// src/api.js
import { supabase } from './lib/supabaseClient';
import { statusToKorean, koreanToStatus } from './constants'; // [NEW] STATUS enum 헬퍼 함수

// 1. 전체 게임 목록 가져오기
export const fetchGames = async () => {
  try {

    // Supabase는 조인된 데이터를 배열/객체로 반환함.
    // game_copies의 status를 가져와서 최상위 status로 매핑
    // 또한 대여중인 경우 대여자 정보(rentals -> profiles)를 가져옴
    const { data, error } = await supabase
      .from('games')
      .select(`
        id, name, category, image, naver_id, bgg_id, difficulty, genre, players, tags,
        total_views, dibs_count, review_count, avg_rating,
        game_copies!inner (
          status,
          copy_id,
          rentals (
            rental_id,
            user_id,
            renter_name,
            returned_at,
            profiles (name)
          )
        )
      `)
      .order('name');

    if (error) throw error;

    // Supabase는 조인된 데이터를 배열/객체로 반환함.
    // game_copies의 status를 가져와서 최상위 status로 매핑
    // (지금은 카피가 여러 개여도 하나라도 AVAILABLE이면 대여가능인 로직이 필요하지만,
    //  단순화를 위해 첫 번째 카피의 상태를 사용하거나, 집계 로직이 필요함.
    //  기존 마이그레이션이 1:1에 가깝게 되어있다면 단순 매핑)

    return data.map(game => {
      // game_copies는 배열.
      // 1. 상태 결정: 하나라도 AVAILABLE이면 대여가능.
      //    없으면 첫번째 카피 상태 or MAINTENANCE
      //    (단, 여기서는 간단히 첫번째 것으로 가정하거나, 우선순위 로직 적용)

      const copy = game.game_copies?.[0];
      const copyStatus = copy?.status || 'MAINTENANCE';

      // 2. 대여자 정보 추출 (현재 대여중이거나 찜 상태이고, 반납되지 않은 기록 찾기)
      let renterName = null;

      // [FIX] 만료된 찜인지 확인
      let isExpiredDibs = false;

      if (copyStatus === 'RESERVED' && copy?.rentals) {
        const activeRental = copy.rentals.find(r => !r.returned_at);
        if (activeRental && activeRental.due_date) {
          const dueDate = new Date(activeRental.due_date);
          const now = new Date();
          // 만료되었다면? 프론트에서는 '대여가능'처럼 보여준다 (CleanUp 전이라도)
          if (now > dueDate) {
            isExpiredDibs = true;
            copyStatus = 'AVAILABLE';
          }
        }
      }

      if (!isExpiredDibs && (copyStatus === 'RENTED' || copyStatus === 'RESERVED') && copy?.rentals) {
        // returned_at이 없는 최신 렌탈
        const activeRental = copy.rentals.find(r => !r.returned_at);
        if (activeRental) {
          // 1순위: renter_name (수기 대여)
          // 2순위: profiles.name (회원 대여)
          renterName = activeRental.renter_name || activeRental.profiles?.name || null;
        }
      }

      return {
        ...game,
        status: statusToKorean(copyStatus), // [IMPROVED] constants.js 헬퍼 함수 사용
        renter: renterName
      };
    });

  } catch (error) {
    console.error("게임 목록 불러오기 실패:", error);
    return { error: true, message: error.message || "네트워크 오류" }; // [개선] 에러 객체 반환
  }
};

// 2. 찜하기/대여하기 (RPC)
export const rentGame = async (gameId, userId) => {
  // [Updated] 대여 확정 (다음날 밤 11:59까지)
  const { data, error } = await supabase.rpc('rent_any_copy', {
    p_game_id: gameId,
    p_user_id: userId
  });
  if (error) throw error;
  return data;
};

export const dibsGame = async (gameId, userId) => {
  // [New] 찜하기 (30분)
  const { data, error } = await supabase.rpc('dibs_any_copy', {
    p_game_id: gameId,
    p_user_id: userId
  });
  if (error) throw error;
  return data;
};

// 6. 리뷰 목록 가져오기
export const fetchReviews = async () => {
  // author_name이 reviews 테이블에 있으므로 그냥 가져오면 됨
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("리뷰 로딩 실패:", error);
    return [];
  }
  return data;
};

// 7. 리뷰 작성하기
export const addReview = async (reviewData) => {
  // reviewData: { game_id, rating, comment, user_name }
  // user_id는 Auth Policy가 처리하거나, 명시적으로 보내야 함. RLS에서 auth.uid()=user_id 체크하므로,
  // insert할 때 현재 세션 유저와 user_id가 일치해야 함.
  // 하지만 가장 확실한 건 supabase client가 세션을 물고 있으므로, user_id를 같이 보내주면 됨.

  // AuthContext 등에서 user.id를 받아왔다고 가정하고 호출해야 함.
  // 하지만 현재 api 호출부(GameDetail)는 user_id를 안 넘기고 있음.
  // GameDetail.js 수정 없이 해결하려면:
  // supabase.auth.getUser()로 여기서 확인? -> 가능하지만 느림.

  // GameDetail.js 구조 상 user object가 있음. 
  // 여기서는 Supabase Client가 있으므로, 굳이 인자로 안 받아도 내부적으로 auth.getUser() 가능.
  // 하지만 payload에 user_id가 없으면 RLS 에러 날 수 있으니 넣어주는 게 좋음.

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from('reviews')
    .insert([{
      game_id: reviewData.game_id,
      user_id: user.id,
      author_name: reviewData.user_name, // 닉네임
      rating: parseInt(reviewData.rating),
      content: reviewData.comment
    }])
    .select();

  if (error) throw error;
  return data;
};

// 8. 리뷰 삭제하기
export const deleteReview = async (reviewId, password) => {
  // password 검증 로직 제거 (Supabase Auth가 본인 확인)
  // 본인 글이면 삭제 가능 (RLS)

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('review_id', reviewId);

  if (error) return { status: "error", message: error.message };
  return { status: "success" };
};

// 10. 조회수 증가
export const increaseViewCount = async (gameId) => {
  await supabase.rpc('increment_view_count', { p_game_id: gameId });
};

// 11. 급상승 게임
export const fetchTrending = async () => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('total_views', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data;
  } catch (error) {
    return [];
  }
};

// [IMPROVED] 설정값 가져오기 (영구 저장소: 로컬 스토리지)
export const fetchConfig = async () => {
  // DB가 없으므로 로컬 스토리지를 DB처럼 사용
  // 다른 컴포넌트(App.js)와 키를 맞춤 ('config_cache')
  const STORAGE_KEY = 'config_cache';

  // 1. 저장된 설정 확인
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // 포맷 호환성 체크: { data, timestamp } 형태이거나 배열 자체일 수 있음
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      } else if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn('설정 파싱 실패, 기본값으로 복구합니다.');
    }
  }

  // 2. 없으면 기본값 (하드코딩)
  const defaultConfig = [
    { label: "#입문\\n추천", value: "#입문", color: "#f1c40f", key: "default_1" },
    { label: "#파티\\n게임", value: "#파티", color: "#e67e22", key: "default_2" },
    { label: "#전략\\n게임", value: "#전략", color: "#e74c3c", key: "default_3" },
    { label: "#2인\\n추천", value: "#2인", color: "#9b59b6", key: "default_4" }
  ];

  // 3. 초기값 저장 (포맷: { data, timestamp })
  // timestamp는 App.js 등에서 캐시 검증용으로 쓰일 수 있으므로 최신화
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    data: defaultConfig,
    timestamp: Date.now()
  }));

  return defaultConfig;
};

// 5. 아쉬워요 (수요조사)
export const sendMiss = async (gameId) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('logs').insert([{
    game_id: gameId,
    user_id: user?.id || null,
    action_type: 'MISS',
    details: '입고 요청'
  }]);
  return { result: "success" };
};

// [Admin] Legacy placeholders
export const loginUser = async () => { throw new Error("useAuth().login을 사용하세요."); };
export const signupUser = async () => { throw new Error("useAuth().signup을 사용하세요."); };

// [Admin] 검색용 네이버 API (Mock)
export const searchNaver = async (query) => {
  await new Promise(r => setTimeout(r, 600));
  if (!query) return { items: [] };
  return {
    items: [
      {
        title: `<b>${query}</b> (검색 결과 예시)`,
        image: "https://via.placeholder.com/300x300?text=BoardGame",
        productId: `mock-${Date.now()}-1`,
        description: "실제 네이버 API 연동이 필요합니다."
      }
    ]
  };
};

// [Admin] 게임 추가
export const addGame = async (gameData) => {
  // 1. Games 테이블 추가
  const { data: newGame, error } = await supabase
    .from('games')
    .insert([{
      name: gameData.name,
      category: gameData.category || '보드게임',
      players: gameData.players,
      difficulty: gameData.difficulty,
      image: gameData.image,
      tags: gameData.tags,
      total_views: 0
    }])
    .select()
    .single();

  if (error) throw error;

  // 2. Game Copy 추가 (1개)
  if (newGame) {
    await supabase.from('game_copies').insert([{
      game_id: newGame.id,
      status: 'AVAILABLE',
      location: gameData.location || '동아리방'
    }]);
  }
  return newGame;
};

// [Admin] 설정 저장 (LocalStorage)
export const saveConfig = async (newConfig) => {
  const STORAGE_KEY = 'config_cache';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    data: newConfig,
    timestamp: Date.now()
  }));
  return { status: "success" };
};

// [Admin] 유저 목록 조회
export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, student_id');
  if (error) return [];
  return data;
};

// [Admin] 게임 수정 (단순 정보 업데이트)
export const editGame = async (gameData) => {
  const { error } = await supabase
    .from('games')
    .update({
      name: gameData.name,
      category: gameData.category,
      players: gameData.players,
      difficulty: gameData.difficulty,
      tags: gameData.tags,
      image: gameData.image
    })
    .eq('id', gameData.game_id);
  if (error) throw error;
};

export const adminUpdateGame = async (gameId, newStatus, renterName, userId) => {
  // 1. 상태 매핑 (한글 -> 영문) [IMPROVED]
  const statusKey = koreanToStatus(newStatus) || 'AVAILABLE';

  // 2. 카피 ID 찾기 (해당 게임의 첫번째 카피)
  const { data: copies } = await supabase.from('game_copies').select('copy_id').eq('game_id', gameId).limit(1);
  if (!copies || copies.length === 0) throw new Error("재고(Copy)가 없습니다.");
  const copyId = copies[0].copy_id;

  // 3. 상태 업데이트
  await supabase.from('game_copies').update({ status: statusKey }).eq('copy_id', copyId);

  // 4. 대여/반납에 따른 렌탈 기록 처리
  if (statusKey === 'RENTED') {
    // 대여 시작: rentals insert
    const { data: g } = await supabase.from('games').select('name').eq('id', gameId).single();

    if (userId) {
      // 회원 대여: user_id 포함
      await supabase.from('rentals').insert([{
        copy_id: copyId,
        user_id: userId,
        game_name: g?.name || "",
        borrowed_at: new Date(),
        due_date: new Date(Date.now() + 30 * 60000) // 30분(임시)
      }]);
    } else if (renterName) {
      // 수기 대여: renter_name만 저장 (user_id는 null)
      await supabase.from('rentals').insert([{
        copy_id: copyId,
        user_id: null,
        renter_name: renterName,
        game_name: g?.name || "",
        borrowed_at: new Date(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60000) // 7일
      }]);
    }

    // 로그 남기기
    await supabase.from('logs').insert([{
      game_id: gameId,
      user_id: userId || null,
      action_type: 'RENT',
      details: renterName || "관리자 변경"
    }]);

  } else if (statusKey === 'AVAILABLE') {
    // 반납: active rental 찾아서 returned_at 찍기
    // (user_id 몰라도 copy_id로 찾아서 닫음)
    await supabase.from('rentals')
      .update({ returned_at: new Date() })
      .eq('copy_id', copyId)
      .is('returned_at', null);

    await supabase.from('logs').insert([{
      game_id: gameId,
      action_type: 'RETURN',
      details: "관리자 반납 처리"
    }]);
  } else {
    // 기타 상태 변경 로그
    await supabase.from('logs').insert([{
      game_id: gameId,
      action_type: 'STATUS_CHANGE',
      details: newStatus
    }]);
  }

  return { status: "success" };
};

// [Admin] 특정 대여자 일괄 반납
export const returnGamesByRenter = async (renterName) => {
  // renterName은 수기 대여 이름 또는 회원 이름일 수 있음

  // 1. 회원인 경우: user_id로 조회
  const { data: users } = await supabase.from('profiles').select('id').eq('name', renterName);

  let activeRentals = [];

  if (users && users.length > 0) {
    // 회원 대여 조회
    const userId = users[0].id;
    const { data } = await supabase
      .from('rentals')
      .select('copy_id, rental_id')
      .eq('user_id', userId)
      .is('returned_at', null);
    if (data) activeRentals = data;
  }

  // 2. 수기 대여 조회 (renter_name으로)
  const { data: manualRentals } = await supabase
    .from('rentals')
    .select('copy_id, rental_id')
    .eq('renter_name', renterName)
    .is('returned_at', null);

  if (manualRentals && manualRentals.length > 0) {
    activeRentals = [...activeRentals, ...manualRentals];
  }

  // 3. 일괄 반납 처리
  if (activeRentals.length > 0) {
    for (const rental of activeRentals) {
      // game_copies 상태 변경
      await supabase.from('game_copies').update({ status: 'AVAILABLE' }).eq('copy_id', rental.copy_id);
      // rentals 종료
      await supabase.from('rentals').update({ returned_at: new Date() }).eq('rental_id', rental.rental_id);
    }
  }

  return { status: "success", count: activeRentals.length };
};

// [Admin] 특정 대여자 일괄 찜 승인 (수령)
export const approveDibsByRenter = async (renterName, userId) => {
  // renterName으로 찜(RESERVED) 상태인 게임들을 찾아서 대여중(RENTED)으로 변경

  // 찜 상태는 game_copies.status = 'RESERVED'
  // rentals 테이블에는 아직 기록이 없을 수도 있음 (찜은 로그만 있을 수도)

  // 1. 찜 상태인 게임 복사본 조회
  // 문제: RESERVED 상태인데 누가 예약했는지 DB에 없음
  // 해결: logs 테이블에서 최근 RESERVE 액션을 한 user를 확인해야 하지만,
  //      간단히 하기 위해 renterName으로 rentals 테이블에서 type='DIBS'인 것을 찾기

  let reservedCopies = [];

  if (userId) {
    // 회원 예약: rentals에서 type='DIBS' 조회
    const { data } = await supabase
      .from('rentals')
      .select('copy_id, rental_id, game_name')
      .eq('user_id', userId)
      .eq('type', 'DIBS')
      .is('returned_at', null);
    if (data) reservedCopies = data;
  }

  // 2. 수기 예약 (renter_name으로)
  const { data: manualReserved } = await supabase
    .from('rentals')
    .select('copy_id, rental_id, game_name')
    .eq('renter_name', renterName)
    .eq('type', 'DIBS')
    .is('returned_at', null);

  if (manualReserved && manualReserved.length > 0) {
    reservedCopies = [...reservedCopies, ...manualReserved];
  }

  // 3. 일괄 승인 처리
  if (reservedCopies.length > 0) {
    for (const reserved of reservedCopies) {
      // game_copies 상태 변경: RESERVED -> RENTED
      await supabase.from('game_copies').update({ status: 'RENTED' }).eq('copy_id', reserved.copy_id);

      // rentals 레코드 업데이트: type을 DIBS -> RENT로 변경
      await supabase.from('rentals')
        .update({
          type: 'RENT',
          borrowed_at: new Date(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60000) // 7일
        })
        .eq('rental_id', reserved.rental_id);
    }
  }

  return { status: "success", count: reservedCopies.length };
};

export const deleteGame = async (gameId) => {
  // 게임 삭제 (cascade로 copy 등 삭제됨)
  await supabase.from('games').delete().eq('id', gameId);
};

export const fetchGameLogs = async (gameId) => {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });
  if (error) return { status: "error" };

  // 로그 매핑 (type -> 한글 등)은 프론트에서 처리 중.
  // 날짜 컬럼: created_at -> date (DashboardTab expects .date)
  const formatted = data.map(log => ({
    ...log,
    date: log.created_at,
    type: log.action_type,
    value: log.details // details에 "→ [이름]" 형식이 있거나 단순 텍스트
  }));
  return { status: "success", logs: formatted };
};

// [MyPage]
// [MyPage]
export const fetchMyRentals = async (userId) => {
  // rentals -> game_copies -> games (name)
  // Supabase join syntax:
  const { data, error } = await supabase
    .from('rentals')
    .select(`
      rental_id,
      borrowed_at,
      due_date,
      returned_at,
      type,
      game_copies (
        status,
        games (name)
      )
    `)
    .eq('user_id', userId)
    .order('borrowed_at', { ascending: false });

  if (error) {
    console.error("내 대여 목록 로딩 실패:", error);
    return { status: "error", message: error.message };
  }

  // 데이터 평탄화 (Flatten)
  const formatted = data.map(r => ({
    rentalId: r.rental_id,
    borrowedAt: r.borrowed_at,
    dueDate: r.due_date,
    returnedAt: r.returned_at,
    // game_copies나 games가 null일 경우 대비
    gameName: r.game_copies?.games?.name || "알 수 없는 게임",
    status: r.returned_at ? "반납완료" : "대여중",
    type: r.type || 'RENT' // 기본값 RENT
  }))
    .filter(r => {
      // 1. 이미 반납된 것은 제외 (여긴 원래 같음)
      if (r.returnedAt) return false;

      // [FIX] 2. 찜(DIBS)인데 만료된 것은 숨김
      if (r.type === 'DIBS' && r.dueDate) {
        const due = new Date(r.dueDate);
        const now = new Date();
        if (now > due) return false; // 만료됨 -> 안보여줌
      }

      return true; // 그 외에는 표시
    });

  return { status: "success", data: formatted };
};

