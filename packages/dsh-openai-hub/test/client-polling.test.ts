// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.js';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.js';
import { retainQuotaPolling } from '../src/client/features/settings/quotaPolling.js';
import type { OpenAICodexSnapshot } from '../src/shared/remote.js';

const snapshot: OpenAICodexSnapshot = { accounts: [], status: 'done', deviceCode: '', verificationUri: '', error: '' };
function makeController() {
    const api: OpenAICodexRemote = {
        snapshot: vi.fn(async () => snapshot),
        loadLoggingSettings: vi.fn(async () => ({ enabled: false })),
        saveLoggingSettings: vi.fn(async input => input),
        recordClientLog: vi.fn(async () => true as const),
        startLogin: vi.fn(async () => snapshot),
        cancelLogin: vi.fn(async () => snapshot),
        retryLogin: vi.fn(async () => snapshot),
        submitCallbackUrl: vi.fn(async () => snapshot),
        updateAccount: vi.fn(async () => snapshot),
        deleteAccount: vi.fn(async () => snapshot),
        refreshCatalog: vi.fn(async () => snapshot),
        refreshUsage: vi.fn(async () => snapshot),
        saveModels: vi.fn(async () => snapshot),
        consumeReset: vi.fn(async () => snapshot),
        reportUiError: vi.fn(async () => true as const),
        reportUiReady: vi.fn(async () => true as const)
    };
    return { api, controller: new OpenAICodexController(api) };
}
afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
describe('OpenAI Hub quota polling scheduler', () => {
    it('deduplicates multiple UI owners and refreshes at the fastest requested interval', async () => {
        vi.useFakeTimers();
        const { api, controller } = makeController();
        const releaseCard = retainQuotaPolling(controller, 'primary', 300_000);
        const releaseDock = retainQuotaPolling(controller, 'primary', 60_000);
        await vi.advanceTimersByTimeAsync(60_000);
        expect(api.refreshUsage).toHaveBeenCalledTimes(1);
        releaseDock();
        releaseCard();
        expect(vi.getTimerCount()).toBe(0);
    });
    it('pauses hidden polling and performs one refresh when the page becomes visible', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        const { api, controller } = makeController();
        const release = retainQuotaPolling(controller, 'primary', 300_000);
        await vi.advanceTimersByTimeAsync(600_000);
        expect(api.refreshUsage).not.toHaveBeenCalled();
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
        await vi.waitFor(() => expect(api.refreshUsage).toHaveBeenCalledOnce());
        release();
    });
});
