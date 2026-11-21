import { SettingsIcon, Spinner, ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect } from 'react';

import { ProxyTestId } from '../../../../shared/constants/testId.js';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { proxyClasses } from '../../../app/proxyStyles.js';

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
                className={`dsh-core-root ${proxyClasses('cardBar')}`}
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
        <div
            className={`dsh-core-root ${proxyClasses('cardBar')}`}
            data-theme={effectiveTheme}
            data-testid={ProxyTestId.providerCard(providerId)}>
            <div className={proxyClasses('cardLeft')}>
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
                        className={proxyClasses('badge', 'badgeWarn')}
                        title={tProxy(
                            `Host ${conflict.host} is shared by multiple providers with different proxy settings. Active proxy "${conflict.appliedProfileName}" is applied to the entire host.`
                        )}>
                        {tProxy(`⚠ Host conflict (${conflict.host} → ${conflict.appliedProfileName})`)}
                    </span>
                ) : undefined}
            </div>
            <div className={proxyClasses('cardRight')}>
                <button
                    type="button"
                    className={proxyClasses('button', 'buttonIcon')}
                    aria-label={tProxy('Proxy settings')}
                    title={tProxy('Proxy settings')}
                    onClick={() => proxyStore.publish({ modalOpen: true })}>
                    <SettingsIcon />
                </button>
            </div>
        </div>
    );
}
