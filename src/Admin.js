// src/Admin.js
// 최종 수정일: 2025.12.03
// 설명: 관리자 페이지 (암호 잠금 기능 추가됨)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchNaver, addGame, fetchGames, adminUpdateGame, updateGameTags, fetchConfig, saveConfig, deleteGame, approveDibsByRenter, returnGamesByRenter, verifyAdminPassword } from './api';

function Admin() {


  // ⭐ [NEW] 인증 상태 (false: 잠금, true: 해제)
  // 세션 스토리지(SessionStorage)를 써서 새로고침해도 로그인 유지 (브라우저 끄면 삭제됨)
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("admin_auth") === "true"
  );
  const [inputPassword, setInputPassword] = useState("");

  //로그인 핸들러 (서버 통신)
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!inputPassword) return alert("암호를 입력하세요.");

    try {
      // 서버에 비밀번호 확인 요청
      const res = await verifyAdminPassword(inputPassword);
      
      if (res.status === "success") {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
        alert("로그인 되었습니다."); // (선택사항)
      } else {
        alert("암호가 틀렸습니다.");
        setInputPassword("");
      }
    } catch (error) {
      alert("로그인 서버 오류: " + error);
    }
  };

  // --- 기존 상태 관리 ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 데이터 로딩 ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [gamesData, configData] = await Promise.all([fetchGames(), fetchConfig()]);
      const priority = { "찜": 1, "대여중": 2, "분실": 3, "대여가능": 4 };
      const sortedGames = gamesData.sort((a, b) => (priority[a.status] || 4) - (priority[b.status] || 4));
      setGames(sortedGames);
      if (configData?.length) setConfig(configData);
    } catch (e) { alert("로딩 에러"); } finally { setLoading(false); }
  };

  // 인증되었을 때만 데이터 로드
  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  // ⭐ [NEW] 로그아웃 핸들러
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
    alert("로그아웃 되었습니다.");
  };

  // ============================================================
  // 🔒 [잠금 화면] 인증 안 됐으면 이것만 보여줌
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", textAlign: "center" }}>
        <h2 style={{ fontSize: "2em", marginBottom: "20px" }}>🔒 관리자 접근 제한</h2>
        <p style={{ color: "#666", marginBottom: "30px" }}>관리자 암호를 입력해주세요.</p>
        <form onSubmit={handleLogin} style={{ display: "flex", gap: "10px" }}>
          <input 
            type="password" 
            value={inputPassword} 
            onChange={(e) => setInputPassword(e.target.value)} 
            placeholder="암호 입력" 
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1em" }}
            autoFocus
          />
          <button type="submit" style={{ padding: "12px 20px", background: "#333", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
            확인
          </button>
        </form>
        <Link to="/" style={{ marginTop: "30px", color: "#999", textDecoration: "underline", fontSize: "0.9em" }}>← 메인으로 돌아가기</Link>
      </div>
    );
  }

  // ============================================================
  // 🔓 [관리자 화면] 인증되면 기존 화면 보여줌
  // ============================================================
  
  // 기존 액션 핸들러들 (그대로 유지)
  const handleStatusChange = async (gameId, newStatus, gameName) => {
    let msg = `[${gameName}] 상태를 '${newStatus}'(으)로 변경하시겠습니까?`;
    if (newStatus === "대여중") msg = "현장 수령 확인하시겠습니까?";
    if (newStatus === "대여가능") msg = "반납 처리하시겠습니까?";
    if (!window.confirm(msg)) return;
    await adminUpdateGame(gameId, newStatus);
    alert("처리되었습니다.");
    loadData();
  };

  // ⭐ [스마트 반납] 한 사람의 대여가 여러 개면 물어보기
  const handleReturn = async (game) => {
    const renterName = game.renter;
    
    // 이 사람이 빌려간('대여중') 게임이 몇 개인지 계산
    const sameUserRentals = games.filter(g => g.status === "대여중" && g.renter === renterName);
    const count = sameUserRentals.length;

    // 1. 1개뿐이면 -> 그냥 단건 반납
    if (count <= 1) {
      if (window.confirm(`[${game.name}] 반납 처리하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여가능");
        alert("반납되었습니다.");
        loadData();
      }
      return;
    }

    // 2. 여러 개면 -> 일괄 반납할지 물어봄
    if (window.confirm(`💡 [${renterName}] 님이 현재 빌려간 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '반납' 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 반납합니다)`)) {
      // 확인: 일괄 처리
      await returnGamesByRenter(renterName);
      alert(`${count}건이 일괄 반납되었습니다.`);
      loadData();
    } else {
      // 취소: 단건 처리
      await adminUpdateGame(game.id, "대여가능");
      alert("반납되었습니다.");
      loadData();
    }
  };

  // ⭐ [스마트 수령] 한 사람의 찜이 여러 개면 물어보기
  const handleReceive = async (game) => {
    const renterName = game.renter;
    
    // 이 사람 이름으로 된 '찜'이 몇 개인지 계산
    const sameUserDibs = games.filter(g => g.status === "찜" && g.renter === renterName);
    const count = sameUserDibs.length;

    // 1. 찜이 1개뿐이면 -> 그냥 단건 처리
    if (count <= 1) {
      if (window.confirm(`[${game.name}] 현장 수령 확인하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여중");
        alert("처리되었습니다.");
        loadData();
      }
      return;
    }

    // 2. 찜이 여러 개면 -> 일괄 처리할지 물어봄
    if (window.confirm(`💡 [${renterName}] 님이 예약한 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '대여중'으로 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 처리합니다)`)) {
      // 확인: 일괄 처리
      await approveDibsByRenter(renterName);
      alert(`${count}건이 일괄 수령 처리되었습니다.`);
      loadData();
    } else {
      // 취소: 단건 처리 (원래 하려던 것만)
      await adminUpdateGame(game.id, "대여중");
      alert("처리되었습니다.");
      loadData();
    }
  };

  const handleTagChange = async (game, currentTags) => {
    const newTags = prompt(`[${game.name}] 태그 수정`, currentTags || "");
    if (newTags === null) return;
    await updateGameTags(game.id, newTags);
    alert("수정 완료");
    loadData();
  };

  const handleDelete = async (game) => {
    if (!window.confirm("정말 삭제합니까?")) return;
    await deleteGame(game.id);
    alert("삭제됨");
    loadData();
  };

  
  const handleConfigSave = async () => {
    if (!window.confirm("저장하시겠습니까?")) return;
    await saveConfig(config);
    alert("저장되었습니다.");
  };

  // 1. 설정값 변경 (입력창)
  const handleConfigChange = (idx, field, value) => {
    const newConfig = [...config];
    newConfig[idx][field] = value;
    setConfig(newConfig);
  };

  // 2. ⭐ [NEW] 버튼 추가
  const handleAddConfig = () => {
    const newConfig = [
      ...config,
      {
        key: `btn_${Date.now()}`, // 유니크 키 생성
        label: "✨\n새 버튼",
        value: "#태그입력",
        color: "#95a5a6"
      }
    ];
    setConfig(newConfig);
  };

  // 3. ⭐ [NEW] 버튼 삭제
  const handleDeleteConfig = (idx) => {
    if (config.length <= 1) {
      alert("최소 1개의 버튼은 있어야 합니다.");
      return;
    }
    if (!window.confirm("이 추천 버튼을 삭제하시겠습니까?")) return;
    
    const newConfig = config.filter((_, i) => i !== idx);
    setConfig(newConfig);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", paddingBottom: "100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "15px" }}>
        <h2 style={{ margin: 0 }}>🔓 관리자 페이지</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleLogout} style={{ padding: "8px 15px", background: "#eee", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9em" }}>로그아웃</button>
          <Link to="/" style={{ textDecoration: "none", color: "#333", border: "1px solid #ccc", padding: "8px 15px", borderRadius: "8px", background: "white", fontSize: "0.9em" }}>🏠 메인으로</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid #ddd", paddingBottom: "10px", overflowX: "auto" }}>
        <button onClick={() => setActiveTab("dashboard")} style={tabStyle(activeTab === "dashboard")}>📋 대여 현황 / 태그</button>
        <button onClick={() => setActiveTab("add")} style={tabStyle(activeTab === "add")}>➕ 게임 추가</button>
        <button onClick={() => setActiveTab("config")} style={tabStyle(activeTab === "config")}>🎨 홈페이지 설정</button>
      </div>

     {activeTab === "dashboard" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3>🚨 게임 관리 (총 {games.length}개)</h3>
            <button onClick={loadData} style={{ padding: "5px 10px", cursor: "pointer", background:"#f8f9fa", border:"1px solid #ddd", borderRadius:"5px" }}>🔄 새로고침</button>
          </div>

          {/* 로딩 중일 때 메시지 표시 (loading 변수 사용) */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>데이터를 불러오는 중... ⏳</div>
          ) : (
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
        </div>
      )}

      {activeTab === "add" && <AddGameSection />}

      {activeTab === "config" && (
        <div>
          <h3>🎨 추천 버튼 설정</h3>
            <div style={{ display: "grid", gap: "15px", marginBottom: "20px" }}>
            {config.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "15px", alignItems: "center", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                
                {/* 1. 색상 선택 */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: item.color, border: "3px solid #f0f0f0", marginBottom: "5px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    <input type="color" value={item.color} onChange={(e) => handleConfigChange(idx, 'color', e.target.value)} style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", opacity: 0, cursor: "pointer" }} />
                  </div>
                </div>

                {/* 2. 입력 필드 */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85em", color: "#888", marginBottom: "5px", fontWeight: "bold" }}>버튼 이름 (\n 줄바꿈)</label>
                    <input value={item.label} onChange={(e) => handleConfigChange(idx, 'label', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85em", color: "#888", marginBottom: "5px", fontWeight: "bold" }}>연결 태그 (#)</label>
                    <input value={item.value} onChange={(e) => handleConfigChange(idx, 'value', e.target.value)} placeholder="#태그" style={inputStyle} />
                  </div>
                </div>

                {/* 3. ⭐ [NEW] 삭제 버튼 */}
                <div>
                  <button 
                    onClick={() => handleDeleteConfig(idx)} 
                    style={{ background: "#fff", border: "1px solid #e74c3c", color: "#e74c3c", borderRadius: "8px", width: "40px", height: "40px", cursor: "pointer", fontSize: "1.2em", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="이 버튼 삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ⭐ [NEW] 하단 액션 버튼들 (추가 / 저장) */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleAddConfig} style={{ flex: 1, padding: "15px", background: "#95a5a6", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1em", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
              ➕ 버튼 추가
            </button>
            <button onClick={handleConfigSave} style={{ flex: 2, padding: "15px", background: "#3498db", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1em", cursor: "pointer", boxShadow: "0 4px 12px rgba(52, 152, 219, 0.4)" }}>
              💾 설정 저장하고 적용하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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