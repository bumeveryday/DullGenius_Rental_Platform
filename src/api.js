// src/api.js
import axios from 'axios';

// 앱스 스크립트 주소
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbwtjZhBcbg_DJkKRWxXk4SDliyjwExcszPX7QAaEf2kuLQjJ0eXC_611dhf9ojRbvpT/exec";

// 1. 전체 게임 목록 가져오기
export const fetchGames = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}?action=getGames`);
    return response.data;
  } catch (error) {
    console.error("게임 목록 불러오기 실패:", error);
    return [];
  }
};

// 2. 찜하기 (30분 뒤 만료 시간 자동 계산)
export const rentGame = async (gameId, studentId, password, renterName, phone, playerCount) => {
  // 1. 현재 시간 가져오기
  const now = new Date();
  
  // 2. 30분 더하기
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
  
  const payload = {
    action: "rent",        // ⭐ [중요] 액션 이름을 'dibs'에서 'rent'로 변경 (서버 코드와 매칭 필요)
    game_id: gameId,
    student_id: studentId, // ⭐ 학번 (Users 시트 조회용)
    password: password,    // ⭐ 비밀번호 (검증용)
    renter: renterName,    // 이름
    phone: phone,          // 전화번호 (연락용)
    due_date: thirtyMinutesLater.toISOString(), 
    player_count: playerCount
  };
  
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(async (res) => {
    // 서버 응답 확인 (비밀번호 틀렸을 때 에러 처리용)
    const data = await res.json();
    if (data.result === "error") {
      throw new Error(data.message); // "비밀번호가 일치하지 않습니다" 등
    }
    return data;
  });
};

// 3. [관리자용] 네이버 검색
export const searchNaver = async (keyword) => {
  const payload = {
    action: "searchNaver",
    keyword: keyword
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 4. [관리자용] 게임 추가하기
export const addGame = async (gameData) => {
  const payload = {
    action: "addGame",
    ...gameData
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 5. 아쉬워요 (수요조사)
export const sendMiss = async (gameId) => {
  const payload = {
    action: "miss",
    game_id: gameId,
    user_id: "anonymous"
  };
  return fetch(API_BASE_URL, { method: "POST", body: JSON.stringify(payload) }).then(res => res.json());
};

// 6. 리뷰 목록 가져오기
export const fetchReviews = async () => {
  const response = await fetch(`${API_BASE_URL}?action=getReviews`);
  return response.json();
};

// 7. 리뷰 작성하기
export const addReview = async (reviewData) => {
  const payload = {
    action: "addReview",
    ...reviewData
  };
  return fetch(API_BASE_URL, { method: "POST", body: JSON.stringify(payload) }).then(res => res.json());
};

// 8. 리뷰 삭제하기
export const deleteReview = async (reviewId, password) => {
  const payload = {
    action: "deleteReview",
    review_id: reviewId,
    password: password
  };
  return fetch(API_BASE_URL, { method: "POST", body: JSON.stringify(payload) }).then(res => res.json());
};

// 10. 조회수 증가 (상세 페이지 접속 시)
export const increaseViewCount = async (gameId) => {
  const payload = {
    action: "view",
    game_id: gameId
  };
  // 결과 기다리지 않고(fire-and-forget) 보내기만 함 (로딩 속도 저하 방지)
  fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const fetchTrending = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}?action=getTrending`);
    return response.json();
  } catch (error) {
    return [];
  }
};

// 12. [관리자] 게임 상태 강제 변경 (현장 대여 포함)
export const adminUpdateGame = async (gameId, status, renterName, userId) => {
  const payload = {
    action: "adminUpdate",
    game_id: gameId,
    status: status,
    renter: renterName, // 이름 텍스트
    user_id: userId,    // ⭐ 추가된 ID
    // due_date 등 필요한 경우 추가
  };
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

// 14. [공통] 설정값(Config) 가져오기
export const fetchConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}?action=getConfig`);
    return response.json();
  } catch (error) { return []; }
};

// 15. [관리자] 설정값(Config) 저장하기
export const saveConfig = async (configList) => {
  const payload = {
    action: "saveConfig",
    configList: configList
  };
  return fetch(API_BASE_URL, { method: "POST", body: JSON.stringify(payload) }).then(res => res.json());
};

// 16. [관리자] 게임 영구 삭제
export const deleteGame = async (gameId) => {
  const payload = {
    action: "deleteGame",
    game_id: gameId
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 17. [관리자] 특정 대여자 일괄 수령
export const approveDibsByRenter = async (renterName, userId) => {
  const payload = {
    action: "approveDibsByRenter",
    renter_name: renterName,
    user_id: userId,     // 👈 여기가 핵심!
  };
  
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

// 19. [관리자] 특정 대여자 일괄 반납
export const returnGamesByRenter = async (renterName) => {
  const payload = {
    action: "returnGamesByRenter",
    renter_name: renterName
  };
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

// 20. [관리자] 로그인 인증 (서버에서 확인)
export const verifyAdminPassword = async (password) => {
  const payload = {
    action: "login",
    password: password
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 21. 게임 정보 수정하기 (전체 필드)
export const editGame = async (gameData) => {
  const payload = {
    action: "editGame",
    ...gameData // game_id, name, difficulty 등 포함
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 22. [관리자] 특정 게임 로그 조회
export const fetchGameLogs = async (gameId) => {
  const payload = {
    action: "getGameLogs",
    game_id: gameId
  };
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 23. 부원 로그인 (수정됨)
export const loginUser = async (studentId, password) => {
  const payload = {
    action: "loginUser", 
    student_id: studentId, // 백엔드는 'student_id'를 원함
    password: password
  };
  
  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 24. [NEW] 회원가입 (추가됨)
export const signupUser = async (userData) => {
  // userData 구조: { name, studentId, password, phone }
  const payload = {
    action: "signup",
    name: userData.name,
    student_id: userData.studentId, // 프론트엔드(studentId) -> 백엔드(student_id) 매핑
    password: userData.password,
    phone: userData.phone
  };

  return fetch(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(res => res.json());
};

// 25. 유저 목록 가져오기 함수 추가
export const fetchUsers = async () => {
  const response = await fetch(`${API_BASE_URL}?action=getUsers`);
  return response.json();
};