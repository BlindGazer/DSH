import { Button, CircularProgress, IconButton, Modal, SettingsIcon, SwitchControl, Tooltip, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import type { AccountSnapshot } from '../../../shared/remote.js';
import { CodexAccountCard } from './CodexAccountCard.js';
import styles from './codexFooterStyles.module.scss';
import type { OpenAICodexController } from './openAICodexRuntime.js';
export interface CodexModelsAccountEntryProps {
    readonly account: AccountSnapshot;
    readonly controller: OpenAICodexController;
    readonly text: (key: OpenAICodexText) => string;
    readonly open: boolean;
    readonly autoRefreshBusy: boolean;
    readonly autoRefreshError: boolean;
    readonly accountActionPending: boolean;
    readonly accountActionError: boolean;
    readonly deleteConfirmOpen: boolean;
    readonly reauthenticationPending: boolean;
    readonly onAutoRefreshChange: (enabled: boolean) => void;
    readonly onSignIn: () => void;
    readonly onDelete: () => void;
    readonly onCancelDelete: () => void;
    readonly onConfirmDelete: () => void;
    readonly onOpen: () => void;
    readonly onClose: () => void;
}
export function CodexModelsAccountEntry({
    account,
    controller,
    text,
    open,
    autoRefreshBusy,
    autoRefreshError,
    accountActionPending,
    accountActionError,
    deleteConfirmOpen,
    reauthenticationPending,
    onAutoRefreshChange,
    onSignIn,
    onDelete,
    onCancelDelete,
    onConfirmDelete,
    onOpen,
    onClose
}: CodexModelsAccountEntryProps) {
    const theme = useEffectiveTheme();
    const enabled = account.models.filter(model => model.enabled).length;
    const summary = text('modelsEnabledSummary').replace('{enabled}', String(enabled)).replace('{total}', String(account.models.length));
    const needsAttention = !account.loggedIn;
    const chartLimits = [
        ...(account.usageStatus === 'error' || account.usageLimits.some(limit => limit.windowSeconds === 18_000)
            ? [
                  {
                      name: text('fiveHourLimit'),
                      usedPercent:
                          account.usageStatus === 'error'
                              ? 100
                              : (account.usageLimits.find(limit => limit.windowSeconds === 18_000)?.usedPercent ?? 100)
                  }
              ]
            : []),
        {
            name: text('weeklyLimit'),
            usedPercent:
                account.usageStatus === 'error'
                    ? 100
                    : (account.usageLimits.find(limit => limit.windowSeconds === 604_800)?.usedPercent ?? 100)
        }
    ];
    return (
        <>
            <section
                className={`dsh-core-root ${styles.container}`}
                data-theme={theme}
                data-testid={`${TestId.OpenAIHub.ModelsFooter}-${account.accountLabel}`}>
                <div className={styles.row}>
                    <div className={styles.quotaCharts}>
                        <div className={styles.modelsUsageGroup}>
                            <span className={styles.modelsUsageSummary}>{summary}</span>
                            <span
                                className={styles.modelsEnabledSegments}
                                role="img"
                                aria-label={summary}
                                style={{
                                    width: `${Math.max(52, account.models.length * 9 - 1)}px`
                                }}>
                                {account.models.map(model => (
                                    <span key={model.id} className={styles.modelsEnabledSegment} data-enabled={model.enabled} />
                                ))}
                            </span>
                        </div>
                        <div className={styles.modelsUsageIndicators}>
                            {chartLimits.map(limit => {
                                const remainingPercent = Math.max(0, Math.min(100, Math.round(100 - limit.usedPercent)));
                                const label = `${limit.name}: ${remainingPercent}%`;
                                return (
                                    <span key={limit.name} className={styles.quotaIndicator}>
                                        <CircularProgress value={remainingPercent} label={label} title={label} size="standard" />
                                        <span>{remainingPercent}%</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <span className={styles.modelsUsageActions}>
                        {!needsAttention ? (
                            <Tooltip
                                triggerLabel={text('autoRefreshInfo')}
                                content={text('autoRefreshTooltip')}
                                theme={theme}
                                {...(styles.autoRefreshTooltipTrigger ? { triggerClassName: styles.autoRefreshTooltipTrigger } : {})}>
                                <SwitchControl
                                    ariaLabel={text('autoRefreshLimits')}
                                    checked={account.autoRefreshLimits}
                                    disabled={autoRefreshBusy}
                                    onChange={onAutoRefreshChange}
                                />
                            </Tooltip>
                        ) : undefined}
                        <Button
                            className={styles.openButton ?? ''}
                            variant="secondary"
                            size="sm"
                            ariaLabel={text('compactTitle')}
                            onClick={onOpen}>
                            <SettingsIcon />
                        </Button>
                    </span>
                    {needsAttention ? (
                        <div className={styles.accountError} role="alert">
                            <p>{text('signInRequired')}</p>
                            {accountActionError ? <p>{text('actionFailed')}</p> : undefined}
                            <div className={styles.accountErrorActions}>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={accountActionPending || reauthenticationPending}
                                    onClick={onSignIn}>
                                    {text('signIn')}
                                </Button>
                                <IconButton
                                    ariaLabel={text('deleteAccount')}
                                    disabled={accountActionPending}
                                    className={styles.deletePendingAccountButton ?? ''}
                                    onClick={onDelete}>
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                                        <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 14h11l1-14M9 7V4h6v3" />
                                    </svg>
                                </IconButton>
                            </div>
                        </div>
                    ) : undefined}
                </div>
                {autoRefreshError ? <span role="alert">{text('actionFailed')}</span> : undefined}
                {account.catalogStatus === 'fallback' ? <span role="status">{text('catalogLoading')}</span> : undefined}
            </section>
            <Modal
                open={deleteConfirmOpen}
                onClose={onCancelDelete}
                title={text('deleteAccount')}
                closeLabel={text('close')}
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.confirmationBody}>
                    <p>{text('deleteAccountConfirm')}</p>
                    {accountActionError ? <p role="alert">{text('actionFailed')}</p> : undefined}
                </div>
                <div className={styles.confirmationActions}>
                    <Button variant="danger" disabled={accountActionPending} onClick={onConfirmDelete}>
                        {accountActionPending ? text('working') : text('deleteAccount')}
                    </Button>
                    <Button disabled={accountActionPending} onClick={onCancelDelete}>
                        {text('cancel')}
                    </Button>
                </div>
            </Modal>
            <Modal
                open={open}
                onClose={onClose}
                title={`${text('title')}: ${account.accountLabel} (${text(account.authMethod === 'device-code' ? 'deviceCode' : 'browserOAuth')})`}
                closeLabel={text('close')}
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <CodexAccountCard account={account} controller={controller} text={text} />
            </Modal>
        </>
    );
}
