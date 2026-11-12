import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import styles from './codexStyles.module.scss';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { useCodexState } from './openAICodexRuntime.js';

export interface CodexQuotaDockProps {
    readonly controller: OpenAICodexController;
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexQuotaDock({ controller, text }: CodexQuotaDockProps) {
    const state = useCodexState(controller);
    const snapshot = state.snapshot;
    if (!snapshot?.loggedIn) return undefined;

    return (
        <aside className={styles.card} aria-label={text('usage')} data-testid={TestId.OpenAICodex.QuotaDock}>
            <strong>{text('usage')}</strong>
            {snapshot.usageLimited ? <span role="status">{text('usageLimited')}</span> : undefined}
            {snapshot.usageStatus === 'loading' ? <span role="status">{text('usageLoading')}</span> : undefined}
            {snapshot.usageStatus === 'error' ? <span role="status">{text('usageUnavailable')}</span> : undefined}
            {snapshot.usageStatus === 'ready' && snapshot.usageLimits.length > 0
                ? snapshot.usageLimits.map(limit => (
                      <span key={`${limit.name}-${limit.resetAt}`}>
                          {limit.name}: {Math.max(0, Math.min(100, 100 - limit.usedPercent)).toFixed(0)}% {text('remaining')}
                      </span>
                  ))
                : undefined}
        </aside>
    );
}
