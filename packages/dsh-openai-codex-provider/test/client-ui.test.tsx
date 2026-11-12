// @vitest-environment jsdom

import { TestId as CoreTestId } from '@kalex/dsh-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
        saveModels: vi.fn(async (_models: ModelSettings) => snapshot)
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

function renderSettings(snapshot: OpenAICodexSnapshot = baseSnapshot) {
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
});

describe('Codex settings UI', () => {
    it('shows shared loading indicators until the initial snapshot arrives', async () => {
        const pendingSnapshot = createPendingSnapshot();
        const remote = createRemote(baseSnapshot);
        remote.snapshot = vi.fn(() => pendingSnapshot.promise);
        const controller = new OpenAICodexController(remote);
        render(<CodexSettingsPanel controller={controller} locale="en" text={key => translateOpenAICodex('en', key)} />);

        expect(screen.getByTestId(TestId.OpenAICodex.Loading)).toBeTruthy();
        expect(screen.getByTestId(CoreTestId.Common.Loading)).toBeTruthy();
        pendingSnapshot.resolve(baseSnapshot);
        expect(await screen.findByRole('button', { name: 'Sign in with ChatGPT' })).toBeTruthy();
    });

    it('shows the device code, disables duplicate login, and reports clipboard success', async () => {
        const clipboard = { writeText: vi.fn(async () => undefined) };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
        const { remote } = renderSettings();

        fireEvent.click(await screen.findByRole('button', { name: 'Sign in with ChatGPT' }));

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
        renderSettings();

        fireEvent.click(await screen.findByRole('button', { name: 'Sign in with ChatGPT' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Copy code' }));

        expect((await screen.findByRole('alert')).textContent).toBe('Could not copy the device code.');
    });

    it('shows an OAuth failure from the host snapshot', async () => {
        renderSettings({ ...baseSnapshot, status: 'error', error: 'authorization failed' });

        expect((await screen.findByRole('alert')).textContent).toContain('Could not start sign-in.');
    });

    it('traps keyboard focus in shared dialogs and closes them with Escape', async () => {
        renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));

        const closeButton = screen.getByRole('button', { name: 'Close' });
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(screen.getByTestId(CoreTestId.Common.ModalBackdrop).hasAttribute('data-theme')).toBe(false);
        expect(document.activeElement).toBe(closeButton);
        cancelButton.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(closeButton);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')?.isConnected ?? false).toBe(false);
    });

    it('reorders models and saves their order', async () => {
        const { remote } = renderSettings();
        fireEvent.click(await screen.findByRole('button', { name: 'Edit models' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move down: Model A' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(remote.saveModels).toHaveBeenCalledWith([
                { id: 'model-b', name: 'Model B', enabled: true },
                { id: 'model-a', name: 'Model A', enabled: true }
            ])
        );
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

    it('shows limited usage in both the settings card and the quota dock', async () => {
        renderSettings({ ...baseSnapshot, loggedIn: true, usageStatus: 'ready', usageLimited: true });

        expect(await screen.findAllByText('Usage details are currently limited by the service.')).toHaveLength(2);
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
