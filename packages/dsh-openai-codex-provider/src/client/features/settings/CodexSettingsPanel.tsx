import { Button, Modal, Spinner, ThemedSelect } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import { resetResultText, usageRemainingPercentage } from './codexPresentation.js';
import styles from './codexStyles.module.scss';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { useCodexSettingsPanel } from './useCodexSettingsPanel.js';

export interface CodexSettingsPanelProps {
    readonly controller: OpenAICodexController;
    readonly locale: 'en' | 'ru';
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexSettingsPanel({ controller, locale, text }: CodexSettingsPanelProps) {
    const panel = useCodexSettingsPanel(controller, text);
    const { codex, snapshot } = panel;

    if (codex.loading && !snapshot) {
        return (
            <div className={styles.loading} data-testid={TestId.OpenAICodex.Loading}>
                <Spinner label={text('loading')} />
            </div>
        );
    }

    if (!snapshot) {
        return (
            <section className={styles.panel} data-testid={TestId.OpenAICodex.Settings}>
                <p role="alert">{text('usageError')}</p>
                <Button onClick={() => void codex.refresh()}>{text('retry')}</Button>
            </section>
        );
    }

    return (
        <section className={styles.panel} data-testid={TestId.OpenAICodex.Settings}>
            <header className={styles.header}>
                <div className={styles.grow}>
                    <h2>{text('title')}</h2>
                    <p>{text('intro')}</p>
                </div>
                <strong>{snapshot.loggedIn ? text('connected') : text('notLoggedIn')}</strong>
            </header>

            {snapshot.status === 'starting' ? <p role="status">{text('working')}</p> : undefined}
            {snapshot.status === 'error' && snapshot.error ? (
                <p role="alert" className={styles.error}>
                    {text('loginFailed')}
                </p>
            ) : undefined}
            {snapshot.status === 'waiting' && snapshot.deviceCode ? (
                <div className={styles.card} aria-live="polite">
                    <p>{text('waiting')}</p>
                    <code data-testid={TestId.OpenAICodex.DeviceCode}>{snapshot.deviceCode}</code>
                    <Button onClick={() => void panel.copyDeviceCode(snapshot.deviceCode)}>{text('copy')}</Button>
                    {panel.copyStatus ? (
                        <p role={panel.copyStatus === text('copied') ? 'status' : 'alert'}>{panel.copyStatus}</p>
                    ) : undefined}
                    <a href={snapshot.verificationUri} target="_blank" rel="noreferrer">
                        {text('openVerification')}
                    </a>
                </div>
            ) : undefined}

            <div className={styles.actions}>
                {snapshot.loggedIn ? (
                    <Button variant="danger" disabled={codex.busy} onClick={() => void panel.runAction(codex.logout)}>
                        {text('logout')}
                    </Button>
                ) : (
                    <div data-testid={TestId.OpenAICodex.Login}>
                        <Button
                            variant="primary"
                            disabled={codex.busy || snapshot.status === 'starting' || snapshot.status === 'waiting'}
                            onClick={() => void panel.runAction(codex.startLogin)}>
                            {text('login')}
                        </Button>
                    </div>
                )}
                <Button disabled={codex.busy} onClick={panel.beginEdit}>
                    {text('editModels')}
                </Button>
            </div>

            {panel.actionError ? (
                <p role="alert" className={styles.error}>
                    {panel.actionError}
                </p>
            ) : undefined}
            {snapshot.proxyError ? (
                <p role="alert" className={styles.error}>
                    {text('proxyError')}
                </p>
            ) : undefined}

            <section className={styles.card} aria-labelledby="codex-usage-title" data-testid={TestId.OpenAICodex.Usage}>
                <h3 id="codex-usage-title">{text('usage')}</h3>
                {snapshot.usageLimited ? <p role="status">{text('usageLimited')}</p> : undefined}
                {snapshot.usageStatus === 'loading' ? <p>{text('usageLoading')}</p> : undefined}
                {snapshot.usageStatus === 'error' ? <p role="status">{snapshot.usageError || text('usageError')}</p> : undefined}
                {snapshot.usageStatus === 'ready' ? (
                    <>
                        {snapshot.usageLimits.map(limit => (
                            <div className={styles.usageRow} key={`${limit.name}-${limit.resetAt}`}>
                                <span>{limit.name}</span>
                                <span>
                                    {text('remaining')}: {usageRemainingPercentage(limit.usedPercent)}
                                </span>
                                <span>
                                    {text('resetsIn')}: {new Date(limit.resetAt * 1000).toLocaleString(locale)}
                                </span>
                            </div>
                        ))}
                        <p>
                            {text('credits')}:{' '}
                            {snapshot.usageCreditsUnlimited ? text('unlimited') : snapshot.usageCredits || text('usageUnavailable')}
                        </p>
                    </>
                ) : undefined}
            </section>

            <section className={styles.card} aria-labelledby="codex-reset-title" data-testid={TestId.OpenAICodex.ResetCards}>
                <h3 id="codex-reset-title">{text('resetCards')}</h3>
                {snapshot.resetCardsStatus === 'error' ? <p role="status">{text('resetDetailsUnavailable')}</p> : undefined}
                <p>
                    {text('resetAvailable')}: {snapshot.usageResetCredits ?? text('usageUnavailable')}
                </p>
                {snapshot.resetCards?.map(card => (
                    <div className={styles.usageRow} key={card.id}>
                        <span>{text('resetCardLabel')}</span>
                        <span>{card.expiresAt ? new Date(card.expiresAt * 1000).toLocaleString(locale) : text('expiresUnknown')}</span>
                        <Button
                            disabled={codex.busy || (panel.pendingReset !== undefined && panel.pendingReset.creditId !== card.id)}
                            onClick={() => panel.selectResetCard(card.id)}>
                            {panel.pendingReset?.creditId === card.id ? text('resetRetry') : text('resetUse')}
                        </Button>
                    </div>
                ))}
                {panel.pendingReset && !snapshot.resetCards?.some(card => card.id === panel.pendingReset?.creditId) ? (
                    <div className={styles.usageRow}>
                        <span>{text('resetCardLabel')}</span>
                        <Button disabled={codex.busy} onClick={panel.retryPendingReset}>
                            {text('resetRetry')}
                        </Button>
                    </div>
                ) : undefined}
                {snapshot.resetResult ? <p role="status">{resetResultText(snapshot, text)}</p> : undefined}
            </section>

            <section className={styles.card} aria-labelledby="codex-proxy-title" data-testid={TestId.OpenAICodex.ProxyMode}>
                <h3 id="codex-proxy-title">{text('proxy')}</h3>
                <ThemedSelect
                    value={snapshot.proxyMode ?? 'host'}
                    options={panel.proxyOptions}
                    ariaLabel={text('proxy')}
                    disabled={codex.busy}
                    onChange={mode => void panel.runAction(() => codex.setProxy(mode))}
                />
                {snapshot.proxyRestartRequired ? <p role="status">{text('proxySaving')}</p> : undefined}
            </section>

            <Modal open={panel.editOpen} onClose={panel.closeEdit} title={text('models')} closeLabel={text('close')}>
                <div className={styles.modalBody}>
                    <p>{text('modelHint')}</p>
                    {panel.draft.map((model, index) => (
                        <div className={styles.modelRow} key={model.id}>
                            <label className={styles.grow}>
                                <span>{text('modelName')}</span>
                                <input
                                    value={model.name}
                                    aria-label={`${text('modelName')}: ${model.id}`}
                                    onChange={event => panel.updateModel(model.id, { name: event.currentTarget.value })}
                                />
                            </label>
                            <label className={styles.checkLabel}>
                                <input
                                    type="checkbox"
                                    checked={model.enabled}
                                    aria-label={`${text('enabled')}: ${model.name}`}
                                    onChange={event => panel.updateModel(model.id, { enabled: event.currentTarget.checked })}
                                />
                                {text('enabled')}
                            </label>
                            <div className={styles.modelActions}>
                                <Button
                                    disabled={codex.busy || index === 0}
                                    ariaLabel={`${text('moveUp')}: ${model.name}`}
                                    onClick={() => panel.reorderModel(model.id, 'up')}>
                                    {text('moveUp')}
                                </Button>
                                <Button
                                    disabled={codex.busy || index === panel.draft.length - 1}
                                    ariaLabel={`${text('moveDown')}: ${model.name}`}
                                    onClick={() => panel.reorderModel(model.id, 'down')}>
                                    {text('moveDown')}
                                </Button>
                            </div>
                        </div>
                    ))}
                    <div className={styles.actions}>
                        <div data-testid={TestId.OpenAICodex.SaveModels}>
                            <Button disabled={codex.busy} onClick={() => void panel.saveModels()}>
                                {text('save')}
                            </Button>
                        </div>
                        <Button disabled={codex.busy} onClick={panel.closeEdit}>
                            {text('cancel')}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={panel.resetCard !== undefined}
                onClose={panel.closeReset}
                title={text('resetConfirmTitle')}
                closeLabel={text('close')}>
                <div className={styles.modalBody}>
                    <p>{text('resetConfirm')}</p>
                    <div className={styles.actions}>
                        <div data-testid={TestId.OpenAICodex.ConfirmReset}>
                            <Button variant="danger" disabled={codex.busy} onClick={() => void panel.confirmReset()}>
                                {text('confirm')}
                            </Button>
                        </div>
                        <Button disabled={codex.busy} onClick={panel.closeReset}>
                            {text('cancel')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
