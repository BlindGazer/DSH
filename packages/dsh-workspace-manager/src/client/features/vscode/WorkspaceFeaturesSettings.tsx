import { Button, Notification, Spinner, useEffectiveTheme } from '@kalex/dsh-core';
import { useSyncExternalStore } from 'react';
import type { Translate } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorkspaceManagerClientContext } from '../../models/WorkspaceManagerClientContext.ts';
import { SettingRow } from '../manage-workspaces/components/SettingRow.tsx';
import { useVscodeSettings } from './hooks/useVscodeSettings.ts';

interface WorkspaceFeaturesSettingsProps {
    readonly locale: WorkspaceManagerClientContext['locale'];
    readonly t: Translate;
}

export function WorkspaceFeaturesSettings({ locale, t }: WorkspaceFeaturesSettingsProps) {
    useSyncExternalStore(
        listener => locale.subscribe(listener),
        () => locale.getSnapshot()
    );
    const theme = useEffectiveTheme();
    const { enabled, ready, saving, error, update, dismissError, retry } = useVscodeSettings();
    return (
        <section className="dsh-core-root addir-settings workspace-manager-features" data-theme={theme}>
            <h2>{t('featuresTitle')}</h2>
            <SettingRow
                id="vscode"
                label={t('vscodeFeature')}
                note={t('vscodeFeatureNote')}
                checked={enabled}
                disabled={!ready || saving}
                onChange={value => void update(value)}
            />
            {saving || (!ready && error === undefined) ? <Spinner /> : null}
            {error === 'featuresLoadFailed' ? (
                <div>
                    <p>{t(error)}</p>
                    <Button onClick={retry}>{t('retry')}</Button>
                </div>
            ) : error === 'featuresSaveFailed' ? (
                <Notification
                    severity="error"
                    title={t('featuresTitle')}
                    message={t(error)}
                    onClose={dismissError}
                    copyLabel={t('vscodeCopy')}
                    closeLabel={t('close')}
                />
            ) : null}
        </section>
    );
}
