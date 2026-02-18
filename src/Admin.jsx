// src/Admin.js
// 최종 수정일: 2026.01.30 (다크 모드 적용)
// 설명: 관리자 페이지 메인 (인증 및 탭 컨테이너)

/* 
 * ============================================================
 * [GUIDE] Admin Page Dark Mode Strategy
 * ============================================================
 * This Admin Page is designed to be PERMANENTLY DARK.
 * When adding new components or features to this page:
 * 1. DO NOT use white backgrounds. Use var(--admin-bg) or var(--admin-card-bg).
 * 2. DO NOT use black text. Use var(--admin-text-main) or var(--admin-text-sub).
 * 3. Use the CSS variables defined below for consistency.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchGames, fetchConfig } from './api';
import { useAuth } from './contexts/AuthContext'; // [SECURITY] Supabase 권한 기반 인증
import { useToast } from './contexts/ToastContext';
import './Admin.css'; // [NEW] 다크 모드 스타일 임포트

// 분리된 컴포넌트 임포트 (admin 폴더 생성 필요)
import DashboardTab from './admin/DashboardTab';
import AddGameTab from './admin/AddGameTab';
import ConfigTab from './admin/ConfigTab';
import PointsTab from './admin/PointsTab';
import MembersTab from './admin/MembersTab'; // [NEW]
import SystemTab from './admin/SystemTab'; // [NEW] 시스템 설정 탭
import ReportsTab from './admin/ReportsTab'; // [NEW] 신고/신청 관리 탭

function Admin() {
  const { user, hasRole, logout, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- 1. 권한 체크: 관리자 권한이 있는지 확인 ---
  const isDevBypass = sessionStorage.getItem('dev_admin_bypass') === 'true'; // [CHANGED] 배포 환경에서도 허용
  const isAdmin = hasRole('admin') || hasRole('executive') || isDevBypass;



  // --- 2. 데이터 상태 관리 (하위 탭들과 공유) ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 데이터 로딩 (SWR 패턴 적용) ---
  const loadData = useCallback(async () => {
    // 1. (배경) 로딩 표시 시작
    setLoading(true);
    try {
      const [gamesData, configData] = await Promise.all([fetchGames(), fetchConfig()]);

      // [FIX] gamesData가 배열인지 확인 (에러 객체 반환 가능성 대응)
      let validGames = [];
      if (Array.isArray(gamesData)) {
        validGames = gamesData;
      } else if (gamesData?.error) {
        showToast(gamesData.message, { type: "error" });
        return; // 에러 시 중단
      }

      // 정렬 로직 (우선순위: 예약됨 > 대여중 > 대여가능 > 분실)
      // [FIX] 반납/수령 처리를 위해 '예약됨(찜)', '대여중'을 상위로 이동
      const priority = { "예약됨": 1, "대여중": 2, "대여가능": 3, "분실": 4, "수리중": 5 };

      const sortedGames = validGames.sort((a, b) => {
        // 1. 상태 우선순위 비교 (관리자용 adminStatus 기준)
        const priorityA = priority[a.adminStatus] || 99;
        const priorityB = priority[b.adminStatus] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;

        // 2. 같은 상태면 이름순 정렬
        return a.name.localeCompare(b.name, 'ko');
      });

      setGames(sortedGames);
      if (configData?.length) setConfig(configData);

      // ⭐ [핵심] 최신 데이터를 받으면 로컬 스토리지도 갱신한다! (타임스탬프 포함)
      localStorage.setItem('games_cache', JSON.stringify({
        data: sortedGames,
        timestamp: Date.now()
      }));

    } catch (e) {
      showToast("데이터 로딩 실패 (인터넷 연결 확인)", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 인증 성공 시 데이터 최초 로드
  useEffect(() => {
    if (user && isAdmin) {
      // 캐시가 있으면 먼저 보여준다! (0초 로딩)
      const cachedGames = localStorage.getItem('games_cache');
      if (cachedGames) {
        try {
          const parsedCache = JSON.parse(cachedGames);
          // [FIX] 변경된 캐시 구조 ({ data, timestamp }) 대응
          if (parsedCache.data && Array.isArray(parsedCache.data)) {
            setGames(parsedCache.data);
          } else if (Array.isArray(parsedCache)) {
            // 구버전 캐시 대응 (혹시 모를 하위 호환성)
            setGames(parsedCache);
          }
        } catch (e) {
          console.warn("캐시 파싱 실패");
        }
      }
      loadData();
    }
  }, [user?.id, isAdmin, loadData]);


  // --- 3. 로딩 및 권한 체크 ---

  // --- 4. 렌더링: 관리자 메인 화면 ---
  return (
    <div className="admin-container">
      {/* 상단 헤더 */}
      <div className="admin-header">
        <h2>🔓 관리자 페이지</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={logout} className="admin-btn admin-btn-logout">로그아웃</button>
          <Link to="/" className="admin-btn admin-btn-home">🏠 메인으로</Link>
          <Link to="/kiosk" className="admin-btn" style={{ background: "#667eea" }}>📱 키오스크</Link>
        </div>
      </div>

      {/* 탭 버튼 영역 */}
      <div className="admin-tabs">
        <TabButton label="📋 대여 현황 / 태그" id="dashboard" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="📢 신고/신청 관리" id="reports" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="➕ 게임 추가" id="add" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="⚙️ 시스템 설정" id="system" activeTab={activeTab} onClick={setActiveTab} /> {/* [NEW] */}
        <TabButton label="👥 회원 관리" id="members" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="💰 포인트 시스템" id="points" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="🎨 홈페이지 설정" id="config" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {/* 탭 컨텐츠 영역 */}
      <div className="admin-content">
        {activeTab === "dashboard" && (
          <DashboardTab
            games={games}
            loading={loading}
            onReload={loadData}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab />
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

        {activeTab === "system" && ( // [NEW]
          <SystemTab />
        )}

        {activeTab === "points" && (
          <PointsTab />
        )}

        {activeTab === "members" && ( // [NEW]
          <MembersTab />
        )}
      </div>
    </div>
  );
}

// --- 스타일 및 서브 컴포넌트 ---

// 탭 버튼 컴포넌트 (CSS 클래스 사용)
const TabButton = ({ label, id, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`admin-tab-btn ${activeTab === id ? 'active' : ''}`}
  >
    {label}
  </button>
);

export default Admin;