import { describe, expect, it } from 'vitest';
import {
    findUsageLimit,
    preferredUsageLimit,
    usageRemaining,
    usageResetDuration
} from '../src/client/features/settings/codexPresentation.js';
import type { OpenAICodexSnapshot } from '../src/shared/remote.js';

const limit = (windowSeconds: number, usedPercent = 25): OpenAICodexSnapshot['usageLimits'][number] => ({
    name: String(windowSeconds),
    usedPercent,
    windowSeconds,
    resetAt: 0
});

const text = (key: string) => ({ minutes: 'мин.', hours: 'ч.', days: 'дн.' })[key] ?? key;

describe('Codex usage chart presentation', () => {
    it('uses remaining quota for chart fill, clamped to zero through one hundred', () => {
        expect(usageRemaining(0)).toBe(100);
        expect(usageRemaining(100)).toBe(0);
        expect(usageRemaining(-10)).toBe(100);
        expect(usageRemaining(120)).toBe(0);
    });

    it('prefers the five-hour limit and falls back to weekly', () => {
        const weekly = limit(604_800);
        expect(preferredUsageLimit([weekly])).toBe(weekly);
        expect(preferredUsageLimit([weekly, limit(18_000)])?.windowSeconds).toBe(18_000);
        expect(preferredUsageLimit([limit(86_400)])).toBeUndefined();
        expect(findUsageLimit([weekly], 18_000)).toBeUndefined();
    });

    it('formats reset durations in minutes, hours, and days with upward rounding', () => {
        const now = 1_000_000;
        const reset = (secondsFromNow: number) => usageResetDuration(now + secondsFromNow * 1000, text, now);
        expect(reset(59)).toBe('1 мин.');
        expect(reset(60 * 59)).toBe('59 мин.');
        expect(reset(60 * 59 + 59)).toBe('60 мин.');
        expect(reset(60 * 60)).toBe('1 ч.');
        expect(reset(60 * 60 * 71)).toBe('71 ч.');
        expect(reset(60 * 60 * 71 + 59 * 60)).toBe('72 ч.');
        expect(reset(60 * 60 * 72)).toBe('3 дн.');
        expect(reset(-20)).toBe('0 мин.');
    });
});
