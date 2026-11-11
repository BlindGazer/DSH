import type { ExportedProxyConfigPayload, ProxyProfile, ProxyStateSnapshot, SanitizedProxyConfig, TestConnectionResult } from '../../shared/models/ProxyModels.js';
import type { MasterKeyProvider, ProfileDispatcherLifecycle, ProxyConfigStorage, RawConfigCandidate, RawProfileCandidate } from '../models/ProxyServiceContracts.js';
import { type HostDiscoveryContext, type ProviderInfoCandidate } from './providerDiscovery.js';
/**
 * Контракт контроллера состояния и маршрутизации прокси-серверов.
 */
export interface ProviderProxyController {
    readonly config: SanitizedProxyConfig;
    readonly originalFetch: typeof fetch;
    refreshRouting(): Promise<ProxyStateSnapshot>;
    getStateSnapshot(): ProxyStateSnapshot;
    updateConfig(config: RawConfigCandidate): Promise<ProxyStateSnapshot>;
    bindProvider(providerId: string, profileId: string | null): Promise<ProxyStateSnapshot>;
    exportConfig(options?: {
        readonly includeCredentials?: boolean;
        readonly password?: string;
    }): ExportedProxyConfigPayload;
    importConfig(payload: RawConfigCandidate, password?: string): Promise<ProxyStateSnapshot>;
    resolveProfileWithSecrets(profile: RawProfileCandidate): ProxyProfile | null;
    resolveProfileForUrl(input: string | URL | {
        readonly url?: string;
    } | undefined | null): ProxyProfile | null;
    installFetchInterceptor(): void;
    dispose(): Promise<void>;
    testConnection(profile: ProxyProfile, testUrl?: string): Promise<TestConnectionResult>;
}
export interface ControllerOptions {
    readonly ctx?: HostDiscoveryContext | null;
    readonly initialConfig?: RawConfigCandidate;
    readonly storagePath?: string;
    readonly masterKeyPath?: string;
    readonly extraProviders?: Record<string, ProviderInfoCandidate>;
    readonly fetchTarget?: {
        fetch: typeof fetch;
    };
    readonly configStorage?: ProxyConfigStorage;
    readonly masterKeyProvider?: MasterKeyProvider;
    readonly dispatcherManager?: ProfileDispatcherLifecycle;
}
/**
 * Создает контроллер проксирования провайдеров и устанавливает селективный перехватчик fetch.
 */
export declare function createProviderProxyController(options?: ControllerOptions): ProviderProxyController;
