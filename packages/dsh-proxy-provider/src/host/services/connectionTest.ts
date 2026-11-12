import net from 'node:net';
import { DEFAULT_TEST_URL } from '../../shared/constants/endpoints.js';
import type { ProxyProfile, TestConnectionResult } from '../../shared/models/ProxyModels.js';
import { createProfileDispatcher } from './profileDispatcher.js';
import { loadUndici, type UndiciDispatcherLike } from './undiciLoader.js';

export interface RequestLikeInput {
    readonly url?: string;
    readonly method?: string;
    readonly headers?: {
        forEach?(cb: (value: string, key: string) => void): void;
    };
    readonly body?: BodyInit | null;
    readonly signal?: AbortSignal;
    arrayBuffer?(): Promise<ArrayBuffer>;
}

/**
 * Этап 1 проверки соединения: проверка TCP-доступности узла и порта прокси с тайм-аутом 5000 мс.
 */
export function checkTcpReachability(
    host: string,
    port: number,
    timeoutMs = 5000
): Promise<{ readonly ok: boolean; readonly latencyMs: number }> {
    const start = Date.now();
    return new Promise(resolve => {
        const socket = net.createConnection({ host, port: Number(port) });
        let done = false;
        const finish = (ok: boolean): void => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            socket.destroy();
            resolve({ ok, latencyMs: Date.now() - start });
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
    });
}

/**
 * Выполняет HTTP-запрос через загруженный экземпляр undici.fetch с поддержкой распаковки объектов Request.
 */
export async function dispatchWithUndiciFetch(
    input: string | URL | RequestLikeInput,
    init: Record<string, object | string | undefined> | undefined,
    dispatcher: UndiciDispatcherLike
): Promise<Response> {
    const { fetch: proxyFetch } = await loadUndici();
    if (input && typeof input === 'object' && !(input instanceof URL) && typeof input.url === 'string') {
        const headers: Record<string, string> = {};
        if (input.headers && typeof input.headers.forEach === 'function') {
            input.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }
        const extra = init?.headers as
            | { forEach?: (cb: (v: string, k: string) => void) => void }
            | ReadonlyArray<readonly [string, string]>
            | Record<string, string>
            | undefined;
        if (extra) {
            if (typeof (extra as { forEach?: (...args: never[]) => unknown }).forEach === 'function') {
                (extra as { forEach: (cb: (v: string, k: string) => void) => void }).forEach((value, key) => {
                    headers[key] = value;
                });
            } else if (Array.isArray(extra)) {
                for (const [k, v] of extra) headers[k] = v;
            } else if (typeof extra === 'object') {
                Object.assign(headers, extra);
            }
        }
        const method = (init?.method as string | undefined) || input.method || 'GET';
        let body = init?.body;
        if (body === undefined && method !== 'GET' && method !== 'HEAD' && input.body && typeof input.arrayBuffer === 'function') {
            body = Buffer.from(await input.arrayBuffer());
        }
        const signal = (init?.signal as AbortSignal | undefined) || input.signal;
        return proxyFetch(input.url, {
            method,
            headers,
            ...(body !== undefined ? { body } : {}),
            ...(signal ? { signal } : {}),
            dispatcher
        });
    }

    return proxyFetch(input as string | URL, {
        ...init,
        dispatcher
    });
}

/**
 * Выполняет двухэтапную проверку прокси-соединения (TCP + сквозной HTTP-запрос).
 */
export async function testProxyConnection(
    profile: ProxyProfile,
    testUrl: string = DEFAULT_TEST_URL,
    fetchImpl: ((url: string, init: Record<string, object | string | undefined>) => Promise<{ status: number }>) | null = null
): Promise<TestConnectionResult> {
    if (!profile?.host || !profile.port) {
        return {
            ok: false,
            tcpOk: false,
            httpOk: false,
            error: 'Proxy host and port are required'
        };
    }

    const tcp = await checkTcpReachability(profile.host, Number(profile.port), 5000);
    if (!tcp.ok) {
        return {
            ok: false,
            tcpOk: false,
            httpOk: false,
            error: `TCP connection to proxy ${profile.host}:${profile.port} failed (timeout 5000ms or connection refused)`
        };
    }

    const trimmedUrl = typeof testUrl === 'string' ? testUrl.trim() : '';
    if (!trimmedUrl) {
        return {
            ok: true,
            tcpOk: true,
            httpOk: true,
            latencyMs: tcp.latencyMs,
            tcpLatencyMs: tcp.latencyMs
        };
    }

    let dispatcher: UndiciDispatcherLike | undefined;
    const httpStart = Date.now();
    try {
        dispatcher = await createProfileDispatcher(profile);
        const response = fetchImpl
            ? await fetchImpl(trimmedUrl, {
                  method: 'GET',
                  dispatcher,
                  signal: AbortSignal.timeout(5000)
              })
            : await dispatchWithUndiciFetch(
                  trimmedUrl,
                  {
                      method: 'GET',
                      signal: AbortSignal.timeout(5000)
                  },
                  dispatcher
              );
        const latencyMs = Date.now() - httpStart;
        try {
            await (response as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer?.();
        } catch {}

        if (response.status === 407) {
            return {
                ok: false,
                tcpOk: true,
                httpOk: false,
                status: 407,
                latencyMs,
                tcpLatencyMs: tcp.latencyMs,
                error: 'Proxy Authentication Required (407): check username and password'
            };
        }

        return {
            ok: true,
            tcpOk: true,
            httpOk: true,
            status: response.status,
            latencyMs,
            tcpLatencyMs: tcp.latencyMs
        };
    } catch (err) {
        const latencyMs = Date.now() - httpStart;
        try {
            await (dispatcher as { close?: () => Promise<void> })?.close?.();
        } catch {}
        const errorObj = err as { message?: string; cause?: { message?: string; code?: string } };
        const rawMsg = [errorObj?.message, errorObj?.cause?.message, errorObj?.cause?.code].filter(Boolean).join(' - ');

        if (/407|Proxy Authentication Required/i.test(rawMsg)) {
            return {
                ok: false,
                tcpOk: true,
                httpOk: false,
                status: 407,
                latencyMs,
                tcpLatencyMs: tcp.latencyMs,
                error: 'Proxy Authentication Required (407): check username and password'
            };
        }

        if (/CERT_|certificate|UNABLE_TO_VERIFY|SELF_SIGNED|TLS/i.test(rawMsg)) {
            return {
                ok: false,
                tcpOk: true,
                httpOk: false,
                latencyMs,
                tcpLatencyMs: tcp.latencyMs,
                error: `SSL/TLS certificate error (${rawMsg}). Enable "Ignore SSL / TLS certificate errors" if your proxy uses a corporate root CA.`
            };
        }

        return {
            ok: false,
            tcpOk: true,
            httpOk: false,
            latencyMs,
            tcpLatencyMs: tcp.latencyMs,
            error: `HTTP request through proxy failed: ${rawMsg || String(err)}`
        };
    } finally {
        try {
            await (dispatcher as { destroy?: () => Promise<void> })?.destroy?.();
        } catch {
            // Игнорируем ошибку закрытия
        }
    }
}
