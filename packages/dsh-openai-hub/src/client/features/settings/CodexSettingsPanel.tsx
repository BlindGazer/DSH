import { Button, CollectionAddButton, IconButton, Modal, RadioCardGroup, TextField, useEffectiveTheme } from '@kalex/dsh-core';
import type { AuthMethod } from '../../../shared/accounts.js';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import type { AccountSnapshot } from '../../../shared/remote.js';
import { CodexLoginProgress } from './CodexLoginProgress.js';
import styles from './codexStyles.module.scss';
import { useCodexSettingsPanel } from './hooks/useCodexSettingsPanel.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
export interface CodexSettingsPanelProps {
    readonly controller: OpenAICodexController;
    readonly locale: 'en' | 'ru';
    readonly text: (key: OpenAICodexText) => string;
    readonly hideHeading?: boolean;
    readonly reauthenticateAccount?: Pick<AccountSnapshot, 'accountLabel' | 'authMethod'>;
    readonly onReauthenticationClose?: () => void;
}
export function CodexSettingsPanel({ controller, text, reauthenticateAccount, onReauthenticationClose }: CodexSettingsPanelProps) {
    const theme = useEffectiveTheme();
    const panel = useCodexSettingsPanel(controller, text, reauthenticateAccount, onReauthenticationClose);
    return (
        <section className={`dsh-core-root ${styles.panel}`} data-theme={theme} data-testid={TestId.OpenAIHub.Settings}>
            {!panel.snapshot?.accounts.length ? (
                <header className={styles.header}>
                    <div className={styles.grow}>
                        <h2>{text('title')}</h2>
                        <p>{text('intro')}</p>
                    </div>
                </header>
            ) : undefined}
            {panel.state.status === 'error' && !panel.snapshot ? (
                <div className={styles.card} role="alert">
                    <p>{text('usageError')}</p>
                </div>
            ) : undefined}
            {panel.signingIn && !panel.loginOpen ? <CodexLoginProgress text={text} /> : undefined}
            {panel.snapshot?.status === 'waiting' && !panel.signingIn && !panel.loginOpen ? (
                <div className={styles.card} role="status">
                    <p>{text('waiting')}</p>
                    <code data-testid={TestId.OpenAIHub.DeviceCode}>{panel.snapshot.deviceCode}</code>
                    {panel.snapshot.verificationUri ? (
                        <div className={styles.verificationLink}>
                            <a href={panel.snapshot.verificationUri} target="_blank" rel="noreferrer">
                                {text('openVerification')}
                            </a>
                            <IconButton ariaLabel={text('copyVerificationLink')} onClick={() => void panel.copyVerificationLink()}>
                                <span className={styles.copyIcon} aria-hidden="true" />
                            </IconButton>
                            <span aria-live="polite">{panel.copyFeedback}</span>
                        </div>
                    ) : undefined}
                </div>
            ) : undefined}
            {panel.snapshot?.status === 'error' && !panel.loginOpen ? (
                <div className={styles.card} role="alert">
                    <p>{panel.snapshot.error || text('loginFailed')}</p>
                </div>
            ) : undefined}
            <CollectionAddButton onClick={panel.openLogin}>
                {text(panel.snapshot?.accounts.length ? 'addAccount' : 'addFirstAccount')}
            </CollectionAddButton>
            <Modal
                open={panel.loginOpen}
                onClose={panel.closeLogin}
                title={panel.isReauthentication ? `${text('signIn')}: ${panel.label}` : text('addAccountDialog')}
                closeLabel={text('close')}
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.modalBody}>
                    {panel.signingIn ? (
                        <CodexLoginProgress text={text} />
                    ) : panel.snapshot?.status === 'waiting' ? (
                        <>
                            <div className={styles.card} role="status">
                                <p>{text('waiting')}</p>
                                {panel.snapshot.deviceCode ? <code>{panel.snapshot.deviceCode}</code> : undefined}
                                {panel.snapshot.verificationUri ? (
                                    <div className={styles.verificationLink}>
                                        <a href={panel.snapshot.verificationUri} target="_blank" rel="noreferrer">
                                            {text('openVerification')}
                                        </a>
                                        <IconButton
                                            ariaLabel={text('copyVerificationLink')}
                                            onClick={() => void panel.copyVerificationLink()}>
                                            <span className={styles.copyIcon} aria-hidden="true" />
                                        </IconButton>
                                        <span aria-live="polite">{panel.copyFeedback}</span>
                                    </div>
                                ) : undefined}
                            </div>
                            {panel.snapshot.callbackUrlRequested ? (
                                <div className={styles.card}>
                                    <label htmlFor={panel.labelId}>{text('manualCallbackLabel')}</label>
                                    <p>{text('manualCallbackHint')}</p>
                                    <TextField
                                        type="url"
                                        id={panel.labelId}
                                        value={panel.callbackUrl}
                                        maxLength={4096}
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder={text('callbackPlaceholder')}
                                        onChange={panel.setCallbackUrl}
                                    />
                                    {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                                </div>
                            ) : undefined}
                        </>
                    ) : panel.snapshot?.status === 'error' && panel.snapshot.retryAvailable ? (
                        <div className={styles.card} role="alert">
                            <p>{panel.snapshot.error || text('loginFailed')}</p>
                        </div>
                    ) : panel.loginStarted && panel.snapshot?.status === 'done' && !panel.busy ? (
                        <p role="status">{text('connected')}</p>
                    ) : panel.isReauthentication ? (
                        <div className={styles.card}>
                            <p>{text('reauthenticateHint').replace('{account}', panel.label)}</p>
                            {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                        </div>
                    ) : (
                        <>
                            <label htmlFor={panel.labelId}>{text('accountLabel')}</label>
                            <TextField id={panel.labelId} value={panel.label} maxLength={32} onChange={panel.setLabel} />
                            <RadioCardGroup<AuthMethod>
                                name={`${panel.labelId}-auth-method`}
                                label={text('authMethod')}
                                value={panel.authMethod}
                                disabled={panel.busy}
                                options={[
                                    { value: 'device-code', label: text('deviceCode'), description: text('deviceCodeDescription') },
                                    { value: 'browser-oauth', label: text('browserOAuth'), description: text('browserOAuthDescription') }
                                ]}
                                onChange={panel.setAuthMethod}
                            />
                            {panel.error || (panel.loginStarted && panel.snapshot?.status === 'error' ? panel.snapshot.error : '') ? (
                                <p role="alert">{panel.error || panel.snapshot?.error || text('loginFailed')}</p>
                            ) : undefined}
                        </>
                    )}
                </div>
                <div className={styles.modalFooter}>
                    <div className={styles.actions}>
                        {panel.signingIn ? undefined : panel.snapshot?.retryAvailable ? (
                            <Button
                                data-testid={TestId.OpenAIHub.Login}
                                variant="primary"
                                disabled={panel.busy}
                                onClick={() => void panel.retryLogin()}>
                                {panel.busy ? text('working') : text('retry')}
                            </Button>
                        ) : panel.snapshot?.status === 'waiting' && panel.snapshot.callbackUrlRequested ? (
                            <Button
                                data-testid={TestId.OpenAIHub.Login}
                                variant="primary"
                                disabled={panel.busy || !panel.callbackUrl.trim()}
                                onClick={() => void panel.submitCallbackUrl()}>
                                {panel.busy ? text('callbackSubmitting') : text('submitCallback')}
                            </Button>
                        ) : panel.snapshot?.status === 'waiting' ||
                          (panel.loginStarted && panel.snapshot?.status === 'done' && !panel.busy) ? undefined : (
                            <Button
                                data-testid={TestId.OpenAIHub.Login}
                                variant="primary"
                                disabled={panel.busy}
                                onClick={() => void panel.startLogin()}>
                                {panel.busy ? text('working') : text(panel.isReauthentication ? 'signIn' : 'login')}
                            </Button>
                        )}
                        <Button onClick={panel.closeLogin}>
                            {text(panel.loginStarted && panel.snapshot?.status === 'done' && !panel.busy ? 'close' : 'cancel')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
