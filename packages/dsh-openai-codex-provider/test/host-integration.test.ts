import { Context } from '@deepseek-ai/cordis';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialRef as CredentialRefName, PackageId } from '../src/shared/constants/runtime.js';
import type { OpenAICodexSnapshot } from '../src/shared/remote.js';

const { oauthLogin, oauthRefresh, remoteHandler } = vi.hoisted(() => ({
    oauthLogin: vi.fn(),
    oauthRefresh: vi.fn(),
    remoteHandler: {
        current: undefined as undefined | { snapshot(): Promise<OpenAICodexSnapshot>; startLogin(): Promise<OpenAICodexSnapshot> }
    }
}));

vi.mock('../src/host/remote-service.js', () => ({
    OpenAICodexRemoteService: class {
        private readonly handlers: { snapshot(): Promise<OpenAICodexSnapshot> };

        constructor(_ctx: object, handlers: { snapshot(): Promise<OpenAICodexSnapshot> }) {
            this.handlers = handlers;
            remoteHandler.current = handlers;
        }

        snapshot(): Promise<OpenAICodexSnapshot> {
            return this.handlers.snapshot();
        }

        startLogin(): Promise<OpenAICodexSnapshot> {
            return this.handlers.startLogin();
        }
    }
}));

vi.mock('@earendil-works/pi-ai/providers/openai-codex', () => ({
    openaiCodexProvider: () => ({
        auth: { oauth: { login: oauthLogin, refresh: oauthRefresh } },
        getModels: () => [
            { id: 'codex-test', name: 'Codex Test' },
            { id: 'codex-disabled', name: 'Codex Hidden' }
        ],
        stream: () => ({ result: async () => undefined }),
        streamSimple: () => ({ result: async () => undefined })
    })
}));

vi.mock('../src/host/usage.js', () => ({
    requestCodexUsage: async () => ({
        limited: false,
        limits: [],
        credits: { hasCredits: false, unlimited: false, balance: '' },
        resetCredits: undefined
    })
}));

vi.mock('../src/host/reset-credits.js', () => ({
    createResetRedeemer: () => async () => 'reset',
    requestResetCredits: async () => ({ availableCount: 0, cards: [] })
}));

interface CredentialService {
    resolve(ref: CredentialRef): Promise<{ value: string; source: string } | undefined>;
    set(ref: CredentialRef, value: string): Promise<void>;
    unset(ref: CredentialRef): Promise<void>;
}

interface ToolDefinition {
    name: string;
    execute(input: { arguments: Record<string, never> }): Promise<string>;
}

interface ResolvedCredential {
    value: string;
    source: string;
}

function harness(seed?: string, resolveOverride?: () => Promise<ResolvedCredential | undefined>) {
    let storedValue = seed;
    const configUpdates: Record<string, unknown>[] = [];
    let registrationDisposed = false;
    const replace = vi.fn(() => {
        if (registrationDisposed) throw new Error('a disposed adapter registration cannot replace its routes');
    });
    const profileEntry = { options: { name: PackageId }, config: {} as Record<string, unknown> };
    const configEditor = {
        entries: () => [profileEntry],
        edit: async (
            _entry: typeof profileEntry,
            change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>
        ) => {
            profileEntry.config = change(profileEntry.config, {});
            configUpdates.push({ ...profileEntry.config });
            registrationDisposed = true;
        }
    };
    const tools = new Map<string, ToolDefinition>();
    const credentialCalls = { resolve: [] as CredentialRef[], set: [] as CredentialRef[], unset: [] as CredentialRef[] };
    const credentials: CredentialService = {
        async resolve(ref) {
            credentialCalls.resolve.push(ref);
            return resolveOverride ? resolveOverride() : storedValue ? { value: storedValue, source: 'test-store' } : undefined;
        },
        async set(ref, value) {
            credentialCalls.set.push(ref);
            storedValue = value;
        },
        async unset(ref) {
            credentialCalls.unset.push(ref);
            storedValue = undefined;
        }
    };
    const ctx = new Context();
    Object.defineProperties(ctx, {
        credentials: { value: credentials },
        llm: { value: { registerAdapter: () => ({ replace }) } },
        tools: {
            value: {
                register: (tool: ToolDefinition) => {
                    tools.set(tool.name, tool);
                    return () => tools.delete(tool.name);
                }
            }
        },
        effect: { value: () => () => undefined },
        get: { value: (key: string) => (key === 'configEditor' ? configEditor : undefined) }
    });
    return {
        ctx,
        tools,
        readStored: () => storedValue,
        readCredentialCalls: () => ({
            resolve: [...credentialCalls.resolve],
            set: [...credentialCalls.set],
            unset: [...credentialCalls.unset]
        }),
        readConfigUpdates: () => [...configUpdates],
        replace
    };
}

const tick = (): Promise<void> => new Promise(resolve => setImmediate(resolve));
function readSnapshot(): Promise<OpenAICodexSnapshot> {
    const current = remoteHandler.current;
    if (!current) throw new Error('Remote handlers were not registered');
    return current.snapshot();
}
const credential = JSON.stringify({
    type: 'oauth',
    access: 'mock-access',
    refresh: 'mock-refresh',
    expires: Date.now() + 3_600_000,
    accountId: 'mock-account'
});

beforeEach(() => {
    vi.clearAllMocks();
    remoteHandler.current = undefined;
});

describe('OpenAI Codex host integration', () => {
    it('accepts an omitted plugin config and applies defaults', async () => {
        const { Config } = await import('../src/host/index.js');

        expect(Config.parse(undefined)).toEqual({ proxyMode: 'host', disabledModels: [], modelSettings: [] });
    });

    it('returns a sanitized snapshot without token data', async () => {
        const { ctx } = harness(credential);
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        const snapshot = await readSnapshot();
        expect(snapshot.loggedIn).toBe(true);
        expect(JSON.stringify(snapshot)).not.toContain('mock-access');
        expect(JSON.stringify(snapshot)).not.toContain('mock-refresh');
    });

    it('reuses legacy credential and settings without requiring a new sign-in', async () => {
        const { ctx, tools, readCredentialCalls } = harness(credential);
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx, {
            proxyMode: 'host',
            disabledModels: ['codex-disabled'],
            modelSettings: [{ id: 'codex-test', name: 'Legacy Codex name', enabled: true }]
        });
        const snapshot = await readSnapshot();

        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        expect(snapshot.loggedIn).toBe(true);
        expect(snapshot.proxyMode).toBe('host');
        expect(snapshot.models).toEqual([
            { id: 'codex-test', name: 'Legacy Codex name', enabled: true },
            { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
        ]);
        expect([...tools.keys()]).toEqual(['codex_login', 'codex_status', 'codex_logout']);
        expect(readCredentialCalls().resolve.length).toBeGreaterThan(0);
        expect(readCredentialCalls().resolve).toEqual(readCredentialCalls().resolve.map(() => credentialRef(CredentialRefName)));
        expect(oauthLogin).not.toHaveBeenCalled();
        await tools.get('codex_logout')?.execute({ arguments: {} });
        expect(readCredentialCalls().unset).toEqual([credentialRef(CredentialRefName)]);
    });

    it('rehydrates auth on each save when config editing disposes the adapter registration', async () => {
        const { ctx, readConfigUpdates, readCredentialCalls, replace } = harness(credential);
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const firstService = new OpenAICodexAuthService(ctx, { proxyMode: 'host', disabledModels: [], modelSettings: [] });
        expect(firstService).toBeInstanceOf(OpenAICodexAuthService);
        const firstRemote = remoteHandler.current;
        if (!firstRemote || !('saveModels' in firstRemote)) throw new Error('Remote handlers were not registered');
        const firstSnapshot = await firstRemote.saveModels([
            { id: 'codex-test', name: 'Renamed Codex', enabled: true },
            { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
        ]);
        expect(firstSnapshot).toMatchObject({ status: 'done', loggedIn: true });

        const secondService = new OpenAICodexAuthService(ctx, {
            proxyMode: 'host',
            disabledModels: ['codex-disabled'],
            modelSettings: [
                { id: 'codex-test', name: 'Renamed Codex', enabled: true },
                { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
            ]
        });
        expect(secondService).toBeInstanceOf(OpenAICodexAuthService);
        const secondRemote = remoteHandler.current;
        if (!secondRemote || !('saveModels' in secondRemote)) throw new Error('Reloaded remote handlers were not registered');
        const secondSnapshot = await secondRemote.saveModels([
            { id: 'codex-test', name: 'Renamed Again', enabled: true },
            { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
        ]);

        expect(secondSnapshot).toMatchObject({ status: 'done', loggedIn: true, usageStatus: 'idle' });
        expect(oauthRefresh).not.toHaveBeenCalled();
        expect(secondSnapshot.models).toEqual([
            { id: 'codex-test', name: 'Renamed Again', enabled: true },
            { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
        ]);
        expect(readCredentialCalls().resolve).toEqual([credentialRef(CredentialRefName), credentialRef(CredentialRefName)]);
        expect(readConfigUpdates()).toEqual([
            {
                proxyMode: 'host',
                disabledModels: ['codex-disabled'],
                modelSettings: [
                    { id: 'codex-test', name: 'Renamed Codex', enabled: true },
                    { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
                ]
            },
            {
                proxyMode: 'host',
                disabledModels: ['codex-disabled'],
                modelSettings: [
                    { id: 'codex-test', name: 'Renamed Again', enabled: true },
                    { id: 'codex-disabled', name: 'Codex Hidden', enabled: false }
                ]
            }
        ]);
        expect(replace).not.toHaveBeenCalled();
    });

    it('publishes completed OAuth status after remote startLogin resolves', async () => {
        const { ctx } = harness();
        oauthLogin.mockImplementation(
            async (interaction: { notify(info: { type: string; userCode: string; verificationUri: string }): void }) => {
                interaction.notify({ type: 'device_code', userCode: 'DONE-CODE', verificationUri: 'https://auth.openai.com/done' });
                return {
                    type: 'oauth',
                    access: 'completed-access',
                    refresh: 'completed-refresh',
                    expires: Date.now() + 3_600_000,
                    accountId: 'completed-account'
                };
            }
        );
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        const remote = remoteHandler.current;
        if (!remote) throw new Error('Remote handlers were not registered');
        const snapshot = await remote.startLogin();
        expect(snapshot.status).toBe('waiting');
        await tick();
        const completed = await readSnapshot();
        expect(completed.status).toBe('done');
        expect(completed.loggedIn).toBe(true);
        expect(completed.deviceCode).toBe('');
        expect(completed.verificationUri).toBe('');
        expect((await readSnapshot()).status).toBe('done');
    });

    it('publishes device challenge and stores the completed OAuth locally', async () => {
        const { ctx, readStored, readCredentialCalls, tools } = harness();
        oauthLogin.mockImplementation(
            async (interaction: { notify(info: { type: string; userCode: string; verificationUri: string }): void }) => {
                interaction.notify({ type: 'device_code', userCode: 'ABCD-EFGH', verificationUri: 'https://auth.openai.com/codex/device' });
                return {
                    type: 'oauth',
                    access: 'mock-access',
                    refresh: 'mock-refresh',
                    expires: Date.now() + 3_600_000,
                    accountId: 'mock-account'
                };
            }
        );
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        const loginTool = tools.get('codex_login');
        expect(loginTool).toBeDefined();
        const output = await loginTool?.execute({ arguments: {} });
        expect(output).toContain('ABCD-EFGH');
        expect(output).toContain('https://auth.openai.com/codex/device');
        await tick();
        expect(readStored()).toContain('mock-refresh');
        expect(readStored()).toContain('mock-access');
        expect(readCredentialCalls().set).toEqual([credentialRef(CredentialRefName)]);
    });

    it('returns the waiting snapshot with device code through the remote startLogin action', async () => {
        const { ctx } = harness();
        let notify!: (info: { type: string; userCode: string; verificationUri: string }) => void;
        oauthLogin.mockImplementation(
            async (interaction: { notify(info: { type: string; userCode: string; verificationUri: string }): void }) => {
                notify = interaction.notify;
                return new Promise(() => undefined);
            }
        );
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        const remote = remoteHandler.current;
        if (!remote) throw new Error('Remote handlers were not registered');
        const login = remote.startLogin();
        await tick();
        notify({ type: 'device_code', userCode: 'UI-CODE-1234', verificationUri: 'https://auth.openai.com/codex/device' });
        const snapshot = await login;
        expect(snapshot.status).toBe('waiting');
        expect(snapshot.deviceCode).toBe('UI-CODE-1234');
        expect(snapshot.verificationUri).toBe('https://auth.openai.com/codex/device');
        expect((await readSnapshot()).deviceCode).toBe('UI-CODE-1234');
    });

    it('cancels an active login and removes the local credential on logout', async () => {
        const { ctx, readStored, tools } = harness(credential);
        let observedSignal: AbortSignal | undefined;
        oauthLogin.mockImplementation(
            (interaction: { signal: AbortSignal; notify(info: { type: string; userCode: string; verificationUri: string }): void }) => {
                observedSignal = interaction.signal;
                interaction.notify({ type: 'device_code', userCode: 'ABCD-EFGH', verificationUri: 'https://auth.openai.com/codex/device' });
                return new Promise(() => undefined);
            }
        );
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        await tools.get('codex_login')?.execute({ arguments: {} });
        await tools.get('codex_logout')?.execute({ arguments: {} });
        expect(observedSignal?.aborted).toBe(true);
        expect(readStored()).toBeUndefined();
    });

    it('refreshes expired credentials in the same local reference without exposing tokens', async () => {
        const expired = JSON.stringify({
            type: 'oauth',
            access: 'stale-access-value',
            refresh: 'stale-refresh-value',
            expires: 1,
            accountId: 'mock-account'
        });
        const refreshed = {
            type: 'oauth',
            access: 'rotated-access-value',
            refresh: 'rotated-refresh-value',
            expires: Date.now() + 3_600_000,
            accountId: 'mock-account'
        };
        const { ctx, readStored, tools } = harness(expired);
        oauthRefresh.mockResolvedValue(refreshed);
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);

        const output = await tools.get('codex_status')?.execute({ arguments: {} });
        const snapshot = await readSnapshot();
        expect(output).toContain('Signed in.');
        expect(output).not.toContain('rotated-access-value');
        expect(JSON.stringify(snapshot)).not.toContain('rotated-access-value');
        expect(JSON.stringify(snapshot)).not.toContain('rotated-refresh-value');
        expect(readStored()).toContain('rotated-access-value');
        expect(readStored()).toContain('rotated-refresh-value');
        expect(readStored()).not.toContain('stale-access-value');
        expect(readStored()).not.toContain('stale-refresh-value');
    });

    it('returns a controlled status when no credential exists', async () => {
        const { ctx, tools } = harness();
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        expect(await tools.get('codex_status')?.execute({ arguments: {} })).toBe('Not signed in. Call codex_login.');
        expect((await readSnapshot()).error).toBe('');
    });

    it('does not restore logged-in state when an in-flight credential read finishes after logout', async () => {
        let resolveCredential: ((value: ResolvedCredential | undefined) => void) | undefined;
        let resolveStarted = false;
        const pendingResolve = new Promise<ResolvedCredential | undefined>(resolve => {
            resolveCredential = resolve;
        });
        const { ctx, readStored, tools } = harness(undefined, () => {
            resolveStarted = true;
            return pendingResolve;
        });
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);

        const pendingSnapshot = readSnapshot();
        await tick();
        expect(resolveStarted).toBe(true);
        await tools.get('codex_logout')?.execute({ arguments: {} });
        const completeResolve = resolveCredential;
        if (!completeResolve) throw new Error('Credential read did not start');
        completeResolve({ value: credential, source: 'test-store' });

        const finalSnapshot = await pendingSnapshot;
        expect(finalSnapshot.loggedIn).toBe(false);
        expect(readStored()).toBeUndefined();
    });

    it('reports expired credentials without exposing refresh failure details', async () => {
        const expired = JSON.stringify({
            type: 'oauth',
            access: 'mock-expired-access',
            refresh: 'mock-expired-refresh',
            expires: 1,
            accountId: 'mock-account'
        });
        const { ctx, tools } = harness(expired);
        oauthRefresh.mockRejectedValue(new Error('private-refresh-response'));
        const { OpenAICodexAuthService } = await import('../src/host/index.js');
        const service = new OpenAICodexAuthService(ctx);
        expect(service).toBeInstanceOf(OpenAICodexAuthService);
        const output = await tools.get('codex_status')?.execute({ arguments: {} });
        expect(output).toContain('Unable to refresh OpenAI Codex sign-in.');
        expect(output).not.toContain('private-refresh-response');
        expect(JSON.stringify(await readSnapshot())).not.toContain('mock-expired-refresh');
    });
});
