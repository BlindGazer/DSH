import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import { useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect } from 'react';
import { proxyStore, useProxyStore } from '../../../app/proxyStore.ts';
import { ensureProxyStyles, proxyClasses } from '../../../app/proxyStyles.ts';
import { ProxySettingsModal } from './ProxySettingsModal.tsx';

/**
 * Нижняя информационная панель и кнопка открытия настроек прокси в разделе моделей DSH.
 */
export function ModelsFooterProxyEntry({ t, active }: DshLocalizedSlotProps & { readonly active: string }) {
    const effectiveTheme = useEffectiveTheme();
    const format = new Intl.NumberFormat(active);
    const snap = useProxyStore();

    useEffect(() => {
        ensureProxyStyles();
        proxyStore.refresh().catch(() => {});
    }, []);

    const profilesCount = snap.config?.profiles?.length || 0;
    const activeCount = Object.values(snap.config?.providerBindings || {}).filter(Boolean).length;
    const conflictsCount = snap.conflicts?.length || 0;

    return (
        <div className="dsh-core-root" data-theme={effectiveTheme}>
            <div className={proxyClasses('footerRow')}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                    <button type="button" className={proxyClasses('button')} onClick={() => proxyStore.publish({ modalOpen: true })}>
                        {t('Proxy settings')}
                    </button>
                    <span className={proxyClasses('hostSub')}>
                        {t('summary', { profiles: format.format(profilesCount), providers: format.format(activeCount) })}
                    </span>
                    {conflictsCount > 0 ? (
                        <span className={proxyClasses('badge', 'badgeWarn')}>
                            {t('conflictCount', { count: format.format(conflictsCount) })}
                        </span>
                    ) : undefined}
                </div>
            </div>
            <ProxySettingsModal active={active} t={t} open={snap.modalOpen} onClose={() => proxyStore.publish({ modalOpen: false })} />
        </div>
    );
}
