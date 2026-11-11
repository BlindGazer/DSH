import type { DshLocaleCode } from '@kalex/dsh-core';
import type { DiscoveredProvider, ExportedProxyConfigPayload, HostConflict, ProxyProfile, SanitizedProxyConfig, TestConnectionResult } from '../../shared/models/ProxyModels.js';
export interface ProxyClientSnapshot {
    readonly loading: boolean;
    readonly modalOpen: boolean;
    readonly locale: DshLocaleCode;
    readonly config: SanitizedProxyConfig;
    readonly providers: readonly DiscoveredProvider[];
    readonly conflicts: readonly HostConflict[];
    readonly routes: Record<string, string>;
    readonly error: string | null;
}
/**
 * Реактивное клиентское хранилище состояния плагина @kalex/dsh-proxy-provider.
 */
export declare const proxyStore: {
    snapshot: ProxyClientSnapshot;
    listeners: Set<(snap: ProxyClientSnapshot) => void>;
    subscribe(fn: (snap: ProxyClientSnapshot) => void): () => void;
    publish(patch: Partial<ProxyClientSnapshot>): void;
    refresh(): Promise<void>;
    saveConfig(nextConfig: object): Promise<void>;
    bindProvider(providerId: string, profileId: string | null): Promise<void>;
    testConnection(profile: ProxyProfile, testUrl?: string): Promise<TestConnectionResult>;
    exportConfig(options?: {
        readonly includeCredentials?: boolean;
        readonly password?: string;
    }): Promise<ExportedProxyConfigPayload>;
    importConfig(payload: object, options?: {
        readonly password?: string;
        readonly skipCredentials?: boolean;
    }): Promise<void>;
};
/**
 * Загружает язык интерфейса прокси с учетом сохраненного выбора и языка DSH.
 */
export declare function loadProxyLocale(hostLocale?: string): DshLocaleCode;
/**
 * Сохраняет выбранный пользователем язык интерфейса прокси и обновляет хранилище.
 */
export declare function saveProxyLocale(locale: DshLocaleCode): void;
/**
 * Переводит строку с использованием текущего активного языка прокси.
 */
export declare function tProxy(text: string): string;
/**
 * Реактивный хук подписки на состояние клиентского хранилища прокси.
 */
export declare function useProxyStore(): ProxyClientSnapshot;
