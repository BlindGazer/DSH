import { existsSync } from 'node:fs';

import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface ProxyDispatchOptions {
    readonly origin?: string | URL;
    readonly path?: string;
    readonly headers?: string[] | Record<string, string>;
    readonly [key: string]: object | string | undefined;
}

interface ProxyAgentHandlerLike {
    onHeaders?: (statusCode: number, headers: Buffer[], resume: () => void, statusText: string) => boolean;
    onError?: (error: Error) => void;
}

export interface UndiciDispatcherLike {
    close?(): Promise<void>;
    destroy?(): Promise<void>;
    dispatch?(options: ProxyDispatchOptions, handler: object): boolean;
}

interface ProxyAgentDispatcherLike extends UndiciDispatcherLike {
    dispatch(options: ProxyDispatchOptions, handler: object): boolean;
}

interface ProxyAgentConstructor {
    new (options: Record<string, object | string | undefined>): ProxyAgentDispatcherLike;
    readonly prototype: ProxyAgentDispatcherLike;
}

type UndiciOptionFunction = (...args: never[]) => void;

interface ProxyDispatchClient {
    dispatch(options: ProxyDispatchOptions, handler: object): boolean;
}

function getSymbolObject(target: object, symbol: symbol | undefined): object | undefined {
    if (!symbol) return undefined;
    const value = Object.getOwnPropertyDescriptor(target, symbol)?.value;
    return typeof value === 'object' && value !== null ? value : undefined;
}

function isProxyDispatchClient(value: object): value is ProxyDispatchClient {
    return 'dispatch' in value && typeof value.dispatch === 'function';
}

function isStringRecord(value: object): value is Record<string, string> {
    return Object.keys(value).every(key => typeof Object.getOwnPropertyDescriptor(value, key)?.value === 'string');
}

export interface UndiciModuleLike {
    readonly ProxyAgent: ProxyAgentConstructor;
    readonly Agent: new (options: Record<string, object | UndiciOptionFunction | undefined>) => UndiciDispatcherLike;
    readonly fetch: (input: string | URL, init?: Record<string, object | string | undefined>) => Promise<Response>;
}

export type UndiciLoader = () => Promise<UndiciModuleLike>;
type UndiciModuleResolver = () => Promise<UndiciModuleLike>;

function isolateLegacyProxyAgent(mod: UndiciModuleLike): UndiciModuleLike {
    const baseDispatch = mod.ProxyAgent.prototype.dispatch;
    if (typeof baseDispatch !== 'function') return mod;

    class IsolatedProxyAgent extends mod.ProxyAgent {
        public override dispatch(options: ProxyDispatchOptions, handler: object): boolean {
            const origin = String(options.origin ?? '');
            if (!origin.startsWith('http://')) return baseDispatch.call(this, options, handler);

            const symbols = Object.getOwnPropertySymbols(this);
            const clientSymbol = symbols.find(symbol => symbol.toString() === 'Symbol(proxy client)');
            const headersSymbol = symbols.find(symbol => symbol.toString() === 'Symbol(proxy headers)');
            const clientCandidate = getSymbolObject(this, clientSymbol);
            const client = clientCandidate && isProxyDispatchClient(clientCandidate) ? clientCandidate : undefined;
            const headersCandidate = getSymbolObject(this, headersSymbol);
            const proxyHeaders = headersCandidate && isStringRecord(headersCandidate) ? headersCandidate : {};
            if (!client) return baseDispatch.call(this, options, handler);

            const requestHeaders: Record<string, string> = {};
            if (Array.isArray(options.headers)) {
                for (let index = 0; index < options.headers.length; index += 2) {
                    const key = options.headers[index];
                    const value = options.headers[index + 1];
                    if (key && value !== undefined) requestHeaders[key] = value;
                }
            } else if (options.headers) {
                Object.assign(requestHeaders, options.headers);
            }

            const headers = {
                ...requestHeaders,
                ...proxyHeaders,
                host: new URL(origin).host
            };
            const proxiedHandler = new Proxy(handler as ProxyAgentHandlerLike, {
                get(target, property, receiver) {
                    if (property === 'onHeaders') {
                        return (statusCode: number, responseHeaders: Buffer[], resume: () => void, statusText: string) => {
                            if (statusCode === 407 && typeof target.onError === 'function') {
                                target.onError(new Error('Proxy Authentication Required (407)'));
                                return false;
                            }
                            return target.onHeaders ? target.onHeaders(statusCode, responseHeaders, resume, statusText) : true;
                        };
                    }
                    return Reflect.get(target, property, receiver);
                }
            });

            return client.dispatch(
                {
                    ...options,
                    path: `${origin}${options.path ?? '/'}`,
                    headers
                },
                proxiedHandler
            );
        }
    }

    return { ...mod, ProxyAgent: IsolatedProxyAgent };
}

async function resolveUndiciModule(): Promise<UndiciModuleLike> {
    const candidates: string[] = ['undici'];
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
    const profileUndici = join(dshHome, 'profiles', 'desktop', 'node_modules', 'undici', 'index.js');
    if (existsSync(profileUndici)) candidates.push(pathToFileURL(profileUndici).href);

    if (existsSync('/usr/share/nodejs/undici/index.js')) {
        try {
            const requireFromSystem = createRequire('/usr/share/nodejs/index.js');
            return requireFromSystem('undici') as UndiciModuleLike;
        } catch {
            // Продолжаем перебор кандидатов.
        }
    }

    for (const specifier of candidates) {
        try {
            return (await import(specifier)) as UndiciModuleLike;
        } catch {
            // Пробуем следующий путь.
        }
    }

    throw new Error('undici package is required but could not be resolved');
}

export function createUndiciLoader(resolveModule: UndiciModuleResolver = resolveUndiciModule): UndiciLoader {
    let cachedModule: Promise<UndiciModuleLike> | undefined;

    return async () => {
        if (!cachedModule) cachedModule = resolveModule().then(isolateLegacyProxyAgent);
        try {
            return await cachedModule;
        } catch (error) {
            cachedModule = undefined;
            throw error;
        }
    };
}

const defaultUndiciLoader = createUndiciLoader();

export function loadUndici(): Promise<UndiciModuleLike> {
    return defaultUndiciLoader();
}
