// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCoreThemeStyles, getDshTheme } from '@kalex/dsh-core';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodexModelsFooterEntry } from '../src/client/features/settings/CodexModelsFooterEntry.tsx';
import { CodexSettingsPanel } from '../src/client/features/settings/CodexSettingsPanel.tsx';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.ts';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.ts';
import { translateOpenAICodex } from '../src/shared/constants/localizations/OpenAICodexLocalization.ts';
import type { AccountSnapshot, OpenAICodexSnapshot } from '../src/shared/remote.ts';

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
        startLogin: vi.fn(async () => value),
        cancelLogin: vi.fn(async () => value),
        retryLogin: vi.fn(async () => value),
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
const text = translateOpenAICodex.bind(undefined, 'en');
function settingsButton(container: HTMLElement): HTMLButtonElement {
    const button = [...container.querySelectorAll('button')].find(item => !item.hasAttribute('data-checked') && !item.textContent?.trim());
    if (!button) throw new Error('Account settings button missing');
    return button;
}
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
    cleanup();
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});
describe('OpenAI Hub account settings', () => {
    it.each([
        ['en', 'light'],
        ['en', 'dark'],
        ['ru', 'light'],
        ['ru', 'dark']
    ] as const)('shows localized authorization cards in %s with the %s theme', async (locale, theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const t = translateOpenAICodex.bind(undefined, locale);
        const controller = new OpenAICodexController(makeRemote(snapshot));
        render(<CodexSettingsPanel controller={controller} text={t} />);
        fireEvent.click(await screen.findByRole('button', { name: t('addAccount') }));
        const group = screen.getByRole('group', { name: t('authMethod') });
        const device = within(group).getByDisplayValue<HTMLInputElement>('device-code');
        const browser = within(group).getByDisplayValue<HTMLInputElement>('browser-oauth');
        expect(device.checked).toBe(true);
        expect(browser.checked).toBe(false);
        expect(group.closest('[data-theme]')?.getAttribute('data-theme')).toBe(theme);
        expect(within(group).getByText(t('browserOAuthDescription'))).toBeTruthy();
        expect(screen.queryByRole('combobox', { name: t('authMethod') })).toBeNull();
        fireEvent.click(within(group).getByText(t('browserOAuthDescription')));
        expect(browser.checked).toBe(true);
        expect(device.checked).toBe(false);
    });
    it.each([
        ['en', 'light'],
        ['en', 'dark'],
        ['ru', 'light'],
        ['ru', 'dark']
    ] as const)('shows callback progress until completion in %s with the %s theme', async (locale, theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const t = translateOpenAICodex.bind(undefined, locale);
        const empty: OpenAICodexSnapshot = { ...snapshot, accounts: [], status: 'idle' };
        const waiting: OpenAICodexSnapshot = {
            ...empty,
            status: 'waiting',
            callbackUrlRequested: true,
            verificationUri: 'https://auth.openai.com/oauth/authorize'
        };
        let current = empty;
        const api = makeRemote(empty);
        const pending = Promise.withResolvers<OpenAICodexSnapshot>();
        vi.mocked(api.snapshot).mockImplementation(async () => current);
        vi.mocked(api.startLogin).mockImplementation(async () => {
            current = waiting;
            return current;
        });
        vi.mocked(api.submitCallbackUrl).mockReturnValueOnce(pending.promise);
        const controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} text={t} />);
        fireEvent.click(await screen.findByRole('button', { name: t('addFirstAccount') }));
        fireEvent.change(screen.getByLabelText(t('accountLabel')), { target: { value: 'work' } });
        fireEvent.click(screen.getByDisplayValue('browser-oauth'));
        fireEvent.click(screen.getByRole('button', { name: t('login') }));
        const input = await screen.findByLabelText(t('manualCallbackLabel'));
        fireEvent.change(input, { target: { value: 'http://localhost:1455/auth/callback?code=test-code&state=test-state' } });
        expect(api.submitCallbackUrl).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: t('submitCallback') }));
        const dialog = screen.getByTestId('dsh-modal-card');
        expect(await within(dialog).findByText(t('signingIn'))).toBeTruthy();
        expect(within(dialog).getByText(t('signingInHint'))).toBeTruthy();
        expect(within(dialog).queryByText(t('waiting'))).toBeNull();
        expect(within(dialog).queryByRole('link')).toBeNull();
        expect(within(dialog).queryByLabelText(t('manualCallbackLabel'))).toBeNull();
        expect(within(dialog).queryByRole('button', { name: t('submitCallback') })).toBeNull();
        expect(within(dialog).getByRole('button', { name: t('cancel') })).toBeTruthy();
        current = { ...empty, status: 'starting', callbackUrlRequested: false };
        await act(async () => pending.resolve(current));
        expect(within(dialog).getByText(t('signingIn'))).toBeTruthy();
        current = { ...empty, status: 'done', accounts: [account('work')] };
        await act(async () => {
            await controller.load(true);
        });
        await waitFor(() => expect(screen.queryByTestId('dsh-modal-card')).toBeNull(), { timeout: 2500 });
    });

    it('offers a manual retry after token-exchange timeout without asking for the callback again', async () => {
        const timedOut: OpenAICodexSnapshot = {
            ...snapshot,
            accounts: [],
            status: 'error',
            retryAvailable: true,
            error: 'Connection timed out.'
        };
        const api = makeRemote(timedOut);
        let current = timedOut;
        vi.mocked(api.snapshot).mockImplementation(async () => current);
        vi.mocked(api.retryLogin).mockImplementationOnce(async () => {
            current = { ...timedOut, status: 'starting', retryAvailable: false, error: '' };
            return current;
        });
        const controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: text('addFirstAccount') }));
        const dialog = screen.getByTestId('dsh-modal-card');
        expect(within(dialog).getByText('Connection timed out.')).toBeTruthy();
        expect(within(dialog).getByRole('button', { name: text('retry') })).toBeTruthy();
        expect(within(dialog).queryByLabelText(text('manualCallbackLabel'))).toBeNull();
        fireEvent.click(within(dialog).getByRole('button', { name: text('retry') }));
        await waitFor(() => expect(api.retryLogin).toHaveBeenCalledOnce());
        expect(await within(dialog).findByText(text('signingIn'))).toBeTruthy();
        expect(api.submitCallbackUrl).not.toHaveBeenCalled();
    });

    it('restores the callback form when submission is rejected', async () => {
        const waiting: OpenAICodexSnapshot = {
            ...snapshot,
            accounts: [],
            status: 'waiting',
            callbackUrlRequested: true,
            verificationUri: 'https://auth.openai.com/oauth/authorize'
        };
        const api = makeRemote(waiting);
        vi.mocked(api.submitCallbackUrl).mockRejectedValueOnce(new Error('Synthetic rejection'));
        const controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: text('addFirstAccount') }));
        const callback = 'http://localhost:1455/auth/callback?code=test-code&state=test-state';
        fireEvent.change(await screen.findByLabelText(text('manualCallbackLabel')), { target: { value: callback } });
        fireEvent.click(screen.getByRole('button', { name: text('submitCallback') }));
        expect(await screen.findByText(text('callbackFailed'))).toBeTruthy();
        expect(screen.queryByText(text('signingIn'))).toBeNull();
        expect(screen.getByDisplayValue(callback)).toBeTruthy();
        expect(screen.getByRole('button', { name: text('submitCallback') }).hasAttribute('disabled')).toBe(false);
    });

    it.each(['device-code', 'browser-oauth'] as const)('submits the selected %s authorization card', async authMethod => {
        const api = makeRemote({ ...snapshot, status: 'idle', accounts: [] });
        const pending = Promise.withResolvers<OpenAICodexSnapshot>();
        vi.mocked(api.startLogin).mockReturnValueOnce(pending.promise);
        const controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: text('addFirstAccount') }));
        fireEvent.change(screen.getByRole('textbox', { name: text('accountLabel') }), { target: { value: 'work' } });
        fireEvent.click(screen.getByDisplayValue(authMethod));
        fireEvent.click(screen.getByRole('button', { name: text('login') }));
        await waitFor(() => expect(api.startLogin).toHaveBeenCalledWith({ accountLabel: 'work', authMethod }));
        expect(screen.getByRole('group', { name: text('authMethod') }).hasAttribute('disabled')).toBe(true);
        await act(async () => pending.resolve({ ...snapshot, status: 'waiting', accounts: [] }));
    });
    it.each(['light', 'dark'] as const)('uses the Core collection add action in the %s theme', async theme => {
        document.documentElement.setAttribute('data-theme', theme);
        const controller = new OpenAICodexController(makeRemote(snapshot));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const button = await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' });
        expect(button.classList.contains('dsh-collection-add-btn')).toBe(true);
        expect(button.querySelector('svg.dsh-collection-add-icon')).toBeTruthy();
        expect(button.closest('.dsh-core-root')?.getAttribute('data-theme')).toBe(theme);
        fireEvent.click(button);
        expect(await screen.findByTestId('dsh-modal-card')).toBeTruthy();
    });
    it('does not show a catalog failure in the account information panel', async () => {
        const failedCatalog = { ...account('alpha'), catalogStatus: 'error' as const };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [failedCatalog] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);

        const panel = await screen.findByTestId('openai-hub-models-footer-alpha');

        expect(within(panel).queryByText('Catalog refresh failed; showing saved models.')).toBeNull();
        fireEvent.click(settingsButton(panel));
        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).queryByText('Catalog refresh failed; showing saved models.')).toBeNull();
    });
    it('copies the verification URL from beside the open-page link', async () => {
        const verificationUri = 'https://auth.openai.com/codex/device';
        const waiting = { ...snapshot, status: 'waiting' as const, deviceCode: 'ABCD-EFGH', verificationUri };
        const writeText = vi.fn(async (_value: string) => undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        const controller = new OpenAICodexController(makeRemote(waiting));
        render(<CodexSettingsPanel controller={controller} text={text} />);

        const copyButton = await screen.findByTestId('dsh-icon-button');
        expect(copyButton.hasAttribute('title')).toBe(false);
        fireEvent.pointerEnter(copyButton);
        expect(await screen.findByText('Copy verification link')).toBeTruthy();
        fireEvent.click(copyButton);

        await waitFor(() => expect(writeText).toHaveBeenCalledWith(verificationUri));
        expect(await screen.findByText('Verification link copied')).toBeTruthy();
        writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));
        fireEvent.click(copyButton);
        expect(await screen.findByText('Could not copy verification link')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' }));
        const dialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(dialog).getByTestId('dsh-icon-button'));
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
        render(<CodexModelsFooterEntry controller={controller} locale="ru" text={translateOpenAICodex.bind(undefined, 'ru')} />);

        const footer = await screen.findByTestId('openai-hub-models-footer-alpha');
        const charts = [...footer.querySelectorAll('.dsh-circular-progress')];

        expect(charts).toHaveLength(2);
        for (const [index, label] of ['Лимит на 5 часов: 92 %', 'Недельный лимит: 93 %'].entries()) {
            const chart = charts[index];
            if (!chart) throw new Error('Quota chart missing');
            expect(chart.matches('[title]')).toBe(false);
            expect(chart.querySelector('title')).toBeNull();
            fireEvent.pointerEnter(chart);
            expect(await screen.findByText(label)).toBeTruthy();
            fireEvent.pointerLeave(chart);
        }
    });
    it('hides the five-hour chart when only the weekly limit is available', async () => {
        const localized = {
            ...account('alpha'),
            usageLimits: [{ name: 'Codex', usedPercent: 7, windowSeconds: 604_800, resetAt: 0 }]
        };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [localized] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);

        const footer = await screen.findByTestId('openai-hub-models-footer-alpha');
        expect(footer.querySelectorAll('.dsh-circular-progress')).toHaveLength(1);
        expect(within(footer).getByText('93%')).toBeTruthy();
    });
    it.each([true, false])('keeps the latest quota data when automatic refresh is toggled to %s', async enabled => {
        const current = {
            ...account('alpha'),
            autoRefreshLimits: !enabled,
            usageStatus: 'ready' as const,
            usageLimits: [{ name: 'Codex', usedPercent: 20, windowSeconds: 18000, resetAt: 1234 }],
            usageResetCredits: 2,
            usageUpdatedAt: 1234
        };
        const cleared = { ...account('alpha'), autoRefreshLimits: enabled };
        const api = makeRemote({ ...snapshot, accounts: [cleared] });
        vi.mocked(api.snapshot).mockResolvedValue({ ...snapshot, accounts: [current] });
        const controller = new OpenAICodexController(api);
        await controller.load();

        const result = await controller.updateAccount('alpha', 'alpha', enabled);
        const updated = result.accounts.find(candidate => candidate.accountLabel === 'alpha');

        expect(updated?.autoRefreshLimits).toBe(enabled);
        expect(updated?.usageLimits).toEqual(current.usageLimits);
        expect(updated?.usageUpdatedAt).toBe(1234);
        expect(updated?.usageResetCredits).toBe(2);
    });
    it('does not overwrite a newer usage sample returned with the toggle response', async () => {
        const previous = { ...account('alpha'), usageUpdatedAt: 100, usageResetCredits: 2 };
        const current = { ...previous, autoRefreshLimits: true, usageUpdatedAt: 200, usageResetCredits: 1 };
        const api = makeRemote({ ...snapshot, accounts: [current] });
        vi.mocked(api.snapshot).mockResolvedValue({ ...snapshot, accounts: [previous] });
        const controller = new OpenAICodexController(api);
        await controller.load();

        const updated = await controller.updateAccount('alpha', 'alpha', true);

        expect(updated.accounts[0]).toStrictEqual(current);
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
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-alpha')));
        fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
        const footer = screen.getByTestId('openai-hub-modal-footer');
        expect(
            within(footer)
                .getAllByRole('button')
                .map(button => button.textContent)
        ).toEqual(['Cancel', 'Save']);
        fireEvent.change(screen.getByRole('textbox', { name: 'Account label' }), { target: { value: 'renamed' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByTestId('openai-hub-models-footer-renamed')).toBeTruthy();
        expect(sessionStorage.getItem(`${prefix}-credit:alpha`)).toBeFalsy();
        expect(sessionStorage.getItem(`${prefix}-request:alpha`)).toBeFalsy();
        expect(sessionStorage.getItem(`${prefix}-credit:renamed`)).toBe('credit-original');
        expect(sessionStorage.getItem(`${prefix}-request:renamed`)).toBe(idempotencyKey);
        expect(api.consumeReset).not.toHaveBeenCalled();
    });
    it.each(['light', 'dark'])('inherits the footer theme and background token in %s mode', async theme => {
        document.documentElement.dataset.theme = theme;
        const controller = new OpenAICodexController(makeRemote(snapshot));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        const alphaPanel = await screen.findByTestId('openai-hub-models-footer-alpha');
        fireEvent.click(settingsButton(alphaPanel));
        const card = await screen.findByTestId('openai-hub-account-alpha');
        fireEvent.click(within(card).getByRole('button', { name: 'Edit models' }));
        await screen.findByText('Available models - alpha');
        const dialog = screen.getByText('Available models - alpha').closest('.dsh-modal-card');
        expect(dialog?.classList.contains('dsh-modal-card')).toBe(true);
        expect(dialog?.closest('.dsh-core-root')?.getAttribute('data-theme')).toBe(theme);
        const css = readFileSync(resolve(import.meta.dirname, '../src/client/features/settings/codexStyles.module.scss'), 'utf8');
        expect(css).toMatch(/\.modalCard\s*\{[^}]*background:\s*var\(--dsh-ui-bg-modal\)/);
        expect(dialog?.closest('.dsh-core-root')).toBe(screen.getByTestId('openai-hub-models-footer'));
        expect(card.hasAttribute('data-theme')).toBe(false);
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
        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).getByText('Sign in: failed')).toBeTruthy();
        expect(within(dialog).getByText('Sign in to the existing account failed. Its settings will be kept.')).toBeTruthy();
        expect(within(dialog).queryByLabelText('Account label')).toBeNull();
        expect(
            within(dialog)
                .getAllByRole('button')
                .slice(-2)
                .map(button => button.textContent)
        ).toEqual(['Cancel', 'Sign in']);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in' }));
        await waitFor(() =>
            expect(api.startLogin).toHaveBeenCalledWith({ accountLabel: 'failed', authMethod: 'device-code', reauthenticate: true })
        );
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(api.cancelLogin).toHaveBeenCalledOnce());
        const emptySnapshot = { ...snapshot, accounts: [] };
        vi.mocked(api.snapshot).mockResolvedValue(emptySnapshot);
        vi.mocked(api.deleteAccount).mockResolvedValueOnce(emptySnapshot);
        const deleteButton = within(panel).getByTestId('dsh-icon-button');
        expect(deleteButton.querySelector('svg')).toBeTruthy();
        fireEvent.pointerEnter(deleteButton);
        expect(await screen.findByText('Delete account')).toBeTruthy();
        fireEvent.click(deleteButton);
        const deleteDialog = await screen.findByTestId('dsh-modal-card');
        expect(within(deleteDialog).getByText('Delete this account and its settings?')).toBeTruthy();
        expect(
            within(deleteDialog)
                .getAllByRole('button')
                .slice(-2)
                .map(button => button.textContent)
        ).toEqual(['Cancel', 'Delete account']);
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
        const dialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in' }));
        await waitFor(() => expect(api.startLogin).toHaveBeenCalledOnce());
        const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
        expect(cancelButton.getAttribute('disabled')).toBeNull();
        fireEvent.click(cancelButton);
        await waitFor(() => expect(api.cancelLogin).toHaveBeenCalledOnce());
        await act(async () => pendingStart.resolve(failedSnapshot));
        expect(screen.queryByTestId('dsh-modal-card')).toBeNull();
    });

    it('shows one information panel per account and opens only that account settings modal', async () => {
        const api = makeRemote(snapshot),
            controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        expect(await screen.findByTestId('openai-hub-models-footer-alpha')).toBeTruthy();
        expect(screen.getByTestId('openai-hub-models-footer-beta')).toBeTruthy();
        const alphaPanel = screen.getByTestId('openai-hub-models-footer-alpha');
        fireEvent.click(settingsButton(alphaPanel));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        expect(within(accountDialog).getByText('OpenAI Hub: alpha (Device code)')).toBeTruthy();
        expect(within(accountDialog).getByTestId('openai-hub-account-alpha')).toBeTruthy();
        expect(within(accountDialog).queryByTestId('openai-hub-account-beta')).toBeNull();
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Edit models' }));
        await screen.findByText('Available models - alpha');
        const modelDialog = screen.getAllByTestId('dsh-modal-card').at(-1);
        if (!modelDialog) throw new Error('Model editor missing');
        expect(
            within(modelDialog)
                .getAllByRole('button')
                .slice(-2)
                .map(button => button.textContent)
        ).toEqual(['Cancel', 'Save']);
        fireEvent.click(within(modelDialog).getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(api.saveModels).toHaveBeenCalledWith({ accountLabel: 'alpha', models: account('alpha').models }));
        expect(api.refreshCatalog).not.toHaveBeenCalled();
        expect(api.refreshUsage).not.toHaveBeenCalled();
    });
    it.each([
        ['en', 'Weekly limit', 'No data', 'No data is available for the weekly limit.'],
        ['ru', 'Недельный лимит', 'Нет данных', 'Данные о недельном лимите недоступны.']
    ] as const)('shows a weekly no-data tooltip in %s when only the five-hour limit is known', async (locale, label, noData, tooltip) => {
        const partial: AccountSnapshot = {
            ...account('partial'),
            usageLimits: [{ name: 'Codex', usedPercent: 8, windowSeconds: 18_000, resetAt: 0 }]
        };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [partial] }));
        render(<CodexModelsFooterEntry controller={controller} locale={locale} text={translateOpenAICodex.bind(undefined, locale)} />);
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-partial')));

        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).getByText(label)).toBeTruthy();
        expect(within(dialog).getByText(new Intl.NumberFormat(locale, { style: 'percent' }).format(0.92).replace(/\s/g, ' '))).toBeTruthy();
        expect(within(dialog).queryByText('0%')).toBeNull();
        const tooltipTrigger = within(dialog).getByRole('button', { name: noData });
        expect(tooltipTrigger.hasAttribute('title')).toBe(false);
        fireEvent.focus(tooltipTrigger);
        expect(await screen.findByText(tooltip)).toBeTruthy();
    });
    it.each(['idle', 'error'] as const)('shows missing weekly data without fabricating a quota in %s state', async usageStatus => {
        const empty: AccountSnapshot = { ...account('empty'), usageStatus };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [empty] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-empty')));

        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).getByText('Weekly limit')).toBeTruthy();
        expect(within(dialog).getByText('No data')).toBeTruthy();
        expect(within(dialog).queryByText('0%')).toBeNull();
        expect(dialog.querySelectorAll('.dsh-linear-progress')).toHaveLength(0);
    });
    it('keeps a known exhausted weekly limit at 0%', async () => {
        const exhausted: AccountSnapshot = {
            ...account('exhausted'),
            usageLimits: [{ name: 'Codex', usedPercent: 100, windowSeconds: 604_800, resetAt: 0 }]
        };
        const controller = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [exhausted] }));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-exhausted')));

        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).getByText('Weekly limit')).toBeTruthy();
        expect(within(dialog).getByText('0%')).toBeTruthy();
        expect(within(dialog).queryByText('No data')).toBeNull();
        expect(dialog.querySelectorAll('.dsh-linear-progress')).toHaveLength(1);
    });
    it('distinguishes missing footer quota from cached quota after a usage error', async () => {
        const noData = { ...account('empty'), usageStatus: 'idle' as const };
        const emptyController = new OpenAICodexController(makeRemote({ ...snapshot, accounts: [noData] }));
        render(<CodexModelsFooterEntry controller={emptyController} locale="en" text={text} />);
        const emptyFooter = await screen.findByTestId('openai-hub-models-footer-empty');
        expect(emptyFooter.querySelectorAll('.dsh-circular-progress')).toHaveLength(0);
        expect(within(emptyFooter).getByText('No data')).toBeTruthy();
        expect(screen.queryByText('Loading usage...')).toBeNull();
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
        const cachedFooter = await screen.findByTestId('openai-hub-models-footer-cached');
        expect(cachedFooter.querySelectorAll('.dsh-circular-progress')).toHaveLength(2);
        expect(within(cachedFooter).getByText('100%')).toBeTruthy();
        expect(within(cachedFooter).getByText('93%')).toBeTruthy();
        fireEvent.click(settingsButton(cachedFooter));
        const accountErrorDialog = await screen.findByTestId('dsh-modal-card');
        const charts = accountErrorDialog.querySelectorAll('.dsh-linear-progress');
        expect([...charts].map(chart => chart.getAttribute('style'))).toEqual([
            expect.stringContaining('--dsh-progress-value: 100%'),
            expect.stringContaining('--dsh-progress-value: 93%')
        ]);
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
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-alpha')));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Edit models' }));
        const modelList = await screen.findByTestId('openai-hub-modal-scroll-body-alpha');
        const rows = within(modelList).getAllByRole('listitem');
        const listStyles = readFileSync(resolve(import.meta.dirname, '../src/client/features/settings/codexStyles.module.scss'), 'utf8');
        expect(modelList.querySelector('table')).toBeNull();
        expect(listStyles).toMatch(/\.modelList\s*\{[^}]*display:\s*flex/);
        expect(listStyles).toMatch(/\.modelRow\s*\{[^}]*display:\s*flex/);
        expect(rows).toHaveLength(2);
        expect(within(modelList).getByText('model-one')).toBeTruthy();
        expect(within(modelList).getByText('model-two')).toBeTruthy();
        const grip = rows[0]?.querySelector('button[draggable]');
        if (!grip) throw new Error('Model drag grip missing');
        fireEvent.keyDown(grip, { key: 'ArrowDown' });
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
            usageLimits: [{ name: 'Codex', usedPercent: 1, windowSeconds: 18000, resetAt: Date.now() + 5 * 60 * 60 * 1000 }],
            usageUpdatedAt: Date.now()
        };
        const api = makeRemote({ ...snapshot, accounts: [alpha] });
        vi.mocked(api.updateAccount).mockResolvedValueOnce({ ...snapshot, accounts: [{ ...alpha, autoRefreshLimits: true }] });
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        expect(await screen.findByText('Models: 3/7 enabled')).toBeTruthy();
        const toggle = document.querySelector('button[data-checked]');
        if (!toggle) throw new Error('Auto-refresh toggle missing');
        expect(toggle.getAttribute('data-checked')).toBe('false');
        expect(screen.getByText('99%')).toBeTruthy();
        fireEvent.pointerEnter(toggle);
        expect((await screen.findByText(text('autoRefreshTooltip'))).textContent).toContain(
            'Turning this off stops automatic usage updates. When enabled, limits refresh every 5 minutes, or every minute when less than 25% remains.'
        );
        fireEvent.click(toggle);
        await waitFor(() => expect(toggle.getAttribute('data-checked')).toBe('true'));
        expect(api.updateAccount).toHaveBeenCalledWith({ accountLabel: 'alpha', newLabel: 'alpha', autoRefreshLimits: true });
        expect(api.snapshot).toHaveBeenCalledOnce();
        expect(api.refreshUsage).not.toHaveBeenCalled();
        expect(screen.getByText('99%')).toBeTruthy();
        fireEvent.click(settingsButton(screen.getAllByTestId(/^openai-hub-models-footer-/)[0] ?? document.body));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        const chart = accountDialog.querySelector('.dsh-linear-progress');
        if (!chart) throw new Error('Quota chart missing');
        fireEvent.pointerEnter(chart);
        expect(await screen.findByText('5-hour limit: 99%')).toBeTruthy();
        fireEvent.pointerLeave(chart);
        const reset = within(accountDialog).getByRole('button', { name: /Resets in/ });
        fireEvent.pointerEnter(reset);
        expect(await screen.findByText(new Date(alpha.usageLimits[0]?.resetAt ?? 0).toLocaleString('en'))).toBeTruthy();
        fireEvent.pointerLeave(reset);
        const footer = within(accountDialog).getByTestId('openai-hub-modal-footer');
        expect(within(footer).getAllByRole('button')).toEqual([
            within(footer).getByRole('button', { name: 'Delete account' }),
            within(footer).getByRole('button', { name: 'Rename' }),
            within(footer).getByTestId('dsh-icon-button'),
            within(footer).getByRole('button', { name: 'Edit models' })
        ]);
    });
    it('refreshes the model catalog from the icon button with a tooltip', async () => {
        const api = makeRemote({ ...snapshot, accounts: [account('alpha')] });
        const controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-alpha')));
        const footer = within(await screen.findByTestId('dsh-modal-card')).getByTestId('openai-hub-modal-footer');
        const refresh = within(footer).getByTestId('dsh-icon-button');

        expect(refresh.hasAttribute('title')).toBe(false);
        expect(refresh.textContent).toBe('');
        fireEvent.focus(refresh);
        expect(await screen.findByText('Refresh models')).toBeTruthy();
        fireEvent.click(refresh);

        await waitFor(() => expect(api.refreshCatalog).toHaveBeenCalledWith({ accountLabel: 'alpha' }));
    });
    it('confirms reset cards with a per-account idempotency request', async () => {
        const alpha = { ...account('alpha'), resetCards: [{ id: 'credit-1' }], resetCardsStatus: 'ready' as const };
        const api = makeRemote({ ...snapshot, accounts: [alpha] }),
            controller = new OpenAICodexController(api);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={text} />);
        fireEvent.click(settingsButton(await screen.findByTestId('openai-hub-models-footer-alpha')));
        const accountDialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.click(within(accountDialog).getByRole('button', { name: 'Reset limit' }));
        const confirm = await screen.findByRole('button', { name: 'Confirm reset' });
        expect(confirm.previousElementSibling?.textContent).toBe('Cancel');
        fireEvent.click(confirm);
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
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        const dialog = await screen.findByTestId('dsh-modal-card');
        fireEvent.change(within(dialog).getByLabelText('Paste the full redirect URL'), { target: { value: callbackUrl } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Complete sign-in' }));
        await waitFor(() => expect(api.submitCallbackUrl).toHaveBeenCalledWith({ url: callbackUrl }));
        expect(api.startLogin).not.toHaveBeenCalled();
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
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'work' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        const dialog = await screen.findByTestId('dsh-modal-card');
        expect(within(dialog).getByText('TEST-CODE')).toBeTruthy();
        expect(within(dialog).getByRole('link').getAttribute('href')).toBe('https://auth.openai.com/codex/device');
        expect(within(dialog).queryByRole('button', { name: 'Sign in with ChatGPT' })).toBeNull();
        finished = true;
        expect(await screen.findByText('OpenAI Hub sign-in failed', {}, { timeout: 3000 })).toBeTruthy();
        expect(screen.getByTestId('dsh-modal-card')).toBeTruthy();
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
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'work' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        await screen.findByText('TEST-CODE');
        expect(screen.getByTestId('dsh-modal-card')).toBeTruthy();
        finished = true;
        await waitFor(() => expect(screen.queryByTestId('dsh-modal-card')).toBeNull(), { timeout: 3000 });
        expect(controller.getSnapshot().snapshot?.accounts).toEqual([account('work')]);
    });
    it('requires a lowercase account label before beginning OAuth', async () => {
        const api = makeRemote({ ...snapshot, accounts: [] }),
            controller = new OpenAICodexController(api);
        render(<CodexSettingsPanel controller={controller} text={text} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Add an account to OpenAI Hub' }));
        fireEvent.change(screen.getByLabelText('Account label'), { target: { value: 'Bad Label' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        expect(await screen.findByText(text('labelInvalid'))).toBeTruthy();
        expect(api.startLogin).not.toHaveBeenCalled();
    });
});
