/**
 * Тестовые идентификаторы компонентов плагина проксирования.
 */
export const ProxyTestId = {
    providerCard: (providerId: string): string => `proxy-card-${providerId}`,
    FooterBar: 'proxy-footer-bar',
    SettingsModal: 'proxy-settings-modal',
    LocaleSettings: 'proxy-locale-settings'
} as const;
