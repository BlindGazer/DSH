import { type ReactNode, useEffect } from 'react';

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
    theme = 'dark',
    backdropClassName,
    cardClassName,
    children
}: ModalProps) {
    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined;
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open) return undefined;

    return (
        <div
            data-theme={theme}
            data-testid={TestId.Common.ModalBackdrop}
            className={cx('dsh-modal-backdrop', 'ar-modal', 'kpp-modal-backdrop', backdropClassName)}>
            <button type="button" className="dsh-modal-backdrop-control" aria-hidden="true" tabIndex={-1} onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
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
