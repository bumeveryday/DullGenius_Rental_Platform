-- [1] Profiles 테이블 확장 (포인트 추가)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_points INTEGER DEFAULT 0;

-- [2] 포인트 장부 테이블 생성
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT CHECK (type IN ('RENTAL', 'RETURN_ON_TIME', 'MATCH_REWARD', 'VOTE', 'ADMIN_ADJUSTMENT')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('kst', now())
);

-- 인덱스 (조회 속도용)
CREATE INDEX IF NOT EXISTS idx_transactions_user ON point_transactions(user_id);

-- [3] 매치 기록 테이블 생성
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id INTEGER REFERENCES games(id) ON DELETE SET NULL, -- 게임 삭제되도 기록은 유지(Set Null)
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('kst', now()),
    players JSONB NOT NULL, -- 참여자 ID 배열
    winner_id UUID, -- 무승부면 NULL
    verified_at TIMESTAMP WITH TIME ZONE -- 키오스크 인증 시각
);

-- [4] 내부 함수: 포인트 지급 및 로그 동시 처리
CREATE OR REPLACE FUNCTION earn_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_reason TEXT
) RETURNS VOID AS $$
BEGIN
    -- 1. 트랜잭션 기록
    INSERT INTO point_transactions (user_id, amount, type, reason)
    VALUES (p_user_id, p_amount, p_type, p_reason);

    -- 2. 유저 총점 업데이트
    UPDATE profiles
    SET current_points = current_points + p_amount
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [5] RPC: 매치 결과 등록 (5분 쿨타임) - [UPDATED] 다중 승자 지원
CREATE OR REPLACE FUNCTION register_match_result(
    p_game_id INTEGER,
    p_player_ids UUID[], -- 참여자 ID 배열
    p_winner_ids UUID[] -- [MOD] 승자 ID 배열
) RETURNS JSONB AS $$
DECLARE
    v_last_played TIMESTAMP;
    v_player_id UUID;
    v_is_winner BOOLEAN;
    v_points INTEGER;
    v_game_name TEXT;
BEGIN
    -- 1. 쿨타임 체크 (가장 최근 해당 게임 매치 시간 확인)
    SELECT played_at INTO v_last_played
    FROM matches
    WHERE game_id = p_game_id
    ORDER BY played_at DESC
    LIMIT 1;

    -- 5분 (300초) 이내면 차단 (장난 방지 최소컷)
    IF v_last_played IS NOT NULL AND (EXTRACT(EPOCH FROM (timezone('kst', now()) - v_last_played)) < 300) THEN
         RETURN jsonb_build_object('success', false, 'message', '너무 자주 등록할 수 없습니다. (5분 쿨타임)');
    END IF;

    -- 게임 이름 조회
    SELECT name INTO v_game_name FROM games WHERE id = p_game_id;

    -- 2. 매치 기록 저장
    INSERT INTO matches (game_id, players, winner_id, verified_at)
    VALUES (p_game_id, to_jsonb(p_player_ids), p_winner_ids[1], timezone('kst', now()));

    -- 3. 포인트 지급 (승자 200, 참여 50)
    FOREACH v_player_id IN ARRAY p_player_ids
    LOOP
        v_is_winner := (v_player_id = ANY(p_winner_ids));
        
        IF v_is_winner THEN
            v_points := 200;
            PERFORM earn_points(v_player_id, v_points, 'MATCH_REWARD', COALESCE(v_game_name, '대전') || ' 승리');
        ELSE
            v_points := 50;
            PERFORM earn_points(v_player_id, v_points, 'MATCH_REWARD', COALESCE(v_game_name, '대전') || ' 참여');
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * [6] RPC: 키오스크 간편 반납
 * rental_id 우선 지원을 통해 정확한 인스턴스를 반납 처리합니다.
 * 반납 성공 시 재고를 복구하고 사용자에게 100 포인트를 지급합니다.
 */
CREATE OR REPLACE FUNCTION kiosk_return(
    p_game_id INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_condition_ok BOOLEAN DEFAULT TRUE,
    p_rental_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_rental_id UUID;
    v_game_id INTEGER;
    v_game_name TEXT;
    v_target_user_id UUID;
BEGIN
    -- [Step 1] 반납할 대여 기록 확정
    -- p_rental_id가 있으면 최우선으로 해당 기록을 처리함
    IF p_rental_id IS NOT NULL THEN
        v_rental_id := p_rental_id;
        -- 관련 정보 조회 (재고 및 포인트 지급용)
        SELECT game_id, user_id INTO v_game_id, v_target_user_id FROM rentals WHERE rental_id = v_rental_id;
    ELSE
        -- p_rental_id가 없는 경우 (Legacy) game_id와 user_id로 가장 최근 건을 찾음
        SELECT rental_id, game_id, user_id INTO v_rental_id, v_game_id, v_target_user_id
        FROM rentals
        WHERE game_id = p_game_id
          AND returned_at IS NULL
          AND (user_id = p_user_id OR p_user_id IS NULL)
        LIMIT 1;
    END IF;

    IF v_rental_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '반납할 대여 기록을 찾을 수 없습니다.');
    END IF;

    -- 게임 이름 조회 (포인트 알림용)
    SELECT name INTO v_game_name FROM games WHERE id = v_game_id;

    -- [Step 2] 반납 처리 (Rentals 테이블 업데이트)
    UPDATE rentals
    SET returned_at = timezone('kst', now())
    WHERE rental_id = v_rental_id;

    -- [Step 3] 가용 재고 복구
    UPDATE games
    SET available_count = available_count + 1
    WHERE id = v_game_id;

    -- [Step 4] 반납 포인트 지급 (+100P)
    IF v_target_user_id IS NOT NULL THEN
        PERFORM earn_points(v_target_user_id, 100, 'RETURN_ON_TIME', '키오스크 반납 (' || COALESCE(v_game_name, '게임:' || v_game_id) || ')');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [7] RPC: 키오스크 간편 대여 (무인 대여) - [DEPRECATED] 예약 수령 권장
-- 하지만 직접 대여 기능이 필요할 경우를 위해 V2로 업데이트
CREATE OR REPLACE FUNCTION kiosk_rental(
    p_game_id INTEGER,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_available INTEGER;
BEGIN
    -- 1. 대여 가능한 재고 확인
    SELECT available_count INTO v_available
    FROM games
    WHERE id = p_game_id;

    IF v_available IS NULL OR v_available <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', '현재 대여 가능한 재고가 없습니다.');
    END IF;

    -- 2. 대여 기록 생성 (Rentals)
    INSERT INTO rentals (game_id, user_id, type, borrowed_at, due_date)
    VALUES (
        p_game_id, 
        p_user_id, 
        'RENT', 
        timezone('kst', now()), 
        timezone('kst', now() + INTERVAL '2 days') -- 기본 2일 대여
    );

    -- 3. 가용 재고 감소
    UPDATE games
    SET available_count = available_count - 1
    WHERE id = p_game_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * [7-2] RPC: 키오스크 예약 수령 (Dibs -> Rent 전환)
 * rental_id를 통해 특정 예약을 즉시 대여 상태로 전환합니다.
 */
CREATE OR REPLACE FUNCTION kiosk_pickup(
    p_rental_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_game_id INTEGER;
    v_user_id UUID;
    v_status TEXT;
BEGIN
    -- [Step 1] 유효한 예약(찜) 데이터인지 확인
    SELECT game_id, user_id, type INTO v_game_id, v_user_id, v_status
    FROM rentals
    WHERE rental_id = p_rental_id;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '존재하지 않는 예약입니다.');
    END IF;

    IF v_status != 'DIBS' THEN
        RETURN jsonb_build_object('success', false, 'message', '예약(찜) 상태가 아닙니다.');
    END IF;

    -- [Step 2] 대여(RENT)로 전환 (Update Rentals)
    -- (참고: 재고는 이미 찜하기 단계에서 차감되었으므로 별도 업데이트 불필요)
    UPDATE rentals
    SET 
        type = 'RENT',
        borrowed_at = timezone('kst', now()),
        due_date = timezone('kst', now() + INTERVAL '2 days')
    WHERE rental_id = p_rental_id;

    -- [Step 3] 로그 기록
    INSERT INTO logs (game_id, user_id, action_type, details)
    VALUES (v_game_id, v_user_id, 'RENT', 'Kiosk Pickup (Rental ID: ' || p_rental_id || ')');

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [8] RLS 정책 추가 (리더보드/내역 조회용)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" 
        ON profiles FOR SELECT USING (true);
    END IF;
END
$$;

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'point_transactions' AND policyname = 'Point logs are viewable by everyone'
    ) THEN
        CREATE POLICY "Point logs are viewable by everyone" 
        ON point_transactions FOR SELECT USING (true);
    END IF;
END
$$;
