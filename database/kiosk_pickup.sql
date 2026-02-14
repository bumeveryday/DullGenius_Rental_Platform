-- [NEW] RPC: 키오스크 예약 수령 (단건)
CREATE OR REPLACE FUNCTION kiosk_pickup(
    p_rental_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_game_id INTEGER;
    v_copy_id INTEGER;
    v_user_id UUID;
    v_status TEXT;
BEGIN
    -- 1. 유효한 예약(찜)인지 확인
    SELECT game_id, copy_id, user_id, type INTO v_game_id, v_copy_id, v_user_id, v_status
    FROM rentals
    WHERE rental_id = p_rental_id;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '존재하지 않는 예약입니다.');
    END IF;

    IF v_status != 'DIBS' THEN
        RETURN jsonb_build_object('success', false, 'message', '예약(찜) 상태가 아닙니다.');
    END IF;

    -- 2. 대여로 전환 (Update Rentals)
    UPDATE rentals
    SET 
        type = 'RENT',
        borrowed_at = timezone('kst', now()),
        due_date = timezone('kst', now() + INTERVAL '2 days') -- 기본 2일 대여
    WHERE rental_id = p_rental_id;

    -- 3. 카피 상태 변경 (RESERVED -> RENTED)
    UPDATE game_copies
    SET status = 'RENTED'
    WHERE copy_id = v_copy_id;

    -- 4. 로그 기록
    INSERT INTO logs (game_id, user_id, action_type, details)
    VALUES (v_game_id, v_user_id, 'RENT', 'Kiosk Pickup (Rental ID: ' || p_rental_id || ')');

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [NEW] RPC: 키오스크 예약 일괄 수령
CREATE OR REPLACE FUNCTION kiosk_pickup_all(
    p_rental_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
    v_rental_id UUID;
    v_success_count INTEGER := 0;
    v_fail_count INTEGER := 0;
    v_result JSONB;
BEGIN
    FOREACH v_rental_id IN ARRAY p_rental_ids
    LOOP
        v_result := kiosk_pickup(v_rental_id);
        IF (v_result->>'success')::BOOLEAN THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_fail_count := v_fail_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'success_count', v_success_count, 
        'fail_count', v_fail_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
