import { Spinner, ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect } from 'react';

import { ProxyTestId } from '../../../../shared/constants/testId.js';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { proxyScopeClass } from '../../../app/proxyStyles.js';

export interface ProviderCardProxyEntryProps {
    readonly provider?: string | { readonly provider?: string; readonly id?: string };
    readonly providerId?: string;
}

/**
 * Компактная строка выбора профиля прокси и кнопки настроек внутри карточки провайдера DSH.
 */
export function ProviderCardProxyEntry(props: ProviderCardProxyEntryProps) {
    const effectiveTheme = useEffectiveTheme();
    const snap = useProxyStore();
    const providerEntry = props?.provider;
    const providerId =
        (typeof providerEntry === 'string' ? providerEntry : providerEntry?.provider || providerEntry?.id) || props?.providerId || '';

    useEffect(() => {
        if (proxyStore.snapshot.loading) {
            proxyStore.refresh().catch(() => {});
        }
    }, []);

    if (!providerId) return undefined;
    if (snap.loading) {
        return (
            <div
                className={`kpp-card-bar ${proxyScopeClass}`}
                data-theme={effectiveTheme}
                data-testid={ProxyTestId.providerCard(providerId)}>
                <Spinner />
            </div>
        );
    }

    const profiles = snap.config?.profiles || [];
    const boundProfileId = snap.config?.providerBindings?.[providerId] || '';
    const activeProfile = profiles.find(p => p.id === boundProfileId);
    const conflict = (snap.conflicts || []).find(c => c.providers?.some(p => p.providerId === providerId));

    const dropdownOptions = [
        { value: '', label: tProxy('Direct (No proxy)') },
        ...profiles.map(p => ({
            value: p.id,
            label: `${p.name} (${p.protocol.toUpperCase()} ${p.host}:${p.port})`
        }))
    ];

    const handleSelectChange = async (nextVal: string): Promise<void> => {
        const nextId = nextVal || null;
        try {
            await proxyStore.bindProvider(providerId, nextId);
        } catch (err) {
            const errorObj = err as { message?: string };
            proxyStore.publish({
                error: errorObj?.message || tProxy('Failed to update proxy binding')
            });
        }
    };

    return (
        <div className={`kpp-card-bar ${proxyScopeClass}`} data-theme={effectiveTheme} data-testid={ProxyTestId.providerCard(providerId)}>
            <div className="kpp-card-left">
                <ThemedSelect
                    ariaLabel={tProxy(`Proxy profile for ${providerId}`)}
                    value={activeProfile ? activeProfile.id : ''}
                    options={dropdownOptions}
                    onChange={nextVal => {
                        handleSelectChange(nextVal).catch(() => {});
                    }}
                    showCheckmark={true}
                />
                {conflict ? (
                    <span
                        className="kpp-badge kpp-badge-warn"
                        title={tProxy(
                            `Host ${conflict.host} is shared by multiple providers with different proxy settings. Active proxy "${conflict.appliedProfileName}" is applied to the entire host.`
                        )}>
                        {tProxy(`⚠ Host conflict (${conflict.host} → ${conflict.appliedProfileName})`)}
                    </span>
                ) : undefined}
            </div>
            <div className="kpp-card-right">
                <button
                    type="button"
                    className="kpp-btn kpp-btn-icon"
                    aria-label={tProxy('Proxy settings')}
                    title={tProxy('Proxy settings')}
                    onClick={() => proxyStore.publish({ modalOpen: true })}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.21l-2.39.96a7.2 7.2 0 0 0-1.62-.92l-.36-2.57a.5.5 0 0 0-.47-.41h-3.84a.5.5 0 0 0-.47.41L9.26 5.38a7.2 7.2 0 0 0-1.62.92l-2.39-.96a.5.5 0 0 0-.59.21L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.21.37.29.59.21l2.39-.96c.5.38 1.03.69 1.62.92l.36 2.57a.5.5 0 0 0 .47.41h3.84a.5.5 0 0 0 .47-.41l.36-2.57a7.2 7.2 0 0 0 1.62-.92l2.39.96a.5.5 0 0 0 .59-.21l1.92-3.32a.5.5 0 0 0-.12-.61l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
