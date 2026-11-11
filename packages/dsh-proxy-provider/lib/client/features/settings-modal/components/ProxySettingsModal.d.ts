export interface ProxySettingsModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
}
/**
 * Модальное окно управления профилями прокси, маршрутизацией провайдеров и экспортом/импортом.
 */
export declare function ProxySettingsModal({ open, onClose }: ProxySettingsModalProps): import("react").JSX.Element | undefined;
