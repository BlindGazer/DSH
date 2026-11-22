import { Button, Spinner, useEffectiveTheme } from '@kalex/dsh-core';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import { TestId } from '../../../../shared/constants/testId.ts';
import type { UseWorkspaceSnapshot } from '../../../models/WorkspaceManagerClientContext.ts';
import { useGlobalConfig } from '../hooks/useGlobalConfig.ts';
import { SettingRow } from './SettingRow.tsx';
import { WorkspaceEditorList } from './WorkspaceEditorList.tsx';

export interface SettingsSectionProps {
    readonly t: Translate;
    readonly useWorkspaces: UseWorkspaceSnapshot;
    readonly openEdit: (workspaceId: string) => void;
}

export function AddirSettingsSection({ t, useWorkspaces, openEdit }: SettingsSectionProps) {
    const theme = useEffectiveTheme();
    const { config, busy, error, saved, update, save } = useGlobalConfig();
    return (
        <section className="dsh-core-root addir-settings" data-theme={theme} data-testid={TestId.WorkspaceManager.Settings}>
            <h2>{t('globalTitle')}</h2>
            <p>{t('globalNote')}</p>
            {config === undefined ? (
                error === undefined ? (
                    <Spinner />
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
                            {busy ? <Spinner markLoadingRoot={false} /> : undefined}
                            {t('save')}
                        </Button>
                    </div>
                </>
            )}
            <WorkspaceEditorList useWorkspaces={useWorkspaces} openEdit={openEdit} t={t} />
            {error !== undefined ? <div className="addir-error">{error}</div> : undefined}
            {saved ? <p>{t('saved')}</p> : undefined}
        </section>
    );
}
