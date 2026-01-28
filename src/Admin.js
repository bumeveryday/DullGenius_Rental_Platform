// src/Admin.js
// 최종 수정일: 2025.12.05
// 설명: 관리자 페이지 메인 (인증 및 탭 컨테이너)

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchGames, fetchConfig } from './api';
import { useAuth } from './contexts/AuthContext'; // [SECURITY] Supabase 권한 기반 인증
import { useToast } from './contexts/ToastContext';

// 분리된 컴포넌트 임포트 (admin 폴더 생성 필요)
import DashboardTab from './admin/DashboardTab';
import AddGameTab from './admin/AddGameTab';
import ConfigTab from './admin/ConfigTab';
import PointsTab from './admin/PointsTab';

function Admin() {
  const { user, hasRole, logout, loading: authLoading } = useAuth(); // [FIX] logout 추가
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- 1. 권한 체크: 관리자 권한이 있는지 확인 ---
  const isAdmin = hasRole('admin') || hasRole('executive');

  // 비로그인 또는 권한 없음 처리
  useEffect(() => {
    if (!authLoading && !user) {
      showToast("관리자 로그인이 필요합니다.", { type: "warning" });
      navigate("/login");
    } else if (!authLoading && user && !isAdmin) {
      showToast("접근 권한이 없습니다.", { type: "error" });
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate, showToast]);

  // --- 2. 데이터 상태 관리 (하위 탭들과 공유) ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 데이터 로딩 (SWR 패턴 적용) ---
  const loadData = async () => {
    // 1. (배경) 로딩 표시 시작
    setLoading(true);
    try {
      const [gamesData, configData] = await Promise.all([fetchGames(), fetchConfig()]);

      // 정렬 로직 (우선순위: 찜 > 대여중 > 분실 > 대여가능)
      const priority = { "찜": 1, "대여중": 2, "분실": 3, "대여가능": 4 };
      const sortedGames = gamesData.sort((a, b) => (priority[a.status] || 4) - (priority[b.status] || 4));

      setGames(sortedGames);
      if (configData?.length) setConfig(configData);

      // ⭐ [핵심] 최신 데이터를 받으면 로컬 스토리지도 갱신한다! (유저 페이지와 공유)
      localStorage.setItem('games_cache', JSON.stringify(sortedGames));

    } catch (e) {
      showToast("데이터 로딩 실패 (인터넷 연결 확인)", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 인증 성공 시 데이터 최초 로드
  useEffect(() => {
    if (user && isAdmin) {
      // 캐시가 있으면 먼저 보여준다! (0초 로딩)
      const cachedGames = localStorage.getItem('games_cache');
      if (cachedGames) {
        setGames(JSON.parse(cachedGames));
      }
      loadData();
    }
  }, [user, isAdmin]);


  // --- 3. 로딩 및 권한 체크 ---
  if (authLoading) {
    return (
      <div style={styles.authContainer}>
        <div className="spinner"></div>
        <p style={{ marginTop: "20px", color: "#666" }}>권한 확인 중...</p>
      </div>
    );
  }

  // 로그인하지 않았거나 권한이 없으면 useEffect에서 리다이렉트
  if (!user || !isAdmin) {
    return (
      <div style={styles.authContainer}>
        <h2 style={{ fontSize: "2em", marginBottom: "20px" }}>🔒 관리자 전용</h2>
        <p style={{ color: "#666" }}>접근 권한을 확인하고 있습니다...</p>
      </div>
    );
  }

  // --- 4. 렌더링: 관리자 메인 화면 ---
  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>🔓 관리자 페이지</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={logout} style={styles.logoutBtn}>로그아웃</button>
          <Link to="/" style={styles.homeBtn}>🏠 메인으로</Link>
        </div>
      </div>

      {/* 탭 버튼 영역 */}
      <div style={styles.tabContainer}>
        <TabButton label="📋 대여 현황 / 태그" id="dashboard" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="➕ 게임 추가" id="add" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="🎨 홈페이지 설정" id="config" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="💰 포인트 시스템" id="points" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {/* 탭 컨텐츠 영역 */}
      <div style={styles.content}>
        {activeTab === "dashboard" && (
          <DashboardTab
            games={games}
            loading={loading}
            onReload={loadData}
          />
        )}

        {activeTab === "add" && (
          <AddGameTab
            onGameAdded={loadData} // 게임 추가 후 목록 갱신을 위해 전달
          />
        )}

        {activeTab === "config" && (
          <ConfigTab
            config={config}
            onReload={loadData} // 설정 저장 후 갱신을 위해 전달
          />
        )}

        {activeTab === "points" && (
          <PointsTab />
        )}
      </div>
    </div>
  );
}

// --- 스타일 및 서브 컴포넌트 ---

// 탭 버튼 컴포넌트 (중복 제거)
const TabButton = ({ label, id, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: "10px 20px",
      border: "none",
      background: activeTab === id ? "#333" : "white",
      color: activeTab === id ? "white" : "#555",
      borderRadius: "25px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "0.95rem",
      whiteSpace: "nowrap",
      boxShadow: activeTab === id ? "0 2px 5px rgba(0,0,0,0.2)" : "none",
      transition: "all 0.2s"
    }}
  >
    {label}
  </button>
);

const styles = {
  container: { padding: "20px", maxWidth: "1000px", margin: "0 auto", paddingBottom: "100px" },
  authContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "15px" },
  tabContainer: { display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid #ddd", paddingBottom: "10px", overflowX: "auto" },
  content: { minHeight: "300px" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1em" },
  loginBtn: { padding: "12px 20px", background: "#333", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  logoutBtn: { padding: "8px 15px", background: "#eee", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9em" },
  homeBtn: { textDecoration: "none", color: "#333", border: "1px solid #ccc", padding: "8px 15px", borderRadius: "8px", background: "white", fontSize: "0.9em" },
  backLink: { marginTop: "30px", color: "#999", textDecoration: "underline", fontSize: "0.9em" }
};

export default Admin;