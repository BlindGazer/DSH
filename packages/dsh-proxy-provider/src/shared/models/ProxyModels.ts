/**
 * Поддерживаемые протоколы прокси-сервера.
 */
export type ProxyProtocol = 'http' | 'https' | 'socks5';

/**
 * Учетные данные прокси-профиля (в памяти или на диске).
 */
export interface ProxyAuth {
    readonly enabled: boolean;
    readonly username?: string;
    readonly password?: string;
    readonly cipher?: string;
    readonly exportCipher?: string;
    readonly clearCredentials?: boolean;
}

/**
 * Полный профиль прокси-сервера.
 */
export interface ProxyProfile {
    readonly id: string;
    readonly name: string;
    readonly protocol: ProxyProtocol;
    readonly host: string;
    readonly port: number;
    readonly auth?: ProxyAuth;
    readonly ignoreSslErrors: boolean;
}

/**
 * Конфигурация плагина проксирования провайдеров.
 */
export interface KalexProviderProxyConfig {
    readonly profiles: readonly ProxyProfile[];
    readonly providerBindings: Record<string, string | null>;
    readonly defaultTestUrl?: string;
}

/**
 * Обезличенные данные аутентификации для передачи в клиентский интерфейс.
 */
export interface SanitizedProxyAuth {
    readonly enabled: boolean;
    readonly hasCredentials: boolean;
    readonly usernameMask: string;
    readonly exportCipher?: string;
}

/**
 * Обезличенный профиль прокси для клиентского интерфейса (без открытых паролей).
 */
export interface SanitizedProxyProfile {
    readonly id: string;
    readonly name: string;
    readonly protocol: ProxyProtocol;
    readonly host: string;
    readonly port: number;
    readonly auth: SanitizedProxyAuth;
    readonly ignoreSslErrors: boolean;
}

/**
 * Обезличенная конфигурация прокси для клиентского интерфейса.
 */
export interface SanitizedProxyConfig {
    readonly profiles: readonly SanitizedProxyProfile[];
    readonly providerBindings: Record<string, string | null>;
    readonly defaultTestUrl: string;
}

/**
 * Описание обнаруженного провайдера моделей DSH.
 */
export interface DiscoveredProvider {
    readonly id: string;
    readonly name: string;
    readonly custom?: boolean;
    readonly baseUrl?: string;
    readonly hosts: readonly string[];
    readonly settingsNs?: string;
}

/**
 * Участник конфликта маршрутизации по общему хосту.
 */
export interface HostConflictProviderEntry {
    readonly providerId: string;
    readonly providerName: string;
    readonly profileId: string | null;
    readonly profileName: string;
}

/**
 * Описание конфликта маршрутизации, когда несколько провайдеров делят один хост с разными прокси.
 */
export interface HostConflict {
    readonly host: string;
    readonly providers: readonly HostConflictProviderEntry[];
    readonly appliedProfileId: string;
    readonly appliedProfileName: string;
}

/**
 * Результат двухэтапной проверки соединения через прокси (TCP + HTTP).
 */
export interface TestConnectionResult {
    readonly ok: boolean;
    readonly tcpOk: boolean;
    readonly httpOk: boolean;
    readonly status?: number;
    readonly latencyMs?: number;
    readonly tcpLatencyMs?: number;
    readonly error?: string;
}

/**
 * Снимок состояния прокси-плагина для клиентского интерфейса.
 */
export interface ProxyStateSnapshot {
    readonly config: SanitizedProxyConfig;
    readonly providers: readonly DiscoveredProvider[];
    readonly conflicts: readonly HostConflict[];
    readonly routes: Record<string, string>;
}

/**
 * Форма редактирования профиля прокси в клиентском интерфейсе.
 */
export interface ProfileDraft {
    readonly id: string;
    readonly name: string;
    readonly protocol: ProxyProtocol;
    readonly host: string;
    readonly port: string;
    readonly authEnabled: boolean;
    readonly hasCredentials: boolean;
    readonly usernameMask: string;
    readonly username: string;
    readonly password: string;
    readonly ignoreSslErrors: boolean;
}

/**
 * Описание встроенной конечной точки провайдера.
 */
export interface BuiltinProviderEndpoint {
    readonly name: string;
    readonly settingsNs: string;
    readonly urls: readonly string[];
}

/**
 * Экспортируемый пакет настроек прокси.
 */
export interface ExportedProxyConfigPayload extends SanitizedProxyConfig {
    readonly version: number;
    readonly exportedAt: string;
    readonly encryptedCredentials: boolean;
}
