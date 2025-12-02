// src/App.js
// 최종 수정일: 2025.12.02
// 설명: 메인 화면(Home) 및 라우터 설정, 데이터 로딩, 필터링 로직 포함

import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { fetchGames, fetchTrending, fetchConfig } from './api'; // API 함수들 임포트
import Admin from './Admin';         // 관리자 페이지 컴포넌트
import GameDetail from './GameDetail'; // 상세 페이지 컴포넌트
import './App.css';                  // 스타일시트

function Home() {
  // ==========================================
  // 1. 상태 관리 (State Management)
  // ==========================================
  
  // 데이터 관련 상태
  const [games, setGames] = useState([]);       // 전체 게임 목록 (200개)
  const [trending, setTrending] = useState([]); // 인기 급상승 게임 (Top 5)
  const [config, setConfig] = useState([]);     // 홈페이지 설정값 (추천 버튼 등)
  const [loading, setLoading] = useState(true); // 로딩 중 여부

  // 필터 관련 상태
  const [inputValue, setInputValue] = useState("");              // 검색창 입력값 (화면 표시용)
  const [searchTerm, setSearchTerm] = useState("");              // 실제 검색어 (필터링용)
  const [selectedCategory, setSelectedCategory] = useState("전체"); // 카테고리 (보드게임/TRPG 등)
  const [difficultyFilter, setDifficultyFilter] = useState("전체"); // 난이도 (입문/전략 등)
  const [onlyAvailable, setOnlyAvailable] = useState(false);      // 대여 가능만 보기 체크박스
  const [playerFilter, setPlayerFilter] = useState("all");        // 인원수 필터 (2인, 4인 등)

  // 외부 링크 (부원 가입 구글 폼)
  const JOIN_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdoBGEPRM5TIef66Nen7Sc8pWKkAqCMi90ftM1x9QZsX_5a6g/viewform?usp=header";

  // ==========================================
  // 2. 이펙트 & 데이터 로딩 (Effects)
  // ==========================================

  // [디바운싱] 검색어 입력 시 0.3초 대기 후 검색 실행 (성능 최적화)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 300);
    return () => clearTimeout(timer); // 0.3초 내 재입력 시 타이머 초기화
  }, [inputValue]);

  // [초기 로딩] 앱 실행 시 한 번만 실행
  useEffect(() => {
    const loadData = async () => {
      // 1. 빠른 로딩을 위해 캐시(LocalStorage) 먼저 확인
      const cachedGames = localStorage.getItem('games_cache');
      if (cachedGames) {
        setGames(JSON.parse(cachedGames));
        setLoading(false); // 캐시 있으면 로딩 화면 즉시 해제
      }

      try {
        // 2. 서버에서 최신 데이터 병렬 요청 (게임목록, 급상승, 설정값)
        const [gamesData, trendingData, configData] = await Promise.all([
          fetchGames(),
          fetchTrending(),
          fetchConfig()
        ]);

        // 3. 게임 목록 업데이트 (이름 없는 유령 데이터 제거)
        if (gamesData && gamesData.length > 0) {
          const validGames = gamesData.filter(g => g.name && g.name.trim() !== "");
          setGames(validGames);
          localStorage.setItem('games_cache', JSON.stringify(validGames)); // 캐시 갱신
        }
        
        // 4. 급상승 데이터 처리 (ID 목록 -> 실제 게임 객체 매핑)
        if (Array.isArray(trendingData)) {
          const hotGames = trendingData
            .map(t => gamesData.find(g => String(g.id) === String(t.id)))
            .filter(Boolean); // 없는 게임 제외
          setTrending(hotGames);
        }

        // 5. 설정값(Config) 적용 (없으면 기본값 사용)
        if (configData && configData.length > 0) {
          setConfig(configData);
        } else {
          // 기본 버튼 설정 (백엔드 데이터가 없을 때 대비)
          setConfig([
            { label: "⚡ 순발력 게임", value: "#순발력", color: "#2ecc71" },
            { label: "🧠 마피아류 게임", value: "#마피아", color: "#e67e22" },
            { label: "🕵️‍♂️ 25-2 머더부 선정 수작 머더", value: "#머더부", color: "#9b59b6" },
            { label: "🎉 팀모임 추천", value: "#팀모임", color: "#f1c40f" }
          ]);
        }

      } catch (e) {
        console.error("데이터 로딩 실패:", e);
      } finally {
        setLoading(false); // 로딩 완료
      }
    };
    loadData();
  }, []);

  // ==========================================
  // 3. 핸들러 함수 (Event Handlers)
  // ==========================================

  // [추천 버튼 클릭] 설정값(태그)을 검색어로 입력하고 필터 초기화
  const handleThemeClick = (tagValue) => {
    setInputValue(tagValue); // 검색창에 #태그 입력
    setSearchTerm(tagValue); // 즉시 검색 적용
    
    // 나머지 필터는 초기화하여 태그 검색에 집중하도록 함
    setOnlyAvailable(false);
    setDifficultyFilter("전체");
    setSelectedCategory("전체");
    setPlayerFilter("all");
    
    // 리스트 위치로 부드럽게 스크롤 이동
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  // [초기화 버튼 클릭] 모든 필터를 기본값으로 리셋
  const resetFilters = () => {
    setInputValue("");
    setSearchTerm("");
    setSelectedCategory("전체");
    setDifficultyFilter("전체");
    setPlayerFilter("all");
    setOnlyAvailable(false);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 맨 위로 이동
  };

  // [인원수 체크 헬퍼] "2~5" 같은 문자열 범위 체크
  const checkPlayerCount = (rangeStr, targetFilter) => {
    if (!rangeStr) return false;
    try {
      const parts = rangeStr.split('~'); // 물결표로 분리
      const min = parseInt(parts[0]);
      const max = parts.length > 1 ? parseInt(parts[1]) : min;
      
      if (targetFilter === "6+") {
        return max >= 6; // 6인 이상 필터
      } else {
        const target = parseInt(targetFilter);
        return target >= min && target <= max; // 범위 내 포함 여부
      }
    } catch (e) { return false; }
  };

  // ==========================================
  // 4. 필터링 로직 (Core Logic)
  // ==========================================
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // (1) 유령 데이터 방어
      if (!game.name || game.name.trim() === "") return false;

      // (2) TRPG 은신 (직접 선택 안 하면 숨김)
      if (selectedCategory !== "TRPG" && game.category === "TRPG") return false;

      // (3) 검색어 필터 (#태그 검색 지원)
      if (searchTerm.startsWith("#")) {
        // 태그 컬럼에 해당 해시태그가 있는지 확인
        if (!game.tags || !game.tags.includes(searchTerm)) return false;
      } else {
        // 일반 이름 검색 (대소문자 무시)
        if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }

      // (4) 카테고리 필터
      if (selectedCategory !== "전체" && game.category !== selectedCategory) return false;

      // (5) 대여 가능 여부 필터
      if (onlyAvailable && game.status !== "대여가능") return false;

      // (6) 난이도 필터 (BGG 점수 기준)
      if (difficultyFilter !== "전체" && game.difficulty) {
        const score = parseFloat(game.difficulty);
        if (difficultyFilter === "입문" && score >= 2.0) return false;      // 2.0 미만
        if (difficultyFilter === "초중급" && (score < 2.0 || score >= 3.0)) return false; // 2.0 ~ 2.99
        if (difficultyFilter === "전략" && score < 3.0) return false;      // 3.0 이상
      }

      // (7) 인원수 필터
      if (playerFilter !== "all" && game.players) {
        if (!checkPlayerCount(game.players, playerFilter)) return false;
      }

      return true; // 모든 관문 통과 시 표시
    });
  }, [games, searchTerm, selectedCategory, onlyAvailable, difficultyFilter, playerFilter]);

  // 카테고리 목록 동적 생성 (데이터에 존재하는 것만)
  const categories = ["전체", ...new Set(games.map(g => g.category).filter(Boolean))];

  // ==========================================
  // 5. 화면 렌더링 (UI Rendering)
  // ==========================================
  
  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* --- [헤더 영역] --- */}
      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5em", marginBottom: "10px", cursor:"pointer" }} onClick={()=>window.location.reload()}>
          🎲 덜지니어스 대여소
        </h1>
        
        {/* 부원 가입 버튼 */}
        <div style={{ marginBottom: "20px" }}>
          <a href={JOIN_FORM_URL} target="_blank" rel="noopener noreferrer" 
             style={{ display: "inline-block", padding: "10px 20px", background: "#3498db", color: "white", textDecoration: "none", borderRadius: "25px", fontWeight: "bold", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}>
            🚀 부원 가입 신청하기
          </a>
        </div>
        
        <div><Link to="/admin-secret" style={{ fontSize: "0.8em", color: "#ccc", textDecoration: "none" }}>Admin</Link></div>
      </header>

      {/* --- [대시보드: 추천 테마 + 인기 급상승] --- */}
      {/* 검색 중이 아닐 때만 표시 (필터 초기화 상태일 때) */}
      {!searchTerm && selectedCategory === "전체" && difficultyFilter === "전체" && playerFilter === "all" && (
        <div className="trending-wrapper dashboard-container">
          
          {/* 왼쪽: 상황별 추천 (관리자 설정 연동) */}
          <div className="dashboard-left">
            <h2 style={{ fontSize: "1.5em", marginBottom: "15px" }}>🎯 상황별 추천</h2>
            <div className="theme-grid">
              {config.map((btn, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleThemeClick(btn.value)} 
                  className="theme-btn" 
                  style={{ borderLeft: `5px solid ${btn.color}` }}
                >
                  {/* 줄바꿈 문자(\n) 처리 */}
                  {btn.label.split("\\n").map((line, i) => <span key={i}>{line}<br/></span>)}
                </button>
              ))}
            </div>
          </div>

          {/* 오른쪽: 인기 급상승 Top 5 */}
          <div className="dashboard-right">
            <h2 style={{ fontSize: "1.5em", marginBottom: "15px" }}>🔥 요즘 뜨는 게임</h2>
            {trending.length > 0 ? (
              <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "10px 5px 20px 5px", scrollBehavior: "smooth" }}>
                {trending.map((game, index) => (
                  <Link to={`/game/${game.id}`} state={{ game }} key={game.id} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="trend-card">
                      <div className="trend-badge">{index + 1}위</div>
                      <div style={{ width: "100%", height: "140px", background: "#f8f9fa" }}>
                        {game.image ? <img src={game.image} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc",fontSize:"0.8em"}}>No Image</div>}
                      </div>
                      <div style={{ padding: "10px" }}>
                        <div className="text-truncate" style={{ fontWeight: "bold", marginBottom: "3px", fontSize: "0.9em" }}>{game.name}</div>
                        <div style={{ fontSize: "0.8em", color: "#888" }}>{game.category}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: "30px", background: "#f9f9f9", borderRadius: "10px", textAlign: "center", color: "#888" }}>아직 데이터 수집 중... 📊</div>
            )}
          </div>
        </div>
      )}

      {/* --- [필터 바 UI] --- */}
      <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "15px", marginBottom: "30px", display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "center", justifyContent: "center" }}>
        {/* 검색창 */}
        <input type="text" placeholder="🔍 검색 (태그는 #)" value={inputValue} onChange={(e) => setInputValue(e.target.value)} style={{ padding: "10px 15px", borderRadius: "20px", border: "1px solid #ddd", width: "200px" }} />
        
        {/* 드롭다운 필터들 */}
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #ddd" }}>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #ddd" }}>
          <option value="전체">난이도 전체</option>
          <option value="입문">🐣 입문 (0~2점)</option>
          <option value="초중급">🎲 초중급 (2~3점)</option>
          <option value="전략">🧠 전략 (3점+)</option>
        </select>
        <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #ddd", fontWeight: playerFilter !== "all" ? "bold" : "normal", color: playerFilter !== "all" ? "#3498db" : "black" }}>
          <option value="all">인원수 전체</option>
          <option value="2">2인</option>
          <option value="3">3인</option>
          <option value="4">4인</option>
          <option value="5">5인</option>
          <option value="6+">6인 이상</option>
        </select>

        {/* 체크박스 & 초기화 버튼 */}
        <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} style={{ transform: "scale(1.2)" }} />
          <span style={{ fontWeight: onlyAvailable ? "bold" : "normal" }}>대여 가능만</span>
        </label>
        
        <button onClick={resetFilters} style={{ padding: "10px 15px", background: "#e74c3c", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}>
          🔄 초기화
        </button>
      </div>

      <div style={{ marginBottom: "15px", color: "#666", fontSize: "0.9em", marginLeft: "5px" }}>
        총 <strong>{filteredGames.length}</strong>개의 게임을 찾았습니다.
      </div>

      {/* --- [메인 게임 리스트] --- */}
      <div className="game-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
        {filteredGames.map((game) => (
          <div key={game.id} style={{ border: "1px solid #eee", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", background: "white" }}>
            <Link to={`/game/${game.id}`} state={{ game }} style={{ textDecoration: 'none', color: 'inherit', display: "block" }}>
              <div style={{ width: "100%", height: "200px", overflow: "hidden", background: "#f9f9f9", position: "relative" }}>
                {game.image ? (
                  <img src={game.image} alt={game.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc" }}>이미지 없음</div>
                )}
                {/* 상태 뱃지 (대여중일 때만) */}
                {game.status !== "대여가능" && (
                  <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(231, 76, 60, 0.9)", color: "white", padding: "5px 10px", borderRadius: "15px", fontSize: "0.8em", fontWeight: "bold" }}>
                    {game.status}
                  </div>
                )}
              </div>
              
              <div style={{ padding: "15px" }}>
                <h3 className="text-truncate" style={{ margin: "0 0 5px 0", fontSize: "1.1em", fontWeight: "bold" }}>{game.name}</h3>
                
                {/* 메타 정보 (장르 + 인원) */}
                <div style={{ fontSize: "0.85em", color: "#888", marginBottom: "10px", display:"flex", justifyContent:"space-between" }}>
                  <span className="text-truncate" style={{maxWidth:"60%"}}>{game.genre}</span>
                  <span>{game.players ? `👥 ${game.players}` : ""}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", alignItems: "center" }}>
                  <span style={{ background: "#f1f2f6", padding: "2px 8px", borderRadius: "5px", color: "#555", fontSize: "0.8em" }}>{game.category}</span>
                  {game.difficulty ? (
                    <span style={{ color: "#e67e22", fontWeight: "bold" }}>🔥 {game.difficulty}</span>
                  ) : (
                    <span style={{ color: "#ddd" }}>-</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// 라우터 설정 (메인)
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/admin-secret" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;