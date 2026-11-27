import { useState } from 'react';
import { createPortal } from 'react-dom';
import { coreStyleScopeClass } from '../../theme/styles.ts';
import { Button } from '../Button/Button.tsx';
import { useNotificationCopy } from './useNotificationCopy.ts';

export interface NotificationProps {
    readonly inline?: boolean;
    readonly severity: 'error' | 'warning' | 'info' | 'success';
    readonly title: string;
    readonly message: string;
    readonly onClose: () => void;
    readonly copyLabel: string;
    readonly closeLabel: string;
}

/** Постоянное уведомление сохраняет доступ к диагностике до явного закрытия. */
export function Notification({ inline, severity, title, message, onClose, copyLabel, closeLabel }: NotificationProps) {
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const { copy, textRef } = useNotificationCopy(`${title}\n${message}`);
    const notice = (
        <aside className={`${coreStyleScopeClass} dsh-notification`} data-severity={severity} data-inline={inline || undefined}>
            <div ref={textRef} className="dsh-notification-text">
                <strong>{title}</strong>
                <p>{message}</p>
            </div>
            <div className="dsh-notification-actions">
                <Button onClick={copy}>{copyLabel}</Button>
                <Button onClick={onClose}>{closeLabel}</Button>
            </div>
        </aside>
    );
    if (inline) return notice;
    return (
        <>
            <span ref={setAnchor} hidden />
            {anchor ? createPortal(notice, anchor.closest('[data-theme]:not(html)') ?? anchor.ownerDocument.body) : null}
        </>
    );
}
