import React, { useState, useEffect } from 'react';
import './LoginTooltip.css';

const LoginTooltip = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 세션 스토리지에서 닫힘 여부 확인
        const isClosed = sessionStorage.getItem('login_tooltip_closed');
        if (!isClosed) {
            // 약간의 딜레이 후 표시 (자연스러운 등장을 위해)
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = (e) => {
        e.stopPropagation(); // 부모 링크 클릭 방지
        setIsVisible(false);
        sessionStorage.setItem('login_tooltip_closed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="login-tooltip-container">
            <span>대여를 위해서는 로그인해주세요!</span>
            <button
                className="login-tooltip-close"
                onClick={handleClose}
                aria-label="닫기"
            >
                ×
            </button>
        </div>
    );
};

export default LoginTooltip;
