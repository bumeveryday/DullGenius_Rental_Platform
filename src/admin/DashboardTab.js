// src/admin/DashboardTab.js
import { useState } from 'react';
import { adminUpdateGame, deleteGame, approveDibsByRenter, returnGamesByRenter, editGame, updateGameTags } from '../api';
import GameFormModal from './GameFormModal'; // 공통 모달 임포트

function DashboardTab({ games, loading, onReload }) {
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetGame, setTargetGame] = useState(null);

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
        alert("✅ 수정되었습니다.");
        setIsEditModalOpen(false);
        onReload();
      } catch (e) {
        alert("수정 실패: " + e);
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
      alert("처리되었습니다.");
      onReload();
    } catch (e) {
      alert("오류 발생: " + e);
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
        alert("반납되었습니다.");
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 현재 빌려간 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '반납' 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 반납합니다)`)) {
      await returnGamesByRenter(renterName);
      alert(`${count}건이 일괄 반납되었습니다.`);
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여가능");
      alert("반납되었습니다.");
      onReload();
    }
  };

  // 5. 스마트 수령 (일괄 찜 처리 로직)
  const handleReceive = async (game) => {
    const renterName = game.renter;
    const sameUserDibs = games.filter(g => g.status === "찜" && g.renter === renterName);
    const count = sameUserDibs.length;

    if (count <= 1) {
      if (window.confirm(`[${game.name}] 현장 수령 확인하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여중");
        alert("처리되었습니다.");
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 예약한 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '대여중'으로 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 처리합니다)`)) {
      await approveDibsByRenter(renterName);
      alert(`${count}건이 일괄 수령 처리되었습니다.`);
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여중");
      alert("처리되었습니다.");
      onReload();
    }
  };

  // 6. 게임 삭제
  const handleDelete = async (game) => {
    if (!window.confirm(`[${game.name}] 정말 삭제합니까?\n되돌릴 수 없습니다.`)) return;
    try {
      await deleteGame(game.id);
      alert("삭제되었습니다.");
      onReload();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3>🚨 게임 관리 (총 {games.length}개)</h3>
        <button onClick={onReload} style={{ padding: "5px 10px", cursor: "pointer", background:"#f8f9fa", border:"1px solid #ddd", borderRadius:"5px" }}>🔄 새로고침</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>데이터를 불러오는 중... ⏳</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {games.map(game => (
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
                  <br/>
                  태그: <span style={{color:"#3498db"}}>{game.tags || "(없음)"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <button onClick={() => openEditModal(game)} style={actionBtnStyle("#9b59b6")}>✏️ 수정</button>
                <button onClick={() => handleDelete(game)} style={{...actionBtnStyle("#fff"), color:"#e74c3c", border:"1px solid #e74c3c", width:"30px", padding:0}}>🗑️</button>
                
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
                ) : null}
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
    </div>
  );
}

const getStatusColor = (s) => (s==="대여가능"?"#2ecc71":s==="찜"?"#f1c40f":s==="대여중"?"#3498db":"#95a5a6");
const actionBtnStyle = (bgColor) => ({ padding: "6px 12px", border: "none", background: bgColor, color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" });
const styles = {
  card: { border: "1px solid #ddd", padding: "15px", borderRadius: "10px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" },
  statusBadge: { marginLeft: "8px", fontSize: "0.8em", padding: "2px 8px", borderRadius: "12px", color: "white" }
};

export default DashboardTab;