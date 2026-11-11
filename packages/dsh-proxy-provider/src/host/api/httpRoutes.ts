import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Readable } from 'node:stream';
import type { RawConfigCandidate, RawProfileCandidate } from '../services/configNormalizer.js';
import type { ProviderProxyController } from '../services/controller.js';

/**
 * Записывает JSON-ответ с заголовками запрета кэширования.
 */
export function writeJson(res: ServerResponse, status: number, payload: object): void {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

type JsonBodyValue = object | string | number | boolean | null;

class InvalidJsonBodyError extends Error {
    public constructor() {
        super('Request body must be a JSON object');
    }
}

/**
 * Читает JSON-объект входящего HTTP-запроса с ограничением размера 128 КБ.
 */
export function readJsonBody(req: Readable): Promise<Record<string, JsonBodyValue>> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;
        req.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.from(chunk);
            total += buffer.length;
            if (total > 128 * 1024) {
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            chunks.push(buffer);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8').trim();
                const parsed: object | string | number | boolean | null = raw ? JSON.parse(raw) : {};
                if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    reject(new InvalidJsonBodyError());
                    return;
                }
                resolve(parsed as Record<string, JsonBodyValue>);
            } catch {
                reject(new InvalidJsonBodyError());
            }
        });
        req.on('error', reject);
    });
}

/**
 * Проверяет, что HTTP-запрос поступил из веб-интерфейса оболочки DSH того же источника.
 */
export function isSameOriginBrowserRequest(req: IncomingMessage): boolean {
    const site = req.headers?.['sec-fetch-site'];
    if (site && site !== 'same-origin' && site !== 'none') return false;
    const userAgent = req.headers?.['user-agent'] || '';
    if (/PowerShell|curl\/|Wget\/|python-requests|node-fetch|undici/i.test(userAgent)) return false;
    if (!site && !userAgent.includes('Mozilla/') && req.headers?.['x-kpp-client'] !== 'dsh-web-ui') return false;
    const origin = req.headers?.origin;
    if (typeof origin === 'string') {
        try {
            if (new URL(origin).host !== req.headers.host) return false;
        } catch {
            return false;
        }
    }
    return true;
}

export interface WebServerHostContext {
    inject?(
        deps: readonly string[],
        callback: (webCtx: {
            effect(fn: () => void): void;
            readonly webServer: {
                register(route: {
                    readonly kind: string;
                    readonly path: string;
                    readonly handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
                }): void;
            };
        }) => void
    ): void;
}

/**
 * Регистрирует HTTP-маршруты управления прокси (/api/kalex-provider-proxy/*) в веб-сервере DSH.
 */
export function registerHttpRoutes(ctx: WebServerHostContext, controller: ProviderProxyController): void {
    let activeGuiToken: string | null = null;
    if (typeof ctx.inject !== 'function') return;

    ctx.inject(['webServer'], webCtx => {
        webCtx.effect(() =>
            webCtx.webServer.register({
                kind: 'prefix',
                path: '/api/kalex-provider-proxy',
                handler: async (req, res) => {
                    if (!isSameOriginBrowserRequest(req)) {
                        writeJson(res, 403, { ok: false, error: 'Forbidden: access restricted to DSH Web GUI' });
                        return;
                    }

                    const url = new URL(req.url ?? '/', 'http://dsh.internal');
                    const action = url.pathname.replace(/^\/api\/kalex-provider-proxy\/?/, '');
                    try {
                        if (action === 'session' && req.method === 'POST') {
                            const body = await readJsonBody(req);
                            if (body?.action === 'release') {
                                activeGuiToken = null;
                                writeJson(res, 200, { ok: true });
                                return;
                            }
                            if (!activeGuiToken) activeGuiToken = randomBytes(24).toString('hex');
                            writeJson(res, 200, { ok: true, token: activeGuiToken });
                            return;
                        }

                        const reqToken = req.headers?.['x-kpp-token'];
                        if (reqToken && !activeGuiToken) activeGuiToken = String(reqToken);

                        if (action === 'state' && req.method === 'GET') {
                            writeJson(res, 200, { ok: true, ...(await controller.refreshRouting()) });
                            return;
                        }
                        if (action === 'config' && req.method === 'POST') {
                            const body = (await readJsonBody(req)) as RawConfigCandidate;
                            writeJson(res, 200, { ok: true, ...(await controller.updateConfig(body)) });
                            return;
                        }
                        if (action === 'export' && (req.method === 'GET' || req.method === 'POST')) {
                            const body = req.method === 'POST' ? await readJsonBody(req) : {};
                            writeJson(res, 200, {
                                ok: true,
                                exportData: controller.exportConfig({
                                    includeCredentials: Boolean(body.includeCredentials),
                                    password: typeof body.password === 'string' ? body.password : ''
                                })
                            });
                            return;
                        }
                        if (action === 'import' && req.method === 'POST') {
                            const body = (await readJsonBody(req)) as RawConfigCandidate;
                            writeJson(res, 200, { ok: true, ...(await controller.importConfig(body)) });
                            return;
                        }
                        if (action === 'bind' && req.method === 'POST') {
                            const body = await readJsonBody(req);
                            if (!body || typeof body.providerId !== 'string') {
                                writeJson(res, 400, { ok: false, error: 'providerId is required' });
                                return;
                            }
                            const profileId = typeof body.profileId === 'string' ? body.profileId : null;
                            writeJson(res, 200, {
                                ok: true,
                                ...(await controller.bindProvider(body.providerId, profileId))
                            });
                            return;
                        }
                        if (action === 'test' && req.method === 'POST') {
                            const body = await readJsonBody(req);
                            const rawProfile = (body?.profile ?? {}) as RawProfileCandidate;
                            const rawCandidate: RawProfileCandidate = {
                                id: rawProfile.id || 'test-profile',
                                name: rawProfile.name || 'Test Profile',
                                ...rawProfile
                            };
                            const profile = controller.resolveProfileWithSecrets(rawCandidate);
                            if (!profile) {
                                writeJson(res, 400, {
                                    ok: false,
                                    tcpOk: false,
                                    httpOk: false,
                                    error: 'Valid proxy host and port (1-65535) are required'
                                });
                                return;
                            }
                            const testUrl = typeof body?.testUrl === 'string' ? body.testUrl : undefined;
                            writeJson(res, 200, await controller.testConnection(profile, testUrl));
                            return;
                        }
                        writeJson(res, 404, { ok: false, error: `Unknown endpoint "${action}"` });
                    } catch (error) {
                        writeJson(res, error instanceof InvalidJsonBodyError ? 400 : 500, {
                            ok: false,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
            })
        );
    });
}
