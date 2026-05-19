import './ModalButton.css';

/**
 * 공용 모달 버튼.
 * variant: "primary" | "cancel" | "danger"
 * 호버/액티브 효과는 CSS :hover/:active 로 처리해 리렌더 비용 0.
 */
function ModalButton({
    variant = 'primary',
    type = 'button',
    onClick,
    disabled = false,
    style,
    children,
    ariaLabel,
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`modal-btn modal-btn--${variant}`}
            style={style}
        >
            {children}
        </button>
    );
}

export default ModalButton;
