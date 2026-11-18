import { Spinner, Tooltip, useEffectiveTheme } from '@kalex/dsh-core';
import { createElement, Fragment } from 'react';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import { CircularUsageChart, LinearUsageChart } from './CodexUsageCharts.js';
import { displayPreferredUsageLimit, displayUsageLimit } from './codexPresentation.js';
import styles from './codexStyles.module.scss';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { useCodexState } from './openAICodexRuntime.js';

export interface CodexQuotaDockProps {
    readonly controller: OpenAICodexController;
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexQuotaDock({ controller, text }: CodexQuotaDockProps) {
    const theme = useEffectiveTheme();
    const state = useCodexState(controller);
    const snapshot = state.snapshot;
    if (!snapshot?.loggedIn) return createElement(Fragment);

    // Статус показывается всегда, пока выполнен вход; при загрузке/ошибке отображается 0%.
    const selectedLimit = displayPreferredUsageLimit(snapshot.usageLimits, snapshot.usageStatus, text('usage'));
    const fiveHour = displayUsageLimit(snapshot.usageLimits, 18_000, snapshot.usageStatus, text('fiveHourLimit'));
    const weekly = displayUsageLimit(snapshot.usageLimits, 604_800, snapshot.usageStatus, text('weeklyLimit'));

    return (
        <aside className={`dsh-core-root ${styles.chatQuota}`} data-theme={theme} data-testid={TestId.OpenAICodex.QuotaDock}>
            <Tooltip
                triggerMode="click"
                theme={theme}
                triggerLabel={text('usage')}
                {...(styles.chatQuotaTrigger === undefined ? {} : { triggerClassName: styles.chatQuotaTrigger })}
                contentLabel={text('usage')}
                content={
                    <div className={styles.quotaTooltipContents}>
                        {snapshot.usageLimited ? <span>{text('usageLimited')}</span> : undefined}
                        {snapshot.usageStatus === 'loading' ? (
                            <span className={styles.quotaLoading}>
                                <Spinner label={text('usageLoading')} />
                                {text('usageLoading')}
                            </span>
                        ) : undefined}
                        {snapshot.usageStatus === 'error' ? <span>{text('usageUnavailable')}</span> : undefined}
                        <LinearUsageChart limit={fiveHour} label={text('fiveHourLimit')} text={text} size="small" />
                        <LinearUsageChart limit={weekly} label={text('weeklyLimit')} text={text} size="small" />
                    </div>
                }>
                <CircularUsageChart limit={selectedLimit} label={selectedLimit.name} size="small" />
            </Tooltip>
        </aside>
    );
}
