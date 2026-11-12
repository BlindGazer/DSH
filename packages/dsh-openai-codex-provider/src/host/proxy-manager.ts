import type { Worker } from 'node:worker_threads';
import type { RequestInfo as UndiciRequestInfo, RequestInit as UndiciRequestInit, Response as UndiciResponse } from 'undici';
import type { ProxyTransport, SystemProxyPolicy } from './system-proxy.js';
import { readSystemProxy, SYSTEM_PROXY_ERROR, systemOAuth, systemProxyTransport } from './system-proxy.js';

interface Route {
    mode: ProxyMode;
    users: number;
    retired: boolean;
    closed: boolean;
    error: string;
    transport: ProxyTransport | undefined;
    policy: SystemProxyPolicy | undefined;
    ready: Promise<void>;
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface HostOAuth {
    login(interaction: object): Promise<object>;
    refresh(credential: object | undefined, signal?: AbortSignal): Promise<object>;
}

interface ProxyDependencies {
    read?: () => Promise<SystemProxyPolicy>;
    transport?: (policy: SystemProxyPolicy) => ProxyTransport;
    oauth?: (
        policy: SystemProxyPolicy,
        operation: 'login' | 'refresh',
        credential: object | undefined,
        interaction: object,
        workers: Set<Worker>
    ) => Promise<object>;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

interface OAuthInteraction {
    signal?: AbortSignal;
    notify?: (value: string) => void;
}

interface ProxyLease {
    mode: ProxyMode;
    fetch: Route['fetch'];
    oauth(operation: 'login' | 'refresh', credential: object | undefined, interaction: OAuthInteraction): Promise<object>;
    release(): void;
}

export type ProxyMode = 'host' | 'system';

/** Удерживает прежний транспорт, пока все начатые запросы и OAuth-операции не завершатся. */
export function createProxyManager(initialMode: ProxyMode, hostOAuth: HostOAuth, dependencies: ProxyDependencies = {}) {
    const read = dependencies.read ?? readSystemProxy;
    const makeTransport = dependencies.transport ?? systemProxyTransport;
    const workerOAuth = dependencies.oauth ?? systemOAuth;
    const hostFetch = dependencies.fetch ?? ((...args) => globalThis.fetch(...args));
    const routes = new Set<Route>();
    const workers = new Set<Worker>();
    let disposed = false;

    function make(mode: ProxyMode): Route {
        const route: Route = {
            mode,
            users: 0,
            retired: false,
            closed: false,
            error: '',
            transport: undefined,
            policy: undefined,
            ready: Promise.resolve(),
            fetch: async (...args) => hostFetch(...args)
        };
        routes.add(route);
        route.ready = (async () => {
            if (mode === 'system') {
                route.policy = await read();
                route.transport = makeTransport(route.policy);
            }
        })().catch(() => {
            route.error = SYSTEM_PROXY_ERROR;
        });
        route.fetch = async (...args) => {
            await route.ready;
            if (route.error) throw new Error(route.error);
            if (mode === 'host') return hostFetch(...args);
            if (!route.transport) throw new Error(SYSTEM_PROXY_ERROR);
            // Fetch API совпадает во время выполнения, но DOM и Undici описывают Request разными типами.
            const response: UndiciResponse = await route.transport.fetch(
                args[0] as UndiciRequestInfo,
                args[1] as UndiciRequestInit | undefined
            );
            const headers: Array<[string, string]> = [];
            response.headers.forEach((value, key) => {
                headers.push([key, value]);
            });
            const reader = response.body?.getReader();
            const body = reader
                ? new ReadableStream<Uint8Array>({
                      async pull(controller) {
                          const chunk: { done: boolean; value?: Uint8Array } = await reader.read();
                          if (chunk.done) {
                              reader.releaseLock();
                              controller.close();
                          } else if (chunk.value !== undefined) controller.enqueue(chunk.value);
                      },
                      async cancel() {
                          await reader.cancel();
                          reader.releaseLock();
                      }
                  })
                : undefined;
            return new Response(body, { status: response.status, statusText: response.statusText, headers });
        };
        return route;
    }

    function collect(route: Route, force = false): void {
        if (route.closed || (!force && (!route.retired || route.users !== 0))) return;
        route.closed = true;
        routes.delete(route);
        void route.ready.then(() => route.transport?.close()).catch(() => undefined);
    }

    let current = make(initialMode);
    return {
        get mode(): ProxyMode {
            return current.mode;
        },
        get error(): string {
            return current.error;
        },
        get ready(): Promise<void> {
            return current.ready;
        },
        async prepare(mode: ProxyMode): Promise<Route> {
            if (disposed) throw new Error('Proxy manager disposed');
            const candidate = make(mode);
            await candidate.ready;
            if (candidate.error || disposed) {
                collect(candidate, true);
                throw new Error(candidate.error || 'Proxy manager disposed');
            }
            return candidate;
        },
        commit(candidate: Route): void {
            if (disposed) {
                collect(candidate, true);
                throw new Error('Proxy manager disposed');
            }
            const old = current;
            current = candidate;
            old.retired = true;
            collect(old);
        },
        discard(candidate: Route): void {
            collect(candidate, true);
        },
        acquire(): ProxyLease {
            if (disposed) throw new Error('Proxy manager disposed');
            const route = current;
            route.users++;
            let released = false;
            return {
                mode: route.mode,
                fetch: route.fetch,
                async oauth(operation, credential, interaction) {
                    await route.ready;
                    if (route.error) throw new Error(route.error);
                    if (route.mode === 'system') {
                        if (!route.policy) throw new Error(SYSTEM_PROXY_ERROR);
                        return workerOAuth(route.policy, operation, credential, interaction, workers);
                    }
                    return operation === 'login'
                        ? hostOAuth.login(interaction)
                        : hostOAuth.refresh(credential, interaction.signal ?? new AbortController().signal);
                },
                release() {
                    if (!released) {
                        released = true;
                        route.users--;
                        collect(route);
                    }
                }
            };
        },
        dispose(): void {
            disposed = true;
            for (const worker of workers) void worker.terminate();
            for (const route of routes) collect(route, true);
        }
    };
}
