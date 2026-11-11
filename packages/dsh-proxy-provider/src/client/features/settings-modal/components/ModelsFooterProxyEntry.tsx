import { useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect } from 'react';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { ensureProxyStyles, proxyScopeClass } from '../../../app/proxyStyles.js';
import { ProxySettingsModal } from './ProxySettingsModal.js';

/**
 * Нижняя информационная панель и кнопка открытия настроек прокси в разделе моделей DSH.
 */
export function ModelsFooterProxyEntry() {
    const effectiveTheme = useEffectiveTheme();
    const snap = useProxyStore();

    useEffect(() => {
        ensureProxyStyles();
        proxyStore.refresh().catch(() => {});
    }, []);

    const profilesCount = snap.config?.profiles?.length || 0;
    const activeCount = Object.values(snap.config?.providerBindings || {}).filter(Boolean).length;
    const conflictsCount = snap.conflicts?.length || 0;

    return (
        <>
            <div className={`kpp-footer-row ${proxyScopeClass}`} data-theme={effectiveTheme}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                    <button type="button" className="kpp-btn" onClick={() => proxyStore.publish({ modalOpen: true })}>
                        {tProxy('Proxy settings')}
                    </button>
                    <span className="kpp-host-sub">{tProxy(`${profilesCount} profile(s) • ${activeCount} proxied provider(s)`)}</span>
                    {conflictsCount > 0 ? (
                        <span className="kpp-badge kpp-badge-warn">{tProxy(`⚠ ${conflictsCount} host conflict(s)`)}</span>
                    ) : undefined}
                </div>
            </div>
            <ProxySettingsModal open={snap.modalOpen} onClose={() => proxyStore.publish({ modalOpen: false })} />
        </>
    );
}
