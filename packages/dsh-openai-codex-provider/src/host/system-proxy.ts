import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Worker } from 'node:worker_threads';
import type { Dispatcher, RequestInfo as UndiciRequestInfo, RequestInit as UndiciRequestInit, Response as UndiciResponse } from 'undici';
import { Agent, ProxyAgent, fetch as proxyFetch } from 'undici';

const registryKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
export const SYSTEM_PROXY_ERROR =
    'Windows manual HTTP/HTTPS system proxy is unavailable. PAC is not supported; configure a manual proxy or follow DSH.';

export interface SystemProxyPolicy {
    http?: string;
    https?: string;
    bypass: string;
}

export interface ProxyTransport {
    fetch(input: UndiciRequestInfo, init?: UndiciRequestInit): Promise<UndiciResponse>;
    close(): Promise<void>;
}

type WorkerSet = Set<Worker>;
interface OAuthInteraction {
    signal?: AbortSignal;
    notify?: (value: string) => void;
}
type WorkerMessage = { type: 'notify'; value: string } | { type: 'result'; value: object } | { type: 'error' };
interface WorkerData {
    policy: SystemProxyPolicy;
    operation: 'login' | 'refresh';
    credential: object | undefined;
    providerUrl: string;
}

/** Читает только ручной прокси WinINET текущего пользователя, не раскрывая адреса в интерфейсе. */
export function parseSystemProxy(output: string): SystemProxyPolicy {
    const values: Record<string, string> = {};
    for (const line of output.split(/\r?\n/)) {
        const match = /^\s*(ProxyEnable|ProxyServer|AutoConfigURL|ProxyOverride)\s+REG_\w+\s+(.*?)\s*$/.exec(line);
        const key = match?.[1];
        const value = match?.[2];
        if (key !== undefined && value !== undefined) values[key] = value;
    }
    if (values.AutoConfigURL || Number(values.ProxyEnable) !== 1 || !values.ProxyServer) throw new Error(SYSTEM_PROXY_ERROR);
    const proxies: Omit<SystemProxyPolicy, 'bypass'> = {};
    const address = (value: string): string => {
        const url = new URL(value.includes('://') ? value : `http://${value}`);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
            throw new Error(SYSTEM_PROXY_ERROR);
        return url.href;
    };
    try {
        if (!values.ProxyServer.includes('=')) proxies.http = proxies.https = address(values.ProxyServer);
        else
            for (const entry of values.ProxyServer.split(';')) {
                const match = /^\s*(https?)\s*=\s*(.+?)\s*$/.exec(entry);
                const scheme = match?.[1];
                const proxyAddress = match?.[2];
                if ((scheme === 'http' || scheme === 'https') && proxyAddress !== undefined) proxies[scheme] = address(proxyAddress);
            }
    } catch {
        throw new Error(SYSTEM_PROXY_ERROR);
    }
    // Все точки Codex используют HTTPS, поэтому отсутствие HTTPS-прокси не допускает прямой запрос.
    if (!proxies.https) throw new Error(SYSTEM_PROXY_ERROR);
    return { ...proxies, bypass: values.ProxyOverride ?? '' };
}

export async function readSystemProxy(platform = process.platform, execute = promisify(execFile)): Promise<SystemProxyPolicy> {
    if (platform !== 'win32') throw new Error(SYSTEM_PROXY_ERROR);
    try {
        const result = await execute('reg.exe', ['query', registryKey], {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 5000,
            maxBuffer: 65536
        });
        return parseSystemProxy(typeof result === 'string' ? result : result.stdout);
    } catch {
        throw new Error(SYSTEM_PROXY_ERROR);
    }
}

export function bypassSystemProxy(url: URL, bypass: string): boolean {
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (['localhost', '::1'].includes(host) || host.startsWith('127.')) return true;
    return bypass.split(';').some(raw => {
        const pattern = raw.trim().toLowerCase();
        if (!pattern) return false;
        if (pattern === '<local>') return !host.includes('.') && !host.includes(':');
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`).test(pattern.includes(':') ? url.host.toLowerCase() : host);
    });
}

/** Независимый диспетчер не меняет переменные окружения или глобальный диспетчер хоста. */
export function systemProxyTransport(policy: SystemProxyPolicy): ProxyTransport {
    const agents = new Map<string, Dispatcher>();
    return {
        async fetch(input: UndiciRequestInfo, init?: UndiciRequestInit): Promise<UndiciResponse> {
            const target = typeof input === 'string' ? input : 'url' in input ? input.url : input.href;
            const url = new URL(target);
            if (bypassSystemProxy(url, policy.bypass)) {
                let dispatcher = agents.get('direct');
                if (!dispatcher) {
                    dispatcher = new Agent();
                    agents.set('direct', dispatcher);
                }
                return proxyFetch(input, { ...init, dispatcher });
            }
            const protocol = url.protocol === 'https:' ? 'https' : url.protocol === 'http:' ? 'http' : undefined;
            if (!protocol) throw new Error(SYSTEM_PROXY_ERROR);
            const address = policy[protocol];
            if (!address) throw new Error(SYSTEM_PROXY_ERROR);
            let dispatcher = agents.get(address);
            if (!dispatcher) {
                dispatcher = new ProxyAgent(address);
                agents.set(address, dispatcher);
            }
            return proxyFetch(input, { ...init, dispatcher });
        },
        async close() {
            await Promise.all([...agents.values()].map(agent => agent.destroy()));
        }
    };
}

/** pi-ai не принимает индивидуальный fetch, поэтому OAuth запускается в отдельном Worker. */
export function systemOAuth(
    policy: SystemProxyPolicy,
    operation: 'login' | 'refresh',
    credential: object | undefined,
    interaction: OAuthInteraction = {},
    workers: WorkerSet = new Set()
): Promise<object> {
    return new Promise((resolve, reject) => {
        if (interaction.signal?.aborted) {
            reject(new Error('Codex proxy operation cancelled.'));
            return;
        }
        const data: WorkerData = {
            policy,
            operation,
            credential,
            providerUrl: import.meta.resolve('@earendil-works/pi-ai/providers/openai-codex')
        };
        const worker = new Worker(new URL('./system-proxy-worker.js', import.meta.url), { workerData: data });
        workers.add(worker);
        let finished = false;
        const finish = (error: Error | undefined, result: object | undefined): void => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            interaction.signal?.removeEventListener('abort', abort);
            workers.delete(worker);
            void worker.terminate();
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Codex system-proxy OAuth request failed.'));
        };
        const abort = (): void => finish(new Error('Codex proxy operation cancelled.'), undefined);
        const timer = setTimeout(
            () => finish(new Error('Codex proxy operation timed out.'), undefined),
            operation === 'login' ? 15 * 60_000 : 30_000
        );
        interaction.signal?.addEventListener('abort', abort, { once: true });
        worker.on('message', (message: WorkerMessage) => {
            if (message.type === 'notify') {
                try {
                    if (message.value !== undefined) interaction.notify?.(message.value);
                } catch {
                    finish(new Error('Codex proxy login notification failed.'), undefined);
                }
            } else if (message.type === 'result') finish(undefined, message.value);
            else if (message.type === 'error') finish(new Error('Codex system-proxy OAuth request failed.'), undefined);
        });
        worker.on('error', () => finish(new Error('Codex system-proxy worker failed.'), undefined));
        worker.on('exit', () => {
            if (!finished) finish(new Error('Codex system-proxy worker stopped.'), undefined);
        });
    });
}
