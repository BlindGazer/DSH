import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import type { LlmAdapter, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { AssistantMessage, AuthInteraction, Provider } from '@earendil-works/pi-ai';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserLoginError } from '../src/host/browser-login-error.ts';
import type * as CatalogModule from '../src/host/catalog.ts';
import type { OAuthCredential } from '../src/host/credentials.ts';
import type { CodexModel } from '../src/host/provider.ts';
import type { AccountConfig } from '../src/shared/accounts.ts';
import { credentialRefForAccount, PackageId, ProviderRoute, ServiceKey } from '../src/shared/constants/runtime.ts';
import type { OpenAIHubLogEvent } from '../src/shared/logging.ts';
import type { OpenAIHubRemote } from '../src/shared/remote.ts';

const mocks = vi.hoisted(() => ({
    oauthLogin: vi.fn(),
    hostLog: vi.fn<(event: OpenAIHubLogEvent) => void>(),
    oauthRefresh: vi.fn(),
    usage: vi.fn(),
    resetCards: vi.fn(),
    catalog: vi.fn(),
    providerStream: vi.fn<Provider<'openai-codex-responses'>['stream']>(),
    remote: { current: undefined as OpenAIHubRemote | undefined }
}));
const model = (id: string, name = id, provider = 'openai-codex'): CodexModel => ({
    id,
    name,
    api: 'openai-codex-responses',
    provider,
    baseUrl: 'https://chatgpt.com/backend-api/codex',
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: true,
    contextWindow: 128000,
    maxTokens: 8192
});
vi.mock('@earendil-works/pi-ai/providers/openai-codex', () => ({
    openaiCodexProvider: () => ({
        id: 'openai-codex',
        name: 'OpenAI Codex',
        auth: { oauth: { login: mocks.oauthLogin, refresh: mocks.oauthRefresh } },
        getModels: () => [model('gpt-alpha'), model('gpt-beta')],
        stream: mocks.providerStream,
        streamSimple: mocks.providerStream
    })
}));
vi.mock('../src/host/browser-login.ts', () => ({ loginBrowser: mocks.oauthLogin }));
vi.mock('../src/host/usage.ts', () => ({ requestCodexUsage: mocks.usage }));
vi.mock('../src/host/reset-credits.ts', () => ({
    createResetRedeemer: () => vi.fn(async () => 'reset'),
    requestResetCredits: mocks.resetCards
}));
vi.mock('../src/host/catalog.ts', async importOriginal => {
    const original = await importOriginal<typeof CatalogModule>();
    return { ...original, requestCatalog: mocks.catalog };
});
vi.mock('../src/host/logging.ts', () => ({
    createHubLogger: () => async (event: OpenAIHubLogEvent) => {
        mocks.hostLog(event);
        return false;
    }
}));
vi.mock('../src/host/remote-service.ts', () => ({
    OpenAICodexRemoteService: class {
        readonly handlers: OpenAIHubRemote;

        constructor(_ctx: Context, handlers: OpenAIHubRemote) {
            this.handlers = handlers;
            mocks.remote.current = handlers;
        }

        snapshot() {
            return this.handlers.snapshot();
        }
    }
}));

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const assistantMessage: AssistantMessage = {
    role: 'assistant',
    content: [],
    api: 'openai-codex-responses',
    provider: ProviderRoute,
    model: 'gpt-alpha',
    usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    },
    stopReason: 'stop',
    timestamp: Date.now()
};
function deferred<T>() {
    return Promise.withResolvers<T>();
}
const oauth = (accountId: string, access = `access-${accountId}`) =>
    JSON.stringify({
        type: 'oauth',
        access,
        refresh: `refresh-${accountId}`,
        expires: Date.now() + 3_600_000,
        accountId
    });
const choice = (id: string, name = id, enabled = true) => ({ id, name, enabled });
const config = (
    label: string,
    accountId: string,
    authMethod: 'device-code' | 'browser-oauth' = 'device-code',
    models = [choice('gpt-alpha')]
): AccountConfig => ({
    accountLabel: label,
    authMethod,
    credentialKey: credentialRefForAccount(authMethod, accountId),
    autoRefreshLimits: false,
    models,
    catalogLoaded: true,
    catalogMetadata: []
});

type PluginConfig = { accounts: AccountConfig[] };
type EditRemount = (config: PluginConfig) => void | Promise<void>;
interface TestHost {
    readonly ctx: Context;
    readonly values: Map<string, string>;
    readonly calls: { resolved: string[]; set: string[]; unset: string[] };
    readonly updates: Array<{ accounts: AccountConfig[] }>;
    readonly adapters: LlmAdapter[];
    readonly dispose: () => void;
    readonly remountAfterConfigEdit: (handler: EditRemount) => void;
    readonly rejectNextConfigEdit: () => void;
}
function harness(seed: Record<string, string> = {}): TestHost {
    const values = new Map(Object.entries(seed));
    const calls = { resolved: [] as string[], set: [] as string[], unset: [] as string[] };
    const profileEntry = { options: { name: PackageId }, config: {} as { accounts: AccountConfig[] } };
    const updates: PluginConfig[] = [];
    let remountAfterEdit: EditRemount | undefined;
    let rejectEdit = false;
    const configEditor = {
        entries: () => [profileEntry],
        edit: async (_entry: typeof profileEntry, change: (current: PluginConfig, inherited: PluginConfig) => PluginConfig) => {
            if (rejectEdit) {
                rejectEdit = false;
                throw new Error('Synthetic configuration write failure');
            }
            profileEntry.config = change(profileEntry.config, { accounts: [] });
            updates.push(structuredClone(profileEntry.config));
            await remountAfterEdit?.(profileEntry.config);
        }
    };
    const adapters: LlmAdapter[] = [];
    const cleanups: Array<() => void> = [];
    const ctx = new Context();
    Object.defineProperties(ctx, {
        credentials: {
            value: {
                async resolve(ref: CredentialRef) {
                    calls.resolved.push(String(ref));
                    const value = values.get(String(ref));
                    return value ? { value, source: 'synthetic-test-store' } : undefined;
                },
                async set(ref: CredentialRef, value: string) {
                    calls.set.push(String(ref));
                    values.set(String(ref), value);
                },
                async unset(ref: CredentialRef) {
                    calls.unset.push(String(ref));
                    values.delete(String(ref));
                }
            }
        },
        llm: {
            value: {
                registerAdapter: (_routes: string[], adapter: LlmAdapter) => {
                    adapters.push(adapter);
                    return () => undefined;
                }
            }
        },
        logger: { value: { info: vi.fn(), error: vi.fn() } },
        effect: {
            value: (create: () => (() => void) | undefined) => {
                const cleanup = create();
                if (cleanup) cleanups.push(cleanup);
                return () => undefined;
            }
        },
        get: { value: (key: string) => (key === 'configEditor' ? configEditor : undefined) }
    });
    return {
        ctx,
        values,
        calls,
        updates,
        adapters,
        dispose: () => {
            for (const cleanup of cleanups.splice(0)) cleanup();
        },
        rejectNextConfigEdit: () => {
            rejectEdit = true;
        },
        remountAfterConfigEdit: handler => {
            remountAfterEdit = handler;
        }
    };
}
function remote(): OpenAIHubRemote {
    const handlers = mocks.remote.current;
    if (!handlers) throw new Error('OpenAI Hub remote handlers were not registered');
    return handlers;
}
function registeredAdapter(host: TestHost): LlmAdapter {
    const adapter = host.adapters[0];
    if (!adapter) throw new Error('OpenAI Hub adapter was not registered');
    return adapter;
}
beforeEach(() => {
    vi.stubEnv('DSH_PROFILE_DIR', '');
    vi.stubEnv('DSH_PROFILE_PATH', '');
    vi.clearAllMocks();
    mocks.remote.current = undefined;
    mocks.providerStream.mockImplementation(() => {
        const stream = createAssistantMessageEventStream();
        stream.push({ type: 'start', partial: assistantMessage });
        stream.push({ type: 'done', reason: 'stop', message: assistantMessage });
        stream.end(assistantMessage);
        return stream;
    });
    mocks.usage.mockResolvedValue({ limited: false, limits: [], credits: { hasCredits: false, unlimited: false, balance: '' } });
    mocks.resetCards.mockResolvedValue({ availableCount: 0, cards: [] });
    mocks.catalog.mockResolvedValue([model('gpt-alpha'), model('gpt-beta')]);
});

afterEach(() => vi.unstubAllEnvs());

describe('OpenAI Hub host integration', () => {
    it('starts without dsh-logger and never reads the uninjected property', async () => {
        const host = harness();
        Object.defineProperty(host.ctx, 'dshLogger', {
            get() {
                throw new Error('cannot get property "dshLogger" without inject');
            }
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        expect(() => new OpenAICodexAuthService(host.ctx, { accounts: [] })).not.toThrow();
        expect(OpenAICodexAuthService.inject).not.toContain('dshLogger');
        await expect(remote().snapshot()).resolves.toMatchObject({ accounts: [] });
        host.dispose();
    });

    it('rolls back deletion with the refreshed credential rather than a stale rotating token', async () => {
        const account = config('work', 'account-work');
        const expired: OAuthCredential = {
            type: 'oauth',
            access: 'old-access',
            refresh: 'old-refresh',
            expires: 0,
            accountId: 'account-work'
        };
        const fresh: OAuthCredential = { ...expired, access: 'new-access', refresh: 'new-refresh', expires: Date.now() + 3600000 };
        const host = harness({ [account.credentialKey]: JSON.stringify(expired) });
        const refresh = deferred<OAuthCredential>();
        mocks.oauthRefresh.mockReturnValueOnce(refresh.promise);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        const usage = remote().refreshUsage({ accountLabel: 'work' });
        await vi.waitFor(() => expect(mocks.oauthRefresh).toHaveBeenCalledOnce());
        host.rejectNextConfigEdit();
        const deletion = expect(remote().deleteAccount({ accountLabel: 'work' })).rejects.toThrow('OpenAI Hub operation failed');
        refresh.resolve(fresh);
        await usage;
        await deletion;
        expect(host.values.get(account.credentialKey)).toContain('new-refresh');
        expect((await remote().snapshot()).accounts[0]?.loggedIn).toBe(true);
    });
    it('restores the account credential when deleting its configuration fails', async () => {
        const account = config('work', 'account-work');
        const neighbor = config('other', 'account-other');
        const credential = oauth('account-work');
        const host = harness({ [account.credentialKey]: credential, [neighbor.credentialKey]: oauth('account-other') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account, neighbor] });
        host.rejectNextConfigEdit();
        await expect(remote().deleteAccount({ accountLabel: 'work' })).rejects.toThrow('OpenAI Hub operation failed');
        expect(host.values.get(account.credentialKey)).toBe(credential);
        expect((await remote().snapshot()).accounts.map(item => [item.accountLabel, item.loggedIn])).toEqual([
            ['work', true],
            ['other', true]
        ]);
        expect(host.updates).toHaveLength(0);
    });
    it('registers exactly one static route and parses empty account config', async () => {
        const host = harness();
        const { OpenAICodexAuthService, Config } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        expect(Config.parse(undefined)).toEqual({ accounts: [] });
        expect(host.adapters).toHaveLength(1);
        expect(registeredAdapter(host).providerInfo(ProviderRoute).id).toBe(ProviderRoute);
        expect(ProviderRoute).toBe('openai-hub');
        expect(host.ctx.get(ServiceKey)).toBeUndefined();
    });

    it('keeps per-account credentials isolated and routes resolve/prepare/stream to the upstream model', async () => {
        const work = config('work', 'account-work');
        const personal = config('personal', 'account-personal', 'browser-oauth', [choice('gpt-beta', 'Personal beta')]);
        const host = harness({ [work.credentialKey]: oauth('account-work'), [personal.credentialKey]: oauth('account-personal') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [work, personal] });
        const snapshot = await remote().snapshot();
        expect(snapshot.accounts.map(account => [account.accountLabel, account.loggedIn])).toEqual([
            ['work', true],
            ['personal', true]
        ]);
        expect(JSON.stringify(snapshot)).not.toContain('access-account');
        expect(JSON.stringify(snapshot)).not.toContain('refresh-account');
        const adapter = registeredAdapter(host);
        expect(await adapter.listModels(ProviderRoute)).toEqual([
            { provider: ProviderRoute, id: 'work/gpt-alpha', name: 'work/gpt-alpha' },
            { provider: ProviderRoute, id: 'work/gpt-beta', name: 'work/gpt-beta' },
            { provider: ProviderRoute, id: 'personal/gpt-beta', name: 'personal/gpt-beta' },
            { provider: ProviderRoute, id: 'personal/gpt-alpha', name: 'personal/gpt-alpha' }
        ]);
        await expect(adapter.resolveModel(ProviderRoute, 'personal/gpt-beta')).resolves.toMatchObject({
            provider: ProviderRoute,
            id: 'personal/gpt-beta'
        });
        const prepared = await adapter.prepareCall(ProviderRoute, 'personal/gpt-beta');
        expect(prepared.model).toMatchObject({ provider: ProviderRoute, id: 'personal/gpt-beta' });
        const stream = prepared.stream({
            provider: ProviderRoute,
            model: 'personal/gpt-beta',
            messages: [],
            signal: new AbortController().signal
        });
        for await (const chunk of stream) {
            const chunkType: StreamChunk['type'] = chunk.type;
            expect(chunkType).toBeDefined();
        }
        expect(mocks.providerStream.mock.calls.at(-1)?.[0]).toMatchObject({ id: 'gpt-beta', provider: ProviderRoute });
        expect(host.calls.resolved).toContain(personal.credentialKey);
    });

    it('persists renames without changing credential identity and removes only the selected account', async () => {
        const first = config('work', 'account-work');
        const neighbor = config('other', 'account-other');
        const host = harness({ [first.credentialKey]: oauth('account-work'), [neighbor.credentialKey]: oauth('account-other') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [first, neighbor] });
        await remote().updateAccount({ accountLabel: 'work', newLabel: 'renamed', autoRefreshLimits: true });
        const renamed = host.updates.at(-1)?.accounts[0];
        expect(renamed).toMatchObject({ accountLabel: 'renamed', credentialKey: first.credentialKey, autoRefreshLimits: true });
        const result = await remote().deleteAccount({ accountLabel: 'renamed' });
        expect(result.accounts.map(account => account.accountLabel)).toEqual(['other']);
        expect(host.calls.unset).toEqual([credentialRef(first.credentialKey)]);
        expect(host.values.has(neighbor.credentialKey)).toBe(true);
        await expect(registeredAdapter(host).resolveModel(ProviderRoute, 'renamed/gpt-alpha')).rejects.toThrow('Stale OpenAI Hub account');
    });

    it('returns renamed and remaining-account views when config edits synchronously remount Host', async () => {
        const first = config('work', 'account-work');
        const neighbor = config('neighbor', 'neighbor-account');
        const host = harness({ [first.credentialKey]: oauth('account-work'), [neighbor.credentialKey]: oauth('neighbor-account') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [first, neighbor] });
        host.remountAfterConfigEdit(nextConfig => {
            host.dispose();
            void new OpenAICodexAuthService(host.ctx, nextConfig);
        });

        const renamed = await remote().updateAccount({ accountLabel: 'work', newLabel: 'renamed', autoRefreshLimits: true });
        expect(renamed.accounts.map(account => account.accountLabel)).toEqual(['renamed', 'neighbor']);
        expect(renamed.accounts[0]).toMatchObject({ accountLabel: 'renamed', autoRefreshLimits: true });

        const afterDelete = await remote().deleteAccount({ accountLabel: 'renamed' });
        expect(afterDelete.accounts.map(account => account.accountLabel)).toEqual(['neighbor']);
        expect((await remote().snapshot()).accounts.map(account => account.accountLabel)).toEqual(['neighbor']);
    });

    it('returns committed catalog results when config edit remounts Host', async () => {
        const account = config('work', 'account-work', 'device-code', [choice('gpt-alpha', 'Friendly')]);
        const host = harness({ [account.credentialKey]: oauth('account-work') });
        mocks.catalog.mockResolvedValueOnce([model('gpt-beta')]);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        host.remountAfterConfigEdit(nextConfig => {
            host.dispose();
            void new OpenAICodexAuthService(host.ctx, nextConfig);
        });

        const refreshed = await remote().refreshCatalog({ accountLabel: 'work' });
        expect(refreshed.accounts).toHaveLength(1);
        expect(refreshed.accounts[0]).toMatchObject({ accountLabel: 'work', catalogStatus: 'ready' });
        expect(refreshed.accounts[0]?.models).toEqual([choice('gpt-alpha', 'Friendly'), choice('gpt-beta')]);
        expect((await remote().snapshot()).accounts[0]?.models).toEqual([choice('gpt-alpha', 'Friendly'), choice('gpt-beta')]);
    });

    it('returns the newly saved account from OAuth login across config remount', async () => {
        const host = harness();
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        host.remountAfterConfigEdit(nextConfig => {
            host.dispose();
            void new OpenAICodexAuthService(host.ctx, nextConfig);
        });
        const pendingGrant = deferred<OAuthCredential>();
        mocks.oauthLogin.mockImplementationOnce(async interaction => {
            interaction.notify({ type: 'device_code', userCode: 'TEST-CODE', verificationUri: 'https://auth.openai.com/codex/device' });
            return pendingGrant.promise;
        });

        const waiting = await remote().startLogin({ accountLabel: 'new-account', authMethod: 'device-code' });
        expect(waiting.status).toBe('waiting');
        pendingGrant.resolve({
            type: 'oauth',
            access: 'remount-access',
            refresh: 'remount-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'remount-account'
        });
        await vi.waitFor(async () => expect((await remote().snapshot()).status).toBe('done'));
        const result = await remote().snapshot();
        expect(result.accounts).toHaveLength(1);
        expect(result.accounts[0]).toMatchObject({ accountLabel: 'new-account', loggedIn: true });
        expect(result.accounts.map(account => account.accountLabel)).toEqual(['new-account']);
    });

    it('reauthenticates an existing account without resetting its settings', async () => {
        const savedChoices = [choice('gpt-alpha', 'Preferred model', false), choice('retired-model', 'Retired'), choice('gpt-beta')];
        const account = config('work', 'old-account', 'device-code', savedChoices);
        account.autoRefreshLimits = true;
        account.catalogMetadata = [{ id: 'gpt-alpha', contextWindow: 128000, maxTokens: 8192 }];
        mocks.catalog.mockRejectedValue(new Error('synthetic catalog failure'));
        const host = harness({ [account.credentialKey]: oauth('old-account') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        await expect(remote().startLogin({ accountLabel: 'work', authMethod: 'device-code' })).rejects.toThrow(
            'OpenAI Hub operation failed'
        );
        expect(mocks.oauthLogin).not.toHaveBeenCalled();
        mocks.oauthLogin.mockResolvedValueOnce({
            type: 'oauth',
            access: 'reauthenticated-access',
            refresh: 'reauthenticated-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'new-account'
        });

        const result = await remote().startLogin({ accountLabel: 'work', authMethod: 'device-code', reauthenticate: true });
        const saved = host.updates[0]?.accounts[0];
        const newCredentialKey = credentialRefForAccount('device-code', 'new-account');
        expect(result.accounts[0]).toMatchObject({
            accountLabel: 'work',
            loggedIn: true,
            autoRefreshLimits: true
        });
        expect(result.accounts[0]?.models).toEqual(expect.arrayContaining(savedChoices));
        expect(saved).toMatchObject({
            accountLabel: 'work',
            autoRefreshLimits: true,
            models: savedChoices,
            catalogMetadata: [{ id: 'gpt-alpha', contextWindow: 128000, maxTokens: 8192 }],
            credentialKey: newCredentialKey
        });
        expect(host.values.has(newCredentialKey)).toBe(true);
        expect(host.values.has(account.credentialKey)).toBe(false);
    });

    it('cancels reauthentication without replacing the existing account credential', async () => {
        const account = config('work', 'old-account');
        const oldCredential = oauth('old-account');
        const host = harness({ [account.credentialKey]: oldCredential });
        const pendingGrant = deferred<OAuthCredential>();
        let loginSignal: AbortSignal | undefined;
        mocks.oauthLogin.mockImplementation(async interaction => {
            loginSignal = interaction.signal;
            interaction.notify({ type: 'device_code', userCode: 'TEST-CODE', verificationUri: 'https://auth.openai.com/codex/device' });
            return pendingGrant.promise;
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });

        const waiting = await remote().startLogin({ accountLabel: 'work', authMethod: 'device-code', reauthenticate: true });
        expect(waiting.status).toBe('waiting');
        const cancelled = await remote().cancelLogin();
        expect(cancelled.status).toBe('idle');
        expect(loginSignal?.aborted).toBe(true);
        pendingGrant.resolve({
            type: 'oauth',
            access: 'late-access',
            refresh: 'late-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'new-account'
        });
        await tick();

        expect(host.values.get(account.credentialKey)).toBe(oldCredential);
        expect(host.values.has(credentialRefForAccount('device-code', 'new-account'))).toBe(false);
        expect(host.updates).toEqual([]);
        expect((await remote().snapshot()).accounts[0]).toMatchObject({ accountLabel: 'work', loggedIn: true });
    });

    it('restores an existing target credential when reauthentication is cancelled during config persistence', async () => {
        const account = config('work', 'old-account');
        const oldCredential = oauth('old-account');
        const targetKey = credentialRefForAccount('device-code', 'new-account');
        const targetCredential = oauth('new-account');
        const host = harness({ [account.credentialKey]: oldCredential, [targetKey]: targetCredential });
        const persistGate = deferred<void>();
        let editCount = 0;
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        host.remountAfterConfigEdit(async nextConfig => {
            host.dispose();
            void new OpenAICodexAuthService(host.ctx, nextConfig);
            if (editCount++ === 0) await persistGate.promise;
        });
        mocks.oauthLogin.mockResolvedValueOnce({
            type: 'oauth',
            access: 'replacement-access',
            refresh: 'replacement-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'new-account'
        });

        const signIn = remote().startLogin({ accountLabel: 'work', authMethod: 'device-code', reauthenticate: true });
        await vi.waitFor(() => expect(host.updates).toHaveLength(1));
        await remote().cancelLogin();
        persistGate.resolve();
        const cancelled = await signIn;

        expect(cancelled.status).toBe('idle');
        expect(host.updates).toHaveLength(2);
        expect(host.updates[1]?.accounts[0]).toMatchObject({ accountLabel: 'work', credentialKey: account.credentialKey });
        expect(host.values.get(account.credentialKey)).toBe(oldCredential);
        expect(host.values.get(targetKey)).toBe(targetCredential);
    });

    it('preserves the committed credential when cancellation config rollback fails', async () => {
        const account = config('work', 'old-account');
        const oldCredential = oauth('old-account');
        const targetKey = credentialRefForAccount('device-code', 'new-account');
        const targetCredential = oauth('new-account');
        const host = harness({ [account.credentialKey]: oldCredential, [targetKey]: targetCredential });
        const persistGate = deferred<void>();
        let editCount = 0;
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        host.remountAfterConfigEdit(async nextConfig => {
            host.dispose();
            void new OpenAICodexAuthService(host.ctx, nextConfig);
            if (editCount++ === 0) await persistGate.promise;
        });
        mocks.oauthLogin.mockResolvedValueOnce({
            type: 'oauth',
            access: 'replacement-access',
            refresh: 'replacement-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'new-account'
        });

        const signIn = remote().startLogin({ accountLabel: 'work', authMethod: 'device-code', reauthenticate: true });
        await vi.waitFor(() => expect(host.updates).toHaveLength(1));
        await remote().cancelLogin();
        host.rejectNextConfigEdit();
        persistGate.resolve();
        const cancelled = await signIn;

        expect(cancelled.status).toBe('error');
        expect(cancelled.error).toContain('could not be cancelled completely');
        expect(host.updates).toHaveLength(1);
        expect(host.updates[0]?.accounts[0]).toMatchObject({ accountLabel: 'work', credentialKey: targetKey });
        expect(host.values.get(account.credentialKey)).toBe(oldCredential);
        expect(host.values.get(targetKey)).not.toBe(targetCredential);
        expect((await remote().snapshot()).accounts[0]).toMatchObject({ accountLabel: 'work', loggedIn: true });
    });

    it('retains fallback models until first success; then retains the last successful set on errors and reconciles fresh catalog', async () => {
        const account = config('work', 'account-work', 'device-code', [
            choice('gpt-alpha', 'Friendly', false),
            choice('retired', 'Retired')
        ]);
        account.catalogLoaded = false;
        const host = harness({ [account.credentialKey]: oauth('account-work') });
        mocks.catalog
            .mockRejectedValueOnce(new Error('private catalog response secret'))
            .mockResolvedValueOnce([model('gpt-alpha'), model('gpt-beta')]);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        const initial = await remote().snapshot();
        expect(initial.accounts[0]?.catalogStatus).toBe('fallback');
        expect(initial.accounts[0]?.models.length).toBeGreaterThan(0);
        const failed = await remote().refreshCatalog({ accountLabel: 'work' });
        expect(failed.accounts[0]).toMatchObject({
            catalogStatus: 'error',
            catalogError: expect.stringContaining('retained previous models')
        });
        expect(JSON.stringify(failed)).not.toContain('private catalog response secret');
        const fresh = await remote().refreshCatalog({ accountLabel: 'work' });
        expect(fresh.accounts[0]).toMatchObject({ catalogStatus: 'ready', catalogError: '' });
        expect(fresh.accounts[0]?.models).toEqual([choice('gpt-alpha', 'Friendly', false), choice('gpt-beta')]);
    });

    it('saves only complete catalogs and rejects stale or disabled model requests', async () => {
        const account = config('work', 'account-work', 'device-code', [choice('gpt-alpha'), choice('gpt-beta')]);
        const host = harness({ [account.credentialKey]: oauth('account-work') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        await expect(remote().saveModels({ accountLabel: 'work', models: [choice('gpt-alpha')] })).rejects.toThrow(
            'OpenAI Hub operation failed'
        );
        await remote().saveModels({ accountLabel: 'work', models: [choice('gpt-alpha', 'A', false), choice('gpt-beta')] });
        expect(await registeredAdapter(host).listModels(ProviderRoute)).toEqual([
            { provider: ProviderRoute, id: 'work/gpt-beta', name: 'work/gpt-beta' }
        ]);
        await expect(registeredAdapter(host).resolveModel(ProviderRoute, 'work/retired')).rejects.toMatchObject({
            code: 'MODEL_UNSUPPORTED'
        });
    });

    it('allows deleting the final account and drops all stale route models', async () => {
        const account = config('last', 'last-account');
        const host = harness({ [account.credentialKey]: oauth('last-account') });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        expect(await registeredAdapter(host).listModels(ProviderRoute)).toHaveLength(2);
        const empty = await remote().deleteAccount({ accountLabel: 'last' });
        expect(empty.accounts).toEqual([]);
        expect(await registeredAdapter(host).listModels(ProviderRoute)).toEqual([]);
        await expect(registeredAdapter(host).resolveModel(ProviderRoute, 'last/gpt-alpha')).rejects.toThrow('Stale OpenAI Hub account');
    });

    it('ignores an in-flight catalog result after its account is deleted', async () => {
        const account = config('work', 'account-work');
        const neighbor = config('neighbor', 'neighbor-account');
        const host = harness({ [account.credentialKey]: oauth('account-work'), [neighbor.credentialKey]: oauth('neighbor-account') });
        const pendingCatalog = deferred<CodexModel[]>();
        mocks.catalog.mockReturnValueOnce(pendingCatalog.promise);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account, neighbor] });
        const loading = remote().refreshCatalog({ accountLabel: 'work' });
        await tick();
        const removed = await remote().deleteAccount({ accountLabel: 'work' });
        pendingCatalog.resolve([model('gpt-beta')]);
        await loading;
        expect(removed.accounts.map(item => item.accountLabel)).toEqual(['neighbor']);
        expect((await remote().snapshot()).accounts.map(item => item.accountLabel)).toEqual(['neighbor']);
        expect(host.updates).toHaveLength(1);
        expect(host.values.has(neighbor.credentialKey)).toBe(true);
    });

    it('prevents an old runtime catalog response from mutating the remounted runtime', async () => {
        const account = config('work', 'account-work');
        const host = harness({ [account.credentialKey]: oauth('account-work') });
        const pendingCatalog = deferred<CodexModel[]>();
        mocks.catalog.mockReturnValueOnce(pendingCatalog.promise);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        const oldRefresh = remote().refreshCatalog({ accountLabel: 'work' });
        await tick();
        host.dispose();
        void new OpenAICodexAuthService(host.ctx, { accounts: [account] });
        pendingCatalog.resolve([model('gpt-beta')]);
        await oldRefresh;
        expect((await remote().snapshot()).accounts.map(item => item.accountLabel)).toEqual(['work']);
        expect(host.updates).toEqual([]);
    });

    it('cancels in-flight OAuth work when the Host runtime is disposed for remount', async () => {
        const host = harness();
        let loginSignal: AbortSignal | undefined;
        mocks.oauthLogin.mockImplementation(async interaction => {
            loginSignal = interaction.signal;
            interaction.notify({ type: 'device_code', userCode: 'TEST-CODE', verificationUri: 'https://auth.openai.com/codex/device' });
            return new Promise(() => undefined);
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        const waiting = await remote().startLogin({ accountLabel: 'pending', authMethod: 'device-code' });
        expect(waiting).toMatchObject({ status: 'waiting', deviceCode: 'TEST-CODE' });
        host.dispose();
        expect(loginSignal?.aborted).toBe(true);
        expect(host.values.size).toBe(0);
    });

    it('keeps browser OAuth waiting on its callback prompt and rejects that prompt on runtime cancellation', async () => {
        const host = harness();
        let promptCancelled = false;
        mocks.oauthLogin.mockImplementation(async interaction => {
            interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize' });
            try {
                await interaction.prompt({ type: 'manual_code', message: 'Complete browser sign-in' });
            } catch {
                promptCancelled = true;
                throw new Error('synthetic prompt cancelled');
            }
            return {
                type: 'oauth',
                access: 'unused-access',
                refresh: 'unused-refresh',
                expires: Date.now() + 3_600_000,
                accountId: 'unused-account'
            };
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        const waiting = await remote().startLogin({ accountLabel: 'browser', authMethod: 'browser-oauth' });
        expect(waiting).toMatchObject({ status: 'waiting', verificationUri: 'https://auth.openai.com/oauth/authorize' });
        host.dispose();
        await tick();
        expect(promptCancelled).toBe(true);
        expect(host.values.size).toBe(0);
    });

    it('waits until the browser callback prompt is ready before returning the sign-in snapshot', async () => {
        const host = harness();
        const authorizationPage = Promise.withResolvers<void>();
        let promptReady = false;
        mocks.oauthLogin.mockImplementation(async interaction => {
            interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize' });
            await authorizationPage.promise;
            promptReady = true;
            await interaction.prompt({ type: 'manual_code', message: 'Complete browser sign-in' });
            return {
                type: 'oauth',
                access: 'unused-access',
                refresh: 'unused-refresh',
                expires: Date.now() + 3_600_000,
                accountId: 'unused-account'
            };
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        let settled = false;
        const started = remote()
            .startLogin({ accountLabel: 'browser', authMethod: 'browser-oauth' })
            .then(value => {
                settled = true;
                return value;
            });
        await tick();
        expect(settled).toBe(false);
        authorizationPage.resolve();
        const waiting = await started;
        expect(promptReady).toBe(true);
        expect(waiting).toMatchObject({ status: 'waiting', callbackUrlRequested: true });
        host.dispose();
        await tick();
    });

    it.each([false, true])('marks an accepted callback as processing and supports cancellation=%s', async cancel => {
        const host = harness();
        const exchange = deferred<void>();
        mocks.oauthLogin.mockImplementation(async interaction => {
            interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize' });
            await interaction.prompt({ type: 'manual_code', message: 'Complete browser sign-in' });
            await exchange.promise;
            return {
                type: 'oauth',
                access: 'synthetic-access',
                refresh: 'synthetic-refresh',
                expires: Date.now() + 3_600_000,
                accountId: 'synthetic-account'
            };
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        await remote().startLogin({ accountLabel: 'browser', authMethod: 'browser-oauth' });
        expect(await remote().submitCallbackUrl({ url: 'http://localhost:1455/auth/callback?code=test&state=test' })).toMatchObject({
            status: 'starting',
            callbackUrlRequested: false,
            verificationUri: '',
            deviceCode: ''
        });
        await expect(remote().submitCallbackUrl({ url: 'http://localhost:1455/auth/callback?code=test&state=test' })).rejects.toThrow();
        if (cancel) await remote().cancelLogin();
        exchange.resolve();
        await vi.waitFor(async () => expect((await remote().snapshot()).status).toBe(cancel ? 'idle' : 'done'));
        if (cancel) expect((await remote().snapshot()).accounts).toEqual([]);
    });

    it('keeps the browser login alive after a token timeout and retries without another callback prompt', async () => {
        const host = harness();
        const retryWaiting = deferred<void>();
        let callbackReceived = '';
        mocks.oauthLogin.mockImplementation(
            async (
                interaction: AuthInteraction,
                _request: typeof fetch,
                _report: (event: OpenAIHubLogEvent) => void,
                waitForRetry: ((error: BrowserLoginError, signal?: AbortSignal) => Promise<void>) | undefined
            ) => {
                interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize' });
                callbackReceived = await interaction.prompt({ type: 'manual_code', message: 'Complete browser sign-in' });
                if (!waitForRetry) throw new Error('Retry handler unavailable');
                const retry = waitForRetry(new BrowserLoginError('Connection timed out.'), interaction.signal);
                retryWaiting.resolve();
                await retry;
                return {
                    type: 'oauth',
                    access: 'synthetic-access',
                    refresh: 'synthetic-refresh',
                    expires: Date.now() + 3_600_000,
                    accountId: 'synthetic-account'
                };
            }
        );
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        const waiting = await remote().startLogin({ accountLabel: 'browser-retry', authMethod: 'browser-oauth' });
        expect(waiting).toMatchObject({ status: 'waiting', callbackUrlRequested: true });
        const callbackUrl = 'http://localhost:1455/auth/callback?code=test&state=test';
        await remote().submitCallbackUrl({ url: callbackUrl });
        await retryWaiting.promise;
        expect(await remote().snapshot()).toMatchObject({ status: 'error', retryAvailable: true, error: 'Connection timed out.' });
        expect(callbackReceived).toBe(callbackUrl);
        expect(await remote().retryLogin()).toMatchObject({ status: 'starting', retryAvailable: false });
        await vi.waitFor(async () => expect((await remote().snapshot()).status).toBe('done'));
        expect(mocks.oauthLogin).toHaveBeenCalledOnce();
        expect(JSON.stringify(await remote().snapshot())).not.toContain('test');
    });

    it.each(['', '&scope=openid+profile+email+offline_access', '&scope=openid&iss=https%3A%2F%2Fauth.openai.com'])(
        'passes a validated localhost callback URL with metadata %s through the browser OAuth prompt',
        async metadata => {
            const host = harness();
            let sdkReceived = '';
            mocks.oauthLogin.mockImplementation(async interaction => {
                interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize' });
                sdkReceived = await interaction.prompt({ type: 'manual_code', message: 'Complete browser sign-in' });
                return {
                    type: 'oauth',
                    access: 'synthetic-access',
                    refresh: 'synthetic-refresh',
                    expires: Date.now() + 3_600_000,
                    accountId: 'synthetic-account'
                };
            });
            const { OpenAICodexAuthService } = await import('../src/host/index.ts');
            void new OpenAICodexAuthService(host.ctx);
            const waiting = await remote().startLogin({ accountLabel: 'browser', authMethod: 'browser-oauth' });
            expect(waiting).toMatchObject({ status: 'waiting', callbackUrlRequested: true });
            for (const [url, callbackError] of [
                ['not-a-url', 'invalid_url'],
                ['https://localhost:1455/auth/callback?code=sample&state=sample', 'invalid_endpoint'],
                ['http://example.com:1455/auth/callback?code=sample&state=sample', 'invalid_endpoint'],
                ['http://localhost:1455/other?code=sample&state=sample', 'invalid_endpoint'],
                ['http://user:sample@localhost:1455/auth/callback?code=sample&state=sample', 'invalid_endpoint'],
                ['http://localhost:1455/auth/callback?code=sample&state=sample#fragment', 'invalid_endpoint'],
                ['http://localhost:1455/auth/callback?state=sample&scope=openid', 'missing_code'],
                ['http://localhost:1455/auth/callback?code=sample&scope=openid', 'missing_state'],
                ['http://localhost:1455/auth/callback?code=sample&code=other&state=sample&scope=openid', 'duplicate_code'],
                ['http://localhost:1455/auth/callback?code=sample&state=sample&state=other&scope=openid', 'duplicate_state']
            ] as const) {
                await expect(remote().submitCallbackUrl({ url })).rejects.toThrow();
                expect(mocks.hostLog).toHaveBeenCalledWith({
                    event: 'login',
                    phase: 'failed',
                    operation: 'submitCallbackUrl',
                    errorCode: 'validation_failed',
                    callbackError
                });
                expect((await remote().snapshot()).callbackUrlRequested).toBe(true);
                expect(sdkReceived).toBe('');
            }
            expect(JSON.stringify(mocks.hostLog.mock.calls)).not.toContain('sample');
            vi.useFakeTimers();
            try {
                await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
                expect(await remote().snapshot()).toMatchObject({ status: 'waiting', callbackUrlRequested: true });
            } finally {
                vi.useRealTimers();
            }
            const callbackUrl = `http://localhost:1455/auth/callback?code=sample&state=state-sample${metadata}`;
            await remote().submitCallbackUrl({ url: callbackUrl });
            await vi.waitFor(async () => expect((await remote().snapshot()).status).toBe('done'));
            expect(sdkReceived).toBe(callbackUrl);
            expect(JSON.stringify(await remote().snapshot())).not.toContain('sample');
        }
    );

    it.each(['browser-oauth', 'device-code'] as const)('preserves the primary network failure for %s', async authMethod => {
        const host = harness();
        const cause = Object.assign(new Error('private-proxy-address timeout: 10000ms'), {
            name: 'ConnectTimeoutError',
            code: 'UND_ERR_CONNECT_TIMEOUT'
        });
        mocks.oauthLogin.mockRejectedValueOnce(new TypeError('private-callback-code', { cause }));
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        expect(await remote().startLogin({ accountLabel: 'network-failure', authMethod })).toMatchObject({ status: 'error' });
        expect(mocks.hostLog).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'login',
                phase: 'failed',
                state: 'error',
                authMethod,
                errorCode: 'oauth_connect_timeout',
                networkError: 'UND_ERR_CONNECT_TIMEOUT',
                networkTimeoutMs: 10000,
                loginAttemptId: expect.any(String)
            })
        );
        expect(JSON.stringify(mocks.hostLog.mock.calls)).not.toContain('private');
    });

    it('surfaces safe browser errors and keeps routine snapshots out of diagnostic history', async () => {
        const host = harness();
        const message = 'OpenAI Hub connection to auth.openai.com timed out. Check network and proxy settings.';
        mocks.oauthLogin.mockRejectedValueOnce(new BrowserLoginError(message));
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        expect(await remote().startLogin({ accountLabel: 'browser', authMethod: 'browser-oauth' })).toMatchObject({
            status: 'error',
            error: message
        });
        await remote().snapshot();
        await remote().snapshot();
        expect(mocks.hostLog).toHaveBeenCalledWith({ event: 'plugin', phase: 'started', diagnosticVersion: 3 });
        expect(mocks.hostLog.mock.calls.some(([event]) => event.operation === 'snapshot')).toBe(false);
    });

    it('refreshes only the selected account credential and never serializes rotated tokens', async () => {
        const expired = JSON.stringify({
            type: 'oauth',
            access: 'old-access-secret',
            refresh: 'old-refresh-secret',
            expires: 1,
            accountId: 'work-id'
        });
        const work = config('work', 'work-id');
        const neighbor = config('neighbor', 'neighbor-id');
        const host = harness({ [work.credentialKey]: expired, [neighbor.credentialKey]: oauth('neighbor-id') });
        mocks.oauthRefresh.mockResolvedValueOnce({
            type: 'oauth',
            access: 'new-access-secret',
            refresh: 'new-refresh-secret',
            expires: Date.now() + 3_600_000,
            accountId: 'work-id'
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx, { accounts: [work, neighbor] });
        const result = await remote().refreshUsage({ accountLabel: 'work' });
        expect(mocks.oauthRefresh).toHaveBeenCalledTimes(1);
        expect(host.values.get(work.credentialKey)).toContain('new-refresh-secret');
        expect(host.values.get(neighbor.credentialKey)).toContain('refresh-neighbor-id');
        expect(JSON.stringify(result)).not.toContain('new-access-secret');
        expect(JSON.stringify(result)).not.toContain('new-refresh-secret');
    });

    it('restores only the last successful quota after a Host restart and rename', async () => {
        const profile = mkdtempSync(join(tmpdir(), 'dsh-quota-'));
        vi.stubEnv('DSH_PROFILE_DIR', profile);
        try {
            const work = config('work', 'quota-work');
            const neighbor = config('neighbor', 'quota-neighbor');
            const seed = { [work.credentialKey]: oauth('quota-work'), [neighbor.credentialKey]: oauth('quota-neighbor') };
            const { OpenAICodexAuthService } = await import('../src/host/index.ts');
            const first = harness(seed);
            void new OpenAICodexAuthService(first.ctx, { accounts: [work, neighbor] });
            const limits = [{ name: 'Codex', usedPercent: 42, windowSeconds: 18000, resetAt: Date.now() + 1000 }];
            mocks.usage.mockResolvedValueOnce({ limited: false, limits, credits: { hasCredits: true, unlimited: false, balance: '7' } });
            mocks.resetCards.mockResolvedValueOnce({ availableCount: 1, cards: [{ id: 'action-card-id' }] });
            const success = await remote().refreshUsage({ accountLabel: 'work' });
            mocks.usage.mockRejectedValueOnce(new Error('Usage unavailable'));
            const failure = await remote().refreshUsage({ accountLabel: 'work' });
            expect(failure.accounts[0]).toMatchObject({ usageStatus: 'error', usageLimits: limits });
            const empty = await remote().refreshUsage({ accountLabel: 'work' });
            expect(empty.accounts[0]).toMatchObject({ usageStatus: 'ready', usageLimits: limits });
            first.dispose();

            const second = harness(seed);
            void new OpenAICodexAuthService(second.ctx, { accounts: [{ ...work, accountLabel: 'renamed' }, neighbor] });
            const restored = await remote().snapshot();
            expect(restored.accounts).toMatchObject([
                {
                    accountLabel: 'renamed',
                    autoRefreshLimits: false,
                    usageStatus: 'ready',
                    usageLimits: limits,
                    usageCredits: '7',
                    usageResetCredits: 1,
                    resetCards: [],
                    usageUpdatedAt: success.accounts[0]?.usageUpdatedAt
                },
                { accountLabel: 'neighbor', usageStatus: 'idle', usageLimits: [], usageUpdatedAt: 0 }
            ]);
            expect(mocks.usage).toHaveBeenCalledTimes(3);
            const contents = readdirSync(profile).map(file => readFileSync(join(profile, file), 'utf8'));
            expect(contents).toHaveLength(1);
            expect(contents.join()).not.toMatch(/quota-work|action-card-id|credentialKey/);
            await remote().deleteAccount({ accountLabel: 'renamed' });
            expect(readdirSync(profile)).toStrictEqual([]);
            second.dispose();
        } finally {
            rmSync(profile, { recursive: true, force: true });
        }
    });

    it('stores a successful OAuth grant privately and sanitizes provider failures', async () => {
        const host = harness();
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { OpenAICodexAuthService } = await import('../src/host/index.ts');
        void new OpenAICodexAuthService(host.ctx);
        mocks.oauthLogin.mockResolvedValueOnce({
            type: 'oauth',
            access: 'private-access',
            refresh: 'private-refresh',
            expires: Date.now() + 3_600_000,
            accountId: 'success-account'
        });
        const loggedIn = await remote().startLogin({ accountLabel: 'new-account', authMethod: 'device-code' });
        expect(loggedIn.accounts).toContainEqual(expect.objectContaining({ accountLabel: 'new-account', loggedIn: true }));
        const ref = credentialRefForAccount('device-code', 'success-account');
        expect(host.values.get(ref)).toContain('private-refresh');
        expect(JSON.stringify(loggedIn)).not.toContain('private-access');

        mocks.oauthLogin.mockRejectedValueOnce(new Error('private OAuth access-secret'));
        const failed = await remote().startLogin({ accountLabel: 'failed-account', authMethod: 'device-code' });
        await tick();
        expect(failed).toMatchObject({ status: 'error', error: 'OpenAI Hub sign-in failed' });
        expect(JSON.stringify(await remote().snapshot())).not.toContain('access-secret');
        expect(error.mock.calls.flat().join(' ')).not.toContain('access-secret');
        error.mockRestore();
    });
});
