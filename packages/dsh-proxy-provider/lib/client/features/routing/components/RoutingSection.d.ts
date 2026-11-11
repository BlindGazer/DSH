import type { DiscoveredProvider, HostConflict, SanitizedProxyProfile } from '../../../../shared/models/ProxyModels.js';
export interface RoutingSectionProps {
    readonly providers: readonly DiscoveredProvider[];
    readonly profiles: readonly SanitizedProxyProfile[];
    readonly bindings: Record<string, string | null>;
    readonly conflicts: readonly HostConflict[];
    readonly providerSearch: string;
    readonly setProviderSearch: (next: string) => void;
}
/**
 * Секция назначения профилей прокси провайдерам с поиском и предупреждениями о конфликтах доменов.
 */
export declare function RoutingSection({ providers, profiles, bindings, conflicts, providerSearch, setProviderSearch }: RoutingSectionProps): import("react").JSX.Element;
