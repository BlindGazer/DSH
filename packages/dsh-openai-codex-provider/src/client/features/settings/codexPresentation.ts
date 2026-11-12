import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { OpenAICodexSnapshot } from '../../../shared/remote.js';

export function usageRemainingPercentage(usedPercent: number): string {
    return `${Math.max(0, Math.min(100, 100 - usedPercent)).toFixed(0)}%`;
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
