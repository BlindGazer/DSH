import { useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect, useState } from 'react';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { proxyClasses } from '../../../app/proxyStyles.js';
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
        <div className={`dsh-core-root ${proxyClasses('modalBackdrop')}`} data-theme={effectiveTheme}>
            <div className={proxyClasses('modal')} role="dialog" aria-modal="true" aria-label={tProxy('Proxy settings')}>
                <div className={proxyClasses('modalHeader')}>
                    <h2 className={proxyClasses('modalTitle')}>{tProxy('Proxy settings')}</h2>
                    <ImportExportSection placement="header" {...importExport} />
                    <button type="button" className={proxyClasses('button', 'buttonSmall')} onClick={onClose}>
                        {tProxy('Close')}
                    </button>
                </div>
                <div className={proxyClasses('modalBody')}>
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
