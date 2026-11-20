// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCoreThemeStyles, getDshTheme } from '@kalex/dsh-core';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodexModelsFooterEntry } from '../src/client/features/settings/CodexModelsFooterEntry.js';
import { CodexSettingsPanel } from '../src/client/features/settings/CodexSettingsPanel.js';
import { OpenAIHubLoggingSettings } from '../src/client/features/settings/OpenAIHubLoggingSettings.js';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.js';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.js';
import { translateOpenAICodex } from '../src/shared/constants/localizations/OpenAICodexLocalization.js';
import type { AccountSnapshot, OpenAICodexSnapshot } from '../src/shared/remote.js';

const account = (accountLabel: string): AccountSnapshot => ({
    accountLabel,
    authMethod: 'device-code',
    autoRefreshLimits: false,
    models: [{ id: `${accountLabel}/model`, name: 'Model', enabled: true }],
    catalogStatus: 'ready',
    catalogError: '',
    loggedIn: true,
    expiresAt: 0,
    usageStatus: 'ready',
    usageLimited: false,
    usageLimits: [],
    usageCredits: '',
    usageCreditsUnlimited: false,
    resetCards: [],
    resetCardsStatus: 'idle',
    usageUpdatedAt: 0,
    usageError: ''
});
const snapshot: OpenAICodexSnapshot = {
    accounts: [account('alpha'), account('beta')],
    status: 'done',
    deviceCode: '',
    verificationUri: '',
    error: ''
};
function makeRemote(value: OpenAICodexSnapshot): OpenAICodexRemote {
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
const text = (key: Parameters<typeof translateOpenAICodex>[1]) => translateOpenAICodex('en', key);
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
    cleanup();
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});
describe('OpenAI Hub account settings', () => {
    it('does not show a catalog failure in the account information panel', async () => {
        const failedCatalog = { ...account('alpha'), catalogStatus: 'error' as const };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [failedCatalog] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);

        const panel = await screen.findByTestId('openai-hub-models-footer-alpha');

        expect(within(panel).queryByText('Catalog refresh failed; showing saved models.')).toBeNull();
        fireEvent.click(within(panel).getByRole('button', { name: 'OpenAI Codex' }));
        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).queryByText('Catalog refresh failed; showing saved models.')).toBeNull();
    });
    it('copies the verification URL from beside the open-page link', async () => {
        const verificationUri = 'https://auth.openai.com/codex/device';
        const waiting = { ...snapshot, status: 'waiting' as const, deviceCode: 'ABCD-EFGH', verificationUri };
        const writeText = vi.fn(async (_value: string) => undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        const controller = new OpenAICodexController(makeRemote(waiting));
        render(<CodexSettingsPanel controller={controller} locale="en" text={text} />);

        const copyButton = await screen.findByRole('button', { name: 'Copy verification link' });
        fireEvent.click(copyButton);

        await waitFor(() => expect(writeText).toHaveBeenCalledWith(verificationUri));
        expect(await screen.findByText('Verification link copied')).toBeTruthy();
        writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));
        fireEvent.click(copyButton);
        expect(await screen.findByText('Could not copy verification link')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Copy verification link' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(3));
        expect(within(dialog).getByText('Verification link copied')).toBeTruthy();
    });
    it('loads the full model catalog after first authorization', async () => {
        const fallback = { ...snapshot, status: 'done' as const, accounts: [{ ...account('alpha'), catalogStatus: 'fallback' as const }] };
        const ready = { ...fallback, accounts: [{ ...account('alpha'), catalogStatus: 'ready' as const }] };
        const api = makeRemote(ready);
        vi.mocked(api.startLogin).mockResolvedValueOnce(fallback);
        vi.mocked(api.refreshCatalog).mockResolvedValueOnce(ready);
        const controller = new OpenAICodexController(api);

        const result = await controller.startLogin('alpha', 'device-code');

        expect(api.refreshCatalog).toHaveBeenCalledWith({ accountLabel: 'alpha' });
        expect(result.accounts[0]?.catalogStatus).toBe('ready');
    });
    it('shows localized remaining percentages in the Core circular progress tooltips', async () => {
        const localized = {
            ...account('alpha'),
            usageLimits: [
                { name: 'Codex', usedPercent: 8, windowSeconds: 18_000, resetAt: 0 },
                { name: 'Codex', usedPercent: 7, windowSeconds: 604_800, resetAt: 0 }
            ]
        };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [localized] }));
        render(<CodexModelsFooterEntry controller={controller} locale="ru" text={key => translateOpenAICodex('ru', key)} />);

        const fiveHourChart = await screen.findByRole('progressbar', { name: 'Лимит на 5 часов: 92%' });
        const weeklyChart = screen.getByRole('progressbar', { name: 'Недельный лимит: 93%' });

        expect(fiveHourChart.querySelector('title')?.textContent).toBe('Лимит на 5 часов: 92%');
        expect(weeklyChart.querySelector('title')?.textContent).toBe('Недельный лимит: 93%');
    });
    it('keeps the latest quota data when automatic refresh is disabled', async () => {
        const current = {
            ...account('alpha'),
            autoRefreshLimits: true,
            usageStatus: 'ready' as const,
            usageLimits: [{ name: 'Codex', usedPercent: 20, windowSeconds: 18000, resetAt: 1234 }],
            usageUpdatedAt: 1234
        };
        const cleared = { ...account('alpha'), autoRefreshLimits: false };
        const api = makeRemote({ ...snapshot, accounts: [cleared] });
        vi.mocked(api.snapshot).mockResolvedValue({ ...snapshot, accounts: [current] });
        const controller = new OpenAICodexController(api);
        await controller.load();

        const result = await controller.updateAccount('alpha', 'alpha', false);
        const updated = result.accounts.find(candidate => candidate.accountLabel === 'alpha');

        expect(updated?.autoRefreshLimits).toBe(false);
        expect(updated?.usageLimits).toEqual(current.usageLimits);
        expect(updated?.usageUpdatedAt).toBe(1234);
    });
    it('migrates a pending reset under the confirmed new label before rendering its renamed card', async () => {
        const prefix = '@kalex/dsh-openai-hub.pending-reset';
        const idempotencyKey = '00000000-0000-4000-8000-000000000001';
        sessionStorage.setItem(`${prefix}-credit:alpha`, 'credit-original');
        sessionStorage.setItem(`${prefix}-request:alpha`, idempotencyKey);
        sessionStorage.setItem(`${prefix}-credit:renamed`, 'stale-credit');
        const api = makeRemote({ ...snapshot, accounts: [account('alpha')] });
        vi.mocked(api.updateAccount).mockResolvedValueOnce({ ...snapshot, accounts: [account('renamed')] });
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'OpenAI Codex' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Account label' }), { target: { value: 'renamed' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByTestId('openai-hub-models-footer-renamed')).toBeTruthy();
        expect(sessionStorage.getItem(`${prefix}-credit:alpha`)).toBeFalsy();
        expect(sessionStorage.getItem(`${prefix}-request:alpha`)).toBeFalsy();
        expect(sessionStorage.getItem(`${prefix}-credit:renamed`)).toBe('credit-original');
        expect(sessionStorage.getItem(`${prefix}-request:renamed`)).toBe(idempotencyKey);
        expect(api.consumeReset).not.toHaveBeenCalled();
    });
    it.each(['light', 'dark'])('owns the actual modal theme root and background token in %s mode', async theme => {
        document.documentElement.dataset.theme = theme;
        const controller = new OpenAICodexController(makeRemote(snapshot));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const alphaPanel = await screen.findByTestId('openai-hub-models-footer-alpha');
        fireEvent.click(within(alphaPanel).getByRole('button', { name: 'OpenAI Codex' }));
        const card = await screen.findByTestId('openai-hub-account-alpha');
        fireEvent.click(within(card).getByRole('button', { name: 'Edit models' }));
        await screen.findByText('Available models - alpha');
        const dialog = screen.getByText('Available models - alpha').closest('[role="dialog"]');
        expect(dialog?.classList.contains('dsh-modal-card')).toBe(true);
        expect(dialog?.closest('.ar-modal')?.getAttribute('data-theme')).toBe(theme);
        const css = readFileSync(resolve(import.meta.dirname, '../src/client/features/settings/codexStyles.module.scss'), 'utf8');
        expect(css).toMatch(/\.modalCard\s*\{[^}]*background:\s*var\(--dsh-ui-bg-modal\)/);
        expect(dialog?.closest('.ar-modal')?.classList.contains('dsh-core-root')).toBe(true);
        expect(buildCoreThemeStyles()).toContain(`--dsh-ui-bg-modal:${getDshTheme(theme).tokens.bgModal}`);
    });
    it('shows account authorization errors and supports reauthentication or deletion', async () => {
        const failedAccount = { ...account('failed'), loggedIn: false, usageStatus: 'error' as const };
        const failedSnapshot = { ...snapshot, accounts: [failedAccount] };
        const waitingSnapshot = {
            ...failedSnapshot,
            status: 'waiting' as const,
            deviceCode: 'ABCD-EFGH',
            verificationUri: 'https://auth.openai.com/'
        };
        const api = makeRemote(failedSnapshot);
        vi.mocked(api.snapshot).mockResolvedValueOnce(failedSnapshot).mockResolvedValue(waitingSnapshot);
        vi.mocked(api.startLogin).mockResolvedValueOnce(waitingSnapshot);
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const panel = await screen.findByTestId('openai-hub-models-footer-failed');
        expect(within(panel).getByText('Authorization required.')).toBeTruthy();
        fireEvent.click(within(panel).getByRole('button', { name: 'Sign in' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Sign in: failed')).toBeTruthy();
        expect(within(dialog).getByText('Sign in to the existing account failed. Its settings will be kept.')).toBeTruthy();
        expect(within(dialog).queryByLabelText('Account label')).toBeNull();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in' }));
        await waitFor(() =>
            expect(api.startLogin).toHaveBeenCalledWith({ accountLabel: 'failed', authMethod: 'device-code', reauthenticate: true })
        );
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(api.cancelLogin).toHaveBeenCalledOnce());
        const emptySnapshot = { ...snapshot, accounts: [] };
        vi.mocked(api.snapshot).mockResolvedValue(emptySnapshot);
        vi.mocked(api.deleteAccount).mockResolvedValueOnce(emptySnapshot);
        fireEvent.click(within(panel).getByRole('button', { name: 'Delete account' }));
        const deleteDialog = await screen.findByRole('dialog');
        expect(within(deleteDialog).getByText('Delete this account and its settings?')).toBeTruthy();
        fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Delete account' }));
        await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith({ accountLabel: 'failed' }));
        await waitFor(() => expect(screen.queryByTestId('openai-hub-models-footer-failed')).toBeNull());
    });
    it('cancels login when the dialog closes before the start request settles', async () => {
        const failedAccount = { ...account('failed'), loggedIn: false, usageStatus: 'error' as const };
        const failedSnapshot = { ...snapshot, accounts: [failedAccount] };
        const pendingStart = Promise.withResolvers<OpenAICodexSnapshot>();
        const api = makeRemote(failedSnapshot);
        vi.mocked(api.startLogin).mockReturnValue(pendingStart.promise);
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const panel = await screen.findByTestId('openai-hub-models-footer-failed');
        fireEvent.click(within(panel).getByRole('button', { name: 'Sign in' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in' }));
        await waitFor(() => expect(api.startLogin).toHaveBeenCalledOnce());
        const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
        expect(cancelButton.getAttribute('disabled')).toBeNull();
        fireEvent.click(cancelButton);
        await waitFor(() => expect(api.cancelLogin).toHaveBeenCalledOnce());
        await act(async () => pendingStart.resolve(failedSnapshot));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows one information panel per account and opens only that account settings modal', async () => {
        const api = makeRemote(snapshot),
            controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        expect(await screen.findByTestId('openai-hub-models-footer-alpha')).toBeTruthy();
        expect(screen.getByTestId('openai-hub-models-footer-beta')).toBeTruthy();
        const alphaPanel = screen.getByTestId('openai-hub-models-footer-alpha');
        fireEvent.click(within(alphaPanel).getByRole('button', { name: 'OpenAI Codex' }));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        expect(within(accountDialog).getByText('OpenAI Hub: alpha (Device code)')).toBeTruthy();
        expect(within(accountDialog).getByTestId('openai-hub-account-alpha')).toBeTruthy();
        expect(within(accountDialog).queryByTestId('openai-hub-account-beta')).toBeNull();
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Edit models' }));
        await screen.findByText('Available models - alpha');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(api.saveModels).toHaveBeenCalledWith({ accountLabel: 'alpha', models: account('alpha').models }));
        expect(api.refreshCatalog).not.toHaveBeenCalled();
        expect(api.refreshUsage).not.toHaveBeenCalled();
    });
    it('shows zero usage charts without data or after a usage error', async () => {
        const noData = { ...account('empty'), usageStatus: 'idle' as const };
        const emptyController = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [noData] }));
        render(<CodexModelsFooterEntry controller={emptyController} locale="en" text={text} />);
        expect(await screen.findByRole('progressbar', { name: '5-hour limit: 0%' })).toBeTruthy();
        expect(screen.getByRole('progressbar', { name: 'Weekly limit: 0%' })).toBeTruthy();
        expect(screen.queryByText('Loading usage...')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        expect(within(accountDialog).getByRole('progressbar', { name: '5-hour limit: 0%' })).toBeTruthy();
        expect(within(accountDialog).queryByText('Usage details are unavailable.')).toBeNull();
        cleanup();

        const previous = {
            ...account('cached'),
            usageStatus: 'error' as const,
            usageLimits: [
                { name: 'Codex', usedPercent: 0, windowSeconds: 18_000, resetAt: Date.now() + 3_600_000 },
                { name: 'Codex', usedPercent: 7, windowSeconds: 604_800, resetAt: Date.now() + 7_200_000 }
            ]
        };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [previous] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const fiveHourChart = await screen.findByRole('progressbar', { name: '5-hour limit: 0%' });
        const weeklyChart = screen.getByRole('progressbar', { name: 'Weekly limit: 0%' });
        expect(fiveHourChart.getAttribute('aria-valuenow')).toBe('0');
        expect(weeklyChart.getAttribute('aria-valuenow')).toBe('0');
        fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));
        const accountErrorDialog = await screen.findByTestId('dsh-modal-card');
        const fiveHourLinear = within(accountErrorDialog).getByRole('progressbar', { name: '5-hour limit: 0%' });
        const weeklyLinear = within(accountErrorDialog).getByRole('progressbar', { name: 'Weekly limit: 0%' });
        expect(fiveHourLinear.getAttribute('aria-valuenow')).toBe('0');
        expect(weeklyLinear.getAttribute('aria-valuenow')).toBe('0');
        expect(screen.queryByText('Loading usage...')).toBeNull();
    });
    it('reorders model rows without refreshing an already loaded catalog', async () => {
        const alpha = {
            ...account('alpha'),
            models: [
                { id: 'model-one', name: 'First', enabled: true },
                { id: 'model-two', name: 'Second', enabled: true }
            ]
        };
        const api = makeRemote({ ...snapshot, accounts: [alpha] });
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'OpenAI Codex' }));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Edit models' }));
        const modelList = await screen.findByRole('region', { name: 'Available models' });
        const rows = within(modelList).getAllByRole('listitem');
        const listStyles = readFileSync(resolve(import.meta.dirname, '../src/client/features/settings/codexStyles.module.scss'), 'utf8');
        expect(modelList.querySelector('table')).toBeNull();
        expect(listStyles).toMatch(/\.modelList\s*\{[^}]*display:\s*flex/);
        expect(listStyles).toMatch(/\.modelRow\s*\{[^}]*display:\s*flex/);
        expect(rows).toHaveLength(2);
        expect(within(modelList).getByText('model-one')).toBeTruthy();
        expect(within(modelList).getByText('model-two')).toBeTruthy();
        fireEvent.keyDown(within(modelList).getByRole('button', { name: 'Move down: First' }), { key: 'ArrowDown' });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(api.saveModels).toHaveBeenCalledWith({
                accountLabel: 'alpha',
                models: [
                    { id: 'model-two', name: 'Second', enabled: true },
                    { id: 'model-one', name: 'First', enabled: true }
                ]
            })
        );
        expect(api.refreshCatalog).not.toHaveBeenCalled();
    });
    it('polls until the full catalog replaces fallback models', async () => {
        const fallbackAccount = { ...account('alpha'), catalogStatus: 'fallback' as const },
            readyAccount = {
                ...account('alpha'),
                models: [
                    { id: 'model-one', name: 'Model One', enabled: true },
                    { id: 'model-two', name: 'Model Two', enabled: true }
                ],
                catalogStatus: 'ready' as const
            },
            fallback = { ...snapshot, accounts: [fallbackAccount] },
            ready = { ...snapshot, accounts: [readyAccount] },
            api = makeRemote(fallback),
            snapshotCallCount = () => vi.mocked(api.snapshot).mock.calls.length;
        vi.mocked(api.snapshot).mockImplementation(async () => (snapshotCallCount() > 1 ? ready : fallback));
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        expect(await screen.findByText('Loading the full model list...')).toBeTruthy();
        await waitFor(() => expect(screen.getByText('Models: 2/2 enabled')).toBeTruthy(), { timeout: 4000 });
        expect(screen.queryByText('Loading the full model list...')).toBeNull();
    });
    it('shows remaining quota, model count, automatic refresh, and restored footer order', async () => {
        const alpha = {
            ...account('alpha'),
            models: Array.from({ length: 7 }, (_, index) => ({
                id: `model-${index + 1}`,
                name: `Model ${index + 1}`,
                enabled: index < 3
            })),
            usageLimits: [{ name: 'Codex', usedPercent: 1, windowSeconds: 18000, resetAt: Date.now() + 5 * 60 * 60 * 1000 }]
        };
        const api = makeRemote({ ...snapshot, accounts: [alpha] });
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        expect(await screen.findByText('Models: 3/7 enabled')).toBeTruthy();
        const toggle = screen.getByRole('switch', { name: /Automatically refresh usage limits/ });
        expect(toggle.getAttribute('aria-checked')).toBe('false');
        expect(screen.getByRole('progressbar', { name: '5-hour limit: 99%' })).toBeTruthy();
        fireEvent.focus(screen.getByRole('button', { name: 'Auto-refresh details' }));
        expect((await screen.findByRole('tooltip')).textContent).toContain(
            'Turning this off stops automatic usage updates. When enabled, limits refresh every 5 minutes, or every minute when less than 25% remains.'
        );
        fireEvent.click(toggle);
        await waitFor(() =>
            expect(api.updateAccount).toHaveBeenCalledWith({ accountLabel: 'alpha', newLabel: 'alpha', autoRefreshLimits: true })
        );
        fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        expect(within(accountDialog).getByRole('progressbar', { name: 'Codex: 99%' })).toBeTruthy();
        const footer = within(accountDialog).getByTestId('openai-hub-modal-footer');
        expect(
            within(footer)
                .getAllByRole('button')
                .map(button => button.textContent)
        ).toEqual(['Edit models', 'Refresh models', 'Delete account', 'Rename']);
    });
    it('confirms reset cards with a per-account idempotency request', async () => {
        const alpha = { ...account('alpha'), resetCards: [{ id: 'credit-1' }], resetCardsStatus: 'ready' as const };
        const api = makeRemote({ ...snapshot, accounts: [alpha] }),
            controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'OpenAI Codex' }));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Reset limit' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm reset' }));
        await waitFor(() => expect(api.consumeReset).toHaveBeenCalledOnce());
        expect(api.consumeReset).toHaveBeenCalledWith(
            expect.objectContaining({ accountLabel: 'alpha', creditId: 'credit-1', confirmed: true })
        );
    });
    it('submits the pasted localhost callback without logging its contents', async () => {
        const waiting = {
            ...snapshot,
            accounts: [],
            status: 'waiting' as const,
            verificationUri: 'https://auth.openai.com/oauth',
            callbackUrlRequested: true
        };
        const api = makeRemote(waiting);
        const controller = new OpenAICodexController(api);
        const callbackUrl = 'http://localhost:1455/auth/callback?code=synthetic-code&state=synthetic-state';
        render(<CodexSettingsPanel controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Paste the full redirect URL'), { target: { value: callbackUrl } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Complete sign-in' }));
        await waitFor(() => expect(api.submitCallbackUrl).toHaveBeenCalledWith({ url: callbackUrl }));
        expect(api.startLogin).not.toHaveBeenCalled();
        await waitFor(() => expect(api.recordClientLog).toHaveBeenCalled());
        const clientLogCalls = JSON.stringify(vi.mocked(api.recordClientLog).mock.calls);
        expect(clientLogCalls).not.toContain('synthetic-code');
        expect(clientLogCalls).not.toContain('synthetic-state');
        expect(clientLogCalls).not.toContain(callbackUrl);
    });
    it('keeps the login dialog open through the device challenge and displays a later failure', async () => {
        const empty = { ...snapshot, accounts: [], status: 'idle' as const },
            api = makeRemote(empty),
            controller = new OpenAICodexController(api);
        let submitted = false,
            finished = false;
        vi.mocked(api.startLogin).mockImplementationOnce(async () => {
            submitted = true;
            return {
                ...empty,
                status: 'waiting',
                deviceCode: 'TEST-CODE',
                verificationUri: 'https://auth.openai.com/codex/device'
            };
        });
        vi.mocked(api.snapshot).mockImplementation(async () =>
            submitted
                ? finished
                    ? { ...empty, status: 'error', error: 'OpenAI Hub sign-in failed' }
                    : { ...empty, status: 'waiting', deviceCode: 'TEST-CODE', verificationUri: 'https://auth.openai.com/codex/device' }
                : empty
        );
        render(<CodexSettingsPanel controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'work' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('TEST-CODE')).toBeTruthy();
        expect(within(dialog).getByRole('link').getAttribute('href')).toBe('https://auth.openai.com/codex/device');
        expect(within(dialog).queryByRole('button', { name: 'Sign in with ChatGPT' })).toBeNull();
        finished = true;
        expect((await screen.findByRole('alert', {}, { timeout: 3000 })).textContent).toContain('OpenAI Hub sign-in failed');
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByDisplayValue('work')).toBeTruthy();
    });
    it('closes the login dialog after authorization succeeds', async () => {
        const empty = { ...snapshot, accounts: [], status: 'idle' as const },
            authorized = { ...snapshot, accounts: [account('work')], status: 'done' as const },
            api = makeRemote(empty),
            controller = new OpenAICodexController(api);
        let submitted = false,
            finished = false;
        vi.mocked(api.startLogin).mockImplementationOnce(async () => {
            submitted = true;
            return {
                ...empty,
                status: 'waiting',
                deviceCode: 'TEST-CODE',
                verificationUri: 'https://auth.openai.com/codex/device'
            };
        });
        vi.mocked(api.snapshot).mockImplementation(async () =>
            submitted ? (finished ? authorized : { ...empty, status: 'waiting' }) : empty
        );
        render(<CodexSettingsPanel controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'work' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        await screen.findByText('TEST-CODE');
        expect(screen.getByRole('dialog')).toBeTruthy();
        finished = true;
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 });
        expect(controller.getSnapshot().snapshot?.accounts).toEqual([account('work')]);
    });
    it('saves the global diagnostic logging preference', async () => {
        const api = makeRemote(snapshot);
        render(<OpenAIHubLoggingSettings remote={api} text={text} />);
        fireEvent.click(await screen.findByRole('switch', { name: 'Enable diagnostic logging' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(api.saveLoggingSettings).toHaveBeenCalledWith({ enabled: true }));
        expect(await screen.findByText('Logging settings saved.')).toBeTruthy();
    });
    it('requires a lowercase account label before beginning OAuth', async () => {
        const api = makeRemote({ ...snapshot, accounts: [] }),
            controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} locale="en" text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'Bad Label' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(api.startLogin).not.toHaveBeenCalled();
    });
});
