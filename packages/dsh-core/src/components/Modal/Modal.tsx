import { type ReactNode, useEffect, useRef } from 'react';

import { TestId } from '../../constants/testId.js';
import type { DshThemeId } from '../../models/DshContext.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства модального окна Modal дизайн-системы @kalex/dsh-core.
 */
export interface ModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title?: ReactNode;
    readonly headerExtra?: ReactNode;
    readonly closeLabel?: string;
    readonly theme?: DshThemeId;
    readonly backdropClassName?: string;
    readonly cardClassName?: string;
    readonly children: ReactNode;
}

/**
 * Универсальное модальное окно с поддержкой активной темы DSH, клавиши Escape и закрытия по клику вне карточки.
 */
export function Modal({
    open,
    onClose,
    title,
    headerExtra,
    closeLabel = 'Close',
    theme,
    backdropClassName,
    cardClassName,
    children
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement | undefined>(undefined);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined;
        const previousFocus = document.activeElement;
        const dialog = dialogRef.current;
        const focusableSelector =
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = (): HTMLElement[] =>
            Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
                element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
            );
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !dialog) return;
            const elements = focusableElements();
            const first = elements[0];
            const last = elements.at(-1);
            if (!first || !last) {
                event.preventDefault();
                dialog.focus();
            } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        focusableElements()[0]?.focus();
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, [open]);

    if (!open) return undefined;

    return (
        <div
            data-theme={theme}
            data-testid={TestId.Common.ModalBackdrop}
            className={cx('dsh-modal-backdrop', 'ar-modal', 'kpp-modal-backdrop', backdropClassName)}>
            <button type="button" className="dsh-modal-backdrop-control" aria-hidden="true" tabIndex={-1} onClick={onClose} />
            <div
                ref={element => {
                    dialogRef.current = element ?? undefined;
                }}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                data-testid={TestId.Common.ModalCard}
                className={cx('dsh-modal-card', 'ar-modal-card', 'kpp-modal', cardClassName)}>
                {title !== undefined || headerExtra !== undefined ? (
                    <div className="dsh-modal-header kpp-modal-header">
                        <div className="dsh-modal-title kpp-modal-title">{title}</div>
                        <div className="dsh-modal-actions ar-settings-header-right">
                            {headerExtra}
                            <button
                                type="button"
                                data-testid={TestId.Common.ModalClose}
                                className="dsh-btn dsh-btn-sm kpp-btn kpp-btn-ghost"
                                aria-label={closeLabel}
                                onClick={onClose}>
                                {closeLabel}
                            </button>
                        </div>
                    </div>
                ) : undefined}
                {children}
            </div>
        </div>
    );
}
