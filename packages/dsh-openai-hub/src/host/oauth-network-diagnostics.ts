import { AsyncLocalStorage } from 'node:async_hooks';
import { channel } from 'node:diagnostics_channel';
import { z } from 'zod';
import type { OpenAIHubLogEvent } from '../shared/logging.js';
import { oauthNetworkFailure } from './oauth-network-error.js';

const activeReport = new AsyncLocalStorage<(event: OpenAIHubLogEvent) => void>();
const endpoints = {
    '/oauth/token': 'oauth_token',
    '/api/accounts/deviceauth/usercode': 'oauth_device_code',
    '/api/accounts/deviceauth/token': 'oauth_device_poll'
} as const;
const requestMessage = z.object({
    request: z.object({ origin: z.union([z.string(), z.instanceof(URL)]), path: z.string(), method: z.literal('POST') }),
    response: z.object({ statusCode: z.number().int().min(100).max(599) }).optional(),
    error: z.instanceof(Error).optional()
});
const connectMessage = z.object({
    connectParams: z.object({ hostname: z.string(), port: z.coerce.number().int().min(1).max(65535) }),
    error: z.instanceof(Error).optional()
});

// Только наблюдение за текущей OAuth-операцией: не заменяем fetch/dispatcher и не читаем заголовки или тела.
export function withOAuthNetworkDiagnostics<T>(action: () => Promise<T>, report: (event: OpenAIHubLogEvent) => void): Promise<T> {
    return activeReport.run(report, async () => {
        const requestStarts = new Map<string, number>();
        const connectStarts = new Map<string, number>();
        const unsubscribe: Array<() => void> = [];
        for (const [name, transportEvent] of [
            ['undici:request:create', 'request_created'],
            ['undici:request:headers', 'response_headers'],
            ['undici:request:error', 'request_error'],
            ['undici:client:beforeConnect', 'before_connect'],
            ['undici:client:connected', 'connected'],
            ['undici:client:connectError', 'connect_error']
        ] as const) {
            const source = channel(name);
            const listener: Parameters<typeof source.subscribe>[0] = message => {
                if (activeReport.getStore() !== report) return;
                try {
                    const request = requestMessage.safeParse(message);
                    const connect = connectMessage.safeParse(message);
                    const common: OpenAIHubLogEvent = {
                        event: 'login',
                        transport: 'undici',
                        transportEvent,
                        phase: transportEvent.endsWith('error')
                            ? 'failed'
                            : transportEvent === 'before_connect' || transportEvent === 'request_created'
                              ? 'started'
                              : 'completed'
                    };
                    if (request.success) {
                        if (String(request.data.request.origin) !== 'https://auth.openai.com') return;
                        const endpoint = Object.entries(endpoints).find(([path]) => path === request.data.request.path)?.[1];
                        if (!endpoint) return;
                        if (transportEvent === 'request_created') requestStarts.set(endpoint, Date.now());
                        const startedAt = requestStarts.get(endpoint);
                        report({
                            ...common,
                            ...(startedAt !== undefined ? { durationMs: Math.min(86_400_000, Date.now() - startedAt) } : {}),
                            endpoint,
                            loginStage: 'http_request',
                            requestJson: { endpoint, method: 'POST', body: 'redacted' },
                            ...(request.data.response ? { httpStatus: request.data.response.statusCode } : {}),
                            ...(endpoint !== 'oauth_device_poll' && request.data.response && request.data.response.statusCode >= 400
                                ? ({ ...oauthNetworkFailure(undefined, 'oauth_http_failed'), phase: 'failed' } as const)
                                : {}),
                            ...(request.data.error ? oauthNetworkFailure(request.data.error) : {})
                        });
                    } else if (connect.success) {
                        const target = `${connect.data.connectParams.hostname}:${connect.data.connectParams.port}`;
                        if (transportEvent === 'before_connect') connectStarts.set(target, Date.now());
                        const startedAt = connectStarts.get(target);
                        report({
                            ...common,
                            ...(startedAt !== undefined ? { durationMs: Math.min(86_400_000, Date.now() - startedAt) } : {}),
                            loginStage: 'network_connect',
                            connectionHost: connect.data.connectParams.hostname === 'auth.openai.com' ? 'auth.openai.com' : 'other',
                            connectionPort: connect.data.connectParams.port,
                            ...(connect.data.error ? oauthNetworkFailure(connect.data.error) : {})
                        });
                    }
                } catch {
                    // Наблюдатель не должен менять исход сетевого запроса, даже при ошибке приёмника журнала.
                }
            };
            source.subscribe(listener);
            unsubscribe.push(() => source.unsubscribe(listener));
        }
        try {
            return await action();
        } finally {
            for (const stop of unsubscribe) stop();
        }
    });
}
