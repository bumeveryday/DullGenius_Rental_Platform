// src/admin/AddGameTab.js
import { useState } from 'react';
import { searchNaver, addGame } from '../api';
import GameFormModal from './GameFormModal';
import ConfirmModal from '../components/ConfirmModal'; // [NEW]
import { useToast } from '../contexts/ToastContext';

function AddGameTab({ onGameAdded }) {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  // 컨펌 모달 상태
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "info"
  });

  const showConfirmModal = (title, message, onConfirm, type = "info") => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSearch = async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const data = await searchNaver(keyword);
      if (data.items) setResults(data.items);
      else { showToast("결과 없음", { type: "info" }); setResults([]); }
    } catch (e) { showToast("오류", { type: "error" }); } finally { setLoading(false); }
  };

  // 검색 결과 선택 시 모달 열기
  const openAddModal = (item) => {
    const initialData = {
      name: item.title.replace(/<[^>]*>?/g, ''),
      category: "보드게임",
      players: "2~4인",
      tags: "",
      difficulty: "",
      genre: "",
      image: item.image,
      naverId: item.productId
    };
    setSelectedGame(initialData);
    setIsModalOpen(true);
  };

  // 모달에서 '저장' 버튼 눌렀을 때 실행
  const handleSaveGame = (formData) => {
    showConfirmModal(
      "게임 추가",
      `[${formData.name}] 추가하시겠습니까?`,
      async () => {
        try {
          // id는 DB에서 생성되므로 제거하고 보냄
          const { id, ...rest } = formData;
          await addGame({ ...rest, location: "" });
          showToast("✅ 추가되었습니다!", { type: "success" });
          setIsModalOpen(false);
          setResults([]);
          setKeyword("");
          if (onGameAdded) onGameAdded();
        } catch (e) {
          console.error("게임 추가 실패:", e);
          showToast("추가 실패: " + (e.message || e), { type: "error" });
        }
      }
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          value={keyword} onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="네이버 검색 (예: 스플렌더)"
          className="admin-input"
          style={{ width: "100%" }}
        />
        <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
        <button
          onClick={() => openAddModal({ title: "새 게임", image: "", productId: "manual" })}
          style={{ ...styles.searchBtn, background: "#2ecc71", marginLeft: "auto" }}
        >
          ➕ 직접 추가
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "20px", color: "var(--admin-text-sub)" }}>네이버에서 검색 중... ⏳</div>}

      {!loading && results.length === 0 && keyword && (
        <div style={{ textAlign: "center", color: "var(--admin-text-sub)", padding: "20px" }}>
          검색 결과가 없습니다. '직접 추가' 버튼을 사용해보세요.
        </div>
      )}

      <div style={styles.gridContainer}>
        {results.map((item) => (
          <div key={item.productId} className="admin-card" style={{ padding: "10px", textAlign: "center" }}>
            <img src={item.image} alt="cover" style={styles.cardImage} />
            <div style={styles.cardTitle} dangerouslySetInnerHTML={{ __html: item.title }} />
            <button onClick={() => openAddModal(item)} style={styles.selectBtn}>선택</button>
          </div>
        ))}
      </div>

      {/* 공통 모달 사용 */}
      <GameFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedGame}
        onSubmit={handleSaveGame}
        title="📝 새 게임 추가"
      />

      {/* Confirm 모달 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}

const styles = {
  // input style removed in favor of className
  searchBtn: { padding: "10px 20px", background: "#333", color: "white", border: "1px solid #555", borderRadius: "8px", cursor: "pointer" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "15px" },
  cardImage: { width: "100%", height: "120px", objectFit: "contain", marginBottom: "10px" },
  cardTitle: { fontSize: "0.9em", height: "40px", overflow: "hidden", marginBottom: "10px", color: "var(--admin-text-main)" },
  selectBtn: { width: "100%", padding: "10px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }
};

export default AddGameTab;