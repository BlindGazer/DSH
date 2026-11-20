// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import { expect, it, vi } from 'vitest';

const ok = value => Promise.resolve({ ok: true, value });

it('renders the built OpenAI Hub settings footer through the DSH module loader', async () => {
    const registrations = new Map();
    const snapshot = { accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' };
    const wire = {
        snapshot: vi.fn(async () => ok(snapshot)),
        loadLoggingSettings: vi.fn(async () => ok({ enabled: false })),
        saveLoggingSettings: vi.fn(async input => ok(input)),
        recordClientLog: vi.fn(async () => ok(true)),
        startLogin: vi.fn(async () => ok(snapshot)),
        cancelLogin: vi.fn(async () => ok(snapshot)),
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
    let plugin;
    const modules = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime };
    const browser = {
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        __ModuleLoader__: {
            load({ factory }) {
                plugin = factory(name => {
                    if (!(name in modules)) throw new Error(`Unexpected runtime import: ${name}`);
                    return modules[name];
                });
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
    await plugin.apply({
        remote: { $mount: async () => () => {} },
        get: () => wire,
        modelDirectories,
        locale: { preference: 'en', register: () => () => {} },
        effect: callback => callback(),
        slots: {
            inject: (_name, callback) => {
                callback();
            },
            register: (options, component) => {
                registrations.set(`${options.name}:${options.id ?? ''}`, component);
                return () => registrations.delete(`${options.name}:${options.id ?? ''}`);
            }
        }
    });
    const footer = registrations.get('settings.models.footer:openai-hub-models');
    render(React.createElement(footer));
    expect(await screen.findByText('Add an account to OpenAI Hub')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add an account to OpenAI Hub' })).toBeTruthy();
    expect(wire.snapshot).toHaveBeenCalledOnce();
});
