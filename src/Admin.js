// src/Admin.js
// 최종 수정일: 2025.12.02
// 설명: 관리자 페이지 (대여 현황, 게임 추가, 홈페이지 설정, 삭제 기능 포함)

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchNaver, addGame, fetchGames, adminUpdateGame, updateGameTags, fetchConfig, saveConfig, deleteGame } from './api';

function Admin() {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'add' | 'config'
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);

  // --- 데이터 로딩 ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [gamesData, configData] = await Promise.all([fetchGames(), fetchConfig()]);
      
      // 상태별 정렬 (찜 -> 대여중 -> 분실 -> 대여가능)
      const priority = { "찜": 1, "대여중": 2, "분실": 3, "대여가능": 4 };
      const sortedGames = gamesData.sort((a, b) => {
        const pA = priority[a.status] || 4;
        const pB = priority[b.status] || 4;
        return pA - pB;
      });

      setGames(sortedGames);
      
      // 설정값 적용
      if (configData && configData.length > 0) {
        setConfig(configData);
      } else {
        // 기본값 세팅 (데이터가 없을 경우)
        setConfig([
          { key: "btn1", label: "🐣\n입문 추천", value: "#입문", color: "#2ecc71" },
          { key: "btn2", label: "🧠\n전략 게임", value: "#전략", color: "#e67e22" },
          { key: "btn3", label: "🕵️‍♂️\n추리/머더", value: "#추리", color: "#9b59b6" },
          { key: "btn4", label: "🎉\n파티 게임", value: "#파티", color: "#f1c40f" }
        ]);
      }
    } catch (e) {
      console.error(e);
      alert("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- 액션 핸들러들 ---

  // 상태 변경 (반납/수령/분실)
  const handleStatusChange = async (gameId, newStatus, gameName) => {
    let message = `[${gameName}] 상태를 '${newStatus}'(으)로 변경하시겠습니까?`;
    if (newStatus === "대여중") message = `[${gameName}] 현장 수령 확인하시겠습니까?\n(상태가 '대여중'으로 변경됩니다.)`;
    if (newStatus === "대여가능") message = `[${gameName}] 반납(또는 취소) 처리하시겠습니까?`;
    if (newStatus === "분실") message = `⚠️ [${gameName}] 분실 처리하시겠습니까?`;

    if (!window.confirm(message)) return;
    
    await adminUpdateGame(gameId, newStatus);
    alert("처리되었습니다.");
    loadData();
  };

  // 태그 수정
  const handleTagChange = async (game, currentTags) => {
    const newTags = prompt(
      `[${game.name}] 태그를 입력하세요 (공백으로 구분)\n예: #커플 #신작 #파티`, 
      currentTags || ""
    );
    if (newTags === null) return; 

    await updateGameTags(game.id, newTags);
    alert("태그가 수정되었습니다.");
    loadData();
  };

  // 게임 영구 삭제
  const handleDelete = async (game) => {
    if (!window.confirm(`⚠️ 경고: [${game.name}] 게임을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    if (!window.confirm("정말 삭제합니까?")) return;

    await deleteGame(game.id);
    alert("삭제되었습니다.");
    loadData();
  };

  // 설정값 변경 (입력창)
  const handleConfigChange = (idx, field, value) => {
    const newConfig = [...config];
    newConfig[idx][field] = value;
    setConfig(newConfig);
  };

  // 설정 저장
  const handleConfigSave = async () => {
    if (!window.confirm("메인 페이지 설정을 저장하시겠습니까?")) return;
    
    try {
      const response = await saveConfig(config);
      
      // ⭐ 서버 응답 확인 (성공일 때만 알림)
      if (response && response.status === "success") {
        alert("✅ 저장되었습니다! 메인 페이지를 새로고침하면 적용됩니다.");
      } else {
        // 실패 원인 알려주기
        alert(`❌ 저장 실패: ${response.message || "알 수 없는 오류"}\n\n(팁: Apps Script '새 버전 배포'를 했는지 확인하세요!)`);
      }
    } catch (e) {
      alert("통신 오류가 발생했습니다.");
      console.error(e);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", paddingBottom: "100px" }}>
      
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "15px" }}>
        <h2 style={{ margin: 0 }}>🔒 관리자 페이지</h2>
        <Link to="/" style={{ textDecoration: "none", color: "#333", border: "1px solid #ccc", padding: "8px 15px", borderRadius: "8px", fontSize: "0.9em", display: "flex", alignItems: "center", gap: "5px", background: "white" }}>
          🏠 메인으로 돌아가기
        </Link>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid #ddd", paddingBottom: "10px", overflowX: "auto" }}>
        <button onClick={() => setActiveTab("dashboard")} style={tabStyle(activeTab === "dashboard")}>📋 대여 현황 / 태그</button>
        <button onClick={() => setActiveTab("add")} style={tabStyle(activeTab === "add")}>➕ 게임 추가</button>
        <button onClick={() => setActiveTab("config")} style={tabStyle(activeTab === "config")}>🎨 홈페이지 설정</button>
      </div>

      {/* --- TAB 1: 대여 현황 --- */}
      {activeTab === "dashboard" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3>🚨 게임 관리 (총 {games.length}개)</h3>
            <button onClick={loadData} style={{ padding: "5px 10px", cursor: "pointer", background:"#f8f9fa", border:"1px solid #ddd", borderRadius:"5px" }}>🔄 새로고침</button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {games.map(game => (
              <div key={game.id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "10px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap:"wrap", gap:"10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "1.05em" }}>
                    {game.name} 
                    <span style={{ marginLeft: "8px", fontSize: "0.8em", padding: "2px 8px", borderRadius: "12px", background: getStatusColor(game.status), color:"white" }}>
                      {game.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85em", color: "#666", marginTop: "5px", lineHeight: "1.4" }}>
                    <span style={{ marginRight: "10px" }}>{game.renter ? `👤 ${game.renter}` : "대여자 없음"}</span>
                    {game.due_date && <span style={{ color: "#e67e22", marginRight: "10px" }}>📅 {new Date(game.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                    <br/>
                    태그: <span style={{color:"#3498db"}}>{game.tags || "(없음)"}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "5px" }}>
                  <button onClick={() => handleTagChange(game, game.tags)} style={actionBtnStyle("#9b59b6")}>🏷️ 태그</button>
                  <button onClick={() => handleDelete(game)} style={{...actionBtnStyle("#fff"), color:"#e74c3c", border:"1px solid #e74c3c", width:"30px", padding:0}} title="삭제">🗑️</button>
                  {game.status === "찜" ? (
                    <>
                      <button onClick={() => handleStatusChange(game.id, "대여중", game.name)} style={actionBtnStyle("#3498db")}>🤝 수령</button>
                      <button onClick={() => handleStatusChange(game.id, "대여가능", game.name)} style={actionBtnStyle("#e74c3c")}>🚫 취소</button>
                    </>
                  ) : game.status !== "대여가능" ? (
                    <>
                      <button onClick={() => handleStatusChange(game.id, "대여가능", game.name)} style={actionBtnStyle("#2ecc71")}>↩️ 반납</button>
                      <button onClick={() => handleStatusChange(game.id, "분실", game.name)} style={actionBtnStyle("#95a5a6")}>⚠️ 분실</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: 게임 추가 --- */}
      {activeTab === "add" && <AddGameSection />}

      {/* --- TAB 3: 홈페이지 설정 (개선됨!) --- */}
      {activeTab === "config" && (
        <div>
          <h3>🎨 메인 추천 버튼 설정</h3>
          <div style={{ background: "#e8f4fd", padding: "15px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.9em", color: "#2c3e50", lineHeight: "1.6" }}>
            <strong>💡 설정 가이드</strong>
            <ul style={{ margin: "5px 0 0 20px", padding: 0 }}>
              <li><strong>버튼 이름:</strong> 이모지와 텍스트를 적으세요. 줄바꿈은 <code>\n</code>을 입력하세요. (예: 🐣\n입문 추천)</li>
              <li><strong>검색어:</strong> 버튼 클릭 시 검색될 <strong>#태그</strong>를 정확히 적으세요.</li>
              <li><strong>색상:</strong> 색상표를 클릭하여 버튼 왼쪽의 포인트 컬러를 변경하세요.</li>
            </ul>
          </div>

          <div style={{ display: "grid", gap: "15px", marginBottom: "30px" }}>
            {config.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "15px", alignItems: "center", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                {/* 1. 색상 선택 */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: item.color, border: "3px solid #f0f0f0", marginBottom: "5px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}></div>
                  <input type="color" value={item.color} onChange={(e) => handleConfigChange(idx, 'color', e.target.value)} style={{ width: "40px", height: "30px", padding: 0, border: "none", background: "none", cursor: "pointer" }} />
                </div>

                {/* 2. 텍스트 입력 */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85em", color: "#888", marginBottom: "5px", fontWeight: "bold" }}>버튼 이름</label>
                    <input value={item.label} onChange={(e) => handleConfigChange(idx, 'label', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85em", color: "#888", marginBottom: "5px", fontWeight: "bold" }}>연결 태그 (#)</label>
                    <input value={item.value} onChange={(e) => handleConfigChange(idx, 'value', e.target.value)} placeholder="#태그" style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleConfigSave} style={{ width: "100%", padding: "15px", background: "#3498db", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1em", cursor: "pointer", boxShadow: "0 4px 12px rgba(52, 152, 219, 0.4)", transition: "transform 0.2s" }}>
            💾 설정 저장하고 적용하기
          </button>
        </div>
      )}
    </div>
  );
}

// --- 하위 컴포넌트: 게임 추가 폼 ---
function AddGameSection() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", category: "보드게임", players: "2~4인", tags: "", bggId: "", image: "", naverId: "" });

  const handleSearch = async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const data = await searchNaver(keyword);
      if (data.items) setResults(data.items);
      else alert("결과 없음");
    } catch (e) { alert("오류"); }
    setLoading(false);
  };

  const openAddModal = (item) => {
    setFormData({
      name: item.title.replace(/<[^>]*>?/g, ''),
      category: "보드게임", players: "2~4인", tags: "", bggId: "", image: item.image, naverId: item.productId
    });
    setIsModalOpen(true);
  };

  const submitGame = async () => {
    if (!formData.name) return alert("이름 필수");
    if (window.confirm("추가하시겠습니까?")) {
      await addGame({ id: Date.now(), ...formData, location: "" });
      alert("✅ 추가되었습니다!");
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder="네이버 검색 (예: 스플렌더)" style={inputStyle} />
        <button onClick={handleSearch} style={{ padding: "10px 20px", background: "#333", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>검색</button>
      </div>
      {loading && <div>검색 중...</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "15px" }}>
        {results.map((item) => (
          <div key={item.productId} style={{ border: "1px solid #eee", padding: "10px", borderRadius: "10px", textAlign: "center", background:"white" }}>
            <img src={item.image} alt="cover" style={{ width: "100%", height: "120px", objectFit: "contain", marginBottom:"10px" }} />
            <div style={{ fontSize: "0.9em", height: "40px", overflow: "hidden", marginBottom: "10px" }} dangerouslySetInnerHTML={{ __html: item.title }} />
            <button onClick={() => openAddModal(item)} style={{ width: "100%", padding: "10px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>선택</button>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "450px", boxShadow: "0 5px 20px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{marginTop:0, marginBottom:"20px"}}>📝 게임 정보 입력</h3>
            <div style={{marginBottom:"15px"}}><label style={{fontWeight:"bold", display:"block"}}>이름</label><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} style={inputStyle} /></div>
            <div style={{marginBottom:"15px"}}><label style={{fontWeight:"bold", display:"block"}}>카테고리</label><select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} style={inputStyle}><option>보드게임</option><option>머더미스터리</option><option>TRPG</option><option>TCG</option></select></div>
            <div style={{marginBottom:"15px"}}><label style={{fontWeight:"bold", display:"block"}}>인원</label><input value={formData.players} onChange={e=>setFormData({...formData, players: e.target.value})} style={inputStyle} /></div>
            <div style={{marginBottom:"15px"}}><label style={{fontWeight:"bold", display:"block"}}>태그</label><input value={formData.tags} onChange={e=>setFormData({...formData, tags: e.target.value})} placeholder="#태그" style={inputStyle} /></div>
            <div style={{marginBottom:"20px"}}><label style={{fontWeight:"bold", display:"block"}}>BGG ID</label><input value={formData.bggId} onChange={e=>setFormData({...formData, bggId: e.target.value})} style={inputStyle} /></div>
            <div style={{display:"flex", gap:"10px"}}><button onClick={() => setIsModalOpen(false)} style={{flex:1, padding:"12px", background:"#ddd", border:"none", borderRadius:"8px", cursor:"pointer"}}>취소</button><button onClick={submitGame} style={{flex:1, padding:"12px", background:"#3498db", color:"white", border:"none", borderRadius:"8px", cursor:"pointer"}}>저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

const tabStyle = (isActive) => ({ padding: "10px 20px", border: "none", background: isActive ? "#333" : "white", color: isActive ? "white" : "#555", borderRadius: "25px", cursor: "pointer", fontWeight: "bold", fontSize: "0.95rem", whiteSpace: "nowrap", boxShadow: isActive ? "0 2px 5px rgba(0,0,0,0.2)" : "none", transition: "all 0.2s" });
const actionBtnStyle = (bgColor) => ({ padding: "6px 12px", border: "none", background: bgColor, color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" });
const inputStyle = { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "1em" };
const getStatusColor = (s) => (s==="대여가능"?"#2ecc71":s==="찜"?"#f1c40f":s==="대여중"?"#3498db":"#95a5a6");

export default Admin;