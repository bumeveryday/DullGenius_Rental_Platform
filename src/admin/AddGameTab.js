// src/admin/AddGameTab.js
import { useState } from 'react';
import { searchNaver, addGame } from '../api';
import GameFormModal from './GameFormModal'; // 공통 모달 임포트
import { useToast } from '../contexts/ToastContext'; // [NEW]

function AddGameTab({ onGameAdded }) {
  const { showToast } = useToast(); // [NEW]
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

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
    // 네이버 데이터 -> 우리 포맷으로 변환
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
  const handleSaveGame = async (formData) => {
    if (window.confirm(`[${formData.name}] 추가하시겠습니까?`)) {
      try {
        await addGame({ id: Date.now(), ...formData, location: "" });
        showToast("✅ 추가되었습니다!", { type: "success" });
        setIsModalOpen(false);
        setResults([]);
        setKeyword("");
        if (onGameAdded) onGameAdded();
      } catch (e) {
        showToast("추가 실패: " + e, { type: "error" });
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          value={keyword} onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="네이버 검색 (예: 스플렌더)" style={styles.input}
        />
        <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
      </div>

      {loading && <div>검색 중... ⏳</div>}

      <div style={styles.gridContainer}>
        {results.map((item) => (
          <div key={item.productId} style={styles.card}>
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
    </div>
  );
}

const styles = {
  input: { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "1em" },
  searchBtn: { padding: "10px 20px", background: "#333", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "15px" },
  card: { border: "1px solid #eee", padding: "10px", borderRadius: "10px", textAlign: "center", background: "white" },
  cardImage: { width: "100%", height: "120px", objectFit: "contain", marginBottom: "10px" },
  cardTitle: { fontSize: "0.9em", height: "40px", overflow: "hidden", marginBottom: "10px" },
  selectBtn: { width: "100%", padding: "10px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }
};

export default AddGameTab;