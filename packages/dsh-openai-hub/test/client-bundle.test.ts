// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fireEvent, render, screen } from '@testing-library/react';
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
}

it('renders the built OpenAI Hub settings footer through the DSH module loader', async () => {
    const registrations = new Map<string, React.ComponentType>();
    const snapshot = { accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' };
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
    const modelDirectories = {
        directoryFor: () => ({ store: { getSnapshot: () => ({}), subscribe: () => () => {} }, load: async () => ({}) })
    };
    const context = {
        remote: { $mount: async () => () => {} },
        get: () => wire,
        modelDirectories,
        locale: { preference: 'en', register: () => () => {} },
        effect: (callback: () => void) => callback(),
        slots: {
            inject: (_name: string, callback: () => void) => {
                callback();
            },
            register: (options: SlotOptions, component: React.ComponentType) => {
                registrations.set(`${options.name}:${options.id ?? ''}`, component);
                return () => registrations.delete(`${options.name}:${options.id ?? ''}`);
            }
        }
    };
    interface BundlePlugin {
        apply(value: typeof context): Promise<void>;
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
    await plugin.apply(context);
    const footer = registrations.get('settings.models.footer:openai-hub-models');
    if (!footer) throw new Error('OpenAI Hub footer did not register');
    render(React.createElement(footer));
    expect(await screen.findByText('Add an account to OpenAI Hub')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' }));
    expect(screen.getByTestId('dsh-modal-card').textContent).toContain('Add account');
    expect(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' })).toBeTruthy();
    expect(wire.snapshot).toHaveBeenCalledOnce();
});
