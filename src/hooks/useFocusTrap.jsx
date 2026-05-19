import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * 모달용 포커스 트랩.
 * - active=false 면 아무 리스너도 등록하지 않음 (성능)
 * - 첫 포커스는 옵션으로 받음. 기본은 첫 focusable 요소
 * - Tab/Shift+Tab 순환, ESC로 onEscape 호출
 *
 * @param {object} opts
 * @param {boolean} opts.active 모달이 열려 있는지
 * @param {() => void} opts.onEscape ESC 키 핸들러
 * @param {'first' | 'firstInput'} [opts.initialFocus='first'] 초기 포커스 대상
 * @returns {React.RefObject} 모달 컨테이너에 붙일 ref
 */
export function useFocusTrap({ active, onEscape, initialFocus = 'first' }) {
    const containerRef = useRef(null);
    const previousActiveElement = useRef(null);

    // 부모가 매 렌더마다 새 함수를 넘겨도 effect가 재실행되지 않도록 ref에 보관
    const onEscapeRef = useRef(onEscape);
    useEffect(() => { onEscapeRef.current = onEscape; }, [onEscape]);

    useEffect(() => {
        if (!active) return;
        const container = containerRef.current;
        if (!container) return;

        previousActiveElement.current = document.activeElement;

        const getFocusable = () =>
            Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
                (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null
            );

        // 초기 포커스 (initialFocus='none' 이면 호출자가 직접 처리)
        if (initialFocus !== 'none') {
            const focusables = getFocusable();
            if (focusables.length) {
                let target = focusables[0];
                if (initialFocus === 'firstInput') {
                    target = focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') || focusables[0];
                }
                target.focus();
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onEscapeRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const current = getFocusable();
            if (current.length === 0) {
                e.preventDefault();
                return;
            }
            const first = current[0];
            const last = current[current.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            const prev = previousActiveElement.current;
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, [active, initialFocus]);

    return containerRef;
}
