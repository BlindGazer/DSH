import net from 'node:net';
import tls from 'node:tls';
import { loadUndici } from './undici-loader.js';
import { establishSocks5Tunnel } from './socks5.js';

/**
 * Create an undici Dispatcher (`ProxyAgent` for HTTP/HTTPS, or SOCKS5 `Agent`) for a `ProxyProfile`.
 */
export async function createProfileDispatcher(profile) {
  const { ProxyAgent, Agent } = await loadUndici();
  const protocol = (profile.protocol || 'http').toLowerCase();

  if (protocol === 'socks5') {
    return new Agent({
      connect(opts, callback) {
        const targetHost = opts.hostname || opts.host || 'localhost';
        const isHttps = opts.protocol === 'https:';
        const targetPort = Number(opts.port) || (isHttps ? 443 : 80);

        establishSocks5Tunnel(profile, targetHost, targetPort)
          .then((rawSocket) => {
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
            tlsSocket.once('error', (err) => {
              rawSocket.destroy();
              callback(err, null);
            });
          })
          .catch((err) => {
            callback(err, null);
          });
      }
    });
  }

  const token = profile.auth?.enabled && profile.auth.username
    ? `Basic ${Buffer.from(`${profile.auth.username}:${profile.auth.password ?? ''}`).toString('base64')}`
    : undefined;

  const tlsOpts = profile.ignoreSslErrors ? { rejectUnauthorized: false } : undefined;

  return new ProxyAgent({
    uri: `${protocol}://${profile.host}:${profile.port}`,
    ...(token ? { token, headers: { 'proxy-authorization': token } } : {}),
    ...(tlsOpts ? { requestTls: tlsOpts, proxyTls: tlsOpts, connect: tlsOpts } : {})
  });
}

/**
 * Cache of active dispatchers keyed by profile ID, automatically recreated when profile config changes.
 */
export class DispatcherManager {
  constructor() {
    this.entries = new Map(); // id -> { signature: string, dispatcher: Dispatcher }
  }

  signatureOf(profile) {
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

  async getDispatcher(profile) {
    const sig = this.signatureOf(profile);
    const existing = this.entries.get(profile.id);
    if (existing && existing.signature === sig) {
      return existing.dispatcher;
    }
    if (existing) {
      try {
        await existing.dispatcher.close?.();
      } catch {
        /* ignore */
      }
    }
    const dispatcher = await createProfileDispatcher(profile);
    this.entries.set(profile.id, { signature: sig, dispatcher });
    return dispatcher;
  }

  async syncProfiles(profiles = []) {
    const validIds = new Set(profiles.map((p) => p.id));
    for (const [id, entry] of this.entries.entries()) {
      if (!validIds.has(id)) {
        this.entries.delete(id);
        try {
          await entry.dispatcher.close?.();
        } catch {
          /* ignore */
        }
      }
    }
  }

  async closeAll() {
    const list = Array.from(this.entries.values());
    this.entries.clear();
    for (const entry of list) {
      try {
        await entry.dispatcher.close?.();
      } catch {
        /* ignore */
      }
    }
  }
}
