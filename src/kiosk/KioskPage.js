// src/kiosk/KioskPage.js
import React, { useState, useEffect, useRef } from 'react';
import './Kiosk.css';
import { useToast } from '../contexts/ToastContext'; // Toast 알림
import MatchModal from './MatchModal';
import RouletteModal from './RouletteModal';
import RentalModal from './RentalModal';

// [Constants]
const MASTER_KEY = "dullgenius_2024"; // 실제 운영 시에는 환경변수로 빼는 것이 좋음
const IDLE_TIMEOUT_MS = 180000; // 3분 (번인 방지)
const REFRESH_HOUR = 4; // 새벽 4시 자동 새로고침

function KioskPage() {
    const { showToast } = useToast();

    // [State]
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [activationCode, setActivationCode] = useState("");
    const [isIdle, setIsIdle] = useState(false);

    // [Clock State]
    const [currentTime, setCurrentTime] = useState(new Date());

    // [Modals State]
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [showRouletteModal, setShowRouletteModal] = useState(false);
    const [showRentalModal, setShowRentalModal] = useState(false); // [NEW]

    const idleTimerRef = useRef(null);

    // [Effect 1] 초기 인증 체크 & 자동 새로고침 스케줄러
    useEffect(() => {
        const token = localStorage.getItem('kiosk_token');
        if (token === 'AUTHORIZED') {
            setIsAuthorized(true);
        }

        // 새벽 4시 리프레시 체크 (1분마다)
        const refreshInterval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === REFRESH_HOUR && now.getMinutes() === 0) {
                window.location.reload();
            }
        }, 60000);

        return () => clearInterval(refreshInterval);
    }, []);

    // [Effect: Wake Lock] Prevent screen sleep
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.log(err);
            }
        };
        requestWakeLock();

        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock) wakeLock.release();
        };
    }, []);

    // [Effect 2] 실시간 시계 (1초마다 업데이트 - 리소스 소모 미미함)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // [Effect 3] 유휴 시간 감지 (Screen Saver)
    useEffect(() => {
        const resetTimer = () => {
            if (isIdle) setIsIdle(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

            idleTimerRef.current = setTimeout(() => {
                setIsIdle(true);
            }, IDLE_TIMEOUT_MS);
        };

        // 터치/클릭 이벤트 리스너 -> 타이머 초기화
        window.addEventListener('click', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        window.addEventListener('mousemove', resetTimer);

        resetTimer(); // 초기 실행

        return () => {
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
            window.removeEventListener('mousemove', resetTimer);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isIdle]);

    // [Handlers]
    const handleActivation = () => {
        if (activationCode === MASTER_KEY) {
            localStorage.setItem('kiosk_token', 'AUTHORIZED');
            setIsAuthorized(true);
            showToast("✅ 기기 인증 완료! 키오스크 모드를 시작합니다.", { type: "success" });
        } else {
            showToast("❌ 인증 실패. 마스터 키를 확인하세요.", { type: "error" });
        }
    };

    // [Views]
    if (!isAuthorized) {
        return (
            <div className="activation-screen">
                <h1 style={{ marginBottom: "30px" }}>🔒 기기 인증 필요</h1>
                <input
                    type="password"
                    className="activation-input"
                    placeholder="Master Key 입력"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleActivation()}
                />
                <button
                    className="kiosk-btn"
                    style={{ fontSize: "1rem", padding: "10px 30px", background: "#333" }}
                    onClick={handleActivation}
                >
                    인증하기
                </button>
            </div>
        );
    }

    if (isIdle) {
        return <ScreenSaver onWake={() => setIsIdle(false)} />;
    }

    return (
        <div className="kiosk-container">
            {/* 상단바 */}
            <header style={{ padding: "20px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>🎲 덜지니어스 키오스크</div>
                <div style={{ fontSize: "1rem", color: "#888", fontFamily: "monospace" }}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </header>

            {/* 메인 대시보드 */}
            <div className="kiosk-dashboard">
                <button className="kiosk-btn btn-match" onClick={() => setShowMatchModal(true)}>
                    <div className="btn-icon">⚔️</div>
                    매치 등록
                    <span style={{ fontSize: "1rem", marginTop: "10px", fontWeight: "normal" }}>승자 +200P / 패자 +50P</span>
                </button>

                <button className="kiosk-btn" style={{ background: "linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)" }} onClick={() => setShowRentalModal(true)}>
                    <div className="btn-icon">📥</div>
                    대여하기
                    <span style={{ fontSize: "1rem", marginTop: "10px", fontWeight: "normal" }}>본인 검색 & 인증</span>
                </button>

                <button className="kiosk-btn btn-return" onClick={() => setShowReturnModal(true)}>
                    <div className="btn-icon">📦</div>
                    반납하기
                    <span style={{ fontSize: "1rem", marginTop: "10px", fontWeight: "normal" }}>대여중인 게임 반납</span>
                </button>

                <button className="kiosk-btn btn-roulette" onClick={() => setShowRouletteModal(true)}>
                    <div className="btn-icon">🎰</div>
                    게임 추천
                    <span style={{ fontSize: "1rem", marginTop: "10px", fontWeight: "normal" }}>뭐 할지 모를 때!</span>
                </button>
            </div>

            {/* 플로팅 반납 버튼 (어디서든 접근 가능) */}
            <button className="floating-return-btn" onClick={() => setShowReturnModal(true)}>
                📦
            </button>

            {/* 매치 모달 */}
            {showMatchModal && <MatchModal onClose={() => setShowMatchModal(false)} />}

            {/* 룰렛 모달 */}
            {showRouletteModal && <RouletteModal onClose={() => setShowRouletteModal(false)} />}

            {/* 반납 모달 */}
            {showReturnModal && <ReturnModal onClose={() => setShowReturnModal(false)} />}

            {/* [NEW] 무인 대여 모달 */}
            {showRentalModal && <RentalModal onClose={() => setShowRentalModal(false)} />}
        </div>
    );
}

// [Sub Component] Screen Saver
function ScreenSaver({ onWake }) {
    const [position, setPosition] = useState({ top: 30, left: 30 });

    // Pixel Shift (10초마다 위치 이동)
    useEffect(() => {
        const interval = setInterval(() => {
            const top = Math.floor(Math.random() * 80) + 10; // 10% ~ 90%
            const left = Math.floor(Math.random() * 80) + 10;
            setPosition({ top, left });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="screen-saver" onClick={onWake} onTouchStart={onWake}>
            <div className="saver-content" style={{ top: `${position.top}%`, left: `${position.left}%` }}>
                🎲 DullGenius
                <div style={{ fontSize: "1rem", marginTop: "10px" }}>Touch to Wake Up</div>
            </div>
        </div>
    );
}

export default KioskPage;
