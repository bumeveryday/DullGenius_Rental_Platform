import React, { useState, useEffect } from 'react';

// 키오스크 PWA 설치 안내 배너
// - display-mode: standalone(이미 설치돼 PWA로 실행 중)이면 숨김
// - localStorage 사용 안 함: 새로고침/재진입마다 다시 노출 (키오스크 업데이트 시점마다 재확인)
export default function KioskInstallNudge() {
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
        if (isStandalone) return;

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);
        setVisible(true);

        if (ios) return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!visible) return null;

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setVisible(false);
    };

    const message = isIOS
        ? 'Safari 공유(□↑) → "홈 화면에 추가" 로 설치하세요.'
        : deferredPrompt
            ? '"설치하기" 를 누르면 키오스크 앱으로 설치됩니다.'
            : '주소창 우측 ⋮ 메뉴 → "앱 설치" 를 눌러주세요.';

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
                color: '#fff',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                zIndex: 9000,
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    📱 키오스크 PWA 설치 / 업데이트
                </div>
                <div style={{ fontSize: '0.88rem', marginTop: '4px', opacity: 0.95 }}>
                    {message}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {!isIOS && deferredPrompt && (
                    <button
                        onClick={handleInstall}
                        style={{
                            background: '#fff',
                            color: '#FF5E62',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                        }}
                    >
                        설치하기
                    </button>
                )}
                <button
                    onClick={() => setVisible(false)}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                    }}
                >
                    나중에
                </button>
            </div>
        </div>
    );
}
