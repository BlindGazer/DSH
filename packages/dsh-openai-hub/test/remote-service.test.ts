import { Context } from '@deepseek-ai/cordis';
import { OpenAICodexRemoteService } from '../src/host/remote-service.js';
import { ServiceKey } from '../src/shared/constants/runtime.js';
import type { OpenAICodexSnapshot, UiRenderError } from '../src/shared/remote.js';

const snapshot: OpenAICodexSnapshot = { accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' };

test('registers the OpenAI Hub remote and forwards the complete account-oriented contract', async () => {
    const ctx = new Context();
    const calls: string[] = [];
    let reportedError: UiRenderError | undefined;
    const service = new OpenAICodexRemoteService(ctx, {
        snapshot: async () => snapshot,
        loadLoggingSettings: async () => ({ enabled: false }),
        saveLoggingSettings: async input => input,
        recordClientLog: async input => {
            calls.push(`client-log:${input.event}:${input.phase}`);
            return true;
        },
        startLogin: async input => {
            calls.push(`login:${input.accountLabel}:${input.authMethod}`);
            return snapshot;
        },
        cancelLogin: async () => {
            calls.push('cancel-login');
            return snapshot;
        },
        retryLogin: async () => {
            calls.push('retry-login');
            return snapshot;
        },
        submitCallbackUrl: async () => {
            calls.push('callback-url');
            return snapshot;
        },
        updateAccount: async input => {
            calls.push(`update:${input.accountLabel}:${input.newLabel}`);
            return snapshot;
        },
        deleteAccount: async input => {
            calls.push(`delete:${input.accountLabel}`);
            return snapshot;
        },
        refreshCatalog: async input => {
            calls.push(`catalog:${input.accountLabel}`);
            return snapshot;
        },
        refreshUsage: async input => {
            calls.push(`usage:${input.accountLabel}`);
            return snapshot;
        },
        saveModels: async input => {
            calls.push(`models:${input.accountLabel}:${input.models.length}`);
            return snapshot;
        },
        consumeReset: async input => {
            calls.push(`reset:${input.accountLabel}:${input.creditId}`);
            return snapshot;
        },
        reportUiError: async error => {
            reportedError = error;
            return true;
        },
        reportUiReady: async id => {
            calls.push(`ready:${id}`);
            return true;
        }
    });

    expect(ctx.get(ServiceKey)).toMatchObject({ name: ServiceKey });
    await expect(service.snapshot()).resolves.toBe(snapshot);
    await expect(service.loadLoggingSettings()).resolves.toEqual({ enabled: false });
    await expect(service.saveLoggingSettings({ enabled: true })).resolves.toEqual({ enabled: true });
    await expect(service.recordClientLog({ event: 'settings', phase: 'opened' })).resolves.toBe(true);
    await expect(service.startLogin({ accountLabel: 'work', authMethod: 'browser-oauth' })).resolves.toBe(snapshot);
    await expect(service.cancelLogin()).resolves.toBe(snapshot);
    await expect(service.submitCallbackUrl({ url: 'synthetic' })).resolves.toBe(snapshot);
    await service.updateAccount({ accountLabel: 'work', newLabel: 'renamed', autoRefreshLimits: true });
    await service.deleteAccount({ accountLabel: 'renamed' });
    await service.refreshCatalog({ accountLabel: 'renamed' });
    await service.refreshUsage({ accountLabel: 'renamed' });
    await service.saveModels({ accountLabel: 'renamed', models: [] });
    const reset = {
        accountLabel: 'renamed',
        creditId: 'credit',
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: true as const
    };
    await service.consumeReset(reset);
    const uiError: UiRenderError = { name: 'Error', message: 'sanitized failure', stack: '', componentStack: '' };
    await expect(service.reportUiError(uiError)).resolves.toBe(true);
    await expect(service.reportUiReady('openai-hub-account-list')).resolves.toBe(true);
    expect(reportedError).toEqual(uiError);
    expect(calls).toEqual([
        'client-log:settings:opened',
        'login:work:browser-oauth',
        'cancel-login',
        'callback-url',
        'update:work:renamed',
        'delete:renamed',
        'catalog:renamed',
        'usage:renamed',
        'models:renamed:0',
        'reset:renamed:credit',
        'ready:openai-hub-account-list'
    ]);
});
