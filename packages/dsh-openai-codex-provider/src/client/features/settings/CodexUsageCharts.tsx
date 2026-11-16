import type { DshProgressColor, DshProgressSize } from '@kalex/dsh-core';
import { CircularProgress, LinearProgress } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { UsageLimit } from './codexPresentation.js';
import { usageRemaining, usageRemainingPercentage, usageResetDuration } from './codexPresentation.js';
import styles from './codexStyles.module.scss';

export interface CircularUsageChartProps {
    readonly limit: UsageLimit;
    readonly label: string;
    readonly size?: DshProgressSize;
    readonly color?: DshProgressColor;
}

export function CircularUsageChart({ limit, label, size = 'standard', color = 'default' }: CircularUsageChartProps) {
    const remaining = usageRemaining(limit.usedPercent);
    const percentage = usageRemainingPercentage(limit.usedPercent);
    return (
        <span className={styles.circularChart} data-size={size} title={`${label}: ${percentage}`}>
            <CircularProgress
                value={remaining}
                label={`${label}: ${percentage}`}
                size={size}
                color={color}
                title={`${label}: ${percentage}`}
            />
            <span className={styles.circularChartValue}>{Math.round(remaining)}%</span>
        </span>
    );
}

export interface LinearUsageChartProps {
    readonly limit: UsageLimit;
    readonly label: string;
    readonly text: (key: OpenAICodexText) => string;
    readonly size?: DshProgressSize;
    readonly color?: DshProgressColor;
}

export function LinearUsageChart({ limit, label, text, size = 'standard', color = 'accent' }: LinearUsageChartProps) {
    const remaining = usageRemaining(limit.usedPercent);
    const percentage = usageRemainingPercentage(limit.usedPercent);
    return (
        <div className={styles.linearUsage} data-size={size}>
            <div className={styles.linearUsageLabel}>
                <span>{label}</span>
                <span className={styles.linearUsageValue}>{percentage}</span>
            </div>
            <LinearProgress
                value={remaining}
                label={`${label}: ${percentage}`}
                size={size}
                color={color}
                title={`${label}: ${percentage}`}
            />
            <span className={styles.quotaUsed}>
                {text('resetsIn')} {usageResetDuration(limit.resetAt, text)}
            </span>
        </div>
    );
}
