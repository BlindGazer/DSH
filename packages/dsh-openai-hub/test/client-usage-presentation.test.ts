import { describe, expect, it } from 'vitest';
import { usageRefreshInterval } from '../src/client/features/settings/hooks/useCodexAccountPolling.js';
import type { AccountSnapshot } from '../src/shared/remote.js';

const account = (usageLimits: AccountSnapshot['usageLimits']): AccountSnapshot => ({
    accountLabel: 'primary',
    authMethod: 'device-code',
    autoRefreshLimits: false,
    models: [],
    catalogStatus: 'ready',
    catalogError: '',
    loggedIn: true,
    expiresAt: 0,
    usageStatus: 'ready',
    usageLimited: false,
    usageLimits,
    usageCredits: '',
    usageCreditsUnlimited: false,
    resetCards: [],
    resetCardsStatus: 'idle',
    usageUpdatedAt: 0,
    usageError: ''
});
const limit = (windowSeconds: number, usedPercent: number, resetAt: number) => ({ name: 'Codex', usedPercent, windowSeconds, resetAt });
describe('OpenAI Hub usage refresh policy', () => {
    it('uses five-minute default with hourly, five-hour, then daily priority', () => {
        expect(usageRefreshInterval(account([]))).toBe(300_000);
        expect(usageRefreshInterval(account([limit(86400, 99, 100), limit(18000, 99, 90), limit(3600, 0, 80)]))).toBe(300_000);
        expect(usageRefreshInterval(account([limit(86400, 99, 100), limit(18000, 0, 90)]))).toBe(300_000);
    });
    it('polls every minute when the nearest preferred window has under 25 percent remaining', () => {
        expect(usageRefreshInterval(account([limit(3600, 76, 100)]), 'model-x')).toBe(60_000);
        expect(usageRefreshInterval(account([limit(3600, 20, 100), limit(18000, 99, 90)]))).toBe(300_000);
    });
});
