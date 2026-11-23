import { CircularProgress, type DshActiveLocale, LinearProgress, Popover, Tooltip, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TestId } from '../../../shared/constants/testId.ts';
import styles from './codexFooterStyles.module.scss';
import { formatQuotaReset } from './formatQuotaReset.ts';
import { useCodexQuotaDock } from './hooks/useCodexQuotaDock.ts';
import type { ModelDirectories } from './modelSelectionSource.ts';
import type { OpenAICodexController } from './openAICodexRuntime.ts';

function remainingPercent(usedPercent: number): number {
    return Math.max(0, Math.min(100, Math.round(100 - usedPercent)));
}

export interface CodexQuotaDockProps {
    readonly controller: OpenAICodexController;
    readonly directories: ModelDirectories;
    readonly sessionId?: string;
    readonly locale: DshActiveLocale;
    readonly text: (key: OpenAICodexText) => string;
}
export function CodexQuotaDock({ controller, directories, sessionId, locale, text }: CodexQuotaDockProps) {
    const theme = useEffectiveTheme();
    const { account, visible } = useCodexQuotaDock(controller, directories, sessionId);
    if (!visible || !account) return undefined;
    const primaryLimit = account.usageLimits.find(limit => limit.windowSeconds === 18_000) ?? account.usageLimits[0];
    if (!primaryLimit) return undefined;
    const limitLabel = (windowSeconds: number, name: string) =>
        windowSeconds === 18_000 ? text('fiveHourLimit') : windowSeconds === 604_800 ? text('weeklyLimit') : name;
    const percent = new Intl.NumberFormat(locale, { style: 'percent' });
    const primaryRemaining = remainingPercent(primaryLimit.usedPercent);
    const primaryLabel = `${limitLabel(primaryLimit.windowSeconds, primaryLimit.name)}: ${percent.format(primaryRemaining / 100)}`;
    return (
        <span className={`dsh-core-root ${styles.modelsUsageIndicators}`} data-theme={theme} data-testid={TestId.OpenAIHub.QuotaDock}>
            <Tooltip triggerElement="span" side="top" portal="body" content={primaryLabel}>
                <Popover
                    {...(styles.quotaDockTrigger ? { triggerClassName: styles.quotaDockTrigger } : {})}
                    content={
                        <div className={styles.quotaTooltip}>
                            {account.usageLimits.map(limit => {
                                const remaining = remainingPercent(limit.usedPercent);
                                return (
                                    <div key={`${limit.name}-${limit.windowSeconds}`} className={styles.quotaTooltipItem}>
                                        <div className={styles.quotaTooltipLabel}>
                                            <span>{limitLabel(limit.windowSeconds, limit.name)}</span>
                                            <span>{percent.format(remaining / 100)}</span>
                                        </div>
                                        {limit.resetAt > 0 ? (
                                            <div className={styles.quotaTooltipReset}>{formatQuotaReset(limit.resetAt, text, locale)}</div>
                                        ) : undefined}
                                        <LinearProgress value={remaining} size="small" color="accent" />
                                    </div>
                                );
                            })}
                        </div>
                    }>
                    <CircularProgress value={primaryRemaining} size="small" />
                    <span>{percent.format(primaryRemaining / 100)}</span>
                </Popover>
            </Tooltip>
        </span>
    );
}
