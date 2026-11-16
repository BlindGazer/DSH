// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import { expect, it, vi } from 'vitest';

it('renders the built Models footer through the DSH module loader', async () => {
    const registrations = new Map();
    const snapshot = {
        models: [],
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
    const remote = {
        snapshot: vi.fn(async () => snapshot),
        reportUiError: vi.fn(async () => true),
        reportUiReady: vi.fn(async () => true)
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
        get: () => remote,
        locale: { preference: 'en', register: () => () => {} },
        effect: callback => callback(),
        slots: {
            inject: (_name, callback) => callback(),
            register: (options, component) => {
                registrations.set(options.name, component);
                return () => registrations.delete(options.name);
            }
        }
    });

    render(React.createElement(registrations.get('settings.models.footer')));

    expect(await screen.findByText('Authorization required.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'OpenAI Codex' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in with ChatGPT' })).toBeTruthy();
});
