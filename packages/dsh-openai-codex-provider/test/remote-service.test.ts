import { Context } from '@deepseek-ai/cordis';
import { OpenAICodexRemoteService } from '../src/host/remote-service.js';
import { ServiceKey } from '../src/shared/constants/runtime.js';
import type { OpenAICodexSnapshot } from '../src/shared/remote.js';

const snapshot: OpenAICodexSnapshot = {
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
    resetCards: [],
    resetCardsStatus: 'idle',
    usageUpdatedAt: 0,
    usageError: ''
};

test('registers the remote service with Cordis and dispatches handlers', async () => {
    const ctx = new Context();
    let logoutCalls = 0;
    const service = new OpenAICodexRemoteService(ctx, {
        snapshot: async () => snapshot,
        startLogin: async () => snapshot,
        logout: async () => {
            logoutCalls++;
            return snapshot;
        },
        followHostProxy: async () => snapshot,
        useSystemProxy: async () => snapshot,
        consumeReset: async () => snapshot,
        saveModels: async () => snapshot
    });

    expect(ctx.get(ServiceKey)).toMatchObject({ name: ServiceKey });
    expect(ctx.get(ServiceKey)).toHaveProperty('snapshot');
    await expect(service.snapshot()).resolves.toBe(snapshot);
    await expect(service.logout()).resolves.toBe(snapshot);
    expect(logoutCalls).toBe(1);
});
