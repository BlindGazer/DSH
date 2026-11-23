import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import { ThemedSelect, Tooltip } from '@kalex/dsh-core';

import type {
    DiscoveredProvider,
    HostConflict,
    HostConflictProviderEntry,
    SanitizedProxyProfile
} from '../../../../shared/models/ProxyModels.ts';
import { proxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';

export interface RoutingSectionProps extends DshLocalizedSlotProps {
    readonly active: string;
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
export function RoutingSection({
    providers,
    profiles,
    bindings,
    conflicts,
    providerSearch,
    setProviderSearch,
    t,
    active
}: RoutingSectionProps) {
    // При обновлении снимок API может быть неполным, поэтому рендерим только массивы.
    const providerList: readonly DiscoveredProvider[] = Array.isArray(providers) ? providers : [];
    const profileList: readonly SanitizedProxyProfile[] = Array.isArray(profiles) ? profiles : [];
    const conflictList: readonly HostConflict[] = Array.isArray(conflicts) ? conflicts : [];
    const routingOptions = [
        { value: '', label: t('Direct (No proxy)') },
        ...profileList.map(profile => ({
            value: profile.id,
            label: `${profile.name} (${profile.protocol.toUpperCase()} ${profile.host}:${profile.port})`
        }))
    ];

    const searchNeedle = providerSearch.trim().toLowerCase();
    const filteredProviders = searchNeedle
        ? providerList.filter(provider => {
              const nameMatch = (provider.name || '').toLowerCase().includes(searchNeedle);
              const idMatch = (provider.id || '').toLowerCase().includes(searchNeedle);
              const hostMatch = (provider.hosts || []).some((host: string) => host.toLowerCase().includes(searchNeedle));
              return nameMatch || idMatch || hostMatch;
          })
        : providerList;

    return (
        <div className={proxyClasses('section')}>
            <div className={proxyClasses('sectionHead')}>
                <h3 className={proxyClasses('sectionTitle')}>
                    {t('routingCount', {
                        shown: new Intl.NumberFormat(active).format(filteredProviders.length),
                        total: new Intl.NumberFormat(active).format(providerList.length)
                    })}
                </h3>
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
                        className={proxyClasses('input')}
                        placeholder={t('Search provider by name or host...')}
                        value={providerSearch}
                        onChange={e => setProviderSearch(e.target.value)}
                    />
                    {providerSearch ? (
                        <Tooltip content={t('Clear search')} triggerElement="span">
                            <button type="button" className={proxyClasses('button', 'buttonSmall')} onClick={() => setProviderSearch('')}>
                                ✕
                            </button>
                        </Tooltip>
                    ) : undefined}
                </div>
            </div>

            {conflictList.length > 0 ? (
                <div className={proxyClasses('alert', 'alertWarn')}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚠ {t('Domain / Host Routing Conflict Detected')}</div>
                    {conflictList.map(c => (
                        <div key={c.host}>
                            {t('routingConflict', {
                                host: c.host,
                                providers: c.providers
                                    .map((p: HostConflictProviderEntry) => `${p.providerName}: ${p.profileName}`)
                                    .join(', '),
                                profile: c.appliedProfileName
                            })}
                        </div>
                    ))}
                </div>
            ) : undefined}

            {filteredProviders.length === 0 ? (
                <div className={proxyClasses('hostSub')}>{t('noMatchingProviders', { query: providerSearch.trim() })}</div>
            ) : (
                <div className={proxyClasses('list')}>
                    {filteredProviders.map(prov => {
                        const boundId = bindings[prov.id] || '';
                        return (
                            <div key={prov.id} className={proxyClasses('row')}>
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{prov.name}</span>
                                        {prov.custom ? (
                                            <span className={proxyClasses('badge', 'badgeDirect')}>{t('Custom')}</span>
                                        ) : undefined}
                                    </div>
                                    <div className={proxyClasses('hostSub')}>
                                        {prov.hosts && prov.hosts.length > 0
                                            ? t('hosts', { hosts: prov.hosts.join(', ') })
                                            : t('providerId', { id: prov.id })}
                                    </div>
                                </div>
                                <ThemedSelect
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
