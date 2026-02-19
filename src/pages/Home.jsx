import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameData } from '../contexts/GameDataContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import InfoBar from '../components/InfoBar';
import Header from '../components/Header'; // [NEW] Header Component
import LazyImage from '../components/common/LazyImage'; // [NEW] Lazy Image
import { sendLog } from '../api';
import './Home.css'; // [NEW] External CSS

const Home = () => {
    const navigate = useNavigate();
    const { games, trending, config, loading } = useGameData();

    useEffect(() => {
        // 페이지 진입 로그
        if (!loading) {
            sendLog(null, 'VIEW', { value: 'Home Page' });
        }
    }, [loading]);

    // 스크롤 위치 복원 (Home)
    useEffect(() => {
        const savedScrollY = sessionStorage.getItem('home_scroll_y');
        if (savedScrollY) {
            setTimeout(() => window.scrollTo(0, parseInt(savedScrollY, 10)), 0);
        }
    }, []);

    // [OPTIMIZATION] useCallback for handler
    const handleNavigation = useCallback((path) => {
        sessionStorage.setItem('home_scroll_y', window.scrollY);
        navigate(path);
    }, [navigate]);

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p style={{ marginTop: "20px", color: "#666" }}>보드게임 정보를 불러오고 있어요...</p>
        </div>
    );

    return (
        <div className="home-container">
            {/* [1] 헤더 (로고, 로그인, 입부신청) - [RESTORED] */}
            <Header />

            {/* [2] 메인 내비게이션 (Big Buttons) */}
            <section className="home-nav-section">
                <div
                    onClick={() => handleNavigation('/categories')}
                    className="home-nav-btn category">
                    <div className="nav-icon">📂</div>
                    <div className="nav-title">카테고리로 찾기</div>
                    <div className="nav-desc">테마별, 인원별</div>
                </div>

                <div
                    onClick={() => handleNavigation('/search')}
                    className="home-nav-btn search">
                    <div className="nav-icon">🔍</div>
                    <div className="nav-title">직접 검색하기</div>
                    <div className="nav-desc">게임명, 필터</div>
                </div>
            </section>



            {/* [4] 요즘 뜨는 게임 (Horizontal Scroll) */}
            <section className="trending-section">
                <h2 className="section-title" style={{ paddingLeft: "20px" }}>🔥 요즘 뜨는 게임</h2>
                <div className="trending-list">
                    {trending.map((game, index) => (
                        <div
                            key={game.id}
                            onClick={() => {
                                sessionStorage.setItem('home_scroll_y', window.scrollY);
                                navigate(`/game/${game.id}`, { state: { game, from: '/' } });
                            }}
                            className="trending-item"
                        >
                            <div className="trending-img-wrapper">
                                <div className="trending-rank">
                                    {index + 1}위
                                </div>
                                {game.image ? (
                                    <LazyImage
                                        src={getOptimizedImageUrl(game.image, 200)}
                                        fallbackSrc={game.image}
                                        alt={game.name}
                                        className="trending-img"
                                        aspectRatio="1/1"
                                    />
                                ) : (
                                    <div className="trending-img" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '1.5em' }}>🎲</span>
                                    </div>
                                )}
                            </div>
                            <div className="trending-name">
                                {game.name}
                            </div>
                            <div className="trending-category">{game.category}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* [5] 하단 정보 바 (InfoBar) - [MOVED TO FOOTER] */}
            <footer className="home-footer">
                <InfoBar games={games} />
            </footer>
        </div>
    );
};

export default Home;
