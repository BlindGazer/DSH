import type { DiscoveredProvider, HostConflict, KalexProviderProxyConfig, ProxyProfile } from '../../shared/models/ProxyModels.js';
/**
 * Компилирует таблицу маршрутизации хостов в профили прокси и выявляет конфликты доменов между провайдерами.
 */
export declare function compileRoutingTable(providers: readonly DiscoveredProvider[], config: KalexProviderProxyConfig): {
    readonly hostToProfile: Map<string, ProxyProfile>;
    readonly routes: Record<string, string>;
    readonly conflicts: HostConflict[];
};
