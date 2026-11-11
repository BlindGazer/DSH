import type { DiscoveredProvider } from '../../shared/models/ProxyModels.js';
export interface ProviderInfoCandidate {
    readonly id?: string;
    readonly provider?: string;
    readonly name?: string;
    readonly displayName?: string;
    readonly baseUrl?: string;
    readonly baseURL?: string;
    readonly defaultBaseURL?: string;
    readonly custom?: boolean;
    readonly declared?: boolean;
    readonly settingsNs?: string;
}
export interface HostDiscoveryContext {
    get?(serviceName: string): object | undefined;
    readonly llm?: {
        listConfigurableProviders?(): Promise<readonly ProviderInfoCandidate[]>;
        listProviders?(): Promise<readonly ProviderInfoCandidate[]>;
    };
    readonly settings?: {
        describe?(ns: string, opts?: {
            readonly redactSecrets?: boolean;
        }): Promise<{
            readonly value?: {
                readonly baseURL?: string;
                readonly baseUrl?: string;
                readonly providers?: Record<string, ProviderInfoCandidate>;
            };
        }>;
    };
    readonly configEditor?: {
        entries?(): ReadonlyArray<{
            readonly options?: {
                readonly id?: string;
                readonly config?: {
                    readonly providers?: Record<string, ProviderInfoCandidate>;
                };
            };
            readonly config?: {
                readonly providers?: Record<string, ProviderInfoCandidate>;
            };
        }>;
    };
}
/**
 * Обнаруживает все встроенные и пользовательские провайдеры моделей из контекста DSH и файлов профиля.
 */
export declare function discoverProviders(ctx?: HostDiscoveryContext | null, extraProviders?: Record<string, ProviderInfoCandidate>): Promise<DiscoveredProvider[]>;
