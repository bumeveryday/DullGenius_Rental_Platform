// src/components/FilterBar.js
// 설명: 유저/관리자 공통 필터링 UI 컴포넌트

import React from 'react';

function FilterBar({
  inputValue, setInputValue,
  selectedCategory, setSelectedCategory,
  difficultyFilter, setDifficultyFilter,
  playerFilter, setPlayerFilter,
  onlyAvailable, setOnlyAvailable,
  categories,
  onReset,
  // 관리자 전용 Props
  isAdmin = false,
  renterFilter, setRenterFilter,
  hideSearch = false
}) {
  return (
    <div
      className={isAdmin ? "filter-bar-container admin-filter-bar" : "filter-bar-container"}
      style={isAdmin ? {} : styles.container}
    >

      {/* 1. 검색창 (게임 이름/태그) */}
      {!hideSearch && (
        <input
          type="text"
          placeholder="🔍 검색 (태그는 #)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={isAdmin ? "admin-input search-input" : ""}
          style={isAdmin ? {} : styles.inputSearch}
        />
      )}

      {/* 2. [관리자 전용] 대여자 검색 */}
      {isAdmin && (
        <input
          type="text"
          placeholder="👤 대여자 이름"
          value={renterFilter}
          onChange={(e) => setRenterFilter(e.target.value)}
          className="admin-input search-input"
          style={isAdmin ? {} : { ...styles.inputSearch, borderColor: "#3498db", background: "#f0f9ff" }}
        />
      )}

      {/* 3. 카테고리 선택 */}
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className={isAdmin ? "admin-select" : ""}
        style={isAdmin ? {} : styles.select}
      >
        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>

      {/* 4. 난이도 선택 */}
      <select
        value={difficultyFilter}
        onChange={(e) => setDifficultyFilter(e.target.value)}
        className={isAdmin ? "admin-select" : ""}
        style={isAdmin ? {} : styles.select}
      >
        <option value="전체">난이도 전체</option>
        <option value="입문">🐣 입문 (0~2점)</option>
        <option value="초중급">🎲 초중급 (2~3점)</option>
        <option value="전략">🧠 전략 (3점+)</option>
      </select>

      {/* 5. 인원수 선택 */}
      <select
        value={playerFilter}
        onChange={(e) => setPlayerFilter(e.target.value)}
        className={isAdmin ? "admin-select" : ""}
        style={isAdmin ? { fontWeight: playerFilter !== "all" ? "bold" : "normal", color: playerFilter !== "all" ? "var(--admin-primary)" : "inherit" } : { ...styles.select, fontWeight: playerFilter !== "all" ? "bold" : "normal", color: playerFilter !== "all" ? "#3498db" : "black" }}
      >
        <option value="all">인원수 전체</option>
        <option value="2">2인</option>
        <option value="3">3인</option>
        <option value="4">4인</option>
        <option value="5">5인</option>
        <option value="6+">6인 이상</option>
        <option value="8+">8인 이상</option>
      </select>

      {/* 6. 대여 가능만 보기 체크박스 */}
      <label style={isAdmin ? { color: "var(--admin-text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", margin: "0 10px" } : styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={onlyAvailable}
          onChange={(e) => setOnlyAvailable(e.target.checked)}
          style={{ transform: "scale(1.2)" }}
        />
        <span style={{ fontWeight: onlyAvailable ? "bold" : "normal" }}>대여 가능만</span>
      </label>

      {/* 7. 초기화 버튼 */}
      <button onClick={onReset} style={styles.resetBtn}>
        🔄 초기화
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: "#f8f9fa", padding: "15px", borderRadius: "15px", marginBottom: "20px",
    display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "center",
    border: "1px solid #eee"
  },
  inputSearch: { padding: "10px 15px", borderRadius: "20px", border: "1px solid #ddd", width: "180px" },
  select: { padding: "10px", borderRadius: "10px", border: "1px solid #ddd", cursor: "pointer" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", userSelect: "none", margin: "0 10px" },
  resetBtn: { padding: "10px 15px", background: "#e74c3c", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }
};

export default FilterBar;