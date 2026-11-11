import dns from 'node:dns';
import { describe, expect, it } from 'vitest';
import { createProfileDispatcher, DispatcherManager } from '../src/host/services/profileDispatcher.js';
import { createUndiciLoader, type UndiciDispatcherLike, type UndiciModuleLike } from '../src/host/services/undiciLoader.js';
import type { ProxyProfile } from '../src/shared/models/ProxyModels.js';

type DispatcherOptions = Parameters<NonNullable<UndiciDispatcherLike['dispatch']>>[0];

class ThirdPartyProxyAgent {
    public dispatchCount = 0;
    public destroyCount = 0;

    public constructor(public readonly options: Record<string, object | string | undefined>) {}

    public dispatch(_options: DispatcherOptions, _handler: object): boolean {
        this.dispatchCount += 1;
        return true;
    }

    public async destroy(): Promise<void> {
        this.destroyCount += 1;
    }
}

const profile: ProxyProfile = {
    id: 'proxy-profile',
    name: 'Proxy profile',
    protocol: 'http',
    host: 'proxy.example.test',
    port: 3128,
    auth: { enabled: false },
    ignoreSslErrors: false
};

describe('undici loader isolation', () => {
    it('keeps global DNS and the third-party prototype unchanged through dispatcher use and cleanup', async () => {
        const initialDnsOrder = dns.getDefaultResultOrder();
        const originalDispatch = ThirdPartyProxyAgent.prototype.dispatch;
        let moduleLoads = 0;
        const undiciModule: UndiciModuleLike = {
            ProxyAgent: ThirdPartyProxyAgent,
            Agent: class {
                public async destroy(): Promise<void> {}
            },
            fetch: async () => new Response()
        };
        const loadUndici = createUndiciLoader(async () => {
            moduleLoads += 1;
            return undiciModule;
        });

        const dispatcher = await createProfileDispatcher(profile, loadUndici);
        if (!(dispatcher instanceof ThirdPartyProxyAgent)) throw new Error('The dispatcher must preserve the third-party instance');
        expect(moduleLoads).toBe(1);
        expect(dispatcher.options).toEqual({ uri: 'http://proxy.example.test:3128' });
        if (typeof dispatcher.dispatch !== 'function') throw new Error('The dispatcher must support requests');

        let forwardedOptions: DispatcherOptions | undefined;
        Object.defineProperty(dispatcher, Symbol('proxy client'), {
            value: {
                dispatch(options: DispatcherOptions, _handler: object): boolean {
                    forwardedOptions = options;
                    return true;
                }
            }
        });
        dispatcher.dispatch({ origin: 'http://api.example.test', path: '/v1', headers: ['accept', 'application/json'] }, {});

        const manager = new DispatcherManager(async () => dispatcher);
        expect(await manager.getDispatcher(profile)).toBe(dispatcher);
        await manager.closeAll();

        expect(forwardedOptions).toEqual({
            origin: 'http://api.example.test',
            path: 'http://api.example.test/v1',
            headers: { accept: 'application/json', host: 'api.example.test' }
        });
        expect(dispatcher.dispatchCount).toBe(0);
        expect(dispatcher.destroyCount).toBe(1);
        expect(ThirdPartyProxyAgent.prototype.dispatch).toBe(originalDispatch);
        expect(Object.hasOwn(ThirdPartyProxyAgent.prototype, '__dshPatched')).toBe(false);
        expect(dns.getDefaultResultOrder()).toBe(initialDnsOrder);
    });
});
