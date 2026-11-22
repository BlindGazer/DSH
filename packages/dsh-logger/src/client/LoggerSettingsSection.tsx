import { IconButton, Notification, RefreshIcon, Spinner, useEffectiveTheme } from '@kalex/dsh-core';
import type { LoggerText } from '../shared/localization.ts';
import type { LoggerSettingsRemote } from '../shared/remote.ts';
import styles from './LoggerManagementPanel.module.css';
import panelCss from './LoggerManagementPanel.module.css?inline';
import { LoggerManagementPanel } from './LoggerManagementPanel.tsx';
import { useLoggerManagement } from './useLoggerManagement.ts';

export interface LoggerSettingsSectionProps {
    readonly remote: LoggerSettingsRemote;
    readonly text: LoggerText;
}
export function LoggerSettingsSection({ remote, text }: LoggerSettingsSectionProps): React.JSX.Element {
    const state = useLoggerManagement(remote);
    const theme = useEffectiveTheme();
    return (
        <section className={`dsh-core-root ${styles.section}`} data-theme={theme}>
            {!state.config ? <style>{panelCss}</style> : null}
            {state.status === 'loading' && !state.config ? (
                <div>
                    <Spinner />
                    <p>{text('loading')}</p>
                </div>
            ) : null}
            {state.noticeOpen ? (
                <Notification
                    severity={state.noticeSeverity}
                    title={text(
                        state.noticeSeverity === 'success'
                            ? 'successTitle'
                            : state.noticeSeverity === 'warning'
                              ? 'warningTitle'
                              : 'errorTitle'
                    )}
                    message={
                        state.noticeSeverity === 'success'
                            ? text('saved')
                            : state.noticeSeverity === 'warning'
                              ? text('cleanupFailed')
                              : [text(state.errorKey), state.errorMessage].filter(Boolean).join('\n')
                    }
                    onClose={state.closeNotice}
                    copyLabel={text('copy')}
                    closeLabel={text('close')}
                />
            ) : null}
            {!state.config ? (
                <IconButton variant="neutral" tooltip={text('reload')} disabled={state.status === 'loading'} onClick={state.reload}>
                    <RefreshIcon />
                </IconButton>
            ) : null}
            {state.config ? (
                <fieldset disabled={state.busy || state.status === 'loading'} className={styles.fieldset}>
                    <LoggerManagementPanel
                        key={`${state.snapshot?.resolvedPath}:${state.reloadVersion}`}
                        text={text}
                        config={state.config}
                        {...(state.snapshot ? { savedConfig: state.snapshot.config, resolvedPath: state.snapshot.resolvedPath } : {})}
                        packageNames={state.snapshot?.packageNames ?? []}
                        onChange={state.setConfig}
                        onEdit={state.closeSuccessNotice}
                        onReload={state.reload}
                        busy={state.busy}
                        loading={state.status === 'loading'}
                        {...(state.preview ? { pathPreview: state.preview } : {})}
                        previewDraft={state.previewDraft}
                        pathPreviewStatus={state.previewStatus}
                        pathError={text('previewError')}
                        onPreviewPath={path => {
                            void state.previewPath(path);
                        }}
                        onSave={config => {
                            void state.save(config);
                        }}
                    />
                </fieldset>
            ) : null}
        </section>
    );
}
