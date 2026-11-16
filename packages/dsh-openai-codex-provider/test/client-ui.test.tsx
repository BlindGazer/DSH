// @vitest-environment jsdom

import { TestId as CoreTestId } from '@kalex/dsh-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodexModelsFooterEntry } from '../src/client/features/settings/CodexModelsFooterEntry.js';
import { CodexQuotaDock } from '../src/client/features/settings/CodexQuotaDock.js';
import { CodexSettingsPanel } from '../src/client/features/settings/CodexSettingsPanel.js';
import type { OpenAICodexRemote } from '../src/client/features/settings/openAICodexRuntime.js';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.js';
import { translateOpenAICodex } from '../src/shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../src/shared/constants/testId.js';
import type { ModelSettings, OpenAICodexSnapshot, ResetRequest } from '../src/shared/remote.js';

const baseSnapshot: OpenAICodexSnapshot = {
    models: [
        { id: 'model-a', name: 'Model A', enabled: true },
        { id: 'model-b', name: 'Model B', enabled: true }
    ],
    status: 'idle',
    loggedIn: true,
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
        startLogin: vi.fn(async () => ({
            ...snapshot,
            status: 'waiting',
            deviceCode: 'ABCD-EFGH',
            verificationUri: 'https://auth.openai.com/codex/device'
        })),
        logout: vi.fn(async () => ({ ...snapshot, loggedIn: false })),
        followHostProxy: vi.fn(async () => ({ ...snapshot, proxyMode: 'host' })),
        useSystemProxy: vi.fn(async () => ({ ...snapshot, proxyMode: 'system' })),
        consumeReset: vi.fn(async (_request: ResetRequest) => ({ ...snapshot, resetResult: 'reset' })),
        saveModels: vi.fn(async (_models: ModelSettings) => snapshot),
        reportUiError: vi.fn(async () => true),
        reportUiReady: vi.fn(async () => true)
    };
}

function createPendingSnapshot(): { readonly promise: Promise<OpenAICodexSnapshot>; resolve(value: OpenAICodexSnapshot): void } {
    let resolveSnapshot: ((value: OpenAICodexSnapshot) => void) | undefined;
    const promise = new Promise<OpenAICodexSnapshot>(resolve => {
        resolveSnapshot = resolve;
    });
    return {
        promise,
        resolve(value) {
            resolveSnapshot?.(value);
        }
    };
}

function expectCoreThemeRoot(element: HTMLElement): void {
    expect(element.classList.contains('dsh-core-root')).toBe(true);
    expect(element.getAttribute('data-theme')).toBeTruthy();
}

function renderSettings(snapshot: OpenAICodexSnapshot = { ...baseSnapshot, loggedIn: true }) {
    const remote = createRemote(snapshot);
    const controller = new OpenAICodexController(remote);
    render(
        <>
            <CodexSettingsPanel controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />
            <CodexQuotaDock controller={controller} text={key => translateOpenAICodex('en', key)} />
        </>
    );
    return { remote, controller };
}

beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(window, 'open').mockReturnValue(null);
});

describe('Codex settings UI', () => {
    it('открывает окно Models с доступной авторизацией во время загрузки', async () => {
        const pendingSnapshot = createPendingSnapshot();
        const remote = createRemote(baseSnapshot);
        remote.snapshot = vi.fn(() => pendingSnapshot.promise);
        const controller = new OpenAICodexController(remote);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);
        expectCoreThemeRoot(screen.getByTestId(TestId.OpenAICodex.ModelsFooter));

        fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-label')).toBe('Close');
        expect(screen.getByRole('button', { name: 'Sign in with ChatGPT' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        expect((await screen.findByTestId(TestId.OpenAICodex.DeviceCode)).textContent).toBe('ABCD-EFGH');
        expect(remote.startLogin).toHaveBeenCalledOnce();
    });

    it('shows shared loading indicators until the initial snapshot arrives', async () => {
        const pendingSnapshot = createPendingSnapshot();
        const remote = createRemote(baseSnapshot);
        remote.snapshot = vi.fn(() => pendingSnapshot.promise);
        const controller = new OpenAICodexController(remote);
        render(<CodexSettingsPanel controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);

        expectCoreThemeRoot(screen.getByTestId(TestId.OpenAICodex.Settings));
        expect(screen.getByTestId(TestId.OpenAICodex.Loading)).toBeTruthy();
        expect(screen.getByTestId(CoreTestId.Common.Loading)).toBeTruthy();
        pendingSnapshot.resolve(baseSnapshot);
        expect(await screen.findByRole('button', { name: 'Sign in with ChatGPT' })).toBeTruthy();
    });

    it('shows separate five-hour and weekly rings next to the Models button', async () => {
        const snapshot = {
            ...baseSnapshot,
            models: Array.from({ length: 7 }, (_, index) => ({
                id: `model-${index + 1}`,
                name: `Model ${index + 1}`,
                enabled: index < 3
            })),
            usageStatus: 'ready' as const,
            usageLimits: [
                { name: 'primary', usedPercent: 25, windowSeconds: 18_000, resetAt: Date.now() + 60_000 },
                { name: 'secondary', usedPercent: 31, windowSeconds: 604_800, resetAt: Date.now() + 86_400_000 }
            ]
        };
        const controller = new OpenAICodexController(createRemote(snapshot));
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);

        const modelsSummary = await screen.findByText('Models: 3/7 enabled');
        const usageStatus = screen.getByRole('status', { name: 'Codex usage' });
        const usageGroup = usageStatus.firstElementChild;
        const modelsSegments = modelsSummary.nextElementSibling;
        const usageIndicators = modelsSegments?.nextElementSibling;
        expect(usageStatus.className).toBeTruthy();
        expect(usageGroup?.className).toBeTruthy();
        expect(modelsSummary.className).toBeTruthy();
        expect(modelsSegments?.className).toBeTruthy();
        expect(modelsSegments?.children).toHaveLength(7);
        expect(modelsSegments?.querySelectorAll('[data-enabled="true"]')).toHaveLength(3);
        expect(usageIndicators?.className).toBeTruthy();
        expect(screen.getByRole('progressbar', { name: '5-hour limit: 75%' })).toBeTruthy();
        expect(screen.getByRole('progressbar', { name: 'Weekly limit: 69%' })).toBeTruthy();
    });

    it('shows only the authorization message beside the Models button when logged out', async () => {
        const controller = new OpenAICodexController(
            createRemote({
                ...baseSnapshot,
                loggedIn: false,
                usageStatus: 'ready',
                usageLimits: [{ name: 'primary', usedPercent: 25, windowSeconds: 18_000, resetAt: Date.now() + 60_000 }]
            })
        );
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);

        expect(await screen.findByText('Authorization required.')).toBeTruthy();
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.queryByText('Models: 2/2 enabled')).toBeNull();
    });

    it('opens the Codex panel when a snapshot has no models array', async () => {
        const snapshot = { ...baseSnapshot };
        Object.defineProperty(snapshot, 'models', { value: undefined });
        const remote = createRemote(snapshot);
        const controller = new OpenAICodexController(remote);
        render(<CodexModelsFooterEntry controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);

        fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));

        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Edit models' })).toBeNull();
    });

    it('opens the verification page after starting sign-in', async () => {
        const openWindow = window.open;
        const { remote } = renderSettings({ ...baseSnapshot, loggedIn: false });
        remote.startLogin = vi.fn(() => new Promise<OpenAICodexSnapshot>(() => undefined));
        await waitFor(() => expect(remote.snapshot).toHaveBeenCalled());

        fireEvent.click(await screen.findByRole('button', { name: 'Sign in with ChatGPT' }));

        expect(openWindow).toHaveBeenCalledWith('https://auth.openai.com/codex/device', '_blank', 'noopener,noreferrer');
        expect(remote.startLogin).toHaveBeenCalledOnce();
        expect(await screen.findByText('Working...')).toBeTruthy();
    });

    it('shows the device code, disables duplicate login, and reports clipboard success', async () => {
        const clipboard = { writeText: vi.fn(async () => undefined) };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
        const { remote, controller } = renderSettings({ ...baseSnapshot, loggedIn: false });
        await waitFor(() => expect(controller.getSnapshot().status).toBe('ready'));

        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));

        await waitFor(() => expect(remote.startLogin).toHaveBeenCalledOnce());
        expect((await screen.findByTestId(TestId.OpenAICodex.DeviceCode)).textContent).toBe('ABCD-EFGH');
        expect(screen.getByRole('button', { name: 'Sign in with ChatGPT' }).hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

        await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith('ABCD-EFGH'));
        expect((await screen.findByText('Copied')).getAttribute('role')).toBe('status');
        expect(remote.startLogin).toHaveBeenCalledOnce();
    });

    it('reports when browser clipboard access fails', async () => {
        const clipboard = { writeText: vi.fn(async () => Promise.reject(new Error('clipboard unavailable'))) };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
        const { controller } = renderSettings({ ...baseSnapshot, loggedIn: false });
        await waitFor(() => expect(controller.getSnapshot().status).toBe('ready'));

        fireEvent.click(screen.getByRole('button', { name: 'Sign in with ChatGPT' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Copy code' }));

        expect((await screen.findByRole('alert')).textContent).toBe('Could not copy the device code.');
    });

    it('shows an OAuth failure from the host snapshot', async () => {
        renderSettings({ ...baseSnapshot, status: 'error', error: 'authorization failed' });

        expect((await screen.findByRole('alert')).textContent).toContain('Could not start sign-in.');
    });

    it('shows sign-in placeholder instead of empty settings sections when logged out', async () => {
        renderSettings({ ...baseSnapshot, loggedIn: false });

        expect(await screen.findByText('Authorization required.')).toBeTruthy();
        expect(screen.queryByTestId(TestId.OpenAICodex.Usage)).toBeNull();
        expect(screen.queryByTestId(TestId.OpenAICodex.ResetCards)).toBeNull();
        expect(screen.queryByTestId(TestId.OpenAICodex.ProxyMode)).toBeNull();
    });

    it('traps keyboard focus in shared dialogs and closes them with Escape', async () => {
        renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));

        const closeButton = screen.getByRole('button', { name: 'Close' });
        expect(closeButton.getAttribute('aria-label')).toBe('Close');
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(screen.getByTestId(CoreTestId.Common.ModalBackdrop).hasAttribute('data-theme')).toBe(true);
        expect(document.activeElement).toBe(closeButton);
        cancelButton.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(closeButton);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')?.isConnected ?? false).toBe(false);
    });

    it('keeps model actions outside the scrollable dialog content', async () => {
        renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));

        const body = screen.getByTestId(TestId.OpenAICodex.ModalScrollBody);
        const footer = screen.getByTestId(TestId.OpenAICodex.ModalFooter);
        expect(body.parentElement).toBe(footer.parentElement);
        expect(body.contains(screen.getByRole('button', { name: 'Save' }))).toBe(false);
        expect(footer.contains(screen.getByRole('button', { name: 'Save' }))).toBe(true);
        expect(footer.contains(screen.getByRole('button', { name: 'Cancel' }))).toBe(true);
    });

    it('shows model save failures in the visible modal footer', async () => {
        const { remote } = renderSettings();
        remote.saveModels = vi.fn(async () => Promise.reject(new Error('save failed')));
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        const alert = await screen.findByRole('alert');
        expect(screen.getByTestId(TestId.OpenAICodex.ModalFooter).contains(alert)).toBe(true);
        expect(remote.saveModels).toHaveBeenCalledOnce();
    });

    it('clears a previous save error when retrying', async () => {
        const { remote } = renderSettings();
        let resolveRetry!: (snapshot: OpenAICodexSnapshot) => void;
        remote.saveModels = vi
            .fn()
            .mockRejectedValueOnce(new Error('save failed'))
            .mockImplementationOnce(() => new Promise(resolve => (resolveRetry = resolve)));
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await screen.findByRole('alert');

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.queryByRole('alert')).toBeNull();
        resolveRetry(baseSnapshot);
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(remote.saveModels).toHaveBeenCalledTimes(2);
    });

    it('reorders models and saves their order', async () => {
        const { remote } = renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move down: Model A' }));
        const saveButton = screen.getByRole('button', { name: 'Save' });
        expect(saveButton.classList.contains('dsh-btn-primary')).toBe(true);
        fireEvent.click(saveButton);

        await waitFor(() =>
            expect(remote.saveModels).toHaveBeenCalledWith([
                { id: 'model-b', name: 'Model B', enabled: true },
                { id: 'model-a', name: 'Model A', enabled: true }
            ])
        );
    });

    it('hides model editing when the model list is empty', async () => {
        renderSettings({ ...baseSnapshot, models: [] });

        expect(await screen.findByTestId(TestId.OpenAICodex.Settings)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Edit models' })).toBeNull();
    });

    it('rejects disabling every model before saving', async () => {
        const { remote } = renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled: Model A' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled: Model B' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect((await screen.findByRole('alert')).textContent).toContain('At least one must remain enabled.');
        expect(remote.saveModels).not.toHaveBeenCalled();
    });

    it('shows one chat quota ring and both detailed limits in its DSH panel', async () => {
        renderSettings({
            ...baseSnapshot,
            loggedIn: true,
            usageStatus: 'ready',
            usageLimited: true,
            usageLimits: [
                { name: 'primary', usedPercent: 25, windowSeconds: 18_000, resetAt: Date.now() + 60_000 },
                { name: 'secondary', usedPercent: 31, windowSeconds: 604_800, resetAt: Date.now() + 86_400_000 }
            ]
        });

        expect(await screen.findByText('Usage details are currently limited by the service.')).toBeTruthy();
        const quotaDock = screen.getByTestId(TestId.OpenAICodex.QuotaDock);
        expectCoreThemeRoot(quotaDock);
        expect(quotaDock.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe('primary: 75%');
        const tooltipTrigger = screen.getByRole('button', { name: 'Codex usage' });
        fireEvent.click(tooltipTrigger);
        expect(await screen.findAllByText('Usage details are currently limited by the service.')).toHaveLength(2);
        const quotaPanel = await screen.findByRole('dialog', { name: 'Codex usage' });
        expectCoreThemeRoot(quotaPanel);
        expect(quotaPanel.getAttribute('data-theme')).toBe(quotaDock.getAttribute('data-theme'));
        expect(screen.getByText('5-hour limit')).toBeTruthy();
        expect(screen.getByText('Weekly limit')).toBeTruthy();
    });

    it('reuses a persisted reset request after explicit confirmation', async () => {
        const request: ResetRequest = {
            creditId: 'credit-1',
            idempotencyKey: '00000000-0000-4000-8000-000000000000',
            confirmed: true
        };
        sessionStorage.setItem('dsh-openai-codex-auth.pending-reset-credit', request.creditId);
        sessionStorage.setItem('dsh-openai-codex-auth.pending-reset-request', request.idempotencyKey);
        const { remote } = renderSettings({
            ...baseSnapshot,
            loggedIn: true,
            resetCardsStatus: 'ready',
            resetCards: [{ id: request.creditId, expiresAt: 1_900_000_000 }]
        });

        fireEvent.click(await screen.findByRole('button', { name: 'Retry same reset' }));
        expect(screen.getByText(/affect its other sessions/).textContent).toContain('affect its other sessions');
        expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-label')).toBe('Close');
        fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));

        await waitFor(() => expect(remote.consumeReset).toHaveBeenCalledWith(request));
    });

    it('switches to the system proxy from the shared select', async () => {
        const { remote } = renderSettings();
        const trigger = await screen.findByRole('button', { name: 'Network route' });
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'Enter' });

        await waitFor(() => expect(remote.useSystemProxy).toHaveBeenCalledOnce());
    });
});
