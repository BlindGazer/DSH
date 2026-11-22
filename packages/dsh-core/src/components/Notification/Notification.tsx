import { useState } from 'react';
import { createPortal } from 'react-dom';
import { coreStyleScopeClass } from '../../theme/styles.ts';
import { Button } from '../Button/Button.tsx';
import { useNotificationCopy } from './useNotificationCopy.ts';

export interface NotificationProps {
    readonly severity: 'error' | 'warning' | 'info' | 'success';
    readonly title: string;
    readonly message: string;
    readonly onClose: () => void;
    readonly copyLabel: string;
    readonly closeLabel: string;
}

/** Постоянное уведомление сохраняет доступ к диагностике до явного закрытия. */
export function Notification({ severity, title, message, onClose, copyLabel, closeLabel }: NotificationProps) {
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const { copy, textRef } = useNotificationCopy(`${title}\n${message}`);
    return (
        <>
            <span ref={setAnchor} hidden />
            {anchor &&
                createPortal(
                    <aside className={`${coreStyleScopeClass} dsh-notification`} data-severity={severity}>
                        <div ref={textRef} className="dsh-notification-text">
                            <strong>{title}</strong>
                            <p>{message}</p>
                        </div>
                        <div className="dsh-notification-actions">
                            <Button onClick={copy}>{copyLabel}</Button>
                            <Button onClick={onClose}>{closeLabel}</Button>
                        </div>
                    </aside>,
                    anchor.closest('[data-theme]:not(html)') ?? anchor.ownerDocument.body
                )}
        </>
    );
}
