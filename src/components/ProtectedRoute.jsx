import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, hasRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p style={{ marginTop: "20px", color: "#666" }}>권한 확인 중...</p>
            </div>
        );
    }

    const navigate = useNavigate();

    // 1. 로그인 안 된 경우
    if (!user) {
        return (
            <div className="auth-error-container" style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
                <h2 style={{ fontSize: '2em', marginBottom: '20px' }}>🔒 로그인이 필요합니다</h2>
                <p style={{ marginBottom: '30px', color: '#666' }}>관리자 페이지에 접근하려면 먼저 로그인해주세요.</p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ padding: '10px 20px', fontSize: '1.1em', cursor: 'pointer', background: '#f1f2f6', border: '1px solid #ddd', borderRadius: '5px' }}
                    >
                        🔙 뒤로가기
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        style={{ padding: '10px 20px', fontSize: '1.1em', cursor: 'pointer', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px' }}
                    >
                        로그인 하러 가기
                    </button>
                </div>
            </div>
        );
    }

    const hasPermission = allowedRoles.length === 0 ||
        allowedRoles.some(role => hasRole(role));

    // 2. 권한 없는 경우
    if (!hasPermission) {
        return (
            <div className="auth-error-container" style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
                <h2 style={{ fontSize: '2em', marginBottom: '20px', color: '#e74c3c' }}>🚫 접근 권한이 없습니다</h2>
                <p style={{ marginBottom: '30px', color: '#666' }}>이 페이지를 볼 수 있는 권한이 없습니다.</p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ padding: '10px 20px', fontSize: '1.1em', cursor: 'pointer', background: '#f1f2f6', border: '1px solid #ddd', borderRadius: '5px' }}
                    >
                        🔙 뒤로가기
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '10px 20px', fontSize: '1.1em', cursor: 'pointer', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px' }}
                    >
                        🏠 메인으로
                    </button>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
