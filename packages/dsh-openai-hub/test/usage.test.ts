import { describe, expect, it } from 'vitest';
import { CODEX_USAGE_URL, parseCodexUsage, requestCodexUsage } from '../src/host/usage.ts';

const privateBodyFetch: typeof fetch = async () => new Response('private body', { status: 403 });

describe('Codex usage', () => {
    it('Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð°Ð³Ñ€ÐµÐ³Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ðµ Ð»Ð¸Ð¼Ð¸Ñ‚Ñ‹ Ð¸ Ð±Ð°Ð»Ð°Ð½Ñ', () => {
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
        const diagnostics: Array<{ requestJson: object; responseJson: object }> = [];
        const fetchMock: typeof fetch = async (url, init) => {
            calledUrl = String(url);
            expect(init?.method).toBe('GET');
            expect(init?.redirect).toBe('error');
            expect(new Headers(init?.headers).get('chatgpt-account-id')).toBe('mock-account');
            return Response.json({ rate_limit: { allowed: false } });
        };
        const result = await requestCodexUsage({ access: 'mock-access', accountId: 'mock-account' }, fetchMock, Date.now(), value =>
            diagnostics.push(value)
        );
        expect(calledUrl).toBe(CODEX_USAGE_URL);
        expect(result.limited).toBe(true);
        expect(diagnostics).toEqual([
            {
                requestJson: { endpoint: 'codex_usage', method: 'GET', body: 'none' },
                responseJson: {
                    status: 200,
                    contentType: 'application/json',
                    shape: 'usage',
                    fields: ['rate_limit'],
                    itemCount: 0
                }
            }
        ]);
        expect(JSON.stringify(diagnostics)).not.toContain('mock-account');
    });

    it('does not expose an HTTP error body', async () => {
        await expect(requestCodexUsage({ access: 'mock-access', accountId: 'mock-account' }, privateBodyFetch)).rejects.toThrow(
            'request failed (403)'
        );
    });
});
