import { ThemedSelect } from '@kalex/dsh-core';

import type { DiscoveredProvider, HostConflict, SanitizedProxyProfile } from '../../../../shared/models/ProxyModels.js';
import { proxyStore, tProxy } from '../../../app/proxyStore.js';

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
export function RoutingSection({ providers, profiles, bindings, conflicts, providerSearch, setProviderSearch }: RoutingSectionProps) {
    const routingOptions = [
        { value: '', label: tProxy('Direct (No proxy)') },
        ...profiles.map(profile => ({
            value: profile.id,
            label: `${profile.name} (${profile.protocol.toUpperCase()} ${profile.host}:${profile.port})`
        }))
    ];

    const searchNeedle = providerSearch.trim().toLowerCase();
    const filteredProviders = searchNeedle
        ? providers.filter(provider => {
              const nameMatch = (provider.name || '').toLowerCase().includes(searchNeedle);
              const idMatch = (provider.id || '').toLowerCase().includes(searchNeedle);
              const hostMatch = (provider.hosts || []).some(host => host.toLowerCase().includes(searchNeedle));
              return nameMatch || idMatch || hostMatch;
          })
        : providers;

    return (
        <div className="kpp-section">
            <div className="kpp-section-head">
                <h3 className="kpp-section-title">{tProxy(`2. Provider Routing (${filteredProviders.length}/${providers.length})`)}</h3>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '260px',
                        maxWidth: '100%'
                    }}>
                    <input
                        type="text"
                        className="kpp-input"
                        placeholder={tProxy('Search provider by name or host...')}
                        aria-label={tProxy('Search provider by name or host')}
                        value={providerSearch}
                        onChange={e => setProviderSearch(e.target.value)}
                    />
                    {providerSearch ? (
                        <button
                            type="button"
                            className="kpp-btn kpp-btn-sm"
                            title={tProxy('Clear search')}
                            onClick={() => setProviderSearch('')}>
                            ✕
                        </button>
                    ) : undefined}
                </div>
            </div>

            {conflicts.length > 0 ? (
                <div className="kpp-alert kpp-alert-warn">
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚠ {tProxy('Domain / Host Routing Conflict Detected')}</div>
                    {conflicts.map(c => (
                        <div key={c.host}>
                            {tProxy(
                                `Host "${c.host}" is shared by [${c.providers
                                    .map(p => `${p.providerName}: ${p.profileName}`)
                                    .join(', ')}]. Active proxy "${c.appliedProfileName}" is applied to all requests to ${c.host}.`
                            )}
                        </div>
                    ))}
                </div>
            ) : undefined}

            {filteredProviders.length === 0 ? (
                <div className="kpp-host-sub">{tProxy(`No providers matching "${providerSearch.trim()}".`)}</div>
            ) : (
                <div className="kpp-list">
                    {filteredProviders.map(prov => {
                        const boundId = bindings[prov.id] || '';
                        return (
                            <div key={prov.id} className="kpp-row">
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{prov.name}</span>
                                        {prov.custom ? <span className="kpp-badge kpp-badge-direct">{tProxy('Custom')}</span> : undefined}
                                    </div>
                                    <div className="kpp-host-sub">
                                        {prov.hosts && prov.hosts.length > 0
                                            ? `Hosts: ${prov.hosts.join(', ')}`
                                            : `Provider ID: ${prov.id}`}
                                    </div>
                                </div>
                                <ThemedSelect
                                    ariaLabel={tProxy(`Route for ${prov.name}`)}
                                    value={boundId}
                                    options={routingOptions}
                                    onChange={nextVal => {
                                        proxyStore.bindProvider(prov.id, nextVal || null).catch(() => {});
                                    }}
                                    showCheckmark={true}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
