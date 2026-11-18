import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { OpenAICodexSnapshot } from '../../../shared/remote.js';
import type { CodexClientState } from './openAICodexRuntime.js';

export type UsageLimit = OpenAICodexSnapshot['usageLimits'][number];

// Фоновый опрос лимитов (статус-бар чата и блок под моделями) - не чаще раза в 5 минут.
export const USAGE_POLL_BACKGROUND_MS = 300_000;
// Опрос при открытом окне OpenAI Codex - раз в 5 секунд.
export const USAGE_POLL_ACTIVE_MS = 5_000;

export function usageRemaining(usedPercent: number): number {
    return Math.max(0, Math.min(100, 100 - usedPercent));
}

/** Заглушка лимита для состояний загрузки/ошибки: remaining = 0%, чтобы в цифре отображался 0%. */
export function emptyUsageLimit(name: string): UsageLimit {
    return { name, usedPercent: 100, windowSeconds: 0, resetAt: 0 };
}

/**
 * Лимит для конкретного окна с учетом состояния загрузки.
 * При ошибке всегда показываем заглушку 0%; при загрузке показываем предыдущее значение, если оно есть.
 */
export function displayUsageLimit(
    limits: readonly UsageLimit[],
    windowSeconds: number,
    usageStatus: OpenAICodexSnapshot['usageStatus'],
    fallbackName: string
): UsageLimit {
    if (usageStatus === 'error') return emptyUsageLimit(fallbackName);
    return findUsageLimit(limits, windowSeconds) ?? emptyUsageLimit(fallbackName);
}

/** Приоритетный лимит (5ч или неделя) для статус-бара с учетом состояния загрузки. */
export function displayPreferredUsageLimit(
    limits: readonly UsageLimit[],
    usageStatus: OpenAICodexSnapshot['usageStatus'],
    fallbackName: string
): UsageLimit {
    if (usageStatus === 'error') return emptyUsageLimit(fallbackName);
    return preferredUsageLimit(limits) ?? emptyUsageLimit(fallbackName);
}

export function usageRemainingPercentage(usedPercent: number): string {
    return `${usageRemaining(usedPercent).toFixed(0)}%`;
}

export function findUsageLimit(limits: readonly UsageLimit[], windowSeconds: number): UsageLimit | undefined {
    return limits.find(limit => limit.windowSeconds === windowSeconds);
}

export function preferredUsageLimit(limits: readonly UsageLimit[]): UsageLimit | undefined {
    return findUsageLimit(limits, 18_000) ?? findUsageLimit(limits, 604_800);
}

export function usageResetDuration(resetAt: number, text: (key: OpenAICodexText) => string, now = Date.now()): string {
    if (!Number.isFinite(resetAt) || resetAt <= 0) return text('usageUnavailable');
    const remainingMs = Math.max(0, resetAt - now);
    if (remainingMs < 3_600_000) return `${Math.ceil(remainingMs / 60_000)} ${text('minutes')}`;
    if (remainingMs < 259_200_000) return `${Math.ceil(remainingMs / 3_600_000)} ${text('hours')}`;
    return `${Math.ceil(remainingMs / 86_400_000)} ${text('days')}`;
}

export function modelsFooterSummary(state: CodexClientState, text: (key: OpenAICodexText) => string): string {
    const snapshot = state.snapshot;
    if (!snapshot) return state.status === 'error' ? text('usageError') : text('footerLoading');
    const models = Array.isArray(snapshot.models) ? snapshot.models : [];
    const usageLimits = Array.isArray(snapshot.usageLimits) ? snapshot.usageLimits : [];
    const enabled = models.filter(model => model.enabled).length;
    const modelSummary = text('modelsEnabledSummary').replace('{enabled}', String(enabled)).replace('{total}', String(models.length));
    if (usageLimits.length === 0) {
        const usageSummary = snapshot.usageStatus === 'loading' ? text('usageSummaryLoading') : text('usageSummaryUnavailable');
        return `${modelSummary} | ${usageSummary}`;
    }

    const limitsSummary = snapshot.usageLimits.map(limit => {
        const window =
            limit.windowSeconds >= 86_400 && limit.windowSeconds % 86_400 === 0
                ? `${limit.windowSeconds / 86_400} ${text('days')}`
                : limit.windowSeconds >= 3_600
                  ? `${Math.round(limit.windowSeconds / 3_600)} ${text('hours')}`
                  : limit.windowSeconds >= 60
                    ? `${Math.round(limit.windowSeconds / 60)} ${text('minutes')}`
                    : text('usageWindow');
        return `${limit.name} ${window}: ${text('remaining')} ${usageRemainingPercentage(limit.usedPercent)}`;
    });
    return `${modelSummary} | ${limitsSummary.join(' | ')}`;
}

export function resetResultText(snapshot: OpenAICodexSnapshot, text: (key: OpenAICodexText) => string): string {
    switch (snapshot.resetResult) {
        case 'reset':
            return text('resetSuccess');
        case 'already_redeemed':
            return text('resetAlreadyUsed');
        case 'no_credit':
            return text('resetNoCredit');
        case 'nothing_to_reset':
            return text('resetNothing');
        case 'unknown':
        case 'pending':
            return text('resetPending');
        case 'unavailable':
            return text('resetUnavailable');
        case 'account_changed':
            return text('resetAccountChanged');
        default:
            return '';
    }
}
