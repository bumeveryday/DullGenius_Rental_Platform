// src/App.js
// 최종 수정일: 2026.01.30 (빌드 리프레시)
// 설명: 메인 화면(Home) 및 라우터 설정, 데이터 로딩, 필터링 로직 포함

import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, fetchTrending, fetchConfig } from './api'; // API 함수들 임포트
import { useGameFilter } from './hooks/useGameFilter'; // [NEW] Custom Hook
import Admin from './Admin';         // 관리자 페이지 컴포넌트
import GameDetail from './components/GameDetail'; // 상세 페이지 컴포넌트
import { TEXTS } from './constants'; // 텍스트 수집 
import './App.css';
import logo from './logo.png';
import FilterBar from './components/FilterBar';            // 스타일시트
import Login from './components/Login';   // 로그인 페이지
import Signup from './components/Signup'; // 회원가입 페이지
import MyPage from './components/MyPage';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // [NEW] Supabase Auth
import { ToastProvider } from './contexts/ToastContext'; // [NEW] Toast 시스템
import KioskPage from './kiosk/KioskPage'; // [NEW] Kiosk Page


function Home() {
  const navigate = useNavigate();
  const location = useLocation(); // [FIX] useLocation 훅 사용
  const { user, profile, logout } = useAuth(); // [NEW] useAuth 훅 사용

  // ==========================================
  // [이스터 에그] 로고 5번 클릭 시 관리자 페이지 이동
  // ==========================================




  // ==========================================
  // 1. 상태 관리 (State Management)
  // ==========================================

  const [games, setGames] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [trending, setTrending] = useState([]);
  const [config, setConfig] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [difficultyFilter, setDifficultyFilter] = useState("전체");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [playerFilter, setPlayerFilter] = useState("all");
  const filterSectionRef = useRef(null);
  const JOIN_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdoBGEPRM5TIef66Nen7Sc8pWKkAqCMi90ftM1x9QZsX_5a6g/viewform?usp=header";




  // ==========================================
  // 2. 이펙트 & 데이터 로딩 (Effects)
  // ==========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const loadData = async () => {
      const CACHE_DURATION = 0; // [DEBUG] 캐시 끄기 (항상 최신 데이터 로드)

      // [개선] 캐시 확인 (타임스탬프 기반)
      const cachedGames = localStorage.getItem('games_cache');
      const cachedTrending = localStorage.getItem('trending_cache');
      const cachedConfig = localStorage.getItem('config_cache');

      let shouldFetchGames = true;
      let cachedGamesData = null;

      if (cachedGames) {
        try {
          const cache = JSON.parse(cachedGames);
          const age = Date.now() - (cache.timestamp || 0);

          if (age < CACHE_DURATION) {
            // 캐시 유효
            cachedGamesData = cache.data;
            setGames(cachedGamesData);
            setPageLoading(false);
            shouldFetchGames = false;
          }
        } catch (e) {
          console.warn('게임 캐시 파싱 실패:', e);
        }
      }

      if (cachedConfig) {
        const config = await fetchConfig();
        setConfig(config);
      }

      if (cachedTrending && cachedGamesData) {
        try {
          const tCache = JSON.parse(cachedTrending);
          const mapped = tCache.data.map(t => cachedGamesData.find(g => String(g.id) === String(t.id))).filter(Boolean);
          setTrending(mapped);
        } catch (e) { }
      }

      // [개선] API 호출
      if (shouldFetchGames || !cachedTrending) {
        if (shouldFetchGames) setDataLoading(true);
      }

      try {
        const [gamesData, trendingData, configData] = await Promise.all([
          shouldFetchGames ? fetchGames() : Promise.resolve(null),
          fetchTrending(),
          fetchConfig()
        ]);

        if (gamesData && !gamesData.error) {
          const valid = gamesData.filter(g => g.name && g.name.trim() !== "");
          setGames(valid);
          // [개선] 타임스탬프와 함께 저장
          localStorage.setItem('games_cache', JSON.stringify({
            data: valid,
            timestamp: Date.now()
          }));
        } else if (gamesData?.error) {
          console.error('게임 데이터 로딩 에러:', gamesData.message);
        }

        if (configData) {
          setConfig(configData);
        }

        if (Array.isArray(trendingData)) {
          const gameList = gamesData || cachedGamesData;
          if (gameList) {
            const mapped = trendingData.map(t => gameList.find(g => String(g.id) === String(t.id))).filter(Boolean);
            setTrending(mapped);
            localStorage.setItem('trending_cache', JSON.stringify({
              data: trendingData,
              timestamp: Date.now()
            }));
          }
        }

      } catch (e) {
        console.error("데이터 로딩 실패:", e);
      } finally {
        setPageLoading(false);
        setDataLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const isFiltered = searchTerm || selectedCategory !== "전체" || difficultyFilter !== "전체" || playerFilter !== "all" || onlyAvailable;

    if (isFiltered && !pageLoading) {
      setTimeout(() => {
        filterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchTerm, selectedCategory, difficultyFilter, playerFilter, onlyAvailable, pageLoading]);

  // ==========================================
  // 3. 핸들러 함수 (Event Handlers)
  // ==========================================

  const handleThemeClick = (tagValue) => {
    setInputValue(tagValue);
    setSearchTerm(tagValue);
    setOnlyAvailable(false);
    setDifficultyFilter("전체");
    setSelectedCategory("전체");
    setPlayerFilter("all");
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setInputValue("");
    setSearchTerm("");
    setSelectedCategory("전체");
    setDifficultyFilter("전체");
    setPlayerFilter("all");
    setOnlyAvailable(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // 4. 필터링 로직 (Custom Hook 사용) [IMPROVED]
  // ==========================================
  const filteredGames = useGameFilter(games, {
    searchTerm,
    selectedCategory,
    onlyAvailable,
    difficultyFilter,
    playerFilter
  });

  const categories = ["전체", ...new Set(games.map(g => g.category).filter(Boolean))];

  // ==========================================
  // 5. 화면 렌더링 (UI Rendering)
  // ==========================================

  if (pageLoading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p style={{ marginTop: "20px", color: "#666", fontSize: "1.1em" }}>
        🎲 보드게임 정보를 불러오고 있어요...<br />
        <span style={{ fontSize: "0.8em", color: "#999" }}>요즘 잘나가는 애들로 가져올게요...</span>
      </p>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>

      <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "0.9em", zIndex: 10 }}>
        {user ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", color: "#2c3e50" }}>👋 {profile?.name || user.email}님</span>
            <Link to="/mypage">
              <button style={{ padding: "5px 10px", border: "1px solid #ddd", background: "#f1f2f6", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", color: "#333" }}>
                마이페이지
              </button>
            </Link>

            <button
              onClick={logout}
              style={{ padding: "5px 10px", border: "1px solid #ddd", background: "white", borderRadius: "5px", cursor: "pointer" }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/login" style={{ textDecoration: "none", color: "#555", fontWeight: "bold" }}>로그인</Link>
            <span style={{ color: "#ddd" }}>|</span>
            <Link to="/signup" style={{ textDecoration: "none", color: "#3498db", fontWeight: "bold" }}>회원가입</Link>
          </div>
        )}
      </div>

      {/* --- [헤더 영역] --- */}
      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1
          className="logo-header"
          style={{
            fontSize: "2.5em",
            marginBottom: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "15px",
            userSelect: "none"
          }}
        >
          <img
            src={logo}
            alt="덜지니어스 로고"
            onClick={(e) => {
              // 1. 기본 동작: 메인으로 이동
              if (location.pathname !== "/") {
                navigate("/");
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }

              // 2. [DEV] 이스터에그: 5번 연속 클릭 시 관리자 페이지 이동
              // 2. [DEV] 이스터에그: 5번 연속 클릭 시 관리자 페이지 이동
              // if (import.meta.env.DEV) { // [CHANGED] 배포 환경에서도 허용
              const now = Date.now();
              const lastClick = window.lastLogoClickTime || 0;

              if (now - lastClick < 500) { // 0.5초 이내 클릭
                window.logoClickCount = (window.logoClickCount || 0) + 1;
              } else {
                window.logoClickCount = 1;
              }
              window.lastLogoClickTime = now;

              if (window.logoClickCount >= 5) {
                if (window.logoClickCount >= 5) {
                  const confirmDev = window.confirm("🛠️ 개발자 모드로 관리자 페이지에 접속하시겠습니까?");
                  if (confirmDev) {
                    sessionStorage.setItem('dev_admin_bypass', 'true'); // 우회 플래그 설정
                    navigate("/admin-secret");
                    window.logoClickCount = 0;
                  }
                }
              }
              // }
            }}
            style={{
              height: "1.2em",
              width: "auto",
              objectFit: "contain"
            }}
          />
          <span onClick={() => window.location.reload()}>덜지니어스 대여소</span>
        </h1>

        <div style={{ marginBottom: "20px" }}>
          <a href={JOIN_FORM_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "10px 20px", background: "#3498db", color: "white", textDecoration: "none", borderRadius: "25px", fontWeight: "bold", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}>
            🚀 부원 가입 신청하기
          </a>
        </div>
      </header>

      {/*심플한 텍스트 안내 배너 */}
      <div className="guide-wrapper">
        <button
          className="guide-toggle-btn"
          onClick={() => setShowGuide(!showGuide)}
        >
          <span>💡 <strong>이용 안내 & 공지사항</strong></span>
          <span>{showGuide ? "▲ 접기" : "▼ 펼치기"}</span>
        </button>
        {showGuide && (
          <div className="guide-textarea-view">
            {TEXTS.MAIN_GUIDE}
          </div>
        )}
      </div>

      {/* --- [대시보드: 추천 테마 + 인기 급상승] --- */}
      <div className="trending-wrapper dashboard-container">
        <div className="dashboard-left">
          <h2 style={{ fontSize: "1.5em", marginBottom: "15px" }}>🎯 상황별 추천</h2>
          {config === null ? (
            <div className="theme-grid">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box" style={{ height: "80px" }}></div>)}
            </div>
          ) : (
            <div className="theme-grid">
              {config.map((btn, idx) => (
                <button key={idx} onClick={() => handleThemeClick(btn.value)} className="theme-btn" style={{ borderLeft: `5px solid ${btn.color} ` }}>
                  {btn.label.split("\\n").map((line, i) => <span key={i}>{line}<br /></span>)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-right">
          <h2 style={{ fontSize: "1.5em", marginBottom: "15px" }}>🔥 요즘 뜨는 게임</h2>
          {(dataLoading && trending.length === 0) ? (
            <div className="section-loading">
              <div className="mini-spinner"></div>
              <span style={{ fontSize: "0.9em" }}>인기 순위 집계 중...</span>
            </div>
          ) : (
            trending.length > 0 ? (
              <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "10px 5px 20px 5px", scrollBehavior: "smooth" }}>
                {trending.map((game, index) => (
                  <Link to={`/game/${game.id}`} state={{ game }} key={game.id} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="trend-card">
                      <div className="trend-badge">{index + 1}위</div>
                      <div style={{ width: "100%", height: "140px", background: "#f8f9fa" }}>
                        {game.image ? <img src={game.image} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: "0.8em" }}>No Image</div>}
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
              <div style={{ padding: "30px", background: "#f9f9f9", borderRadius: "10px", textAlign: "center", color: "#888" }}>
                아직 데이터 수집 중... 📊
              </div>
            )
          )}
        </div>
      </div>

      <div ref={filterSectionRef}>
        <FilterBar
          inputValue={inputValue} setInputValue={setInputValue}
          selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
          difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter}
          playerFilter={playerFilter} setPlayerFilter={setPlayerFilter}
          onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
          categories={categories}
          onReset={resetFilters}
        />
      </div>

      <div style={{ marginBottom: "15px", color: "#666", fontSize: "0.9em", marginLeft: "5px" }}>
        총 <strong>{filteredGames.length}</strong>개의 게임을 찾았습니다.
      </div>

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
                {(game.status !== "대여가능") && (
                  <div style={{
                    position: "absolute", top: "10px", right: "10px",
                    background: game.status === "대여가능" ? "rgba(46, 204, 113, 0.9)" : "rgba(231, 76, 60, 0.9)",
                    color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8em", fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    {game.status}
                    {game.status === "대여가능" && game.available_count > 0 && ` (${game.available_count})`}
                  </div>
                )}
              </div>

              <div style={{ padding: "15px" }}>
                <h3 className="text-truncate" style={{ margin: "0 0 5px 0", fontSize: "1.1em", fontWeight: "bold" }}>{game.name}</h3>
                <div style={{ fontSize: "0.85em", color: "#888", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                  <span className="text-truncate" style={{ maxWidth: "60%" }}>{game.genre}</span>
                  <span>{game.players ? `👥 ${game.players} ` : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", alignItems: "center" }}>
                  <span style={{ background: "#f1f2f6", padding: "2px 8px", borderRadius: "5px", color: "#555", fontSize: "0.8em" }}>{game.category}</span>
                  {game.difficulty ? <span style={{ color: "#e67e22", fontWeight: "bold" }}>🔥 {game.difficulty}</span> : <span style={{ color: "#ddd" }}>-</span>}
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
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Home은 이제 내부 useAuth를 사용하므로 props 전달 불필요 */}
            <Route path="/" element={<Home />} />
            {/* 하위 페이지들도 context 사용 가능 */}
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin-secret" element={<Admin />} />
            <Route path="/kiosk" element={<KioskPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;