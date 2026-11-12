import { Button, Spinner } from '@kalex/dsh-core';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import { TestId } from '../../../../shared/constants/testId.js';
import type { UseWorkspaceSnapshot } from '../../../models/WorkspaceManagerClientContext.js';
import { useGlobalConfig } from '../hooks/useGlobalConfig.js';
import { SettingRow } from './SettingRow.js';
import { WorkspaceEditorList } from './WorkspaceEditorList.js';

export interface SettingsSectionProps {
    readonly t: Translate;
    readonly useWorkspaces: UseWorkspaceSnapshot;
    readonly openEdit: (workspaceId: string) => void;
}

export function AddirSettingsSection({ t, useWorkspaces, openEdit }: SettingsSectionProps) {
    const { config, busy, error, saved, update, save } = useGlobalConfig();
    return (
        <section className="addir-settings" data-testid={TestId.WorkspaceManager.Settings}>
            <h2>{t('globalTitle')}</h2>
            <p>{t('globalNote')}</p>
            {config === undefined ? (
                error === undefined ? (
                    <Spinner label={t('loading')} />
                ) : undefined
            ) : (
                <>
                    <SettingRow
                        id="tools"
                        label={t('tools')}
                        note={t('toolsNote')}
                        checked={config.enableTools}
                        disabled={busy}
                        onChange={value => update('enableTools', value)}
                    />
                    <SettingRow
                        id="context"
                        label={t('context')}
                        note={t('contextNote')}
                        checked={config.enableContextInjection}
                        disabled={busy}
                        onChange={value => update('enableContextInjection', value)}
                    />
                    <SettingRow
                        id="guard"
                        label={t('guard')}
                        note={t('guardNote')}
                        checked={config.enforceReadOnly}
                        disabled={busy}
                        onChange={value => update('enforceReadOnly', value)}
                    />
                    <div>
                        <Button
                            variant="primary"
                            disabled={busy}
                            onClick={() => {
                                void save();
                            }}>
                            {busy ? <Spinner label={t('loading')} markLoadingRoot={false} /> : undefined}
                            {t('save')}
                        </Button>
                    </div>
                </>
            )}
            <WorkspaceEditorList useWorkspaces={useWorkspaces} openEdit={openEdit} t={t} />
            {error !== undefined ? (
                <div className="addir-error" role="alert">
                    {error}
                </div>
            ) : undefined}
            {saved ? <p role="status">{t('saved')}</p> : undefined}
        </section>
    );
}
