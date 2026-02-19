import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LINKS } from '../infoData';
import logo from '../logo.png'; // [NEW] Logo Import
import LoginTooltip from './LoginTooltip'; // [NEW] Login Tooltip Import
import './Header.css';

const Header = () => {
    const { user, profile, logout } = useAuth(); // [FIX] signOut -> logout
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout(); // [FIX] signOut -> logout
            navigate('/');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // [NEW] Easter Egg: Logo 5 consecutive clicks -> Admin Page
    const [logoClickCount, setLogoClickCount] = React.useState(0);

    React.useEffect(() => {
        if (logoClickCount === 5) {
            navigate('/admin-secret'); // [FIX] /admin -> /admin-secret
            setLogoClickCount(0);
        }

        // 클릭 후 1초 동안 추가 클릭이 없으면 카운트 리셋 (연속 클릭 감지)
        const timer = setTimeout(() => setLogoClickCount(0), 1000);
        return () => clearTimeout(timer);
    }, [logoClickCount, navigate]);

    const handleLogoClick = (e) => {
        e.preventDefault(); // [FIX] 기본 동작 방지
        e.stopPropagation(); // [FIX] 이벤트 전파 방지

        // 이미지 클릭 시 카운트만 증가
        setLogoClickCount(prev => prev + 1);
    };

    const isPaidUser = user && profile?.is_paid;

    return (
        <header className={`hero-header ${isPaidUser ? 'paid-user' : ''}`}>
            {/* 상단: 로그인 정보 & 마이페이지 */}
            <div className="header-top-bar">
                {user ? (
                    <div className="user-action-group">
                        <span className="user-greeting">
                            <span className="branding-icon">🕊️</span>
                            <span className="user-name">{profile?.name || user?.user_metadata?.full_name || '부원'}님</span>
                        </span>
                        <Link to="/mypage" className="header-sm-btn">마이페이지</Link>
                        <button onClick={handleLogout} className="header-sm-btn outline">로그아웃</button>
                    </div>
                ) : (
                    <div className="user-action-group">
                        <span className="branding-icon" style={{ marginRight: '5px' }}>🔒</span>
                        <LoginTooltip />
                        {/* <Link to="/login" className="header-link-btn login">로그인</Link> */}
                    </div>
                )}
            </div>

            {/* 하단: 로고 & 메인 액션 */}
            <div className="header-main-bar">
                <div className="branding-container">
                    <img
                        src={logo}
                        alt="덜지니어스 대여소 로고"
                        className="branding-logo-img"
                        onClick={handleLogoClick}
                        style={{ cursor: 'pointer' }}
                    />
                    <Link to="/" className="branding-text-link">
                        <h1 className="branding-text">덜지니어스 대여소</h1>
                    </Link>
                </div>

                {/* [MODIFIED] Hide Join Button for Paid Users */}
                {!isPaidUser && (
                    <a
                        href={LINKS.recruit}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="recruit-pill-btn"
                    >
                        🚀 부원 가입 신청하기
                    </a>
                )}
            </div>
        </header>
    );
};

export default Header;
