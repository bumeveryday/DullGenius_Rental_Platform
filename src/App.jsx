// src/App.js
// 최종 수정일: 2026.02.19 (구조 개편)
// 설명: 라우터 설정 및 전역 Provider 구성 (InfoBar, Home 등은 하위 페이지로 이동)

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { GameProvider } from './contexts/GameDataContext'; // [NEW] 데이터 중앙 관리

// Components (Lazy Load)
const Home = lazy(() => import('./pages/Home')); // [MOVED] pages/Home.jsx
const CategorySelect = lazy(() => import('./pages/CategorySelect')); // [NEW]
const GameSearch = lazy(() => import('./pages/GameSearch')); // [NEW]
const GameDetail = lazy(() => import('./components/GameDetail'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const MyPage = lazy(() => import('./components/MyPage'));
const KioskPage = lazy(() => import('./kiosk/KioskPage'));
const Admin = lazy(() => import('./Admin'));

import ProtectedRoute from './components/ProtectedRoute';
import LoginTooltip from './components/LoginTooltip';

// 메인 앱 컴포넌트
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <GameProvider> {/* [NEW] Game Data Provider 추가 */}
          <BrowserRouter>
            <Suspense fallback={
              <div className="loading-container">
                <div className="spinner"></div>
                <p style={{ marginTop: "20px", color: "#666" }}>페이지 로딩 중...</p>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/categories" element={<CategorySelect />} />
                <Route path="/search" element={<GameSearch />} />

                <Route path="/game/:id" element={<GameDetail />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route element={<ProtectedRoute allowedRoles={['admin', 'executive']} />}>
                  <Route path="/admin-secret" element={<Admin />} />
                </Route>

                <Route path="/kiosk" element={<KioskPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* [Global UI] 로그인 툴팁은 이제 각 페이지 헤더나 필요 시점에 렌더링되므로 여기서 제거하거나 
                  필요하다면 공통 레이아웃 컴포넌트(Layout.jsx)를 만드는 것이 좋음.
                  현재는 Home, GameDetail 등에서 개별 처리 중이므로 App level에서는 제거. 
                  단, AuthProvider 내부에서 Global로 처리해야 할 것이 있다면 여기에 배치.
              */}

            </Suspense>
          </BrowserRouter>
        </GameProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
