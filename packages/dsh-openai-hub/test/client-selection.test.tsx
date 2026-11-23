// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAccountPolling } from '../src/client/features/settings/accountPollingLifetime.ts';
import { CodexQuotaDock } from '../src/client/features/settings/CodexQuotaDock.tsx';
import { usageRefreshInterval } from '../src/client/features/settings/hooks/useCodexAccountPolling.ts';
import type { ModelDirectories, ModelSelectionState } from '../src/client/features/settings/modelSelectionSource.ts';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.ts';
import { retainQuotaPolling } from '../src/client/features/settings/quotaPolling.ts';
import { translateOpenAICodex } from '../src/shared/constants/localizations/OpenAICodexLocalization.ts';
import { AccountSnapshotSchema, SnapshotSchema } from '../src/shared/remote.ts';

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
        startLogin: reply,
        cancelLogin: reply,
        retryLogin: reply,
        submitCallbackUrl: reply,
        updateAccount: vi.fn(reply),
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
        expect(h.remote.refreshUsage).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(300000);
        expect(h.remote.refreshUsage).toHaveBeenCalledOnce();
        stop();
        await vi.advanceTimersByTimeAsync(300000);
        expect(h.remote.refreshUsage).toHaveBeenCalledOnce();
    });
    it('fetches missing quota immediately when automatic refresh is enabled and stops the timer when disabled', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        const empty = { ...account('work'), usageStatus: 'idle' as const, usageLimits: [], usageUpdatedAt: 0 };
        const h = harness([empty]);
        const stop = startAccountPolling(h.controller);
        try {
            await h.controller.load();
            expect(h.remote.refreshUsage).not.toHaveBeenCalled();

            const snapshot = await h.remote.snapshot();
            const enabled = { ...empty, autoRefreshLimits: true };
            h.remote.updateAccount.mockResolvedValueOnce({ ...snapshot, accounts: [enabled] });
            h.remote.refreshUsage.mockResolvedValueOnce({ ...snapshot, accounts: [{ ...account('work'), autoRefreshLimits: true }] });

            await h.controller.updateAccount('work', 'work', true);
            expect(h.remote.refreshUsage).toHaveBeenCalledExactlyOnceWith({ accountLabel: 'work' });
            expect(h.controller.getSnapshot().snapshot?.accounts[0]?.autoRefreshLimits).toBe(true);

            await h.controller.updateAccount('work', 'work', false);
            await vi.advanceTimersByTimeAsync(300000);
            expect(h.remote.refreshUsage).toHaveBeenCalledOnce();
        } finally {
            stop();
        }
    });
    it('follows the selected account, shows only its circular status, and hides for other or stale selections', async () => {
        const h = harness();
        render(<CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" locale="en" text={text} />);
        const status = await screen.findByTestId('openai-hub-quota-dock');
        expect(within(status).getByRole('button', { name: '10%' })).toBeTruthy();
        expect(status.textContent).not.toContain('work');
        expect(status.textContent).not.toContain('personal');
        act(() => h.select({ current: { provider: 'openai-hub', model: 'personal/gpt-6.2-sol' }, routable: true }));
        expect(within(status).getByRole('button', { name: '90%' })).toBeTruthy();
        act(() => h.select({ current: { provider: 'other', model: 'work/gpt-6.2-sol' }, routable: true }));
        expect(screen.queryByTestId('openai-hub-quota-dock')).toBeFalsy();
        act(() => h.select({ current: { provider: 'openai-hub', model: 'deleted/gpt-6.2-sol' }, routable: false }));
        expect(screen.queryByTestId('openai-hub-quota-dock')).toBeFalsy();
    });
    it('previews the primary quota on hover without a native title', async () => {
        const h = harness();
        render(<CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" locale="en" text={text} />);
        const status = await screen.findByTestId('openai-hub-quota-dock');
        const trigger = within(status).getByRole('button', { name: '10%' });

        expect(status.querySelector('[title], title')).toBeNull();
        fireEvent.pointerOver(trigger);
        const tooltip = screen.getByText('Codex: 10%');
        expect(tooltip.parentElement).toBe(document.body);
        expect(tooltip.getAttribute('data-theme')).toBe(status.getAttribute('data-theme'));
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.pointerOut(trigger);
        expect(screen.queryByText('Codex: 10%')).toBeNull();
    });
    it('opens available quota percentages, linear charts, and reset times on click', async () => {
        const selected = {
            ...account('work'),
            usageLimits: [
                { name: 'Codex', usedPercent: 28, windowSeconds: 18_000, resetAt: Date.now() + 180_000 },
                { name: 'Codex', usedPercent: 52, windowSeconds: 604_800, resetAt: Date.now() + 360_000 }
            ]
        };
        const h = harness([selected]);
        render(<CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" locale="en" text={text} />);

        const trigger = await screen.findByRole('button', { name: '72%' });
        fireEvent.pointerOver(trigger);
        expect(screen.getByText('5-hour limit: 72%')).toBeTruthy();
        fireEvent.click(trigger);

        expect(screen.queryByText('5-hour limit: 72%')).toBeNull();
        const popover = screen.getByRole('dialog');
        expect(within(popover).getByText('72%')).toBeTruthy();
        expect(within(popover).getByText('48%')).toBeTruthy();
        expect([...popover.querySelectorAll('.dsh-linear-progress')].map(chart => chart.getAttribute('style'))).toEqual([
            expect.stringContaining('--dsh-progress-value: 72%'),
            expect.stringContaining('--dsh-progress-value: 48%')
        ]);
        expect(within(popover).getAllByText(/Resets in/)).toHaveLength(2);
    });
    it.each([true, false])('keeps quota visible after ten minutes with automatic refresh set to %s', async autoRefreshLimits => {
        vi.useFakeTimers();
        const stale = { ...account('work'), autoRefreshLimits, usageUpdatedAt: Date.now() - 600001 };
        const h = harness([stale]);
        await h.controller.load();
        await act(async () => {
            render(
                <CodexQuotaDock controller={h.controller} directories={h.directories} sessionId="session-test" locale="en" text={text} />
            );
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(screen.getByRole('button', { name: '10%' })).toBeTruthy();
        expect(h.remote.refreshUsage).not.toHaveBeenCalled();
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
