import { Context } from '@deepseek-ai/cordis';
import { OpenAICodexRemoteService } from '../src/host/remote-service.js';
import { ServiceKey } from '../src/shared/constants/runtime.js';
import type { OpenAICodexSnapshot, UiRenderError } from '../src/shared/remote.js';

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
    let reportedError: UiRenderError | undefined;
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
        saveModels: async () => snapshot,
        reportUiError: async error => {
            reportedError = error;
            return true;
        },
        reportUiReady: async () => true
    });

    expect(ctx.get(ServiceKey)).toMatchObject({ name: ServiceKey });
    expect(ctx.get(ServiceKey)).toHaveProperty('snapshot');
    await expect(service.snapshot()).resolves.toBe(snapshot);
    await expect(service.logout()).resolves.toBe(snapshot);
    const uiError: UiRenderError = {
        name: 'TypeError',
        message: 'panel failed',
        stack: 'at BrokenPanel',
        componentStack: 'in BrokenPanel'
    };
    await expect(service.reportUiError(uiError)).resolves.toBe(true);
    await expect(service.reportUiReady('openai-codex-auth-models')).resolves.toBe(true);
    expect(reportedError).toEqual(uiError);
    expect(logoutCalls).toBe(1);
});
