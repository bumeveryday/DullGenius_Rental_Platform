-- ============================================================
-- [일관성 개선] DB 함수 4가지 문제 수정
-- 작성일: 2026-03-03
-- 수정 항목:
--   Fix 2: rent_game / rent_any_copy — renter_name '회원' 제거 (null 허용)
--   Fix 3: admin_rent_game / admin_return_game / rent_game
--           — to_jsonb(문자열) → jsonb_build_object 형식으로 통일
--   Fix 4: admin_return_game — UPDATE에 AND type = 'RENT' 추가
--           (DIBS 레코드를 rental_id 직접 지정으로 실수 반납하는 경로 차단)
-- ============================================================
-- 실행: Supabase SQL Editor에 전체 붙여넣고 실행
-- 실행 후: npm run pull-schema 로 _LIVE 갱신
-- ============================================================


-- ============================================================
-- 1. rent_any_copy (래퍼 함수) — '회원' → NULL
-- ============================================================
CREATE OR REPLACE FUNCTION public.rent_any_copy(p_game_id integer, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN public.rent_game(p_game_id, p_user_id, NULL);
END;
$function$;


-- ============================================================
-- 2. rent_game — COALESCE '회원' 제거 + JSONB 형식 통일
-- ============================================================
CREATE OR REPLACE FUNCTION public.rent_game(p_game_id integer, p_user_id uuid, p_renter_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_game_name TEXT; v_affected INTEGER;
BEGIN
    -- [AUTH] 본인 확인
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RETURN jsonb_build_object('success', false, 'message', '권한이 없습니다.');
    END IF;

    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;
    IF v_game_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '존재하지 않는 게임입니다.');
    END IF;

    -- [Fix 2] COALESCE(p_renter_name, '회원') → p_renter_name (null 허용)
    UPDATE public.rentals
    SET type = 'RENT', returned_at = NULL, borrowed_at = now(),
        due_date = now() + interval '7 days',
        renter_name = p_renter_name
    WHERE game_id = p_game_id AND user_id = p_user_id AND type = 'DIBS' AND returned_at IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        UPDATE public.games SET available_count = available_count - 1
        WHERE id = p_game_id AND available_count > 0;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected = 0 THEN
            RETURN jsonb_build_object('success', false, 'message', '재고가 없습니다.');
        END IF;
        -- [Fix 2] COALESCE(p_renter_name, '회원') → p_renter_name
        INSERT INTO public.rentals (game_id, user_id, game_name, renter_name, type, borrowed_at, due_date)
        VALUES (p_game_id, p_user_id, v_game_name, p_renter_name, 'RENT', now(), now() + interval '7 days');
    END IF;

    -- [Fix 3] to_jsonb(문자열) → jsonb_build_object
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'RENT', jsonb_build_object('action', 'RENT'));

    RETURN jsonb_build_object('success', true, 'message', '대여 완료');
END;
$function$;


-- ============================================================
-- 3. admin_rent_game — JSONB 형식 통일
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_rent_game(
    p_game_id integer,
    p_renter_name text,
    p_user_id uuid DEFAULT NULL::uuid,
    p_rental_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_game_name TEXT;
    v_affected INTEGER;
    v_target_rental_id UUID;
BEGIN
    -- [AUTH] 관리자 확인
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', '관리자 권한이 필요합니다.');
    END IF;

    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;
    IF v_game_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '존재하지 않는 게임입니다.');
    END IF;

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

    IF v_target_rental_id IS NOT NULL THEN
        UPDATE public.rentals
        SET type = 'RENT',
            returned_at = NULL,
            borrowed_at = now(),
            due_date = now() + interval '7 days',
            renter_name = p_renter_name,
            user_id = COALESCE(p_user_id, user_id)
        WHERE rental_id = v_target_rental_id
          AND type = 'DIBS';
        GET DIAGNOSTICS v_affected = ROW_COUNT;
    ELSE
        v_affected := 0;
    END IF;

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

    -- [Fix 3] to_jsonb(문자열) → jsonb_build_object
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'RENT', jsonb_build_object('action', 'ADMIN RENT', 'renter', p_renter_name));

    RETURN jsonb_build_object('success', true, 'message', '대여 완료');
END;
$function$;


-- ============================================================
-- 4. admin_return_game — JSONB 형식 통일 + AND type = 'RENT'
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_return_game(
    p_game_id integer,
    p_renter_name text DEFAULT NULL::text,
    p_user_id uuid DEFAULT NULL::uuid,
    p_rental_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_affected INTEGER;
    v_target_rental_id UUID;
    v_game_id INTEGER;
BEGIN
    -- [AUTH] 관리자 확인
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', '관리자 권한이 필요합니다.');
    END IF;

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

    SELECT game_id INTO v_game_id FROM public.rentals WHERE rental_id = v_target_rental_id;

    -- [Fix 4] AND type = 'RENT' 추가 — DIBS 레코드 실수 반납 차단
    UPDATE public.rentals SET returned_at = now()
    WHERE rental_id = v_target_rental_id AND type = 'RENT';
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', '반납 처리 실패 (이미 반납됐거나 RENT 타입이 아님)');
    END IF;

    UPDATE public.games SET available_count = available_count + 1 WHERE id = v_game_id;

    -- [Fix 3] to_jsonb(문자열) → jsonb_build_object
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (v_game_id, p_user_id, 'RETURN', jsonb_build_object('action', 'ADMIN RETURN'));

    RETURN jsonb_build_object('success', true, 'message', '반납 완료');
END;
$function$;


-- ============================================================
-- 결과 확인
-- ============================================================
SELECT proname AS 함수명,
       pg_get_function_identity_arguments(oid) AS 파라미터
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
  AND proname IN ('rent_game', 'rent_any_copy', 'admin_rent_game', 'admin_return_game')
ORDER BY proname;
