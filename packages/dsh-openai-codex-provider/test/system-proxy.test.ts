import { ChildProcess } from 'node:child_process';
import type { SystemProxyPolicy } from '../src/host/system-proxy.js';
import { bypassSystemProxy, parseSystemProxy, readSystemProxy, systemOAuth, systemProxyTransport } from '../src/host/system-proxy.js';

const manual = (server: string): string => `ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ ${server}`;
const failedRegistryQuery: NonNullable<Parameters<typeof readSystemProxy>[1]> = () =>
    Object.assign(Promise.reject(new Error('private-address')), { child: new ChildProcess() });

test('parses combined and per-scheme manual Windows proxy settings', () => {
    expect(parseSystemProxy(manual('127.0.0.1:7897')).https).toBe('http://127.0.0.1:7897/');
    expect(parseSystemProxy(manual('http=localhost:1;https=localhost:2')).https).toBe('http://localhost:2/');
});

test('fails closed for PAC, disabled, SOCKS-only, malformed, and non-Windows settings', async () => {
    const unsupported = [
        '',
        `${manual('localhost:1')}\nAutoConfigURL REG_SZ https://hidden.invalid/pac`,
        'ProxyEnable REG_DWORD 0x0',
        manual('socks=localhost:1'),
        manual('socks5://localhost:1'),
        manual('user:password@localhost:1')
    ];
    for (const text of unsupported) expect(() => parseSystemProxy(text)).toThrow(/manual HTTP\/HTTPS/);
    await expect(readSystemProxy('linux')).rejects.toThrow(/manual HTTP\/HTTPS/);
    await expect(readSystemProxy('win32', failedRegistryQuery)).rejects.not.toThrow(/private-address/);
});

test('honors Windows bypass syntax and loopback', () => {
    expect(bypassSystemProxy(new URL('https://a.example.com'), '*.example.com;<local>')).toBe(true);
    expect(bypassSystemProxy(new URL('http://intranet'), '<local>')).toBe(true);
    expect(bypassSystemProxy(new URL('http://127.0.0.2'), '')).toBe(true);
    expect(bypassSystemProxy(new URL('https://auth.openai.com'), '*.example.com')).toBe(false);
});

test('system transport routes via proxy and leaves global fetch untouched', async () => {
    const originalFetch = globalThis.fetch;
    const policy: SystemProxyPolicy = { https: 'http://127.0.0.1:1', bypass: '' };
    const transport = systemProxyTransport(policy);
    await expect(transport.fetch('https://destination.invalid', { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
    expect(globalThis.fetch).toBe(originalFetch);
    await transport.close();
});

test('rejects cancelled OAuth before starting a Worker', async () => {
    await expect(systemOAuth({ bypass: '' }, 'login', undefined, { signal: AbortSignal.abort() })).rejects.toThrow(/cancelled/);
});
