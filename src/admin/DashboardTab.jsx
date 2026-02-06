// src/admin/DashboardTab.js
import { useState, useEffect } from 'react';
import { adminUpdateGame, deleteGame, approveDibsByRenter, returnGamesByRenter, editGame, fetchGameLogs, fetchUsers } from '../api';
import GameFormModal from './GameFormModal';
import ConfirmModal from '../components/ConfirmModal'; // [NEW]
import FilterBar from '../components/FilterBar';
import { TEXTS, getStatusColor } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useGameFilter } from '../hooks/useGameFilter';

function DashboardTab({ games, loading, onReload }) {
  const { showToast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetGame, setTargetGame] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [gameLogs, setGameLogs] = useState([]);
  const [logGameName, setLogGameName] = useState("");

  // [NEW] Confirm 모달 상태
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "info"
  });

  // [NEW] 유저 선택 모달 상태
  const [userSelectModal, setUserSelectModal] = useState({
    isOpen: false,
    candidates: [],
    game: null,
    renterNameInput: ""
  });

  // [NEW] Confirm 모달 헬퍼 함수
  const showConfirmModal = (title, message, onConfirm, type = "info") => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, type: "info" });
  };

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

  // ⭐ [헬퍼 함수] 이름으로 User ID 찾기 (단일 매칭 - 구버전 호환용)
  const findUserId = (nameStr) => {
    const matches = findMatchingUsers(nameStr);
    return matches.length > 0 ? matches[0].id : null;
  };

  // ⭐ [NEW] 이름 포함하는 모든 유저 찾기
  const findMatchingUsers = (nameStr) => {
    if (!nameStr) return [];
    if (!allUsers || allUsers.length === 0) return [];

    // 공백 제거 후 비교
    const cleanInput = nameStr.replace(/\s+/g, "");

    return allUsers.filter(u => {
      if (!u.name) return false;
      const cleanUserName = u.name.replace(/\s+/g, "");
      return cleanUserName.includes(cleanInput);
    });
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
    playerFilter,
    sortByName: false // [FIX] Admin.js에서 정한 중요도 순서(찜>대여가능)를 유지하기 위해 이름 정렬 끔
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
    showConfirmModal(
      "게임 정보 수정",
      `[${formData.name}] 정보를 수정하시겠습니까?`,
      async () => {
        try {
          await editGame({ game_id: targetGame.id, ...formData });
          showToast("✅ 수정되었습니다.", { type: "success" });
          setIsEditModalOpen(false);
          onReload();
        } catch (e) {
          showToast("수정 실패: " + e, { type: "error" });
        }
      }
    );
  };

  // 현장 대여 핸들러 추가
  const handleDirectRent = async (game) => {
    // 1. 대여자 이름 입력받기
    const promptMsg = TEXTS.ADMIN_RENT_PROMPT.replace("{gameName}", game.name);
    const renterName = prompt(promptMsg);
    if (!renterName || renterName.trim() === "") return;

    // 2. 일치하는 유저들 찾기
    const candidates = findMatchingUsers(renterName);

    // [CASE 1] 2명 이상 -> 선택 모달 띄우기
    if (candidates.length > 1) {
      setUserSelectModal({
        isOpen: true,
        candidates: candidates,
        game: game,
        renterNameInput: renterName
      });
      return;
    }

    // [CASE 2] 1명 -> 자동 선택 후 컨펌
    if (candidates.length === 1) {
      proceedRentWithUser(game, renterName, candidates[0]);
      return;
    }

    // [CASE 3] 0명 -> 수기 대여 컨펌
    proceedRentWithUser(game, renterName, null);
  };

  // 실제 대여 처리 (컨펌 포함)
  const proceedRentWithUser = (game, renterNameInput, matchedUser) => {
    let confirmMsg = TEXTS.ADMIN_RENT_CONFIRM_HeadsUp
      .replace("{gameName}", game.name)
      .replace("{renterName}", renterNameInput);

    if (matchedUser) {
      confirmMsg += TEXTS.ADMIN_RENT_CONFIRM_SUCCESS.replace("{userId}", matchedUser.id);
      confirmMsg += `\n(이름: ${matchedUser.name}, 학번: ${matchedUser.student_id || '-'}, 전화: ${matchedUser.phone || '-'})`;
    } else {
      confirmMsg += TEXTS.ADMIN_RENT_CONFIRM_FAIL;
      confirmMsg += "\n(비회원 수기 대여로 진행합니다)";
    }

    showConfirmModal(
      "현장 대여 확인",
      confirmMsg,
      async () => {
        try {
          // matchedUser가 있으면 id 사용, 없으면 null
          const res = await adminUpdateGame(game.id, "대여중", renterNameInput, matchedUser?.id);
          if (res && res.status === "success") {
            showToast(TEXTS.ADMIN_RENT_SUCCESS, { type: "success" });
            onReload();
          } else {
            showToast("오류 발생: " + (res.message || "응답 없음"), { type: "error" });
          }
        } catch (e) {
          console.error(e);
          showToast("처리 실패 (콘솔 확인): " + e, { type: "error" });
        }
      },
      "warning"
    );
  };



  const handleStatusChange = async (gameId, newStatus, gameName) => {
    let msg = `[${gameName}] 상태를 '${newStatus}'(으)로 변경하시겠습니까?`;
    if (newStatus === "대여중") msg = "현장 수령 확인하시겠습니까?";
    if (newStatus === "대여가능") msg = "반납 처리하시겠습니까?";

    showConfirmModal(
      "상태 변경",
      msg,
      async () => {
        try {
          await adminUpdateGame(gameId, newStatus);
          showToast("처리되었습니다.", { type: "success" });
          onReload();
        } catch (e) {
          showToast("오류 발생: " + e, { type: "error" });
        }
      }
    );
  };

  // 4. 스마트 반납 (일괄 처리 로직)
  const handleReturn = async (game) => {
    const renterName = game.renter;
    const sameUserRentals = games.filter(g => g.status === "대여중" && g.renter === renterName);
    const count = sameUserRentals.length;

    if (count <= 1) {
      showConfirmModal(
        "반납 확인",
        `[${game.name}] 반납 처리하시겠습니까?`,
        async () => {
          // [UPDATED] 정확한 반납을 위해 대여자 정보 전달
          await adminUpdateGame(game.id, "대여가능", game.renter, game.renterId);
          showToast("반납되었습니다.", { type: "success" });
          onReload();
        }
      );
      return;
    }

    showConfirmModal(
      "일괄 반납 처리",
      `💡 [${renterName}] 님이 현재 빌려간 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '반납' 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 반납합니다)`,
      async () => {
        await returnGamesByRenter(renterName);
        showToast(`${count}건이 일괄 반납되었습니다.`, { type: "success" });
        onReload();
      },
      "warning"
    );
    // 취소 시 단일 반납은 모달의 취소 버튼으로 처리됨
  };

  // 5. 스마트 수령 (일괄 찜 처리 로직)
  const handleReceive = async (game) => {
    const renterName = game.renter;
    const sameUserDibs = games.filter(g => g.status === "찜" && g.renter === renterName);
    const count = sameUserDibs.length;

    // [FIX] game.renterId가 있으면 바로 사용, 없으면(수기) 이름 검색
    const userId = game.renterId || findUserId(renterName);
    if (count <= 1) {
      showConfirmModal(
        "수령 확인",
        `[${game.name}] 현장 수령 확인하시겠습니까?`,
        async () => {
          await adminUpdateGame(game.id, "대여중", renterName, userId);
          showToast("처리되었습니다.", { type: "success" });
          onReload();
        }
      );
      return;
    }

    showConfirmModal(
      "일괄 수령 처리",
      `💡 [${renterName}] 님이 예약한 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '대여중'으로 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 처리합니다)`,
      async () => {
        await approveDibsByRenter(renterName, userId);
        showToast(`${count}건이 일괄 수령 처리되었습니다.`, { type: "success" });
        onReload();
      },
      "warning"
    );
  };

  const handleDelete = async (game) => {
    showConfirmModal(
      "게임 삭제",
      `[${game.name}] 정말 삭제합니까?\n되돌릴 수 없습니다.`,
      async () => {
        try {
          await deleteGame(game.id);
          showToast("삭제되었습니다.", { type: "success" });
          onReload();
        } catch (e) {
          showToast("삭제 실패", { type: "error" });
        }
      },
      "danger"
    );
  };

  // ⭐ [추가] 로그 보기 핸들러
  const handleShowLogs = async (game) => {
    setLogGameName(game.name);
    setGameLogs([]); // 초기화
    setIsLogModalOpen(true);

    try {
      const res = await fetchGameLogs(game.id);


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
        <button onClick={onReload} style={{ padding: "5px 10px", cursor: "pointer", background: "var(--admin-card-bg)", color: "var(--admin-text-main)", border: "1px solid var(--admin-border)", borderRadius: "5px" }}>🔄 새로고침</button>
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
        <div style={{ textAlign: "center", padding: "40px", color: "var(--admin-text-sub)" }}>데이터를 불러오는 중... ⏳</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredGames.map(game => (
            <div key={game.id} className="admin-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.05em" }}>
                  {game.name}
                  <span style={{ ...styles.statusBadge, background: getStatusColor(game.status) }}>
                    {game.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85em", color: "var(--admin-text-sub)", marginTop: "5px", lineHeight: "1.4" }}>
                  <span style={{ marginRight: "10px" }}>{game.renter ? `👤 ${game.renter}` : "대여자 없음"}</span>
                  <span style={{ color: "#e67e22", marginRight: "10px" }}>난이도: {game.difficulty || "-"}</span>
                  <br />
                  태그: <span style={{ color: "var(--admin-primary)" }}>{game.tags || "(없음)"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <button onClick={() => handleShowLogs(game)} style={{ ...actionBtnStyle("#2c3e50"), color: "#eee", border: "1px solid #555" }} title="이력 조회">📜</button>
                <button onClick={() => openEditModal(game)} style={actionBtnStyle("#8e44ad")}>✏️ 수정</button>
                <button onClick={() => handleDelete(game)} style={{ ...actionBtnStyle("transparent"), color: "#e74c3c", border: "1px solid #e74c3c", width: "30px", padding: 0 }}>🗑️</button>

                {/* 상태별 버튼 로직 유지 [IMPROVED] */}
                {game.status === "찜" ? (
                  <>
                    <button onClick={() => handleReceive(game)} style={actionBtnStyle("#2980b9")}>🤝 수령</button>
                    <button onClick={() => handleStatusChange(game.id, "대여가능", game.name)} style={actionBtnStyle("#c0392b")}>🚫 취소</button>
                    {/* [NEW] 찜 상태여도, 다른 재고가 있으면 대여 가능해야 함 */}
                    {/* Reserved 카피가 우선순위라 찜 상태로 보이지만, availableCount가 있으면 대여 버튼 추가 */}
                    {game.availableCount > 0 && (
                      <button onClick={() => handleDirectRent(game)} style={{ ...actionBtnStyle("var(--admin-card-bg)"), marginLeft: "5px" }}>✋ 현장대여</button>
                    )}
                  </>
                ) : game.status !== "대여가능" ? (
                  <>
                    <button onClick={() => handleReturn(game)} style={actionBtnStyle("#27ae60")}>↩️ 반납</button>
                    <button onClick={() => handleStatusChange(game.id, "분실", game.name)} style={actionBtnStyle("#7f8c8d")}>⚠️ 분실</button>
                    {/* [NEW] 대여중 상태여도, 다른 재고가 있으면 대여 가능해야 함 */}
                    {game.availableCount > 0 && (
                      <button onClick={() => handleDirectRent(game)} style={{ ...actionBtnStyle("var(--admin-card-bg)"), marginLeft: "5px" }}>✋ 현장대여</button>
                    )}
                  </>
                ) :
                  <button onClick={() => handleDirectRent(game)} style={actionBtnStyle("var(--admin-card-bg)")}>✋ 현장대여</button>}
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
            <h3 style={{ marginTop: 0, marginBottom: "15px", borderBottom: "1px solid var(--admin-border)", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📜 [{logGameName}] 대여 이력</span>
              <button onClick={() => setIsLogModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2em", cursor: "pointer", color: "var(--admin-text-main)" }}>✖️</button>
            </h3>

            <div style={{ maxHeight: "500px", overflowY: "auto", fontSize: "0.9em" }}>
              {gameLogs.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--admin-text-sub)", padding: "20px" }}>기록이 없습니다.</p>
              ) : (
                <table className="admin-table">
                  <thead style={{ position: "sticky", top: 0, background: "var(--admin-card-bg)", zIndex: 1 }}>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid var(--admin-border)" }}>
                      <th style={{ padding: "10px", width: "130px", color: "var(--admin-text-sub)" }}>날짜</th>
                      <th style={{ padding: "10px", width: "60px", color: "var(--admin-text-sub)", textAlign: "center" }}>행동</th>
                      <th style={{ padding: "10px", color: "var(--admin-text-sub)" }}>내용</th>
                      <th style={{ padding: "10px", width: "150px", color: "var(--admin-text-sub)" }}>대여자 정보</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameLogs.map((log, idx) => {
                      const valStr = String(log.value || "");
                      let mainText = valStr;
                      let userInfo = null;
                      let isNonMember = false;

                      if (valStr.includes("→ [")) {
                        const parts = valStr.split("→ [");
                        mainText = parts[0].trim();
                        userInfo = parts[1].replace("]", "").trim();
                      } else if (log.type === "RENT" && valStr.trim() !== "" && valStr !== "일괄처리") {
                        mainText = "현장 대여 (수기)";
                        userInfo = valStr;
                        isNonMember = true;
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                          <td style={{ padding: "10px 5px", color: "var(--admin-text-sub)", fontSize: "0.85em", minWidth: "80px" }}>
                            {(() => {
                              const dateStr = String(log.date || "");
                              try {
                                const date = new Date(dateStr);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleString('ko-KR', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: false
                                  });
                                }
                              } catch (e) { }
                              return dateStr.replace(/:[0-9]{2}$/, "").replace("AM", "").replace("PM", "").trim();
                            })()}
                          </td>
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
                          <td style={{ padding: "10px 5px", color: "var(--admin-text-main)" }}>
                            {mainText}
                          </td>
                          <td style={{ padding: "10px 5px" }}>
                            {userInfo ? (
                              <div style={{
                                fontSize: "0.9em",
                                color: isNonMember ? "#ccc" : "#0984e3",
                                fontWeight: "600",
                                background: isNonMember ? "#333" : "rgba(9, 132, 227, 0.1)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                display: "inline-block"
                              }}>
                                👤 {userInfo}
                              </div>
                            ) : (
                              <span style={{ color: "#555", fontSize: "0.8em" }}>-</span>
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

      {/* [NEW] Confirm 모달 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
      {/* [NEW] 유저 선택 모달 */}
      {userSelectModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>👥 동명이인 선택</h3>
            <p>검색된 사용자가 여러 명입니다. 대여할 유저를 선택해주세요.</p>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #eee", borderRadius: "8px" }}>
              {userSelectModal.candidates.map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    setUserSelectModal({ ...userSelectModal, isOpen: false });
                    proceedRentWithUser(userSelectModal.game, userSelectModal.renterNameInput, u);
                  }}
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fff"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                >
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{u.name}</div>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>학번: {u.student_id || "-"}</div>
                  </div>
                  <div style={{ fontSize: "0.9em", color: "#888" }}>{u.phone || "전화번호 없음"}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  setUserSelectModal({ ...userSelectModal, isOpen: false });
                  // 수기 대여로 진행할지 여부는 선택사항이지만, 보통 취소가 맞음
                  // 여기서는 "비회원(수기)으로 진행" 옵션을 줄 수도 있지만
                  // 일단 그냥 취소하거나, 수기 대여 버튼을 따로 두는게 좋음.
                  // 간편하게 "수기 대여로 진행" 버튼 추가
                  proceedRentWithUser(userSelectModal.game, userSelectModal.renterNameInput, null);
                }}
                style={{ padding: "8px 12px", border: "1px solid #ddd", background: "white", borderRadius: "6px", cursor: "pointer" }}
              >
                비회원(수기)으로 대여
              </button>
              <button
                onClick={() => setUserSelectModal({ ...userSelectModal, isOpen: false })}
                style={{ padding: "8px 15px", background: "#666", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = (bgColor) => ({ padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", background: bgColor, color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" });
const styles = {
  // admin-card class replaces styles.card
  statusBadge: { marginLeft: "8px", fontSize: "0.8em", padding: "2px 8px", borderRadius: "12px", color: "white" },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
  },
  modalContent: { background: "var(--admin-card-bg)", color: "var(--admin-text-main)", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "800px", boxShadow: "0 5px 20px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" },
  cancelBtn: { padding: "10px 20px", background: "#444", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#ccc" }
};

export default DashboardTab;