// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAccountPolling } from '../src/client/features/settings/accountPollingLifetime.js';
import { CodexQuotaDock } from '../src/client/features/settings/CodexQuotaDock.js';
import { usageRefreshInterval } from '../src/client/features/settings/hooks/useCodexAccountPolling.js';
import type { ModelDirectories, ModelSelectionState } from '../src/client/features/settings/modelSelectionSource.js';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.js';
import { retainQuotaPolling } from '../src/client/features/settings/quotaPolling.js';
import { translateOpenAICodex } from '../src/shared/constants/localizations/OpenAICodexLocalization.js';
import { AccountSnapshotSchema, SnapshotSchema } from '../src/shared/remote.js';

const text = (key: Parameters<typeof translateOpenAICodex>[1]) => translateOpenAICodex('en', key);
function account(label: string, usedPercent = 90) {
    return AccountSnapshotSchema.parse({
        accountLabel: label,
        authMethod: 'device-code',
        autoRefreshLimits: false,
        models: [{ id: 'gpt-6.2-sol', name: 'Sol', enabled: true }],
        catalogStatus: 'ready',
        catalogError: '',
        loggedIn: true,
        expiresAt: Date.now() + 1000000,
        usageStatus: 'ready',
        usageLimited: false,
        usageLimits: [{ name: 'Codex', usedPercent, windowSeconds: 3600, resetAt: Date.now() + 100000 }],
        usageCredits: '',
        usageCreditsUnlimited: false,
        resetCards: [],
        resetCardsStatus: 'ready',
        usageUpdatedAt: Date.now(),
        usageError: ''
    });
}
function harness(accounts = [account('work'), account('personal', 10)]) {
    const snapshot = SnapshotSchema.parse({ accounts, status: 'idle', deviceCode: '', verificationUri: '', error: '' });
    const reply = async () => snapshot;
    const remote = {
        snapshot: vi.fn(reply),
        loadLoggingSettings: async () => ({ enabled: false }),
        saveLoggingSettings: async (input: { enabled: boolean }) => input,
        recordClientLog: async () => true as const,
        startLogin: reply,
        cancelLogin: reply,
        submitCallbackUrl: reply,
        updateAccount: reply,
        deleteAccount: reply,
        refreshCatalog: reply,
        refreshUsage: vi.fn(reply),
        saveModels: reply,
        consumeReset: reply,
        reportUiError: async () => true as const,
        reportUiReady: async () => true as const
    };
    const controller = new OpenAICodexController(remote);
    let current: ModelSelectionState = { current: { provider: 'openai-hub', model: 'work/gpt-6.2-sol' }, routable: true };
    const listeners = new Set<() => void>();
    const source = {
        store: {
            getSnapshot: () => current,
            subscribe: (listener: () => void) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
        },
        load: async () => current
    };
    const directories: ModelDirectories = { directoryFor: () => source };
    return {
        controller,
        remote,
        directories,
        select: (value: ModelSelectionState) => {
            current = value;
            for (const listener of listeners) listener();
        }
    };
}
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
describe('selected OpenAI Hub account', () => {
    it('keeps enabled account polling alive without any mounted settings or dock', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        const h = harness([{ ...account('work'), autoRefreshLimits: true }]);
        const stop = startAccountPolling(h.controller);
        await h.controller.load();
        await vi.advanceTimersByTimeAsync(300000);
        expect(h.remote.refreshUsage).toHaveBeenCalledOnce();
        stop();
        await vi.advanceTimersByTimeAsync(300000);
        expect(h.remote.refreshUsage).toHaveBeenCalledOnce();
    });
    it('follows the SDK model directory, shows only that account, and hides for other or stale selections', async () => {
        const h = harness();
        render(<CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" text={text} />);
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('work'));
        expect(screen.getByRole('status').textContent).not.toContain('personal');
        act(() => h.select({ current: { provider: 'openai-hub', model: 'personal/gpt-6.2-sol' }, routable: true }));
        expect(screen.getByRole('status').textContent).toContain('personal');
        act(() => h.select({ current: { provider: 'other', model: 'work/gpt-6.2-sol' }, routable: true }));
        expect(screen.queryByRole('status')).toBeFalsy();
        act(() => h.select({ current: { provider: 'openai-hub', model: 'deleted/gpt-6.2-sol' }, routable: false }));
        expect(screen.queryByRole('status')).toBeFalsy();
    });
    it('does not display stale quota data', async () => {
        vi.useFakeTimers();
        const stale = { ...account('work'), usageUpdatedAt: Date.now() - 600001 };
        const h = harness([stale]);
        await h.controller.load();
        await act(async () => {
            render(<CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" text={text} />);
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(screen.queryByRole('status')).toBeFalsy();
    });
    it('accelerates only a selected model and honors hourly before five-hour and daily windows', () => {
        const value = account('work');
        expect(usageRefreshInterval(value)).toBe(300000);
        expect(usageRefreshInterval(value, 'gpt-6.2-sol')).toBe(60000);
        value.usageLimits.push({ name: 'Codex', usedPercent: 99, windowSeconds: 18000, resetAt: Date.now() + 1000 });
        value.usageLimits[0] = { name: 'Codex', usedPercent: 75, windowSeconds: 3600, resetAt: Date.now() + 5000 };
        expect(usageRefreshInterval(value, 'gpt-6.2-sol')).toBe(300000);
    });
    it('shares one timer per account, pauses hidden requests and refreshes once on return', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        const h = harness();
        const releaseCard = retainQuotaPolling(h.controller, 'work', 300000);
        const releaseDock = retainQuotaPolling(h.controller, 'work', 60000);
        await vi.advanceTimersByTimeAsync(60000);
        expect(h.remote.refreshUsage).toHaveBeenCalledTimes(1);
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        await vi.advanceTimersByTimeAsync(600000);
        expect(h.remote.refreshUsage).toHaveBeenCalledTimes(1);
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
        expect(h.remote.refreshUsage).toHaveBeenCalledTimes(2);
        expect(h.remote.refreshUsage).toHaveBeenLastCalledWith({ accountLabel: 'work' });
        releaseCard();
        releaseDock();
    });
});
