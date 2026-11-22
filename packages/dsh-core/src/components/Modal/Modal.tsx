import { createElement, Fragment, type ReactNode, useEffect, useRef } from 'react';

import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';
import CloseIcon from '../icons/CloseIcon.tsx';
import { Tooltip } from '../Tooltip/Tooltip.tsx';

/**
 * Свойства модального окна Modal дизайн-системы @kalex/dsh-core.
 */
export interface ModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title?: ReactNode;
    readonly headerExtra?: ReactNode;
    readonly footer?: ReactNode;
    readonly description?: ReactNode;
    readonly closeLabel?: string;
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
    footer,
    description,
    closeLabel = 'Close',
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

    // Пустой фрагмент совместим с React 18, где компонент не может возвращать undefined.
    if (!open) return createElement(Fragment);

    return (
        <div data-testid={TestId.Common.ModalBackdrop} className={cx('dsh-modal-backdrop', 'ar-modal', backdropClassName)}>
            <button type="button" className="dsh-modal-backdrop-control" tabIndex={-1} onClick={onClose} />
            <div
                ref={element => {
                    dialogRef.current = element ?? undefined;
                }}
                tabIndex={-1}
                data-testid={TestId.Common.ModalCard}
                className={cx('dsh-modal-card', 'ar-modal-card', cardClassName)}>
                {title !== undefined || headerExtra !== undefined ? (
                    <div className="dsh-modal-header">
                        <div className="dsh-modal-title">{title}</div>
                        <div className="dsh-modal-actions ar-settings-header-right">
                            {headerExtra}
                            <Tooltip content={closeLabel} triggerElement="span" side="bottom">
                                <button
                                    type="button"
                                    data-testid={TestId.Common.ModalClose}
                                    className="dsh-modal-close"
                                    aria-label={closeLabel}
                                    onClick={onClose}>
                                    <CloseIcon size={16} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                ) : undefined}
                {description}
                <div className="dsh-modal-body">{children}</div>
                {footer !== undefined ? <div className="dsh-modal-footer">{footer}</div> : undefined}
            </div>
        </div>
    );
}
