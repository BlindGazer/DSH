import { describe, expect, it, vi } from 'vitest';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.js';
import { OpenAICodexController, selectLocale, translateFor } from '../src/client/features/settings/openAICodexRuntime.js';
import type { ModelSettings, OpenAICodexSnapshot, ResetRequest } from '../src/shared/remote.js';

const initialSnapshot: OpenAICodexSnapshot = {
    models: [],
    status: 'idle',
    loggedIn: false,
    deviceCode: '',
    verificationUri: '',
    expiresAt: 0,
    error: '',
    usageStatus: 'idle',
    usageLimited: false,
    usageLimits: [],
    usageCredits: '',
    usageCreditsUnlimited: false,
    usageUpdatedAt: 0,
    usageError: ''
};

function createRemote(snapshot: OpenAICodexSnapshot): OpenAICodexRemote {
    return {
        snapshot: vi.fn(async () => snapshot),
        startLogin: vi.fn(async () => snapshot),
        logout: vi.fn(async () => snapshot),
        followHostProxy: vi.fn(async () => snapshot),
        useSystemProxy: vi.fn(async () => snapshot),
        consumeReset: vi.fn(async (_request: ResetRequest) => snapshot),
        saveModels: vi.fn(async (_models: ModelSettings) => snapshot)
    };
}

describe('OpenAICodexController', () => {
    it('loads a direct Typed Remote snapshot and notifies subscribers', async () => {
        const remote = createRemote(initialSnapshot);
        const controller = new OpenAICodexController(remote);
        const listener = vi.fn();
        controller.subscribe(listener);

        await controller.load();

        expect(controller.getSnapshot()).toEqual({ status: 'ready', snapshot: initialSnapshot });
        expect(remote.snapshot).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('publishes action snapshots and propagates a rejected request', async () => {
        const nextSnapshot: OpenAICodexSnapshot = { ...initialSnapshot, loggedIn: true };
        const remote = createRemote(nextSnapshot);
        const controller = new OpenAICodexController(remote);

        await controller.startLogin();
        expect(controller.getSnapshot()).toEqual({ status: 'ready', snapshot: nextSnapshot });

        remote.logout = vi.fn(async () => Promise.reject(new Error('transport error')));
        await expect(controller.logout()).rejects.toThrow('transport error');
    });
});

describe('OpenAICodex locale helpers', () => {
    it('selects Russian explicitly and defaults other preferences to English', () => {
        expect(selectLocale('ru')).toBe('ru');
        expect(selectLocale('en')).toBe('en');
        expect(selectLocale(undefined)).toBe('en');
    });

    it('translates known keys and leaves unknown keys visible for diagnostics', () => {
        expect(translateFor('en', 'title')).toBe('OpenAI Codex');
        expect(translateFor('ru', 'title')).toBe('OpenAI Codex');
        expect(translateFor('en', 'missing.key')).toBe('missing.key');
    });
});
