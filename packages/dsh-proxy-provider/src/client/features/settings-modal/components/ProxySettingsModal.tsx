import { useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect, useState } from 'react';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { proxyScopeClass } from '../../../app/proxyStyles.js';
import { ImportExportSection } from '../../import-export/components/ImportExportSection.js';
import { useImportExportHandlers } from '../../import-export/hooks/useImportExportHandlers.js';
import { ProfilesSection } from '../../profiles/components/ProfilesSection.js';
import { useProfileActions } from '../../profiles/hooks/useProfileActions.js';
import { RoutingSection } from '../../routing/components/RoutingSection.js';

export interface ProxySettingsModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
}

/**
 * Модальное окно управления профилями прокси, маршрутизацией провайдеров и экспортом/импортом.
 */
export function ProxySettingsModal({ open, onClose }: ProxySettingsModalProps) {
    const effectiveTheme = useEffectiveTheme();
    const snap = useProxyStore();
    const { resetForOpen: resetProfileForOpen, ...profileActions } = useProfileActions(snap);
    const { resetForOpen: resetImportExportForOpen, ...importExport } = useImportExportHandlers({
        setEditingDraft: profileActions.setEditingDraft
    });
    const [providerSearch, setProviderSearch] = useState('');

    useEffect(() => {
        if (!open) return;
        proxyStore.refresh().catch(() => {});
        resetProfileForOpen();
        resetImportExportForOpen();
    }, [open, resetImportExportForOpen, resetProfileForOpen]);

    if (!open) return undefined;

    return (
        <div className={`kpp-modal-backdrop ${proxyScopeClass}`} data-theme={effectiveTheme}>
            <div className="kpp-modal" role="dialog" aria-modal="true" aria-label={tProxy('Proxy settings')}>
                <div className="kpp-modal-header">
                    <h2 className="kpp-modal-title">{tProxy('Proxy settings')}</h2>
                    <ImportExportSection placement="header" {...importExport} />
                    <button type="button" className="kpp-btn kpp-btn-sm" onClick={onClose}>
                        {tProxy('Close')}
                    </button>
                </div>
                <div className="kpp-modal-body">
                    <ImportExportSection placement="body" snap={snap} {...importExport} />
                    <ProfilesSection {...profileActions} />
                    <RoutingSection
                        providers={profileActions.providers}
                        profiles={profileActions.profiles}
                        bindings={profileActions.bindings}
                        conflicts={profileActions.conflicts}
                        providerSearch={providerSearch}
                        setProviderSearch={setProviderSearch}
                    />
                </div>
            </div>
        </div>
    );
}
