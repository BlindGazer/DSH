export interface NotificationProps {
    readonly severity: 'error' | 'warning' | 'info' | 'success';
    readonly title: string;
    readonly message: string;
    readonly onClose: () => void;
    readonly copyLabel: string;
    readonly closeLabel: string;
}
/** Постоянное уведомление сохраняет доступ к диагностике до явного закрытия. */
export declare function Notification({ severity, title, message, onClose, copyLabel, closeLabel }: NotificationProps): import("react").JSX.Element;
