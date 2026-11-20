import { describe, expect, it, vi } from 'vitest';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.js';
import { OpenAICodexController, selectLocale } from '../src/client/features/settings/openAICodexRuntime.js';
import type { OpenAICodexSnapshot } from '../src/shared/remote.js';

const snapshot: OpenAICodexSnapshot = { accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' };
function remote(value: OpenAICodexSnapshot): OpenAICodexRemote {
    return {
        snapshot: vi.fn(async () => value),
        loadLoggingSettings: vi.fn(async () => ({ enabled: false })),
        saveLoggingSettings: vi.fn(async input => input),
        recordClientLog: vi.fn(async () => true as const),
        startLogin: vi.fn(async () => value),
        cancelLogin: vi.fn(async () => value),
        submitCallbackUrl: vi.fn(async () => value),
        updateAccount: vi.fn(async () => value),
        deleteAccount: vi.fn(async () => value),
        refreshCatalog: vi.fn(async () => value),
        refreshUsage: vi.fn(async () => value),
        saveModels: vi.fn(async () => value),
        consumeReset: vi.fn(async () => value),
        reportUiError: vi.fn(async () => true as const),
        reportUiReady: vi.fn(async () => true as const)
    };
}
describe('OpenAI Hub Client controller', () => {
    it('loads a global account snapshot and notifies subscribers', async () => {
        const api = remote(snapshot),
            controller = new OpenAICodexController(api),
            listener = vi.fn();
        controller.subscribe(listener);
        await controller.load();
        expect(controller.getSnapshot()).toEqual({ status: 'ready', snapshot });
        expect(api.snapshot).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledTimes(2);
    });
    it('addresses actions by validated account label', async () => {
        const api = remote(snapshot),
            controller = new OpenAICodexController(api);
        await controller.startLogin('work', 'device-code');
        await controller.startLogin('work', 'device-code', true);
        await controller.updateAccount('work', 'work', true);
        await controller.refreshUsage('work');
        await controller.deleteAccount('work');
        expect(api.startLogin).toHaveBeenNthCalledWith(1, { accountLabel: 'work', authMethod: 'device-code' });
        expect(api.startLogin).toHaveBeenNthCalledWith(2, { accountLabel: 'work', authMethod: 'device-code', reauthenticate: true });
        expect(api.updateAccount).toHaveBeenCalledWith({ accountLabel: 'work', newLabel: 'work', autoRefreshLimits: true });
        expect(api.refreshUsage).toHaveBeenCalledWith({ accountLabel: 'work' });
        expect(api.deleteAccount).toHaveBeenCalledWith({ accountLabel: 'work' });
    });
    it('uses English by default and honors Russian preference', () => {
        expect(selectLocale(undefined)).toBe('en');
        expect(selectLocale('ru')).toBe('ru');
    });
});
