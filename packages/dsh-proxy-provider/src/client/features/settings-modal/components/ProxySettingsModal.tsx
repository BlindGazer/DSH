import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import { useEffect, useState } from 'react';
import { proxyStore, useProxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';
import { ImportExportSection } from '../../import-export/components/ImportExportSection.tsx';
import { useImportExportHandlers } from '../../import-export/hooks/useImportExportHandlers.ts';
import { ProfilesSection } from '../../profiles/components/ProfilesSection.tsx';
import { useProfileActions } from '../../profiles/hooks/useProfileActions.ts';
import { RoutingSection } from '../../routing/components/RoutingSection.tsx';

export interface ProxySettingsModalProps extends DshLocalizedSlotProps {
    readonly active: string;
    readonly open: boolean;
    readonly onClose: () => void;
}

/**
 * Модальное окно управления профилями прокси, маршрутизацией провайдеров и экспортом/импортом.
 */
export function ProxySettingsModal({ open, onClose, t, active }: ProxySettingsModalProps) {
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
        <div className={proxyClasses('modalBackdrop')}>
            <div className={proxyClasses('modal')}>
                <div className={proxyClasses('modalHeader')}>
                    <h2 className={proxyClasses('modalTitle')}>{t('Proxy settings')}</h2>
                    <ImportExportSection active={active} t={t} placement="header" {...importExport} />
                    <button type="button" className={proxyClasses('button', 'buttonSmall')} onClick={onClose}>
                        {t('Close')}
                    </button>
                </div>
                <div className={proxyClasses('modalBody')}>
                    <ImportExportSection active={active} t={t} placement="body" snap={snap} {...importExport} />
                    <ProfilesSection active={active} t={t} {...profileActions} />
                    <RoutingSection
                        active={active}
                        t={t}
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
