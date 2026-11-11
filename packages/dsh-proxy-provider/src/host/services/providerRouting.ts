import { BUILTIN_PROVIDER_ENDPOINTS } from '../../shared/constants/endpoints.js';
import type { DiscoveredProvider, HostConflict, KalexProviderProxyConfig, ProxyProfile } from '../../shared/models/ProxyModels.js';
import { resolveProviderHosts } from '../../shared/utils/hostUtils.js';

interface HostRoutingEntry {
    readonly providerId: string;
    readonly providerName: string;
    readonly profileId: string | null;
    readonly profileName: string;
    readonly settingsSignature: string;
}

function profileSettingsSignature(profile: ProxyProfile | null): string {
    if (!profile) return 'direct';
    return JSON.stringify({
        protocol: (profile.protocol || 'http').toLowerCase(),
        host: (profile.host || '').toLowerCase(),
        port: Number(profile.port),
        authEnabled: Boolean(profile.auth?.enabled),
        username: profile.auth?.username ?? '',
        password: profile.auth?.password ?? '',
        cipher: profile.auth?.cipher ?? '',
        ignoreSslErrors: Boolean(profile.ignoreSslErrors)
    });
}

/**
 * Компилирует таблицу маршрутизации хостов в профили прокси и выявляет конфликты доменов между провайдерами.
 */
export function compileRoutingTable(
    providers: readonly DiscoveredProvider[],
    config: KalexProviderProxyConfig
): {
    readonly hostToProfile: Map<string, ProxyProfile>;
    readonly routes: Record<string, string>;
    readonly conflicts: HostConflict[];
} {
    const profilesById = new Map<string, ProxyProfile>();
    for (const profile of config?.profiles || []) {
        if (profile && typeof profile.id === 'string') {
            profilesById.set(profile.id, profile);
        }
    }

    const rawBindings = config?.providerBindings || {};
    const bindings: Record<string, string | null> = { ...rawBindings };
    if (bindings.deepseek && !bindings['deepseek-official']) {
        bindings['deepseek-official'] = bindings.deepseek;
    }

    const hostEntries = new Map<string, HostRoutingEntry[]>();
    const allProviders: DiscoveredProvider[] = [...(providers || [])];
    const seenIds = new Set(allProviders.map(p => p.id));

    for (const rawBoundId of Object.keys(bindings)) {
        const boundProviderId = rawBoundId === 'deepseek' ? 'deepseek-official' : rawBoundId;
        if (!seenIds.has(boundProviderId) && bindings[rawBoundId]) {
            const hosts = resolveProviderHosts(boundProviderId);
            if (hosts.length > 0) {
                allProviders.push({
                    id: boundProviderId,
                    name: BUILTIN_PROVIDER_ENDPOINTS[boundProviderId]?.name || boundProviderId,
                    hosts
                });
                seenIds.add(boundProviderId);
            }
        }
    }

    for (const provider of allProviders) {
        const rawProfileId = bindings[provider.id] ?? null;
        const validProfile = rawProfileId && profilesById.has(rawProfileId) ? (profilesById.get(rawProfileId) ?? null) : null;
        const effectiveProfileId = validProfile ? validProfile.id : null;
        const effectiveProfileName = validProfile ? validProfile.name : 'Direct';
        const settingsSignature = profileSettingsSignature(validProfile);

        for (const rawHost of provider.hosts || []) {
            const host = rawHost.toLowerCase();
            const currentList = hostEntries.get(host) ?? [];
            currentList.push({
                providerId: provider.id,
                providerName: provider.name || provider.id,
                profileId: effectiveProfileId,
                profileName: effectiveProfileName,
                settingsSignature
            });
            hostEntries.set(host, currentList);
        }
    }

    const hostToProfile = new Map<string, ProxyProfile>();
    const routes: Record<string, string> = {};
    const conflicts: HostConflict[] = [];

    for (const [host, entries] of hostEntries.entries()) {
        const distinctSettings = new Set(entries.map(e => e.settingsSignature));
        const firstActive = entries.find(e => e.profileId !== null);

        if (firstActive && firstActive.profileId) {
            const profile = profilesById.get(firstActive.profileId);
            if (profile) {
                hostToProfile.set(host, profile);
                routes[host] = profile.id;
            }
        }

        if (entries.length > 1 && distinctSettings.size > 1 && firstActive && firstActive.profileId) {
            conflicts.push({
                host,
                providers: entries.map(({ providerId, providerName, profileId, profileName }) => ({
                    providerId,
                    providerName,
                    profileId,
                    profileName
                })),
                appliedProfileId: firstActive.profileId,
                appliedProfileName: firstActive.profileName
            });
        }
    }

    return {
        hostToProfile,
        routes,
        conflicts
    };
}
