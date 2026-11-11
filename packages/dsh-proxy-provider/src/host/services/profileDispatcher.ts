import net from 'node:net';
import tls from 'node:tls';
import type { ProxyProfile } from '../../shared/models/ProxyModels.js';
import type { ProfileDispatcherLifecycle } from '../models/ProxyServiceContracts.js';
import { establishSocks5Tunnel } from './socks5.js';
import { loadUndici, type UndiciDispatcherLike, type UndiciLoader } from './undiciLoader.js';

interface ConnectOptionsLike {
    readonly hostname?: string;
    readonly host?: string;
    readonly protocol?: string;
    readonly port?: number | string;
    readonly servername?: string;
}

/**
 * Создает экземпляр диспетчера undici (ProxyAgent для HTTP/HTTPS или Agent с туннелем SOCKS5).
 */
export async function createProfileDispatcher(
    profile: ProxyProfile,
    undiciLoader: UndiciLoader = loadUndici
): Promise<UndiciDispatcherLike> {
    const { ProxyAgent, Agent } = await undiciLoader();
    const protocol = (profile.protocol || 'http').toLowerCase();

    if (protocol === 'socks5') {
        return new Agent({
            connect(opts: ConnectOptionsLike, callback: (err: Error | null, socket: net.Socket | null) => void) {
                const targetHost = opts.hostname || opts.host || 'localhost';
                const isHttps = opts.protocol === 'https:';
                const targetPort = Number(opts.port) || (isHttps ? 443 : 80);

                establishSocks5Tunnel(profile, targetHost, targetPort)
                    .then(rawSocket => {
                        if (!isHttps) {
                            callback(null, rawSocket);
                            return;
                        }
                        const tlsSocket = tls.connect({
                            socket: rawSocket,
                            servername: opts.servername || (net.isIP(targetHost) ? undefined : targetHost),
                            rejectUnauthorized: !profile.ignoreSslErrors
                        });
                        tlsSocket.once('secureConnect', () => {
                            callback(null, tlsSocket);
                        });
                        tlsSocket.once('error', (err: Error) => {
                            rawSocket.destroy();
                            callback(err, null);
                        });
                    })
                    .catch((err: Error) => {
                        callback(err, null);
                    });
            }
        });
    }

    const token =
        profile.auth?.enabled && profile.auth.username
            ? `Basic ${Buffer.from(`${profile.auth.username}:${profile.auth.password ?? ''}`).toString('base64')}`
            : undefined;

    const tlsOpts = profile.ignoreSslErrors ? { rejectUnauthorized: false } : undefined;

    return new ProxyAgent({
        uri: `${protocol}://${profile.host}:${profile.port}`,
        ...(token ? { token } : {}),
        ...(tlsOpts ? { requestTls: tlsOpts, proxyTls: tlsOpts, connect: tlsOpts } : {})
    });
}

/**
 * Кэш активных диспетчеров undici по идентификатору профиля с автоматическим пересозданием при изменении настроек.
 */
export class DispatcherManager implements ProfileDispatcherLifecycle {
    private readonly entries = new Map<string, { readonly signature: string; readonly dispatcher: UndiciDispatcherLike }>();
    private readonly operations = new Map<string, Promise<void>>();
    private readonly inflight = new Map<string, { readonly signature: string; readonly promise: Promise<UndiciDispatcherLike> }>();

    public constructor(private readonly createDispatcher = createProfileDispatcher) {}

    public signatureOf(profile: ProxyProfile): string {
        return JSON.stringify({
            protocol: profile.protocol,
            host: profile.host,
            port: Number(profile.port),
            authEnabled: Boolean(profile.auth?.enabled),
            username: profile.auth?.username ?? '',
            password: profile.auth?.password ?? '',
            ignoreSslErrors: Boolean(profile.ignoreSslErrors)
        });
    }

    public getDispatcher(profile: ProxyProfile): Promise<UndiciDispatcherLike> {
        const sig = this.signatureOf(profile);
        const pending = this.inflight.get(profile.id);
        if (pending?.signature === sig) return pending.promise;

        const previous = this.operations.get(profile.id) ?? Promise.resolve();
        const operation = previous.then(async () => {
            const existing = this.entries.get(profile.id);
            if (existing?.signature === sig) return existing.dispatcher;
            if (existing) {
                this.entries.delete(profile.id);
                try {
                    await existing.dispatcher.destroy?.();
                } catch {
                    // Игнорируем ошибки закрытия старого диспетчера
                }
            }
            const dispatcher = await this.createDispatcher(profile);
            this.entries.set(profile.id, { signature: sig, dispatcher });
            return dispatcher;
        });
        const tail = operation.then(
            () => {},
            () => {}
        );
        const pendingOperation = { signature: sig, promise: operation };
        this.operations.set(profile.id, tail);
        this.inflight.set(profile.id, pendingOperation);
        void tail.then(() => {
            if (this.operations.get(profile.id) === tail) this.operations.delete(profile.id);
            if (this.inflight.get(profile.id) === pendingOperation) this.inflight.delete(profile.id);
        });
        return operation;
    }

    public async syncProfiles(profiles: readonly ProxyProfile[] = []): Promise<void> {
        await Promise.all(this.operations.values());
        const validIds = new Set(profiles.map(p => p.id));
        for (const [id, entry] of this.entries.entries()) {
            if (!validIds.has(id)) {
                this.entries.delete(id);
                try {
                    await entry.dispatcher.destroy?.();
                } catch {
                    // Игнорируем ошибки закрытия
                }
            }
        }
    }

    public async closeAll(): Promise<void> {
        await Promise.all(this.operations.values());
        const list = Array.from(this.entries.values());
        this.entries.clear();
        for (const entry of list) {
            try {
                await entry.dispatcher.destroy?.();
            } catch {
                // Игнорируем ошибки закрытия
            }
        }
    }
}
