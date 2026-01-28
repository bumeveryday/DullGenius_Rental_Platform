// src/admin/DashboardTab.js
import { useState, useEffect } from 'react'; // [CHANGE] useMemo 제거
import { adminUpdateGame, deleteGame, approveDibsByRenter, returnGamesByRenter, editGame, fetchGameLogs, fetchUsers } from '../api';
import GameFormModal from './GameFormModal';
import FilterBar from '../components/FilterBar';
import { TEXTS, getStatusColor } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useGameFilter } from '../hooks/useGameFilter'; // [NEW] Custom Hook

function DashboardTab({ games, loading, onReload }) {
  const { showToast } = useToast(); // [NEW]

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetGame, setTargetGame] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [gameLogs, setGameLogs] = useState([]);
  const [logGameName, setLogGameName] = useState("");

  const [allUsers, setAllUsers] = useState([]);
  // 필터 관련 변수
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [renterFilter, setRenterFilter] = useState(""); // 👤 대여자 검색용
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [difficultyFilter, setDifficultyFilter] = useState("전체");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);


  // ⭐ 페이지 로드 시 유저 목록 가져오기
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await fetchUsers(); // api.js에 추가한 함수 호출
        if (Array.isArray(users)) {
          setAllUsers(users);
        }
      } catch (e) {
        console.error("유저 목록 로드 실패:", e);
      }
    };
    loadUsers();
  }, []);

  // ⭐ [헬퍼 함수] 이름으로 User ID 찾기
  const findUserId = (nameStr) => {
    if (!nameStr) return null;
    if (!allUsers || allUsers.length === 0) {
      console.warn("⚠️ 유저 목록이 아직 로드되지 않았습니다.");
      return null;
    }
    // 공백 제거 후 비교 (입력 실수 방지)
    const cleanInput = nameStr.replace(/\s+/g, "");

    const target = allUsers.find(u => {
      if (!u.name) return false; // 이름 없는 데이터 건너뜀
      const cleanUserName = u.name.replace(/\s+/g, "");

      return cleanInput.includes(cleanUserName);
    });

    return target ? target.id : null;
  };

  // 검색어 디바운싱 (0.3초 딜레이)
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // --- 필터링 로직 (App.js에서 가져옴 + 대여자 필터 추가) ---
  // [개선] Custom Hook 사용
  const filteredGames = useGameFilter(games, {
    searchTerm,
    renterFilter, // Admin 전용
    selectedCategory,
    onlyAvailable,
    difficultyFilter,
    playerFilter
  });

  // 필터 초기화 함수
  const resetFilters = () => {
    setInputValue(""); setSearchTerm(""); setRenterFilter("");
    setSelectedCategory("전체"); setDifficultyFilter("전체");
    setPlayerFilter("all"); setOnlyAvailable(false);
  };

  // 여기까지 필터바 
  // ===================================


  // 카테고리 목록 추출
  const categories = ["전체", ...new Set(games.map(g => g.category).filter(Boolean))];


  // 수정 모달 열기
  const openEditModal = (game) => {
    setTargetGame(game); // 기존 게임 데이터를 그대로 넘김
    setIsEditModalOpen(true);
  };

  // 모달에서 '저장' 버튼 클릭 시
  const handleEditSubmit = async (formData) => {
    if (window.confirm(`[${formData.name}] 정보를 수정하시겠습니까?`)) {
      try {
        // 기존 ID는 유지하고 폼 데이터로 덮어쓰기
        await editGame({ game_id: targetGame.id, ...formData });
        showToast("✅ 수정되었습니다.", { type: "success" });
        setIsEditModalOpen(false);
        onReload();
      } catch (e) {
        showToast("수정 실패: " + e, { type: "error" });
      }
    }
  };

  // 현장 대여 핸들러 추가
  const handleDirectRent = async (game) => {
    // 1. 대여자 이름 입력받기
    const promptMsg = TEXTS.ADMIN_RENT_PROMPT.replace("{gameName}", game.name);
    const renterName = prompt(promptMsg);
    if (!renterName || renterName.trim() === "") return;

    // 2. ID 찾기 시도
    const userId = findUserId(renterName);

    // 찾았는지 못 찾았는지 확인 메시지 (테스트용)
    let confirmMsg = TEXTS.ADMIN_RENT_CONFIRM_HeadsUp
      .replace("{gameName}", game.name)
      .replace("{renterName}", renterName);
    if (userId) {
      confirmMsg += TEXTS.ADMIN_RENT_CONFIRM_SUCCESS.replace("{userId}", userId);
    } else {
      confirmMsg += TEXTS.ADMIN_RENT_CONFIRM_FAIL;
    }

    if (window.confirm(confirmMsg)) {
      try {
        // 3. API 호출
        const res = await adminUpdateGame(game.id, "대여중", renterName, userId);

        // 응답 체크
        if (res && res.status === "success") {
          showToast(TEXTS.ADMIN_RENT_SUCCESS, { type: "success" });
          onReload();
        } else {
          showToast("오류 발생: " + (res.message || "응늵 없음"), { type: "error" });
        }
      } catch (e) {
        console.error(e);
        showToast("처리 실패 (콘솔 확인): " + e, { type: "error" });
      }
    }
  };



  // 3. 단순 상태 변경 (분실, 대여취소 등)
  const handleStatusChange = async (gameId, newStatus, gameName) => {
    let msg = `[${gameName}] 상태를 '${newStatus}'(으)로 변경하시겠습니까?`;
    if (newStatus === "대여중") msg = "현장 수령 확인하시겠습니까?";
    if (newStatus === "대여가능") msg = "반납 처리하시겠습니까?";

    if (!window.confirm(msg)) return;

    try {
      await adminUpdateGame(gameId, newStatus);
      showToast("처리되었습니다.", { type: "success" });
      onReload();
    } catch (e) {
      showToast("오류 발생: " + e, { type: "error" });
    }
  };

  // 4. 스마트 반납 (일괄 처리 로직)
  const handleReturn = async (game) => {
    const renterName = game.renter;
    const sameUserRentals = games.filter(g => g.status === "대여중" && g.renter === renterName);
    const count = sameUserRentals.length;

    if (count <= 1) {
      if (window.confirm(`[${game.name}] 반납 처리하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여가능");
        showToast("반납되었습니다.", { type: "success" });
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 현재 빌려간 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '반납' 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 반납합니다)`)) {
      await returnGamesByRenter(renterName);
      showToast(`${count}건이 일괄 반납되었습니다.`, { type: "success" });
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여가능");
      showToast("반납되었습니다.", { type: "success" });
      onReload();
    }
  };

  // 5. 스마트 수령 (일괄 찜 처리 로직)
  const handleReceive = async (game) => {
    const renterName = game.renter;
    const sameUserDibs = games.filter(g => g.status === "찜" && g.renter === renterName);
    const count = sameUserDibs.length;
    const userId = findUserId(renterName);
    if (count <= 1) {
      if (window.confirm(`[${game.name}] 현장 수령 확인하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여중", renterName, userId);
        showToast("처리되었습니다.", { type: "success" });
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 예약한 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '대여중'으로 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 처리합니다)`)) {
      await approveDibsByRenter(renterName, userId);
      showToast(`${count}건이 일괄 수령 처리되었습니다.`, { type: "success" });
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여중", renterName, userId);
      showToast("처리되었습니다.", { type: "success" });
      onReload();
    }
  };

  // 6. 게임 삭제
  const handleDelete = async (game) => {
    if (!window.confirm(`[${game.name}] 정말 삭제합니까?\n되돌릴 수 없습니다.`)) return;
    try {
      await deleteGame(game.id);
      showToast("삭제되었습니다.", { type: "success" });
      onReload();
    } catch (e) {
      showToast("삭제 실패", { type: "error" });
    }
  };

  // ⭐ [추가] 로그 보기 핸들러
  const handleShowLogs = async (game) => {
    setLogGameName(game.name);
    setGameLogs([]); // 초기화
    setIsLogModalOpen(true);

    try {
      const res = await fetchGameLogs(game.id);

      console.log("받아온 로그 데이터:", res);
      if (res.status === "success") {
        setGameLogs(res.logs);
      } else {
        showToast("로그를 불러오지 못했습니다.", { type: "error" });
      }
    } catch (e) {
      showToast("로그 로딩 에러", { type: "error" });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3>🚨 게임 관리 (총 {games.length}개)</h3>
        <button onClick={onReload} style={{ padding: "5px 10px", cursor: "pointer", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "5px" }}>🔄 새로고침</button>
      </div>

      <FilterBar
        inputValue={inputValue} setInputValue={setInputValue}
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter}
        playerFilter={playerFilter} setPlayerFilter={setPlayerFilter}
        onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
        categories={categories}
        onReset={resetFilters}
        isAdmin={true}                   // 관리자 모드 켜기
        renterFilter={renterFilter}      // 대여자 검색 state
        setRenterFilter={setRenterFilter}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>데이터를 불러오는 중... ⏳</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredGames.map(game => (
            <div key={game.id} style={styles.card}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.05em" }}>
                  {game.name}
                  <span style={{ ...styles.statusBadge, background: getStatusColor(game.status) }}>
                    {game.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85em", color: "#666", marginTop: "5px", lineHeight: "1.4" }}>
                  <span style={{ marginRight: "10px" }}>{game.renter ? `👤 ${game.renter}` : "대여자 없음"}</span>
                  <span style={{ color: "#e67e22", marginRight: "10px" }}>난이도: {game.difficulty || "-"}</span>
                  <br />
                  태그: <span style={{ color: "#3498db" }}>{game.tags || "(없음)"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <button onClick={() => handleShowLogs(game)} style={{ ...actionBtnStyle("#ecf0f1"), color: "#555", border: "1px solid #ddd" }} title="이력 조회">📜</button>
                <button onClick={() => openEditModal(game)} style={actionBtnStyle("#9b59b6")}>✏️ 수정</button>
                <button onClick={() => handleDelete(game)} style={{ ...actionBtnStyle("#fff"), color: "#e74c3c", border: "1px solid #e74c3c", width: "30px", padding: 0 }}>🗑️</button>

                {/* 상태별 버튼 로직 유지 */}
                {game.status === "찜" ? (
                  <>
                    <button onClick={() => handleReceive(game)} style={actionBtnStyle("#3498db")}>🤝 수령</button>
                    <button onClick={() => handleStatusChange(game.id, "대여가능", game.name)} style={actionBtnStyle("#e74c3c")}>🚫 취소</button>
                  </>
                ) : game.status !== "대여가능" ? (
                  <>
                    <button onClick={() => handleReturn(game)} style={actionBtnStyle("#2ecc71")}>↩️ 반납</button>
                    <button onClick={() => handleStatusChange(game.id, "분실", game.name)} style={actionBtnStyle("#95a5a6")}>⚠️ 분실</button>
                  </>
                ) :
                  <button onClick={() => handleDirectRent(game)} style={actionBtnStyle("#2c3e50")}>✋ 현장대여</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 공통 모달 사용 (수정용) */}
      <GameFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={targetGame}
        onSubmit={handleEditSubmit}
        title="✏️ 게임 정보 수정"
      />

      {isLogModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📜 [{logGameName}] 대여 이력</span>
              <button onClick={() => setIsLogModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2em", cursor: "pointer" }}>✖️</button>
            </h3>

            <div style={{ maxHeight: "500px", overflowY: "auto", fontSize: "0.9em" }}>
              {gameLogs.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>기록이 없습니다.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                    <tr style={{ background: "#f8f9fa", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {/* ⭐ [변경] 헤더를 4개로 확실히 나눕니다 */}
                      <th style={{ padding: "10px", width: "130px", color: "#555" }}>날짜</th>
                      <th style={{ padding: "10px", width: "60px", color: "#555", textAlign: "center" }}>행동</th>
                      <th style={{ padding: "10px", color: "#555" }}>내용</th>
                      <th style={{ padding: "10px", width: "150px", color: "#555" }}>대여자 정보</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameLogs.map((log, idx) => {
                      // 1. 데이터 안전 변환
                      const valStr = String(log.value || "");

                      let mainText = valStr;
                      let userInfo = null;
                      let isNonMember = false; // 디자인 구분용

                      // [CASE 1] 회원 매칭 성공 (→ [ 기호가 있는 경우)
                      if (valStr.includes("→ [")) {
                        const parts = valStr.split("→ [");
                        mainText = parts[0].trim(); // 예: "대여중"
                        userInfo = parts[1].replace("]", "").trim(); // 예: "홍길동, 010..."
                      }
                      // [CASE 2] 기호는 없지만 '대여(RENT)'인 경우 (수기 입력)
                      // 단, "일괄처리" 같은 시스템 메시지는 제외하고 싶다면 조건 추가 가능
                      else if (log.type === "RENT" && valStr.trim() !== "" && valStr !== "일괄처리") {
                        mainText = "현장 대여 (수기)"; // 내용은 이걸로 고정
                        userInfo = valStr; // 원래 적혀있던 "ㄴㅇㄹㄴㅇㄹ"를 대여자 칸으로 이동
                        isNonMember = true; // 회색 배지로 표시
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                          {/* 1. 날짜 (24시간제 포맷팅 적용) */}
                          <td style={{ padding: "10px 5px", color: "#666", fontSize: "0.85em", minWidth: "80px" }}>
                            {(() => {
                              const dateStr = String(log.date || "");
                              try {
                                const date = new Date(dateStr);
                                if (!isNaN(date.getTime())) {
                                  // 24시간제로 깔끔하게 변환 (예: 2025. 12. 12. 14:30)
                                  return date.toLocaleString('ko-KR', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: false
                                  });
                                }
                              } catch (e) { }
                              // 파싱 실패 시: 원본에서 초(:ss) 단위만 떼고 보여줌
                              return dateStr.replace(/:[0-9]{2}$/, "").replace("AM", "").replace("PM", "").trim();
                            })()}
                          </td>

                          {/* 2. 행동 배지 */}
                          <td style={{ padding: "10px 5px", textAlign: "center" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8em",
                              fontWeight: "bold",
                              color: "white",
                              display: "inline-block",
                              minWidth: "40px",
                              background: log.type === "RENT" ? "#e74c3c" : log.type === "RETURN" ? "#2ecc71" : "#95a5a6"
                            }}>
                              {log.type === "RENT" ? "대여" : log.type === "RETURN" ? "반납" : log.type}
                            </span>
                          </td>

                          {/* 3. 내용 (Content) */}
                          <td style={{ padding: "10px 5px", color: "#333" }}>
                            {mainText}
                          </td>

                          {/* 4. 대여자 정보 (Renter Info) */}
                          <td style={{ padding: "10px 5px" }}>
                            {userInfo ? (
                              <div style={{
                                fontSize: "0.9em",
                                // 비회원(수기)이면 회색, 회원이면 파란색
                                color: isNonMember ? "#555" : "#0984e3",
                                fontWeight: "600",
                                background: isNonMember ? "#eee" : "#e3f2fd",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                display: "inline-block"
                              }}>
                                👤 {userInfo}
                              </div>
                            ) : (
                              <span style={{ color: "#ccc", fontSize: "0.8em" }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button onClick={() => setIsLogModalOpen(false)} style={styles.cancelBtn}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = (bgColor) => ({ padding: "6px 12px", border: "none", background: bgColor, color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" });
const styles = {
  card: { border: "1px solid #ddd", padding: "15px", borderRadius: "10px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" },
  statusBadge: { marginLeft: "8px", fontSize: "0.8em", padding: "2px 8px", borderRadius: "12px", color: "white" },

  modalOverlay: {
    position: "fixed",   // 모달 위치 강제 고정
    top: 0,
    left: 0,
    right: 0,   // 추가
    bottom: 0,  // 추가
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999 // 매우 높은 값으로 설정
  },
  modalContent: { background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "800px", boxShadow: "0 5px 20px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  cancelBtn: { padding: "10px 20px", background: "#ddd", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#555" }
};

export default DashboardTab;