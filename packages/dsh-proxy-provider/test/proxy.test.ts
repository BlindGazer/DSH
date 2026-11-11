import { describe, expect, it, vi } from 'vitest';
import type { MasterKeyProvider, ProfileDispatcherLifecycle, ProxyConfigStorage } from '../src/host/models/ProxyServiceContracts.js';
import { normalizeProxyConfig } from '../src/host/services/configNormalizer.js';
import { createProviderProxyController } from '../src/host/services/controller.js';
import { DispatcherManager } from '../src/host/services/profileDispatcher.js';
import type { ProxyProfile } from '../src/shared/models/ProxyModels.js';
import { createEmptyDraft, draftFromProfile, profileFromDraft, resolveProviderHosts } from '../src/shared/utils/hostUtils.js';

function makeControllerDependencies() {
    const key = new Uint8Array([1, 2, 3]);
    let config = normalizeProxyConfig({}, key);
    const storage: ProxyConfigStorage = {
        load: vi.fn(() => config),
        save: vi.fn((_path, nextConfig) => {
            config = nextConfig;
        })
    };
    const masterKeyProvider: MasterKeyProvider = {
        getOrCreate: vi.fn(() => key)
    };
    const dispatcherManager: ProfileDispatcherLifecycle = {
        getDispatcher: vi.fn(async () => ({})),
        syncProfiles: vi.fn(async () => {}),
        closeAll: vi.fn(async () => {})
    };
    const localFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response());
    const fetchTarget = { fetch: localFetch };
    const controller = createProviderProxyController({
        configStorage: storage,
        masterKeyProvider,
        dispatcherManager,
        fetchTarget,
        storagePath: 'memory-only'
    });
    return {
        controller,
        dispatcherManager,
        fetchTarget,
        localFetch,
        masterKeyProvider,
        storage
    };
}

describe('dsh-proxy-provider hostUtils', () => {
    it('creates an empty draft with default values', () => {
        const draft = createEmptyDraft();
        expect(draft.protocol).toBe('http');
        expect(draft.port).toBe('8080');
        expect(draft.authEnabled).toBe(false);
        expect(draft.hasCredentials).toBe(false);
    });

    it('resolves provider hosts from builtin and custom URLs', () => {
        const openAiHosts = resolveProviderHosts('openai');
        expect(openAiHosts).toContain('api.openai.com');

        const custom = resolveProviderHosts('custom-provider', 'https://proxy.example.com:8443/v1');
        expect(custom).toEqual(['proxy.example.com:8443']);
    });

    it('isolates storage, key and dispatcher lifecycle per controller', async () => {
        const globalFetch = globalThis.fetch;
        const first = makeControllerDependencies();
        const second = makeControllerDependencies();

        first.controller.installFetchInterceptor();
        await first.controller.updateConfig({});
        await first.controller.dispose();

        expect(first.storage.load).toHaveBeenCalledOnce();
        expect(first.storage.save).toHaveBeenCalledOnce();
        expect(first.masterKeyProvider.getOrCreate).toHaveBeenCalledOnce();
        expect(first.dispatcherManager.closeAll).toHaveBeenCalledOnce();
        expect(first.fetchTarget.fetch).toBe(first.localFetch);
        expect(second.storage.load).toHaveBeenCalledOnce();
        expect(second.storage.save).not.toHaveBeenCalled();
        expect(globalThis.fetch).toBe(globalFetch);

        await second.controller.dispose();
        expect(second.dispatcherManager.closeAll).toHaveBeenCalledOnce();
    });

    it('destroys cached dispatchers when profiles change or manager closes', async () => {
        const resources: Array<{ readonly destroy: ReturnType<typeof vi.fn> }> = [];
        const manager = new DispatcherManager(async () => {
            const resource = { destroy: vi.fn(async () => {}) };
            resources.push(resource);
            return resource;
        });
        const profile: ProxyProfile = {
            id: 'profile-a',
            name: 'Profile A',
            protocol: 'http',
            host: 'proxy.example.test',
            port: 8080,
            auth: { enabled: false },
            ignoreSslErrors: false
        };

        const firstDispatcher = await manager.getDispatcher(profile);
        expect(await manager.getDispatcher(profile)).toBe(firstDispatcher);
        await manager.getDispatcher({ ...profile, host: 'proxy2.example.test' });
        expect(resources[0]?.destroy).toHaveBeenCalledOnce();

        await manager.closeAll();
        expect(resources[1]?.destroy).toHaveBeenCalledOnce();
    });

    it('coalesces concurrent dispatcher requests for one profile', async () => {
        const resource = { destroy: vi.fn(async () => {}) };
        let releaseCreation = (_resource: typeof resource) => {};
        const creation = new Promise<typeof resource>(resolve => {
            releaseCreation = resolve;
        });
        const createDispatcher = vi.fn(() => creation);
        const manager = new DispatcherManager(createDispatcher);
        const profile: ProxyProfile = {
            id: 'profile-concurrent',
            name: 'Concurrent Profile',
            protocol: 'http',
            host: 'proxy.example.test',
            port: 8080,
            auth: { enabled: false },
            ignoreSslErrors: false
        };

        const first = manager.getDispatcher(profile);
        const second = manager.getDispatcher(profile);
        await Promise.resolve();
        expect(createDispatcher).toHaveBeenCalledOnce();
        releaseCreation(resource);

        expect(await first).toBe(resource);
        expect(await second).toBe(resource);
        await manager.closeAll();
        expect(resource.destroy).toHaveBeenCalledOnce();
    });

    it('serializes dispatcher replacement for concurrent profile changes', async () => {
        const resources: Array<{ readonly destroy: ReturnType<typeof vi.fn> }> = [];
        const manager = new DispatcherManager(async () => {
            const resource = { destroy: vi.fn(async () => {}) };
            resources.push(resource);
            return resource;
        });
        const profile: ProxyProfile = {
            id: 'profile-changing',
            name: 'Changing Profile',
            protocol: 'http',
            host: 'proxy.example.test',
            port: 8080,
            auth: { enabled: false },
            ignoreSslErrors: false
        };

        const first = manager.getDispatcher(profile);
        const second = manager.getDispatcher({
            ...profile,
            host: 'proxy2.example.test'
        });
        const [firstDispatcher, secondDispatcher] = await Promise.all([first, second]);

        expect(firstDispatcher).toBe(resources[0]);
        expect(secondDispatcher).toBe(resources[1]);
        expect(resources[0]?.destroy).toHaveBeenCalledOnce();
        await manager.closeAll();
        expect(resources[1]?.destroy).toHaveBeenCalledOnce();
    });

    it('preserves a replacement fetch assigned while the interceptor is active', async () => {
        const dependencies = makeControllerDependencies();
        const replacementFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response());

        dependencies.controller.installFetchInterceptor();
        dependencies.fetchTarget.fetch = replacementFetch;
        await dependencies.controller.dispose();

        expect(dependencies.fetchTarget.fetch).toBe(replacementFetch);
    });

    it('preserves a fetch property replaced by another host plugin before dispose', async () => {
        const dependencies = makeControllerDependencies();
        const replacementFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response());

        dependencies.controller.installFetchInterceptor();
        Object.defineProperty(dependencies.fetchTarget, 'fetch', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: replacementFetch
        });
        await dependencies.controller.dispose();

        expect(dependencies.fetchTarget.fetch).toBe(replacementFetch);
    });

    it('converts draft to profile and back', () => {
        const draft = {
            ...createEmptyDraft(),
            name: 'Test Profile',
            host: 'https://my-proxy.com:3128/',
            port: '3128',
            authEnabled: true,
            username: 'alice',
            password: 'secret'
        };

        const profile = profileFromDraft(draft);
        expect(profile.name).toBe('Test Profile');
        expect(profile.host).toBe('my-proxy.com');
        expect(profile.port).toBe(3128);
        expect(profile.auth?.enabled).toBe(true);
        expect(profile.auth?.username).toBe('alice');

        const sanitized = {
            id: profile.id,
            name: profile.name,
            protocol: profile.protocol,
            host: profile.host,
            port: profile.port,
            auth: {
                enabled: true,
                hasCredentials: true,
                usernameMask: 'a***e'
            },
            ignoreSslErrors: false
        };

        const roundtripped = draftFromProfile(sanitized);
        expect(roundtripped.name).toBe('Test Profile');
        expect(roundtripped.host).toBe('my-proxy.com');
        expect(roundtripped.hasCredentials).toBe(true);
        expect(roundtripped.usernameMask).toBe('a***e');
    });
});
