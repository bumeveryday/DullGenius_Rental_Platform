-- harden_core_logic.sql (Final)

-- 1. [Security] dibs_any_copy: 본인 확인 추가 + RentalID 로그
CREATE OR REPLACE FUNCTION public.dibs_any_copy(
    p_game_id integer,
    p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_copy_id integer;
    v_game_name text;
    v_rental_id uuid;
    v_existing_count integer;
BEGIN
    -- [SEC] 본인 확인
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', '권한이 없습니다. (본인만 찜 가능)');
    END IF;

    -- [RULE] 중복 이용 방지
    SELECT count(*) INTO v_existing_count
    FROM public.rentals r
    JOIN public.game_copies gc ON r.copy_id = gc.copy_id
    WHERE r.user_id = p_user_id
      AND gc.game_id = p_game_id
      AND r.returned_at IS NULL;

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', '이미 이용 중인 게임입니다.');
    END IF;

    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;

    SELECT copy_id INTO v_copy_id
    FROM public.game_copies
    WHERE game_id = p_game_id AND status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_copy_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '대여 가능한 재고가 없습니다.');
    END IF;

    UPDATE public.game_copies SET status = 'RESERVED' WHERE copy_id = v_copy_id;

    INSERT INTO public.rentals (user_id, copy_id, game_name, borrowed_at, due_date, type)
    VALUES (p_user_id, v_copy_id, v_game_name, now(), now() + interval '30 minutes', 'DIBS')
    RETURNING rental_id INTO v_rental_id;

    -- [LOG] Rental ID 포함
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'DIBS', 'Copy:' || v_copy_id || ', RentID:' || v_rental_id);

    RETURN jsonb_build_object('success', true, 'rental_id', v_rental_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. [Security] rent_any_copy: 본인 확인 추가 + RentalID 로그
CREATE OR REPLACE FUNCTION public.rent_any_copy(
    p_game_id integer,
    p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_copy_id integer;
    v_game_name text;
    v_rental_id uuid;
    v_due_date timestamptz;
    v_existing_count integer; -- [NEW]
BEGIN
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', '권한이 없습니다.');
    END IF;

    -- [RULE] 이미 대여 중인 다른 카피가 있는지 확인 (찜 전환 제외)
    -- 찜 전환의 경우, 아래 로직에서 처리됨. 여기서는 "쌩으로 2개째 빌리는 것"을 방지.
    -- 단, "내가 이 게임을 찜해놨고, 그걸 대여로 전환하려는 경우"는 허용해야 함.
    SELECT count(*) INTO v_existing_count
    FROM public.rentals r
    JOIN public.game_copies gc ON r.copy_id = gc.copy_id
    WHERE r.user_id = p_user_id
        AND gc.game_id = p_game_id
        AND r.returned_at IS NULL
        AND r.type = 'RENT'; -- 이미 RENT 상태인게 있으면 막음 (DIBS는 전환되므로 OK)

    IF v_existing_count > 0 THEN
         RETURN jsonb_build_object('success', false, 'message', '이미 이용(대여) 중인 게임입니다.');
    END IF;

    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;
    v_due_date := (current_date + 1) + time '23:59:59';

    SELECT copy_id INTO v_copy_id
    FROM public.rentals
    WHERE user_id = p_user_id 
      AND type = 'DIBS' 
      AND returned_at IS NULL
      AND copy_id IN (SELECT copy_id FROM public.game_copies WHERE game_id = p_game_id)
    LIMIT 1;

    IF v_copy_id IS NOT NULL THEN
        UPDATE public.rentals SET returned_at = now() WHERE copy_id = v_copy_id AND type = 'DIBS';
        UPDATE public.game_copies SET status = 'RENTED' WHERE copy_id = v_copy_id;
    ELSE
         SELECT copy_id INTO v_copy_id
         FROM public.game_copies
         WHERE game_id = p_game_id AND status = 'AVAILABLE'
         LIMIT 1
         FOR UPDATE SKIP LOCKED;

         IF v_copy_id IS NULL THEN
             RETURN jsonb_build_object('success', false, 'message', '대여 가능한 재고가 없습니다.');
         END IF;
         UPDATE public.game_copies SET status = 'RENTED' WHERE copy_id = v_copy_id;
    END IF;

    INSERT INTO public.rentals (user_id, copy_id, game_name, borrowed_at, due_date, type)
    VALUES (p_user_id, v_copy_id, v_game_name, now(), v_due_date, 'RENT')
    RETURNING rental_id INTO v_rental_id;

    -- [LOG] Rental ID 포함
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'RENT', 'Copy:' || v_copy_id || ', RentID:' || v_rental_id);

    RETURN jsonb_build_object('success', true, 'rental_id', v_rental_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. [Admin] 관리자 전용 대여: RentalID 로그
CREATE OR REPLACE FUNCTION public.admin_rent_copy(
    p_game_id integer,
    p_renter_name text,
    p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_copy_id integer;
    v_game_name text;
    v_rental_id uuid;
BEGIN
    SELECT name INTO v_game_name FROM public.games WHERE id = p_game_id;

    v_copy_id := NULL;
    
    -- [1] 찜 확인
    IF p_user_id IS NOT NULL THEN
        SELECT copy_id INTO v_copy_id FROM public.rentals
        WHERE user_id = p_user_id AND type = 'DIBS' AND returned_at IS NULL
        AND copy_id IN (SELECT copy_id FROM public.game_copies WHERE game_id = p_game_id) LIMIT 1;
    ELSE
        SELECT copy_id INTO v_copy_id FROM public.rentals
        WHERE renter_name = p_renter_name AND type = 'DIBS' AND returned_at IS NULL
        AND copy_id IN (SELECT copy_id FROM public.game_copies WHERE game_id = p_game_id) LIMIT 1;
    END IF;

    -- [2] 찜 종료
    IF v_copy_id IS NOT NULL THEN
        UPDATE public.rentals SET returned_at = now() 
        WHERE copy_id = v_copy_id AND type = 'DIBS' AND returned_at IS NULL;
    ELSE
        -- [3] Available 찾기
        SELECT copy_id INTO v_copy_id
        FROM public.game_copies
        WHERE game_id = p_game_id AND status = 'AVAILABLE'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
        
        IF v_copy_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', '처리 가능한(AVAILABLE/RESERVED) 재고가 없습니다.');
        END IF;
    END IF;

    -- [4] 상태 변경
    UPDATE public.game_copies SET status = 'RENTED' WHERE copy_id = v_copy_id;

    -- [5] 렌탈 기록 + Return ID
    INSERT INTO public.rentals (
        user_id, copy_id, game_name, renter_name, borrowed_at, due_date, type
    ) VALUES (
        p_user_id,
        v_copy_id,
        v_game_name,
        p_renter_name,
        now(),
        now() + interval '7 days',
        'RENT'
    )
    RETURNING rental_id INTO v_rental_id;

    -- [6] 로그 (RentalID 포함)
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (p_game_id, p_user_id, 'RENT', 'ADMIN Direct, RentID:' || v_rental_id || ', Name:' || p_renter_name);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. [Admin] 관리자 전용 반납: ID 매칭 및 로그
CREATE OR REPLACE FUNCTION public.admin_return_copy(
    p_game_id integer,
    p_renter_name text DEFAULT NULL, -- [NEW] 특정 대여자 반납용
    p_user_id uuid DEFAULT NULL      -- [NEW] 특정 회원 반납용
) RETURNS jsonb AS $$
DECLARE
    v_copy_id integer;
    v_user_id uuid;
    v_rental_id uuid;
    v_renter_name text;
BEGIN
    -- [1] 반납할 카피 찾기 (특정 대여자 우선, 없으면 아무거나)
    -- 입력된 p_renter_name / p_user_id 가 있으면 그것과 일치하는 렌탈을 찾음.
    SELECT gc.copy_id INTO v_copy_id
    FROM public.game_copies gc
    LEFT JOIN public.rentals r ON gc.copy_id = r.copy_id AND r.returned_at IS NULL
    WHERE gc.game_id = p_game_id 
      AND gc.status != 'AVAILABLE'
      -- [필터 조건 추가]
      AND (p_user_id IS NULL OR r.user_id = p_user_id)
      AND (p_renter_name IS NULL OR r.renter_name = p_renter_name OR (r.user_id IS NOT NULL AND p_renter_name IS NOT NULL)) 
      -- 주의: 수기 이름만 왔을 때 회원 이름과 매칭하는 건 복잡하므로, 
      -- p_renter_name만 오면 renter_name 컬럼만 보거나, 
      -- 프론트에서 ID를 찾아서 p_user_id를 주는게 베스트.
      -- 여기서는 단순화: ID가 오면 ID 매칭, 이름만 오면 이름 매칭.
      AND (
          (p_user_id IS NOT NULL AND r.user_id = p_user_id) OR
          (p_user_id IS NULL AND p_renter_name IS NOT NULL AND (r.renter_name = p_renter_name OR r.game_name IS NOT NULL)) OR -- r.game_name IS NOT NULL is dummy true, trying to fallback
          (p_user_id IS NULL AND p_renter_name IS NULL) -- 조건 없으면 아무거나
      )
    ORDER BY 
        (r.user_id = p_user_id) DESC, -- ID 일치 우선
        (r.renter_name = p_renter_name) DESC, -- 이름 일치 우선
        (r.rental_id IS NOT NULL) DESC, 
        gc.copy_id ASC
    LIMIT 1;

    -- 쿼리가 너무 복잡해졌으므로 단순화:
    -- 동적 쿼리 대신 단순 우선순위 로직 사용
    
    v_copy_id := NULL;

    -- 1순위: User ID로 찾기
    IF p_user_id IS NOT NULL THEN
        SELECT gc.copy_id INTO v_copy_id
        FROM public.game_copies gc
        JOIN public.rentals r ON gc.copy_id = r.copy_id AND r.returned_at IS NULL
        WHERE gc.game_id = p_game_id AND r.user_id = p_user_id
        LIMIT 1;
    END IF;

    -- 2순위: Renter Name으로 찾기 (User ID 못찾았을 때)
    IF v_copy_id IS NULL AND p_renter_name IS NOT NULL THEN
        SELECT gc.copy_id INTO v_copy_id
        FROM public.game_copies gc
        JOIN public.rentals r ON gc.copy_id = r.copy_id AND r.returned_at IS NULL
        WHERE gc.game_id = p_game_id AND r.renter_name = p_renter_name
        LIMIT 1;
    END IF;

    -- 3순위: 조건 없이 아무거나 반납 (기존 로직 - 파라미터 없을 때 대비)
    IF v_copy_id IS NULL AND p_renter_name IS NULL AND p_user_id IS NULL THEN
        SELECT gc.copy_id INTO v_copy_id
        FROM public.game_copies gc
        LEFT JOIN public.rentals r ON gc.copy_id = r.copy_id AND r.returned_at IS NULL
        WHERE gc.game_id = p_game_id AND gc.status != 'AVAILABLE'
        ORDER BY (r.rental_id IS NOT NULL) DESC, gc.copy_id ASC
        LIMIT 1;
    END IF;
    
    -- 여전히 못 찾았으면 에러 (조건을 줬는데 못 찾은 경우 포함)
    IF v_copy_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '반납할 재고가 없습니다(해당 조건의 대여 기록 없음).');
    END IF;

    -- [2] 상태 변경
    UPDATE public.game_copies SET status = 'AVAILABLE' WHERE copy_id = v_copy_id;

    -- [3] 렌탈 종료 + ID들 추출
    UPDATE public.rentals
    SET returned_at = now()
    WHERE copy_id = v_copy_id AND returned_at IS NULL
    RETURNING user_id, rental_id, renter_name INTO v_user_id, v_rental_id, v_renter_name;

    -- [4] 로그 (상세 정보 포함)
    INSERT INTO public.logs (game_id, user_id, action_type, details)
    VALUES (
        p_game_id, 
        v_user_id, 
        'RETURN', 
        'ADMIN Return, RentID:' || COALESCE(v_rental_id::text, 'Unknown') || ', Name:' || COALESCE(v_renter_name, p_renter_name, '-')
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Safe Delete (변동 없음)
CREATE OR REPLACE FUNCTION public.safe_delete_game(
    p_game_id integer
) RETURNS jsonb AS $$
DECLARE
    v_active_count integer;
BEGIN
    SELECT count(*) INTO v_active_count
    FROM public.game_copies
    WHERE game_id = p_game_id AND status IN ('RENTED', 'RESERVED');

    IF v_active_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', '대여/찜 중인 재고가 있어 삭제할 수 없습니다.');
    END IF;

    DELETE FROM public.games WHERE id = p_game_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
