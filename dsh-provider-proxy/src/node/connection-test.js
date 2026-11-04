import net from 'node:net';
import { createProfileDispatcher } from './profile-dispatcher.js';
import { loadUndici } from './undici-loader.js';

/**
 * Step 1 of Test Connection: TCP reachability check (analog of Test-TcpPort) with 5000ms timeout.
 */
export function checkTcpReachability(host, port, timeoutMs = 5000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });
    let done = false;
    const finish = (ok) => {
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
 * Execute a fetch call using the loaded `undici.fetch` so the `Dispatcher` protocol
 * matches the exact `undici` version that constructed `ProxyAgent` / `Agent`.
 * Also unwraps native `globalThis.Request` objects to prevent cross-undici brand errors.
 */
export async function dispatchWithUndiciFetch(input, init, dispatcher) {
  const { fetch: proxyFetch } = await loadUndici();
  if (
    input &&
    typeof input === 'object' &&
    !(input instanceof URL) &&
    typeof input.url === 'string'
  ) {
    const headers = {};
    if (input.headers && typeof input.headers.forEach === 'function') {
      input.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }
    if (init?.headers) {
      const extra = init.headers;
      if (typeof extra.forEach === 'function') {
        extra.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(extra)) {
        for (const [k, v] of extra) headers[k] = v;
      } else if (typeof extra === 'object') {
        Object.assign(headers, extra);
      }
    }
    const method = init?.method || input.method || 'GET';
    let body = init?.body;
    if (body === undefined && method !== 'GET' && method !== 'HEAD' && input.body) {
      body = await input.arrayBuffer();
    }
    return proxyFetch(input.url, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      ...(init?.signal || input.signal ? { signal: init?.signal || input.signal } : {}),
      dispatcher
    });
  }

  return proxyFetch(input, {
    ...(init || {}),
    dispatcher
  });
}

/**
 * Two-stage proxy connection test (Section 6.4):
 * 1. TCP Reachability (5000ms timeout)
 * 2. End-to-End Proxy & Auth HTTP check (5000ms timeout)
 */
export async function testProxyConnection(profile, testUrl = 'https://generativelanguage.googleapis.com', fetchImpl = null) {
  if (!profile || !profile.host || !profile.port) {
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

  let dispatcher;
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
    const rawMsg = [
      err?.message,
      err?.cause?.message,
      err?.cause?.code
    ].filter(Boolean).join(' â€” ');

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
      await dispatcher?.close?.();
    } catch {
      /* ignore */
    }
  }
}
