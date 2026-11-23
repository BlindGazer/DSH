// @vitest-environment jsdom
import type { DshTranslate } from '@kalex/dsh-core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { proxyStore } from '../src/client/app/proxyStore.ts';
import { ModelsFooterProxyEntry } from '../src/client/features/settings-modal/components/ModelsFooterProxyEntry.tsx';
import { proxyDictionaries } from '../src/shared/constants/localizations/ProxyLocalization.ts';

it('updates the summary and open editor without remounting the draft input', async () => {
    const previous = proxyStore.snapshot;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const refresh = vi.spyOn(proxyStore, 'refresh').mockResolvedValue(undefined);
    const render = (active: 'en' | 'ru') => {
        const dictionary: Readonly<Record<string, string>> = proxyDictionaries[active];
        const t: DshTranslate = (key, params) =>
            (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) => String(params?.[name] ?? match));
        return act(() => root.render(<ModelsFooterProxyEntry t={t} active={active} />));
    };
    const button = (label: string) => {
        const match = Array.from(host.querySelectorAll('button')).find(node => node.textContent?.trim() === label);
        if (!match) throw new Error(`Missing button: ${label}`);
        return match;
    };
    try {
        proxyStore.publish({
            config: {
                ...previous.config,
                profiles: Array.from({ length: 1234 }, (_, i) => ({
                    id: `proxy-${i}`,
                    name: `Proxy ${i}`,
                    protocol: 'http',
                    host: 'example.test',
                    port: 8080,
                    auth: { enabled: false, hasCredentials: false, usernameMask: '' },
                    ignoreSslErrors: false
                })),
                providerBindings: { example: 'proxy-0' }
            },
            modalOpen: false
        });
        await render('en');
        expect(host.textContent).toContain('1,234 profile(s); 1 proxied provider(s)');
        await act(() => button('Proxy settings').click());
        await act(() => button('+ Add Profile').click());
        const input = host.querySelector<HTMLInputElement>('input[placeholder="e.g. Corporate Proxy"]');
        if (!input) throw new Error('Missing draft input');
        const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        await act(() => {
            value?.set?.call(input, 'Unsaved proxy');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const calls = refresh.mock.calls.length;
        await render('ru');
        expect(host.textContent).toContain('Профилей: 1\u00a0234; провайдеров через прокси: 1');
        expect(host.textContent).toContain('Создать профиль прокси');
        expect(host.querySelector('input[placeholder="Например, корпоративный прокси"]')).toBe(input);
        expect(input.value).toBe('Unsaved proxy');
        await render('en');
        expect(input.value).toBe('Unsaved proxy');
        expect(refresh).toHaveBeenCalledTimes(calls);
    } finally {
        await act(() => root.unmount());
        proxyStore.publish(previous);
        host.remove();
        refresh.mockRestore();
        vi.unstubAllGlobals();
    }
});
