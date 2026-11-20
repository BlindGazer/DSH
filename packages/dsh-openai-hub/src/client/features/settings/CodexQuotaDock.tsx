import { useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import styles from './codexFooterStyles.module.scss';
import { useCodexQuotaDock } from './hooks/useCodexQuotaDock.js';
import type { ModelDirectories } from './modelSelectionSource.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';

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
    return (
        <span
            className={`dsh-core-root ${styles.modelsUsageIndicators}`}
            data-theme={theme}
            data-testid={TestId.OpenAIHub.QuotaDock}
            role="status">
            <span>{account.accountLabel}</span>
            {account.usageLimits.map(limit => (
                <span
                    key={`${limit.name}-${limit.windowSeconds}`}
                    title={`${text('resetsIn')} ${new Date(limit.resetAt).toLocaleString()}`}>
                    {limit.name}: {text('remaining')} {Math.round(100 - limit.usedPercent)}%
                </span>
            ))}
        </span>
    );
}
