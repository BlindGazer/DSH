import { CircularProgress, LinearProgress, Popover, Tooltip, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import styles from './codexFooterStyles.module.scss';
import { formatQuotaReset } from './formatQuotaReset.js';
import { useCodexQuotaDock } from './hooks/useCodexQuotaDock.js';
import type { ModelDirectories } from './modelSelectionSource.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';

function remainingPercent(usedPercent: number): number {
    return Math.max(0, Math.min(100, Math.round(100 - usedPercent)));
}

export interface CodexQuotaDockProps {
    readonly controller: OpenAICodexController;
    readonly directories: ModelDirectories;
    readonly sessionId?: string;
    readonly text: (key: OpenAICodexText) => string;
}
export function CodexQuotaDock({ controller, directories, sessionId, text }: CodexQuotaDockProps) {
    const theme = useEffectiveTheme();
    const { account, visible } = useCodexQuotaDock(controller, directories, sessionId);
    if (!visible || !account) return undefined;
    const primaryLimit = account.usageLimits.find(limit => limit.windowSeconds === 18_000) ?? account.usageLimits[0];
    if (!primaryLimit) return undefined;
    const limitLabel = (windowSeconds: number, name: string) =>
        windowSeconds === 18_000 ? text('fiveHourLimit') : windowSeconds === 604_800 ? text('weeklyLimit') : name;
    const primaryLabel = `${limitLabel(primaryLimit.windowSeconds, primaryLimit.name)}: ${remainingPercent(primaryLimit.usedPercent)}%`;
    return (
        <span
            className={`dsh-core-root ${styles.modelsUsageIndicators}`}
            data-theme={theme}
            data-testid={TestId.OpenAIHub.QuotaDock}
            role="status">
            <Tooltip
                triggerLabel={primaryLabel}
                triggerElement="span"
                content={`${limitLabel(primaryLimit.windowSeconds, primaryLimit.name)}: ${remainingPercent(primaryLimit.usedPercent)}%`}>
                <span className={styles.quotaDockValue}>
                    <Popover
                        triggerLabel={primaryLabel}
                        content={
                            <div className={styles.quotaTooltip}>
                                {account.usageLimits.map(limit => {
                                    const remaining = remainingPercent(limit.usedPercent);
                                    const label = `${limitLabel(limit.windowSeconds, limit.name)}: ${remaining}%`;
                                    return (
                                        <div key={`${limit.name}-${limit.windowSeconds}`} className={styles.quotaTooltipItem}>
                                            <div className={styles.quotaTooltipLabel}>
                                                <span>{limitLabel(limit.windowSeconds, limit.name)}</span>
                                                <span>{remaining}%</span>
                                            </div>
                                            {limit.resetAt > 0 ? (
                                                <div className={styles.quotaTooltipReset}>{formatQuotaReset(limit.resetAt, text)}</div>
                                            ) : undefined}
                                            <LinearProgress value={remaining} label={label} size="small" color="accent" />
                                        </div>
                                    );
                                })}
                            </div>
                        }
                        theme={theme}
                        triggerElement="span"
                        {...(styles.quotaDockTrigger ? { triggerClassName: styles.quotaDockTrigger } : {})}>
                        <span className={styles.quotaDockValue}>
                            <CircularProgress
                                value={remainingPercent(primaryLimit.usedPercent)}
                                label={primaryLabel}
                                title={primaryLabel}
                                size="small"
                            />
                            <span>{remainingPercent(primaryLimit.usedPercent)}%</span>
                        </span>
                    </Popover>
                </span>
            </Tooltip>
        </span>
    );
}
