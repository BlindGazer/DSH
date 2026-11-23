import {
    Button,
    CircularProgress,
    type DshActiveLocale,
    type DshTranslate,
    IconButton,
    Modal,
    SettingsIcon,
    SwitchControl,
    Tooltip
} from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TestId } from '../../../shared/constants/testId.ts';
import type { AccountSnapshot } from '../../../shared/remote.ts';
import { CodexAccountCard } from './CodexAccountCard.tsx';
import styles from './codexFooterStyles.module.scss';
import type { OpenAICodexController } from './openAICodexRuntime.ts';
export interface CodexModelsAccountEntryProps {
    readonly account: AccountSnapshot;
    readonly controller: OpenAICodexController;
    readonly locale: DshActiveLocale;
    readonly text: DshTranslate<OpenAICodexText>;
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
    locale,
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
    const enabled = account.models.filter(model => model.enabled).length;
    const number = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, { style: 'percent' });
    const summary = text('modelsEnabledSummary', { enabled: number.format(enabled), total: number.format(account.models.length) });
    const needsAttention = !account.loggedIn;
    const fiveHour = account.usageLimits.find(limit => limit.windowSeconds === 18_000);
    const weekly = account.usageLimits.find(limit => limit.windowSeconds === 604_800);
    const chartLimits = [
        ...(fiveHour ? [{ id: 'five-hour', name: text('fiveHourLimit'), usedPercent: fiveHour.usedPercent }] : []),
        { id: 'weekly', name: text('weeklyLimit'), usedPercent: weekly?.usedPercent }
    ];
    return (
        <>
            <section className={styles.container} data-testid={`${TestId.OpenAIHub.ModelsFooter}-${account.accountLabel}`}>
                <div className={styles.row}>
                    <div className={styles.quotaCharts}>
                        <div className={styles.modelsUsageGroup}>
                            <span className={styles.modelsUsageSummary}>{summary}</span>
                            <span
                                className={styles.modelsEnabledSegments}
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
                                const remainingPercent =
                                    limit.usedPercent === undefined
                                        ? undefined
                                        : Math.max(0, Math.min(100, Math.round(100 - limit.usedPercent)));
                                const value = remainingPercent === undefined ? text('quotaNoData') : percent.format(remainingPercent / 100);
                                const label = `${limit.name}: ${value}`;
                                return (
                                    <span key={limit.id} className={styles.quotaIndicator}>
                                        {remainingPercent !== undefined && (
                                            <Tooltip content={label} triggerElement="span">
                                                <CircularProgress value={remainingPercent} size="standard" />
                                            </Tooltip>
                                        )}
                                        <span>{value}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <span className={styles.modelsUsageActions}>
                        {!needsAttention ? (
                            <Tooltip
                                content={text('autoRefreshTooltip')}
                                triggerElement="span"
                                {...(styles.autoRefreshTooltipTrigger ? { triggerClassName: styles.autoRefreshTooltipTrigger } : {})}>
                                <SwitchControl
                                    checked={account.autoRefreshLimits}
                                    disabled={autoRefreshBusy}
                                    onChange={onAutoRefreshChange}
                                />
                            </Tooltip>
                        ) : undefined}
                        <Button className={styles.openButton ?? ''} variant="secondary" size="sm" onClick={onOpen}>
                            <SettingsIcon />
                        </Button>
                    </span>
                    {needsAttention ? (
                        <div className={styles.accountError}>
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
                                    tooltip={text('deleteAccount')}
                                    disabled={accountActionPending}
                                    className={styles.deletePendingAccountButton ?? ''}
                                    onClick={onDelete}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 14h11l1-14M9 7V4h6v3" />
                                    </svg>
                                </IconButton>
                            </div>
                        </div>
                    ) : undefined}
                </div>
                {autoRefreshError ? <span>{text('actionFailed')}</span> : undefined}
                {account.catalogStatus === 'fallback' ? <span>{text('catalogLoading')}</span> : undefined}
            </section>
            <Modal
                open={deleteConfirmOpen}
                onClose={onCancelDelete}
                title={text('deleteAccount')}
                closeLabel={text('close')}
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.confirmationBody}>
                    <p>{text('deleteAccountConfirm')}</p>
                    {accountActionError ? <p>{text('actionFailed')}</p> : undefined}
                </div>
                <div className={styles.confirmationActions}>
                    <Button disabled={accountActionPending} onClick={onCancelDelete}>
                        {text('cancel')}
                    </Button>
                    <Button variant="danger" disabled={accountActionPending} onClick={onConfirmDelete}>
                        {accountActionPending ? text('working') : text('deleteAccount')}
                    </Button>
                </div>
            </Modal>
            <Modal
                open={open}
                onClose={onClose}
                title={`${text('title')}: ${account.accountLabel} (${text(account.authMethod === 'device-code' ? 'deviceCode' : 'browserOAuth')})`}
                closeLabel={text('close')}
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <CodexAccountCard account={account} controller={controller} locale={locale} text={text} />
            </Modal>
        </>
    );
}
