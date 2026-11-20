import { Button, Spinner, SwitchControl, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import type { OpenAIHubRemote } from '../../../shared/remote.js';
import { useOpenAIHubLoggingSettings } from './hooks/useOpenAIHubLoggingSettings.js';
import styles from './loggingSettings.module.scss';

export interface OpenAIHubLoggingSettingsProps {
    readonly remote: OpenAIHubRemote;
    readonly text: (key: OpenAICodexText) => string;
}

export function OpenAIHubLoggingSettings({ remote, text }: OpenAIHubLoggingSettingsProps) {
    const theme = useEffectiveTheme();
    const settings = useOpenAIHubLoggingSettings(remote, text);

    return (
        <section
            id="openai-hub-logging-settings"
            className={`dsh-core-root ${styles.root}`}
            data-theme={theme}
            aria-label={text('loggingTitle')}>
            <header className={styles.header}>
                <div>
                    <h2>{text('loggingTitle')}</h2>
                    <p>{text('loggingDescription')}</p>
                </div>
                <span className={styles.scope}>{text('globalScope')}</span>
            </header>
            {settings.settings ? (
                <>
                    <div className={styles.row}>
                        <span className={styles.copy}>
                            <strong id="openai-hub-logging-label">{text('loggingEnabled')}</strong>
                        </span>
                        <SwitchControl
                            labelledBy="openai-hub-logging-label"
                            checked={settings.settings.enabled}
                            disabled={settings.busy}
                            onChange={settings.updateEnabled}
                        />
                    </div>
                    <p className={styles.pathHint}>
                        {text('loggingPathHint')} <code>~/.dsh/openai-hub/logs</code>
                    </p>
                    <p className={styles.warning}>{text('loggingDisableHint')}</p>
                </>
            ) : settings.error ? (
                <div className={styles.message}>
                    <p role="alert">{settings.error}</p>
                    <Button disabled={settings.busy} onClick={() => void settings.reload()}>
                        {text('retry')}
                    </Button>
                </div>
            ) : (
                <div className={styles.loading} role="status" data-testid={TestId.OpenAIHub.Loading}>
                    <Spinner />
                </div>
            )}
            {settings.settings ? (
                <footer className={styles.footer}>
                    <div aria-live="polite">
                        {settings.error ? (
                            <span className={styles.error} role="alert">
                                {settings.error}
                            </span>
                        ) : null}
                        {settings.notice ? (
                            <span className={styles.notice} role="status">
                                {settings.notice}
                            </span>
                        ) : null}
                    </div>
                    <Button disabled={settings.busy} variant="primary" onClick={() => void settings.save()}>
                        {text('save')}
                    </Button>
                </footer>
            ) : null}
        </section>
    );
}
