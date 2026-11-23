import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import { SettingsIcon, Spinner, ThemedSelect, Tooltip, useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect } from 'react';

import { ProxyTestId } from '../../../../shared/constants/testId.ts';
import { proxyStore, useProxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';

export interface ProviderCardProxyEntryProps extends DshLocalizedSlotProps {
    readonly provider?: string | { readonly provider?: string; readonly id?: string };
    readonly providerId?: string;
}

/**
 * Компактная строка выбора профиля прокси и кнопки настроек внутри карточки провайдера DSH.
 */
export function ProviderCardProxyEntry(props: ProviderCardProxyEntryProps) {
    const { t } = props;
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
        { value: '', label: t('Direct (No proxy)') },
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
                error: errorObj?.message || 'Failed to update proxy binding'
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
                    value={activeProfile ? activeProfile.id : ''}
                    options={dropdownOptions}
                    onChange={nextVal => {
                        handleSelectChange(nextVal).catch(() => {});
                    }}
                    showCheckmark={true}
                />
                {conflict ? (
                    <Tooltip
                        content={t('cardConflictDetails', { host: conflict.host, profile: conflict.appliedProfileName })}
                        triggerElement="span">
                        <span className={proxyClasses('badge', 'badgeWarn')}>
                            {t('cardConflict', { host: conflict.host, profile: conflict.appliedProfileName })}
                        </span>
                    </Tooltip>
                ) : undefined}
            </div>
            <div className={proxyClasses('cardRight')}>
                <Tooltip content={t('Proxy settings')} triggerElement="span">
                    <button
                        type="button"
                        className={proxyClasses('button', 'buttonIcon')}
                        onClick={() => proxyStore.publish({ modalOpen: true })}>
                        <SettingsIcon />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
