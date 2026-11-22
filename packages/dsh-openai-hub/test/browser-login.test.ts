import { createHash } from 'node:crypto';
import type { AuthInteraction } from '@earendil-works/pi-ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginBrowser } from '../src/host/browser-login.ts';

function setup(waitForRetry?: Parameters<typeof loginBrowser>[3]) {
    const input = Promise.withResolvers<string>();
    const controller = new AbortController();
    let authorizationUrl = new URL('https://auth.openai.com');
    const interaction: AuthInteraction = {
        signal: controller.signal,
        notify(event) {
            if (event.type === 'auth_url') authorizationUrl = new URL(event.url);
        },
        prompt: vi.fn(() => input.promise)
    };
    const access = `header.${Buffer.from(JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' } })).toString('base64url')}.signature`;
    const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ access_token: access, refresh_token: 'test-refresh', expires_in: 3600 }));
    const report = vi.fn();
    const result = loginBrowser(interaction, request, report, waitForRetry);
    const callback = new URL('http://localhost:1455/auth/callback');
    callback.searchParams.set('code', 'test-code');
    callback.searchParams.set('state', authorizationUrl.searchParams.get('state') ?? '');
    return { input, controller, interaction, authorizationUrl, request, result, callback, report };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('manual browser login', () => {
    it('makes no requests while waiting and exchanges only the pasted callback with PKCE', async () => {
        vi.useFakeTimers();
        const login = setup();
        await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
        expect(login.request).not.toHaveBeenCalled();
        expect(login.interaction.prompt).toHaveBeenCalledTimes(1);
        expect(login.authorizationUrl.searchParams.get('redirect_uri')).toBe('http://localhost:1455/auth/callback');
        login.input.resolve(login.callback.toString());
        await expect(login.result).resolves.toMatchObject({ type: 'oauth', accountId: 'test-account' });
        expect(login.request).toHaveBeenCalledTimes(1);
        const [url, init] = login.request.mock.calls[0] ?? [];
        expect(url).toBe('https://auth.openai.com/oauth/token');
        expect(init?.signal).toBe(login.controller.signal);
        const body = new URLSearchParams(String(init?.body));
        expect(body.get('code')).toBe('test-code');
        expect(
            createHash('sha256')
                .update(body.get('code_verifier') ?? '')
                .digest('base64url')
        ).toBe(login.authorizationUrl.searchParams.get('code_challenge'));
    });

    it('accepts callback metadata without sending it to the token endpoint', async () => {
        const login = setup();
        login.callback.searchParams.set('scope', 'openid profile email offline_access');
        login.callback.searchParams.set('iss', 'https://auth.openai.com');
        login.input.resolve(login.callback.toString());
        await expect(login.result).resolves.toMatchObject({ accountId: 'test-account' });
        const body = new URLSearchParams(String(login.request.mock.calls[0]?.[1]?.body));
        expect(body.get('code')).toBe('test-code');
        expect(body.has('scope')).toBe(false);
        expect(body.has('iss')).toBe(false);
    });

    it.each(['wrong-state', 'missing-state', 'wrong-origin', 'missing-code'])('rejects %s before exchanging tokens', async invalid => {
        const login = setup();
        if (invalid === 'wrong-state') login.callback.searchParams.set('state', 'other-state');
        if (invalid === 'missing-state') login.callback.searchParams.delete('state');
        if (invalid === 'wrong-origin') login.callback.hostname = 'example.com';
        if (invalid === 'missing-code') login.callback.searchParams.delete('code');
        login.input.resolve(login.callback.toString());
        await expect(login.result).rejects.toThrow();
        expect(login.request).not.toHaveBeenCalled();
    });

    it('does not exchange a callback after cancellation', async () => {
        const login = setup();
        login.controller.abort();
        login.input.resolve(login.callback.toString());
        await expect(login.result).rejects.toThrow();
        expect(login.request).not.toHaveBeenCalled();
    });

    it.each(['UND_ERR_CONNECT_TIMEOUT', 'ENOTFOUND', 'private-untrusted-code'])(
        'reports only an allowlisted network cause for %s',
        async code => {
            const login = setup();
            const cause = Object.assign(new Error('private-cause'), { code });
            login.request.mockRejectedValue(new TypeError('private-request', { cause }));
            login.input.resolve(login.callback.toString());
            await expect(login.result).rejects.toThrow('auth.openai.com');
            expect(login.report).toHaveBeenCalledWith(
                expect.objectContaining({
                    phase: 'failed',
                    loginStage: 'token_exchange',
                    networkError: code === 'private-untrusted-code' ? 'other' : code
                })
            );
            expect(JSON.stringify(login.report.mock.calls)).not.toContain('private');
            expect(login.request).toHaveBeenCalledTimes(1);
        }
    );

    it('waits for a manual retry and repeats token exchange with the original callback and PKCE verifier', async () => {
        const retryGate = Promise.withResolvers<void>();
        const retryWaiting = Promise.withResolvers<void>();
        const login = setup(async (error, signal) => {
            expect(error.diagnostic).toMatchObject({ errorCode: 'oauth_connect_timeout', loginStage: 'token_exchange' });
            expect(signal).toBe(login.controller.signal);
            retryWaiting.resolve();
            await retryGate.promise;
        });
        login.request.mockRejectedValueOnce(
            new TypeError('timeout', { cause: Object.assign(new Error('timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) })
        );
        login.input.resolve(login.callback.toString());
        await retryWaiting.promise;
        expect(login.request).toHaveBeenCalledOnce();
        retryGate.resolve();
        await expect(login.result).resolves.toMatchObject({ accountId: 'test-account' });
        expect(login.request).toHaveBeenCalledTimes(2);
        const firstBody = new URLSearchParams(String(login.request.mock.calls[0]?.[1]?.body));
        const secondBody = new URLSearchParams(String(login.request.mock.calls[1]?.[1]?.body));
        expect(secondBody.get('code')).toBe(firstBody.get('code'));
        expect(secondBody.get('code_verifier')).toBe(firstBody.get('code_verifier'));
        expect(secondBody.get('code')).toBe('test-code');
        expect(login.interaction.prompt).toHaveBeenCalledOnce();
    });

    it.each(['token_response', 'account_claim'] as const)('sanitizes invalid %s diagnostics', async stage => {
        const login = setup();
        login.request.mockResolvedValue(
            Response.json(
                stage === 'token_response'
                    ? { access_token: 'private-token' }
                    : { access_token: 'private-token', refresh_token: 'private-refresh', expires_in: 3600 }
            )
        );
        login.input.resolve(login.callback.toString());
        await expect(login.result).rejects.toThrow('OpenAI Hub');
        expect(login.report).toHaveBeenCalledWith(expect.objectContaining({ phase: 'failed', loginStage: stage }));
        expect(JSON.stringify(login.report.mock.calls)).not.toContain('private');
    });

    it.each([
        { error: 'invalid_grant', error_description: 'private-server-details' },
        { error: { code: 'invalid_grant', message: 'private-server-details' } }
    ])('records an allowlisted OAuth rejection without storing its response body', async payload => {
        const login = setup();
        login.request.mockResolvedValue(Response.json(payload, { status: 400 }));
        login.input.resolve(login.callback.toString());
        await expect(login.result).rejects.toThrow('invalid_grant');
        expect(login.report).toHaveBeenCalledWith(
            expect.objectContaining({
                errorCode: 'oauth_http_failed',
                httpStatus: 400,
                oauthServerError: 'invalid_grant',
                endpoint: 'oauth_token'
            })
        );
        expect(JSON.stringify(login.report.mock.calls)).not.toContain('private');
    });

    it('does not expose an unsuccessful token response in the error', async () => {
        const login = setup();
        login.request.mockResolvedValue(new Response('private response', { status: 400 }));
        login.input.resolve(login.callback.toString());
        await expect(login.result).rejects.toThrow('OpenAI Hub token exchange failed');
    });
});
