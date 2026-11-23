// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import type { DshTranslate } from '@kalex/dsh-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import { expect, it, vi } from 'vitest';

const ok = <T>(value: T) => Promise.resolve({ ok: true, value });

const modules = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime };

function resolveRuntime(name: string) {
    if (name === 'react' || name === 'react-dom' || name === 'react/jsx-runtime') return modules[name];
    throw new Error(`Unexpected runtime import: ${name}`);
}

interface SlotOptions {
    readonly name: string;
    readonly id?: string;
    readonly locale: string;
}

it('relocalizes the built, open OpenAI Hub footer, quota and settings without fetching again', async () => {
    const registrations = new Map<
        string,
        { options: SlotOptions; component: React.ComponentType<{ t: DshTranslate; sessionId?: string }> }
    >();
    const dictionaries = new Map<string, Readonly<Record<string, string>>>();
    const disposers: (() => void)[] = [];
    let active = 'en';
    const bind =
        (namespace: string): DshTranslate =>
        (key, params) => {
            const message = dictionaries.get(`${namespace}:${active}`)?.[key] ?? dictionaries.get(`${namespace}:en`)?.[key] ?? key;
            return message.replace(/\{(\w+)\}/g, (match, name: string) => String(params?.[name] ?? match));
        };
    const resetAt = Date.UTC(2030, 2, 23, 14, 35);
    const expiresAt = Date.UTC(2030, 4, 30, 11, 45);
    const snapshot = {
        accounts: [
            {
                accountLabel: 'work',
                authMethod: 'device-code',
                autoRefreshLimits: false,
                loggedIn: true,
                expiresAt: 0,
                models: [{ id: 'model', name: 'Model', enabled: true }],
                catalogStatus: 'ready',
                catalogError: '',
                usageStatus: 'ready',
                usageLimited: false,
                usageLimits: [{ name: 'Codex', usedPercent: 10, windowSeconds: 18000, resetAt }],
                usageCredits: '1234.5',
                usageCreditsUnlimited: false,
                usageResetCredits: 1,
                resetCards: [{ id: 'card', expiresAt }],
                resetCardsStatus: 'ready',
                usageUpdatedAt: Date.now(),
                usageError: ''
            }
        ],
        status: 'idle',
        deviceCode: '',
        verificationUri: '',
        error: ''
    };
    const wire = {
        snapshot: vi.fn(async () => ok(snapshot)),
        loadLoggingSettings: vi.fn(async () => ok({ enabled: false })),
        saveLoggingSettings: vi.fn(async (input: { enabled: boolean }) => ok(input)),
        recordClientLog: vi.fn(async () => ok(true)),
        startLogin: vi.fn(async () => ok(snapshot)),
        cancelLogin: vi.fn(async () => ok(snapshot)),
        retryLogin: vi.fn(async () => ok(snapshot)),
        updateAccount: vi.fn(async () => ok(snapshot)),
        deleteAccount: vi.fn(async () => ok(snapshot)),
        refreshCatalog: vi.fn(async () => ok(snapshot)),
        refreshUsage: vi.fn(async () => ok(snapshot)),
        saveModels: vi.fn(async () => ok(snapshot)),
        consumeReset: vi.fn(async () => ok(snapshot)),
        reportUiError: vi.fn(async () => ok(true)),
        reportUiReady: vi.fn(async () => ok(true))
    };
    const selection = { current: { provider: 'openai-hub', model: 'work/model' }, routable: true };
    const modelDirectories = {
        directoryFor: () => ({ store: { getSnapshot: () => selection, subscribe: () => () => {} }, load: vi.fn(async () => selection) })
    };
    const context = {
        remote: { $mount: async () => () => {} },
        get: () => wire,
        modelDirectories,
        locale: {
            preference: 'en',
            getSnapshot: () => ({ active }),
            register(namespace: string, language: string, dictionary: Readonly<Record<string, string>>) {
                const id = `${namespace}:${language}`;
                dictionaries.set(id, dictionary);
                return () => {
                    dictionaries.delete(id);
                };
            },
            bind
        },
        effect: (callback: () => () => void) => disposers.push(callback()),
        slots: {
            inject: (_name: string, callback: () => void) => {
                callback();
            },
            register: (options: SlotOptions, component: React.ComponentType<{ t: DshTranslate; sessionId?: string }>) => {
                registrations.set(`${options.name}:${options.id ?? ''}`, { options, component });
                return () => registrations.delete(`${options.name}:${options.id ?? ''}`);
            }
        }
    };
    interface BundlePlugin {
        apply(value: typeof context): Promise<() => Promise<void>>;
    }
    let plugin: BundlePlugin | undefined;
    const browser = {
        addEventListener: window.addEventListener.bind(window),
        removeEventListener: window.removeEventListener.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        __ModuleLoader__: {
            load({ factory }: { factory: (resolve: typeof resolveRuntime) => BundlePlugin }) {
                plugin = factory(resolveRuntime);
            }
        }
    };
    runInNewContext(readFileSync(resolve(import.meta.dirname, '../lib/client.js'), 'utf8'), {
        window: browser,
        console,
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        queueMicrotask,
        document,
        navigator,
        HTMLElement
    });
    if (!plugin) throw new Error('OpenAI Hub bundle did not register');
    const dispose = await plugin.apply(context);
    try {
        const footer = registrations.get('settings.models.footer:openai-hub-models');
        const quota = registrations.get('conversation.composer.dock:openai-hub-quota');
        if (!footer || !quota) throw new Error('OpenAI Hub slots did not register');
        const view = () =>
            React.createElement(
                React.Fragment,
                undefined,
                React.createElement(footer.component, { t: (key, params) => bind(footer.options.locale)(key, params) }),
                React.createElement(quota.component, { sessionId: 'session', t: (key, params) => bind(quota.options.locale)(key, params) })
            );
        const { rerender } = render(view());
        const summary = await screen.findByText('Models: 1/1 enabled');
        const row = screen.getByTestId('openai-hub-models-footer-work');
        const settingsButton = [...row.querySelectorAll('button')].find(button => !button.hasAttribute('data-checked'));
        if (!settingsButton) throw new Error('Account settings button missing');
        fireEvent.click(settingsButton);
        const settings = screen.getByTestId('dsh-modal-card');
        const quotaRoot = await screen.findByTestId('openai-hub-quota-dock');
        fireEvent.click(within(quotaRoot).getByRole('button'));
        const quotaDetails = screen.getAllByText('5-hour limit').find(node => !settings.contains(node));
        expect(quotaDetails).toBeDefined();
        const reset = within(settings).getByText(/Resets in/);
        fireEvent.pointerEnter(reset);
        const resetTooltip = await screen.findByText(new Date(resetAt).toLocaleString('en'));
        const close = within(settings).getByRole('button', { name: 'Close' });
        expect(settings.textContent).toContain(new Date(expiresAt).toLocaleString('en'));
        expect(settings.textContent).toContain(new Intl.NumberFormat('en').format(1234.5));
        const calls = () => Object.values(wire).map(endpoint => endpoint.mock.calls.length);
        const before = calls();

        active = 'ru';
        rerender(view());
        expect(screen.getByTestId('dsh-modal-card')).toBe(settings);
        expect(within(settings).getByRole('button', { name: 'Закрыть' })).toBe(close);
        expect(summary.textContent).toBe('Модели: 1/1');
        expect(quotaDetails?.textContent).toBe('Лимит на 5 часов');
        expect(settings.textContent).toContain(new Date(expiresAt).toLocaleString('ru'));
        expect(settings.textContent).toContain(new Intl.NumberFormat('ru').format(1234.5));
        expect(resetTooltip.textContent).toBe(new Date(resetAt).toLocaleString('ru'));
        expect(within(quotaRoot).getByRole('button').textContent).toContain(new Intl.NumberFormat('ru', { style: 'percent' }).format(0.9));
        expect(calls()).toStrictEqual(before);

        active = 'en';
        rerender(view());
        expect(within(settings).getByRole('button', { name: 'Close' })).toBe(close);
        expect(summary.textContent).toBe('Models: 1/1 enabled');
        expect(quotaDetails?.textContent).toBe('5-hour limit');
        expect(calls()).toStrictEqual(before);
    } finally {
        cleanup();
        for (const teardown of disposers.toReversed()) teardown();
        await dispose();
    }
    expect(dictionaries.size).toBe(0);
});
