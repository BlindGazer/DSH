import type { DshLocaleSnapshot, DshLocalizedSlotProps, DshSlotRegistrationOptions } from '@kalex/dsh-core';
import { createElement, type JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { apply } from '../src/client/app/index.tsx';
import { proxyStore } from '../src/client/app/proxyStore.ts';

const originalSnapshot = proxyStore.snapshot;

afterEach(() => {
    proxyStore.publish(originalSnapshot);
    vi.unstubAllGlobals();
});

it('follows the shell instead of the former plugin setting without touching profiles or routes', async () => {
    const formerKey = '@kalex/dsh-proxy-provider/interface-language';
    const stored = new Map([[formerKey, 'ru']]);
    const getItem = vi.fn((key: string) => stored.get(key) ?? null);
    const setItem = vi.fn((key: string, value: string) => stored.set(key, value));
    const removeItem = vi.fn((key: string) => stored.delete(key));
    vi.stubGlobal('localStorage', { getItem, setItem, removeItem });

    const profiles = [{ id: 'test-proxy', name: 'Test Proxy', type: 'http', host: 'example.test', port: 8080 }];
    const providerBindings = { deepseek: 'test-proxy' };
    const routes = { 'api.deepseek.com': 'test-proxy' };
    const fetchState = vi.fn(async (url: string) =>
        Response.json(url.endsWith('/state') ? { ok: true, config: { profiles, providerBindings }, routes } : { ok: false })
    );
    vi.stubGlobal('fetch', fetchState);

    let snapshot: DshLocaleSnapshot = { active: 'en', revision: 0 };
    const effects: Array<() => void> = [];
    const listeners = new Set<() => void>();
    const dictionaries = new Map<string, Readonly<Record<string, string>>>();
    const slots: DshSlotRegistrationOptions[] = [];
    const translate = (key: string) => dictionaries.get(snapshot.active)?.[key] ?? key;
    interface ActionProps extends DshLocalizedSlotProps {
        subject: { pkg: { name: string } };
    }
    let Action: ((props: ActionProps) => JSX.Element | undefined) | undefined;

    try {
        apply({
            effect: setup => effects.push(setup()),
            locale: {
                register: (_namespace, locale, dictionary) => {
                    dictionaries.set(locale, dictionary);
                    return () => dictionaries.delete(locale);
                },
                bind: () => translate,
                subscribe: listener => {
                    listeners.add(listener);
                    return () => listeners.delete(listener);
                },
                getLocale: () => snapshot,
                getSnapshot: () => snapshot
            },
            slots: {
                inject: (_name, register) => {
                    const dispose = register();
                    if (typeof dispose === 'function') effects.push(dispose);
                },
                register: <Props,>(options: DshSlotRegistrationOptions, component: (props: Props) => JSX.Element | undefined) => {
                    slots.push(options);
                    if (options.name === 'plugins.detail.actions') Action = component as typeof Action;
                    return () => {};
                }
            }
        });
        await vi.waitFor(() => expect(proxyStore.snapshot.config.profiles).toEqual(profiles));
        const SettingsAction = Action;
        if (!SettingsAction) throw new Error('Missing Proxy settings action');
        const renderAction = () =>
            renderToString(
                createElement(SettingsAction, { subject: { pkg: { name: '@kalex/dsh-proxy-provider' } }, t: key => translate(key) })
            );

        const footerLabel = slots.find(slot => slot.name === 'settings.models.footer')?.label;
        if (typeof footerLabel !== 'function') throw new Error('Missing localized footer label');
        expect(listeners.size).toBe(0);
        expect(slots.some(slot => slot.name === 'plugins.bundle.config')).toBe(false);
        expect(footerLabel()).toBe('Proxy settings');
        expect(renderAction()).toContain('Proxy settings');
        expect(renderAction()).not.toContain('Interface language');

        snapshot = { active: 'ru', revision: 1 };
        for (const listener of listeners) listener();
        expect(footerLabel()).toBe('Настройки прокси');
        expect(renderAction()).toContain('Настройки прокси');
        expect(renderAction()).not.toContain('Язык интерфейса');

        snapshot = { active: 'en', revision: 2 };
        for (const listener of listeners) listener();
        expect(renderAction()).toContain('Proxy settings');
        expect(proxyStore.snapshot.config.profiles).toEqual(profiles);
        expect(proxyStore.snapshot.config.providerBindings).toEqual(providerBindings);
        expect(proxyStore.snapshot.routes).toEqual(routes);
        expect(fetchState.mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['session', 'state']);
        expect(getItem).not.toHaveBeenCalled();
        expect(setItem).not.toHaveBeenCalled();
        expect(removeItem).not.toHaveBeenCalled();
        expect(stored.get(formerKey)).toBe('ru');
    } finally {
        for (const dispose of effects.toReversed()) dispose();
    }
    expect(listeners.size).toBe(0);
    expect(dictionaries.size).toBe(0);
});
