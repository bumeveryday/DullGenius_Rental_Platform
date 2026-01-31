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
      // 1. 상태 결정 우선순위:
      //    (1) 유효한 'RESERVED' (찜)이 있는가? -> 있으면 'RESERVED' (그래야 관리자가 수령 처리 가능)
      //    (2) 'AVAILABLE'이 있는가? -> 'AVAILABLE'
      //    (3) 그 외 (RENTED 등)

      const copies = game.game_copies || [];

      // 1-1. 유효한 찜 찾기
      let reservedCopy = null;
      let isExpiredDibs = false;

      // RESERVED 상태인 카피들 중 만료 안 된 것 찾기
      // 만약 만료되었으면 해당 카피는 논리적으로 AVAILABLE 취급해야 함 (단, DB 업데이트는 별도)
      // 여기서는 '보여지는 상태' 결정용
      const validReserved = copies.find(c => {
        if (c.status !== 'RESERVED') return false;
        // 만료 체크
        if (c.rentals) {
          const active = c.rentals.find(r => !r.returned_at);
          if (active && active.due_date) {
            if (new Date() > new Date(active.due_date)) return false; // 만료됨
          }
        }
        return true;
      });

      // 1-2. 대여 가능 카피 찾기
      // 상태가 AVAILABLE 이거나, RESERVED지만 만료된 경우(아직 DB업뎃 안된)
      const hasAvailable = copies.some(c => {
        if (c.status === 'AVAILABLE') return true;
        if (c.status === 'RESERVED') {
          // 만료 체크
          const active = c.rentals?.find(r => !r.returned_at);
          if (active && active.due_date && new Date() > new Date(active.due_date)) {
            return true; // 만료된 찜은 대여 가능으로 간주
          }
        }
        return false;
      });

      let copyStatus = 'MAINTENANCE';
      let targetCopy = null;

      if (validReserved) {
        copyStatus = 'RESERVED';
        targetCopy = validReserved;
      } else if (hasAvailable) {
        copyStatus = 'AVAILABLE';
        // targetCopy는 굳이 필요 없지만 available 중 하나
        targetCopy = copies.find(c => c.status === 'AVAILABLE');
      } else {
        // 나머지는 대여중이거나 수리중
        // 첫번째 카피 상태를 따르거나 RENTED로 통일
        const rentedCopy = copies.find(c => c.status === 'RENTED');
        if (rentedCopy) {
          copyStatus = 'RENTED';
          targetCopy = rentedCopy;
        } else {
          copyStatus = copies[0]?.status || 'MAINTENANCE';
          targetCopy = copies[0];
        }
      }

      // 2. 대여자 정보 추출 (targetCopy 기준)
      let renterName = null;
      let renterId = null;

      if ((copyStatus === 'RENTED' || copyStatus === 'RESERVED') && targetCopy?.rentals) {
        const activeRental = targetCopy.rentals.find(r => !r.returned_at);
        if (activeRental) {
          renterName = activeRental.renter_name || activeRental.profiles?.name || null;
          renterId = activeRental.user_id || null;
        }
      }

      return {
        ...game,
        status: statusToKorean(copyStatus),
        renter: renterName,
        renterId: renterId
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
export const fetchReviews = async (gameId) => {
  // author_name이 reviews 테이블에 있으므로 그냥 가져오면 됨
  let query = supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (gameId) {
    query = query.eq('game_id', gameId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("리뷰 로딩 실패:", error);
    return [];
  }

  // [FIX] 서버 DB에 중복된 데이터가 있을 경우를 대비해, API 레벨에서 중복 제거
  // (작성자 + 내용 + 게임ID)가 같으면 중복으로 간주하고 최신 것만 남김
  const uniqueReviews = [];
  const seen = new Set();

  for (const review of data) {
    // 키 생성 (유니크 조건)
    const key = `${review.game_id}-${review.author_name || review.user_name}-${review.content}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueReviews.push(review);
    }
  }

  return uniqueReviews;
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
// 11. 급상승 게임
export const fetchTrending = async () => {
  try {
    // [FIX] 최근 7일 집계 로직이 반영된 RPC 호출
    const { data: trendingData, error } = await supabase
      .rpc('get_trending_games');

    if (error) {
      // RPC가 아직 없거나 에러인 경우 fallback: 기존 방식(총 조회수)
      console.warn("Trending RPC Error (Fallback to total_views):", error.message);
      const { data, error: fbError } = await supabase
        .from('games')
        .select('*')
        .order('total_views', { ascending: false })
        .limit(5);

      if (fbError) throw fbError;
      return data;
    }

    // RPC 리턴값: { id, name, image, category, weekly_views }
    // 프론트엔드 컴포넌트는 game object 전체를 기대할 수 있으므로,
    // 필요하다면 여기서 매핑하거나, RPC에서 더 많은 필드를 반환해야 함.
    // 현재는 id, name, image, category만으로도 충분할 수 있음 (DashboardTab UI 체크 필요).
    return trendingData;

  } catch (error) {
    console.error("Trending Fetch Failed:", error);
    return [];
  }
};

// [IMPROVED] 설정값 가져오기 (DB: app_config)
export const fetchConfig = async () => {
  const DEFAULT_KEY = 'recommendations';

  // 1. Supabase에서 설정 가져오기
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', DEFAULT_KEY)
    .single();

  if (error || !data) {
    // 2. 없으면 기본값 반환 (DB에 없을 때)
    console.warn("설정 로드 실패 또는 없음, 기본값 사용:", error?.message);
    return [
      { label: "#입문\\n추천", value: "#입문", color: "#f1c40f", key: "default_1" },
      { label: "#파티\\n게임", value: "#파티", color: "#e67e22", key: "default_2" },
      { label: "#전략\\n게임", value: "#전략", color: "#e74c3c", "key": "default_3" },
      { label: "#2인\\n추천", value: "#2인", color: "#9b59b6", key: "default_4" }
    ];
  }

  // 3. DB에 있으면 그 값 반환
  // JSONB 컬럼이므로 자동으로 파싱된 객체/배열이 반환됨
  return data.value;
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

// [Admin] 검색용 네이버 API (Proxy 사용)
// [Admin] 검색용 네이버 API (Proxy 사용)
export const searchNaver = async (query) => {
  if (!query) return { items: [] };

  try {
    let url;
    // [FIX] 환경에 따른 URL 분기
    // 개발 환경(npm start): setupProxy.js가 가로채는 '/v1' 경로 사용
    // 배포 환경(Netlify): Serverless Function 경로 사용
    if (process.env.NODE_ENV === 'development') {
      url = `/v1/search/shop.json?query=${encodeURIComponent(query)}&display=10`;
    } else {
      url = `/.netlify/functions/naver-proxy?query=${encodeURIComponent(query)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Naver API Error:", errText);
      throw new Error(`API 호출 실패 (${response.status})`);
    }

    const data = await response.json();
    console.log("검색 결과:", data);
    return data;
  } catch (e) {
    console.error("검색 중 오류:", e);
    throw e;
  }
};

// [Admin] 게임 추가 (개선됨)
export const addGame = async (gameData) => {
  // 1. 중복 체크 (선택 사항, 프론트에서도 함)
  // 여기서는 강제로 막지는 않음 (프론트가 '새로 생성'을 선택했을 수 있으므로)

  // 1. Games 테이블 추가
  const { data: newGame, error } = await supabase
    .from('games')
    .insert([{
      name: gameData.name,
      category: gameData.category || '보드게임',
      players: gameData.players,
      difficulty: gameData.difficulty,
      image: gameData.image,
      video_url: gameData.video_url,
      manual_url: gameData.manual_url,
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

// [Admin] 게임 이름 중복 확인 [NEW]
export const checkGameExists = async (name) => {
  const { data, error } = await supabase
    .from('games')
    .select('id, name, game_copies(count)')
    .eq('name', name);

  if (error) return [];
  return data; // 중복된 게임 리스트 (보통 1개여야 함)
};

// [Admin] 기존 게임에 재고(Copy) 추가 [NEW]
export const addGameCopy = async (gameId, location) => {
  const { data, error } = await supabase
    .from('game_copies')
    .insert([{
      game_id: gameId,
      status: 'AVAILABLE',
      location: location || '동아리방'
    }])
    .select();

  if (error) throw error;
  return data;
};

// [Admin] 설정 저장 (DB: app_config)
export const saveConfig = async (newConfig) => {
  const DEFAULT_KEY = 'recommendations';

  // Supabase에 Upsert (Insert or Update)
  const { error } = await supabase
    .from('app_config')
    .upsert({
      key: DEFAULT_KEY,
      value: newConfig,
      updated_at: new Date()
    }, { onConflict: 'key' });

  if (error) {
    console.error("설정 저장 실패:", error);
    throw error;
  }

  return { status: "success" };
};

// [Admin] 유저 목록 조회
export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, student_id, phone');
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
      image: gameData.image,
      video_url: gameData.video_url,
      manual_url: gameData.manual_url
    })
    .eq('id', gameData.game_id);
  if (error) throw error;
};

// [Updated] 트랜잭션 RPC를 사용하는 안전한 관리자 상태 변경
export const adminUpdateGame = async (gameId, newStatus, renterName, userId) => {
  const statusKey = koreanToStatus(newStatus) || 'AVAILABLE';

  try {
    if (statusKey === 'RENTED') {
      // [RPC] 관리자용 대여 (트랜잭션)
      const { data, error } = await supabase.rpc('admin_rent_copy', {
        p_game_id: gameId,
        p_renter_name: renterName || (userId ? "회원" : "관리자"),
        p_user_id: userId || null
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return { status: "success" };

    } else if (statusKey === 'AVAILABLE') {
      // [RPC] 관리자용 반납 (트랜잭션)
      // [FIX] 누구 것을 반납하는지 명시 (renterName, userId)
      const { data, error } = await supabase.rpc('admin_return_copy', {
        p_game_id: gameId,
        p_renter_name: renterName || null,
        p_user_id: userId || null
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return { status: "success" };

    } else {
      // 그 외 상태(분실, 수리중 등)는 기존처럼 단순 상태 변경
      // 1. 카피 ID 찾기
      const { data: copies } = await supabase.from('game_copies').select('copy_id').eq('game_id', gameId).limit(1);
      if (!copies || copies.length === 0) throw new Error("재고가 없습니다.");
      const copyId = copies[0].copy_id;

      // 2. 상태 변경
      await supabase.from('game_copies').update({ status: statusKey }).eq('copy_id', copyId);

      // 3. 로그
      await supabase.from('logs').insert([{
        game_id: gameId,
        action_type: 'STATUS_CHANGE',
        details: newStatus
      }]);
      return { status: "success" };
    }
  } catch (e) {
    console.error("adminUpdateGame failed:", e);
    return { status: "error", message: e.message };
  }
};

// [Admin] 특정 대여자 일괄 반납
export const returnGamesByRenter = async (renterName) => {
  // ... (Code omitted for brevity, keeping existing logic but maybe we should use admin_return_copy loop?)
  // For now, keeping existing logic as it's complex to map exactly to single-copy return RPC without loop.
  // But strictly speaking, we should use atomic operations if possible.
  // Given user request for "Robustness", let's leave this as is for now because 'admin_return_copy' targets a game_id,
  // and here we iterate rentals. We can call admin_return_copy inside loop?
  // Let's keep it simple and safe for this turn.

  // 1. 회원인 경우: user_id로 조회
  const { data: users } = await supabase.from('profiles').select('id').eq('name', renterName);

  let activeRentals = [];

  if (users && users.length > 0) {
    // 회원 대여 조회
    const userId = users[0].id;
    const { data } = await supabase
      .from('rentals')
      .select('game_copies(game_id), rental_id')
      .eq('user_id', userId)
      .is('returned_at', null);

    // Flatten to list of game_ids
    if (data) {
      data.forEach(r => {
        if (r.game_copies) activeRentals.push(r.game_copies.game_id);
      });
    }
  }

  // 2. 수기 대여 조회
  const { data: manualRentals } = await supabase
    .from('rentals')
    .select('game_copies(game_id), rental_id')
    .eq('renter_name', renterName)
    .is('returned_at', null);

  if (manualRentals) {
    manualRentals.forEach(r => {
      if (r.game_copies) activeRentals.push(r.game_copies.game_id);
    });
  }

  // 3. 일괄 반납 처리 (RPC 호출로 전환)
  let successCount = 0;
  if (activeRentals.length > 0) {
    for (const gId of activeRentals) {
      try {
        await supabase.rpc('admin_return_copy', { p_game_id: gId });
        successCount++;
      } catch (e) {
        console.error("일괄 반납 중 에러:", e);
      }
    }
  }

  return { status: "success", count: successCount };
};

// [Admin] 특정 대여자 일괄 찜 승인 (수령)
export const approveDibsByRenter = async (renterName, userId) => {
  // 기존 로직 유지 (Update existing rental record is better than creating new one provided by admin_rent_copy)
  // ... (Keeping original implementation as viewed in file)

  let reservedCopies = [];

  if (userId) {
    const { data } = await supabase
      .from('rentals')
      .select('copy_id, rental_id, game_name')
      .eq('user_id', userId)
      .eq('type', 'DIBS')
      .is('returned_at', null);
    if (data) reservedCopies = data;
  }

  const { data: manualReserved } = await supabase
    .from('rentals')
    .select('copy_id, rental_id, game_name')
    .eq('renter_name', renterName)
    .eq('type', 'DIBS')
    .is('returned_at', null);

  if (manualReserved && manualReserved.length > 0) {
    reservedCopies = [...reservedCopies, ...manualReserved];
  }

  if (reservedCopies.length > 0) {
    for (const reserved of reservedCopies) {
      await supabase.from('game_copies').update({ status: 'RENTED' }).eq('copy_id', reserved.copy_id);
      await supabase.from('rentals')
        .update({
          type: 'RENT',
          borrowed_at: new Date(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60000)
        })
        .eq('rental_id', reserved.rental_id);
    }
  }

  return { status: "success", count: reservedCopies.length };
};

export const deleteGame = async (gameId) => {
  // [Updated] 안전 삭제 RPC 사용
  const { data, error } = await supabase.rpc('safe_delete_game', { p_game_id: gameId });

  if (error) throw error;
  if (!data.success) throw new Error(data.message);

  return data;
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
        games (id, name, video_url, manual_url)
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
    gameId: r.game_copies?.games?.id, // [NEW] 게임 ID 추가
    gameName: r.game_copies?.games?.name || "알 수 없는 게임",
    videoUrl: r.game_copies?.games?.video_url,
    manualUrl: r.game_copies?.games?.manual_url,
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


// ==========================================
// [Kiosk & Points System APIs]
// ==========================================

// [Kiosk] 12. 포인트 내역 조회
export const fetchPointHistory = async (userId) => {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("포인트 내역 로딩 실패:", error);
    return [];
  }
  return data;
};

// [Kiosk] 13. 매치 결과 등록 (RPC)
export const registerMatch = async (gameId, playerIds, winnerId) => {
  // playerIds: array of UUIDs
  const { data, error } = await supabase.rpc('register_match_result', {
    p_game_id: gameId,
    p_player_ids: playerIds,
    p_winner_id: winnerId
  });

  if (error) {
    console.error("Match Register Error:", error);
    return { success: false, message: error.message };
  }
  return data; // { success: true/false, message: ... }
};

// [Kiosk] 14. 키오스크 간편 반납 (RPC)
export const kioskReturn = async (copyId, userId) => {
  const { data, error } = await supabase.rpc('kiosk_return', {
    p_copy_id: copyId,
    p_user_id: userId
  });

  if (error) {
    console.error("Kiosk Return Error:", error);
    return { success: false, message: error.message };
  }
  return data;
};

// [Kiosk] 16. 키오스크 간편 대여 (RPC) [NEW]
export const kioskRental = async (gameId, userId) => {
  const { data, error } = await supabase.rpc('kiosk_rental', {
    p_game_id: gameId,
    p_user_id: userId
  });

  if (error) {
    console.error("Kiosk Rental Error:", error);
    return { success: false, message: error.message };
  }
  return data;
};

// [Admin] 17. 전체 포인트 내역 조회 (Dashboard) [NEW]
export const fetchGlobalPointHistory = async (limit = 50) => {
  const { data, error } = await supabase
    .from('point_transactions')
    .select(`
      *,
      profiles:user_id (name, student_id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Global Point History Error:", error);
    return [];
  }
  return data;
};

// [Admin] 18. 포인트 랭킹 조회 (Dashboard) [NEW]
export const fetchLeaderboard = async (limit = 10) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, student_id, current_points')
    .order('current_points', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Leaderboard Error:", error);
    return [];
  }
  return data;
};


// [Kiosk] 15. 유저 포인트 조회 (Helper)
export const fetchUserPoints = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_points')
    .eq('id', userId)
    .single();

  if (error) return 0;
  return data?.current_points || 0;
};
