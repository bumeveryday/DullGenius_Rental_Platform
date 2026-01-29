// src/components/ConfirmModal.js
import { useEffect } from 'react';

/**
 * 재사용 가능한 확인 모달 컴포넌트
 * window.confirm()을 대체하여 더 나은 UI/UX 제공
 */
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "확인",
    message,
    confirmText = "확인",
    cancelText = "취소",
    type = "info" // "info" | "warning" | "danger"
}) {

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            // 모달 열릴 때 body 스크롤 방지
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // 타입별 색상 결정
    const getButtonColor = () => {
        switch (type) {
            case 'danger':
                return '#e74c3c';
            case 'warning':
                return '#f39c12';
            default:
                return '#3498db';
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div style={styles.header}>
                    <h3 style={styles.title}>{title}</h3>
                    <button onClick={onClose} style={styles.closeBtn} aria-label="닫기">
                        ✕
                    </button>
                </div>

                {/* 메시지 */}
                <div style={styles.content}>
                    <p style={styles.message}>
                        {message.split('\n').map((line, i) => (
                            <span key={i}>
                                {line}
                                {i < message.split('\n').length - 1 && <br />}
                            </span>
                        ))}
                    </p>
                </div>

                {/* 버튼 */}
                <div style={styles.footer}>
                    <button onClick={onClose} style={styles.cancelBtn}>
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{ ...styles.confirmBtn, backgroundColor: getButtonColor() }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.2s ease-out'
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '450px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        animation: 'slideUp 0.3s ease-out',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f0f0f0'
    },
    title: {
        margin: 0,
        fontSize: '1.3em',
        fontWeight: 'bold',
        color: '#2c3e50'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '1.5em',
        color: '#95a5a6',
        cursor: 'pointer',
        padding: '0',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'all 0.2s'
    },
    content: {
        padding: '24px',
        minHeight: '60px'
    },
    message: {
        margin: 0,
        fontSize: '1em',
        lineHeight: '1.6',
        color: '#555',
        whiteSpace: 'pre-wrap'
    },
    footer: {
        display: 'flex',
        gap: '12px',
        padding: '20px 24px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fafafa'
    },
    cancelBtn: {
        flex: 1,
        padding: '12px 20px',
        border: '1px solid #ddd',
        backgroundColor: 'white',
        color: '#555',
        borderRadius: '8px',
        fontSize: '1em',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    confirmBtn: {
        flex: 1,
        padding: '12px 20px',
        border: 'none',
        color: 'white',
        borderRadius: '8px',
        fontSize: '1em',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    }
};

export default ConfirmModal;
