-- ============================================================
-- [긴급 수정] admin_return_game / admin_rent_game 오버로드 충돌 해결
-- 작성일: 2026-03-02
-- 배경:
--   harden_rpc_security.sql (3-param 버전) 과
--   final_rpc_v2.sql (4-param 버전) 이 DB에 공존하여
--   p_rental_id 없이 호출 시 "ambiguous function call" 에러 발생
--   → 관리자 페이지 반납 버튼이 아무 반응 없는 현상 원인
-- 해결:
--   3-param 구버전 제거 → 4-param 단일 버전으로 통합 (권한 체크 포함)
-- ============================================================
-- 실행: Supabase SQL Editor에 전체 붙여넣고 실행
-- ============================================================


-- ============================================================
-- 1. admin_return_game — 3-param 구버전 제거 + 4-param 재배포 (권한 체크 포함)
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_return_game(INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.admin_return_game(
    p_game_id    INTEGER,
    p_renter_name TEXT    DEFAULT NULL,
    p_user_id    UUID    DEFAULT NULL,
    p_rental_id  UUID    DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_affected         INTEGER;
    v_target_rental_id UUID;
    v_game_id          INTEGER;
BEGIN
    -- [SECURE] 관리자/집행부 권한 체크
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_key IN ('admin', 'executive')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', '접근 권한이 없습니다.');
    END IF;

    -- [Step 1] 반납할 RENT 기록 확정 (rental_id 우선, 없으면 검색)
    IF p_rental_id IS NOT NULL THEN
        v_target_rental_id := p_rental_id;
    ELSE
        SELECT rental_id INTO v_target_rental_id
        FROM public.rentals
        WHERE game_id = p_game_id
          AND returned_at IS NULL
          AND type = 'RENT'
          AND (
              (p_user_id IS NOT NULL AND user_id = p_user_id) OR
              (p_user_id IS NULL AND p_renter_name IS NOT NULL AND renter_name = p_renter_name) OR
              (p_user_id IS NULL AND p_renter_name IS NULL)
          )
        ORDER BY borrowed_at ASC
        LIMIT 1;
    END IF;

    IF v_target_rental_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '반납할 대여 기록을 찾을 수 없습니다.');
    END IF;

    -- [Step 2] 실제 game_id 추출 (재고 복구용)
    SELECT game_id INTO v_game_id FROM public.rentals WHERE rental_id = v_target_rental_id;

    -- [Step 3] 반납 처리 (type = RENT 조건 추가로 안전성 확보)
    UPDATE public.rentals
    SET returned_at = now()
    WHERE rental_id = v_target_rental_id AND type = 'RENT';
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', '반납 처리 실패 (이미 반납됐거나 RENT 타입이 아님)');
    END IF;

    -- [Step 4] 재고 복구 및 로그
    UPDATE public.games SET available_count = available_count + 1 WHERE id = v_game_id;

    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (v_game_id, p_user_id, 'RETURN', to_jsonb('ADMIN RETURN'::text));

    RETURN jsonb_build_object('success', true, 'message', '반납 완료');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. admin_rent_game — 동일한 오버로드 문제 사전 차단
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_rent_game(INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.admin_rent_game(
    p_game_id     INTEGER,
    p_renter_name TEXT,
    p_user_id     UUID    DEFAULT NULL,
    p_rental_id   UUID    DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_game_name        TEXT;
    v_affected         INTEGER;
    v_target_rental_id UUID;
BEGIN
    -- [SECURE] 관리자/집행부 권한 체크
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_key IN ('admin', 'executive')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', '접근 권한이 없습니다.');
    END IF;

    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;
    IF v_game_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '존재하지 않는 게임입니다.');
    END IF;

    -- [Step 1] 전환할 DIBS 기록 확정
    IF p_rental_id IS NOT NULL THEN
        v_target_rental_id := p_rental_id;
    ELSE
        SELECT rental_id INTO v_target_rental_id
        FROM public.rentals
        WHERE game_id = p_game_id
          AND (user_id = p_user_id OR renter_name = p_renter_name)
          AND type = 'DIBS'
          AND returned_at IS NULL
        LIMIT 1;
    END IF;

    -- [Step 2] DIBS → RENT 전환
    IF v_target_rental_id IS NOT NULL THEN
        UPDATE public.rentals
        SET type = 'RENT', returned_at = NULL, borrowed_at = now(),
            due_date = now() + interval '7 days',
            renter_name = p_renter_name,
            user_id = COALESCE(p_user_id, user_id)
        WHERE rental_id = v_target_rental_id AND type = 'DIBS';
        GET DIAGNOSTICS v_affected = ROW_COUNT;
    ELSE
        v_affected := 0;
    END IF;

    -- [Step 3] DIBS 없으면 신규 대여
    IF v_affected = 0 THEN
        UPDATE public.games SET available_count = available_count - 1
        WHERE id = p_game_id AND available_count > 0;
        GET DIAGNOSTICS v_affected = ROW_COUNT;

        IF v_affected = 0 THEN
            RETURN jsonb_build_object('success', false, 'message', '재고가 없습니다.');
        END IF;

        INSERT INTO public.rentals (game_id, user_id, game_name, renter_name, type, borrowed_at, due_date)
        VALUES (p_game_id, p_user_id, v_game_name, p_renter_name, 'RENT', now(), now() + interval '7 days');
    END IF;

    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'RENT', to_jsonb('ADMIN RENT: ' || p_renter_name));

    RETURN jsonb_build_object('success', true, 'message', '대여 완료');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 결과 확인 — 각 함수 오버로드 수가 1개여야 정상
-- ============================================================

SELECT
    proname AS 함수명,
    pg_get_function_identity_arguments(oid) AS 파라미터,
    CASE prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS 보안모드
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
  AND proname IN ('admin_return_game', 'admin_rent_game')
ORDER BY proname, 파라미터;
