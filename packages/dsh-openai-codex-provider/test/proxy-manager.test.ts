import { Response as UndiciResponse } from 'undici';
import { createProxyManager } from '../src/host/proxy-manager.js';

type CloseId = number;

function fixture() {
    const closed: CloseId[] = [];
    let revision = 0;
    const manager = createProxyManager(
        'host',
        {
            login: async () => ({}),
            refresh: async () => ({})
        },
        {
            read: async () => ({ bypass: '', https: `https://proxy-${++revision}.invalid` }),
            transport: policy => {
                const routeRevision = revision;
                return {
                    fetch: async () => new UndiciResponse(policy.https),
                    close: async () => {
                        closed.push(routeRevision);
                    }
                };
            },
            fetch: async () => new globalThis.Response('host')
        }
    );
    return { manager, closed };
}

const tick = (): Promise<void> => new Promise(resolve => setImmediate(resolve));

test('switching preserves old leases and closes after the final release', async () => {
    const { manager, closed } = fixture();
    manager.commit(await manager.prepare('system'));
    const first = manager.acquire();
    const second = manager.acquire();
    manager.commit(await manager.prepare('system'));
    const next = manager.acquire();
    expect(await (await first.fetch('https://fixture.invalid')).text()).toContain('proxy-1');
    expect(await (await next.fetch('https://fixture.invalid')).text()).toContain('proxy-2');
    first.release();
    await tick();
    expect(closed).toEqual([]);
    second.release();
    second.release();
    await tick();
    expect(closed).toEqual([1]);
    manager.commit(await manager.prepare('host'));
    await tick();
    expect(closed).toEqual([1]);
    next.release();
    await tick();
    expect(closed).toEqual([1, 2]);
    manager.dispose();
});

test('failed preparation leaves the active mode unchanged and hides the cause', async () => {
    const manager = createProxyManager(
        'host',
        {
            login: async () => ({}),
            refresh: async () => ({})
        },
        {
            read: async () => {
                throw new Error('private-address');
            }
        }
    );
    await expect(manager.prepare('system')).rejects.toThrow(/manual HTTP\/HTTPS/);
    expect(manager.mode).toBe('host');
    manager.dispose();
});

test('OAuth already started retains its route after a mode change', async () => {
    let complete: ((value: object) => void) | undefined;
    const manager = createProxyManager(
        'system',
        {
            login: async () => ({}),
            refresh: async () => ({})
        },
        {
            read: async () => ({ bypass: '' }),
            transport: () => ({ fetch: async () => new UndiciResponse(), close: async () => undefined }),
            oauth: async () =>
                new Promise(resolve => {
                    complete = resolve;
                })
        }
    );
    await manager.ready;
    const lease = manager.acquire();
    const pending = lease.oauth('refresh', {}, {});
    await tick();
    manager.commit(await manager.prepare('host'));
    complete?.({ access: 'old-route-result' });
    expect(await pending).toEqual({ access: 'old-route-result' });
    lease.release();
    manager.dispose();
});

test('dispose during asynchronous proxy read rejects preparation and closes transport', async () => {
    let resolveRead: ((value: { bypass: string }) => void) | undefined;
    let closed = 0;
    const manager = createProxyManager(
        'host',
        {
            login: async () => ({}),
            refresh: async () => ({})
        },
        {
            read: () =>
                new Promise(resolve => {
                    resolveRead = resolve;
                }),
            transport: () => ({
                fetch: async () => new UndiciResponse(),
                close: async () => {
                    closed++;
                }
            })
        }
    );
    const pending = manager.prepare('system');
    manager.dispose();
    resolveRead?.({ bypass: '' });
    await expect(pending).rejects.toThrow(/disposed/);
    await tick();
    expect(closed).toBe(1);
    expect(() => manager.acquire()).toThrow(/disposed/);
});
