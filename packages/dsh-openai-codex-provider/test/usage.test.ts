import { describe, expect, it } from 'vitest';
import { CODEX_USAGE_URL, parseCodexUsage, requestCodexUsage } from '../src/host/usage.js';

const privateBodyFetch: typeof fetch = async () => new Response('private body', { status: 403 });

describe('Codex usage', () => {
    it('возвращает только агрегированные лимиты и баланс', () => {
        const result = parseCodexUsage(
            {
                rate_limit: { primary_window: { used_percent: 24.5, limit_window_seconds: 18000, reset_at: 1900000000 } },
                additional_rate_limits: [
                    { limit_name: 'Codex Spark', rate_limit: { secondary_window: { used_percent: 70, reset_after_seconds: 90 } } }
                ],
                credits: { has_credits: true, balance: '12.50' }
            },
            1000000
        );
        expect(result.limits).toEqual([
            { name: 'Codex', usedPercent: 24.5, windowSeconds: 18000, resetAt: 1900000000000 },
            { name: 'Codex Spark', usedPercent: 70, windowSeconds: 0, resetAt: 1090000 }
        ]);
        expect(result.credits).toEqual({ hasCredits: true, unlimited: false, balance: '12.50' });
    });

    it('uses mocked fetch with OAuth headers and strict redirect handling', async () => {
        let calledUrl = '';
        const fetchMock: typeof fetch = async (url, init) => {
            calledUrl = String(url);
            expect(init?.method).toBe('GET');
            expect(init?.redirect).toBe('error');
            expect(new Headers(init?.headers).get('chatgpt-account-id')).toBe('mock-account');
            return Response.json({ rate_limit: { allowed: false } });
        };
        const result = await requestCodexUsage({ access: 'mock-access', accountId: 'mock-account' }, fetchMock);
        expect(calledUrl).toBe(CODEX_USAGE_URL);
        expect(result.limited).toBe(true);
    });

    it('does not expose an HTTP error body', async () => {
        await expect(requestCodexUsage({ access: 'mock-access', accountId: 'mock-account' }, privateBodyFetch)).rejects.toThrow(
            'request failed (403)'
        );
    });
});
