import { channel } from 'node:diagnostics_channel';
import { describe, expect, it, vi } from 'vitest';
import { withOAuthNetworkDiagnostics } from '../src/host/oauth-network-diagnostics.js';
import { oauthNetworkFailure } from '../src/host/oauth-network-error.js';
import { OpenAIHubClientLogEventSchema, type OpenAIHubLogEvent } from '../src/shared/logging.js';

const request = {
    request: { origin: 'https://auth.openai.com', path: '/oauth/token', method: 'POST', headers: 'private-header', body: 'private-code' }
};

function timeoutError() {
    return Object.assign(new Error('private-address and private-token; timeout: 10000ms'), {
        name: 'ConnectTimeoutError',
        code: 'UND_ERR_CONNECT_TIMEOUT'
    });
}

describe('OAuth network diagnostics', () => {
    it('preserves the nested timeout cause without storing exception messages or stacks', () => {
        const error = new TypeError('private-fetch', { cause: new AggregateError([timeoutError()], 'private-aggregate') });
        const failure = oauthNetworkFailure(error);
        expect(failure).toMatchObject({
            errorCode: 'oauth_connect_timeout',
            networkError: 'UND_ERR_CONNECT_TIMEOUT',
            networkTimeoutMs: 10000
        });
        expect(failure.errorCauses).toEqual([
            { name: 'TypeError', code: 'other' },
            { name: 'AggregateError', code: 'other' },
            { name: 'ConnectTimeoutError', code: 'UND_ERR_CONNECT_TIMEOUT' }
        ]);
        expect(JSON.stringify(failure)).not.toContain('private');
        expect(OpenAIHubClientLogEventSchema.safeParse({ event: 'login', phase: 'failed', ...failure }).success).toBe(true);
    });

    it.each([
        ['ENOTFOUND', 'oauth_dns_failed'],
        ['ECONNREFUSED', 'oauth_connection_refused'],
        ['ECONNRESET', 'oauth_connection_reset'],
        ['CERT_HAS_EXPIRED', 'oauth_tls_failed'],
        ['UND_ERR_HEADERS_TIMEOUT', 'oauth_headers_timeout'],
        ['UND_ERR_BODY_TIMEOUT', 'oauth_body_timeout']
    ])('distinguishes %s from a connection timeout', (code, errorCode) => {
        expect(oauthNetworkFailure(Object.assign(new Error('private'), { code }))).toMatchObject({ errorCode, networkError: code });
    });

    it('handles cyclic causes and refuses arbitrary diagnostic strings', () => {
        const error = new Error('private');
        Object.assign(error, { cause: error });
        expect(oauthNetworkFailure(error).errorCauses).toHaveLength(1);
        const event = { event: 'login', phase: 'failed', ...oauthNetworkFailure(error) };
        expect(OpenAIHubClientLogEventSchema.safeParse({ ...event, errorMessage: 'private' }).success).toBe(false);
        expect(OpenAIHubClientLogEventSchema.safeParse({ ...event, errorCauses: [{ name: 'private', code: 'other' }] }).success).toBe(
            false
        );
    });

    it('records the actual request and response metadata and removes subscriptions afterward', async () => {
        const report = vi.fn<(event: OpenAIHubLogEvent) => void>();
        const source = channel('undici:request:create');
        const subscribedBefore = source.hasSubscribers;
        await expect(
            withOAuthNetworkDiagnostics(async () => {
                source.publish(request);
                channel('undici:request:headers').publish({ ...request, response: { statusCode: 400, headers: 'private-token' } });
                return 'done';
            }, report)
        ).resolves.toBe('done');
        expect(report).toHaveBeenCalledWith(
            expect.objectContaining({ transport: 'undici', endpoint: 'oauth_token', transportEvent: 'request_created' })
        );
        expect(report).toHaveBeenCalledWith(expect.objectContaining({ httpStatus: 400, errorCode: 'oauth_http_failed', phase: 'failed' }));
        expect(JSON.stringify(report.mock.calls)).not.toContain('private');
        for (const [event] of report.mock.calls) expect(OpenAIHubClientLogEventSchema.safeParse(event).success).toBe(true);
        expect(source.hasSubscribers).toBe(subscribedBefore);
        source.publish(request);
        expect(report).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['/api/accounts/deviceauth/usercode', 403, 'failed'],
        ['/api/accounts/deviceauth/token', 403, 'completed'],
        ['/api/accounts/deviceauth/token', 404, 'completed']
    ] as const)('records %s status %s without treating expected pending as a failure', async (path, statusCode, phase) => {
        const report = vi.fn<(event: OpenAIHubLogEvent) => void>();
        await withOAuthNetworkDiagnostics(async () => {
            channel('undici:request:headers').publish({
                request: { ...request.request, path },
                response: { statusCode }
            });
        }, report);
        expect(report).toHaveBeenCalledWith(expect.objectContaining({ httpStatus: statusCode, phase }));
        if (phase === 'failed') expect(report).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'oauth_http_failed' }));
        else expect(report.mock.calls[0]?.[0].errorCode).toBeUndefined();
    });

    it('records connection failure details without writing proxy hosts or request payloads', async () => {
        const report = vi.fn<(event: OpenAIHubLogEvent) => void>();
        await withOAuthNetworkDiagnostics(async () => {
            channel('undici:client:connectError').publish({
                connectParams: { hostname: 'private-proxy-host', port: '443', servername: 'private' },
                error: timeoutError()
            });
        }, report);
        expect(report).toHaveBeenCalledWith(
            expect.objectContaining({
                transportEvent: 'connect_error',
                connectionHost: 'other',
                connectionPort: 443,
                errorCode: 'oauth_connect_timeout',
                networkError: 'UND_ERR_CONNECT_TIMEOUT'
            })
        );
        expect(JSON.stringify(report.mock.calls)).not.toContain('private');
    });

    it('does not attribute requests outside its async scope or unrelated endpoints to OAuth', async () => {
        const report = vi.fn<(event: OpenAIHubLogEvent) => void>();
        let resume: (() => void) | undefined;
        const pending = new Promise<void>(resolve => {
            resume = resolve;
        });
        const result = withOAuthNetworkDiagnostics(async () => {
            channel('undici:request:create').publish({ request: { ...request.request, path: '/other?code=private' } });
            await pending;
            channel('undici:request:create').publish(request);
        }, report);
        channel('undici:request:create').publish(request);
        expect(report).not.toHaveBeenCalled();
        resume?.();
        await result;
        expect(report).toHaveBeenCalledTimes(1);
    });

    it('does not let a failing log receiver break the original operation', async () => {
        await expect(
            withOAuthNetworkDiagnostics(
                async () => {
                    channel('undici:request:create').publish(request);
                    return 'ok';
                },
                () => {
                    throw new Error('private-log-receiver');
                }
            )
        ).resolves.toBe('ok');
    });
});
