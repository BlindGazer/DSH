// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { RouterView } from '../src/client/app/RouterView.tsx';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS } from '../src/shared/constants/constants.ts';
import { locales } from '../src/shared/constants/localizations/RouterUiLocalization.ts';

function selectTab(container: HTMLElement, title: string): HTMLButtonElement {
    const button = [...container.querySelectorAll<HTMLButtonElement>('.ar-tab-btn')].find(node => node.textContent?.startsWith(title));
    if (!button) throw new Error(`Missing tab: ${title}`);
    return button;
}

test('mounted Router keeps its tab, query, and historical point when DSH changes the injected language', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const now = new Date(2026, 0, 15, 15, 23, 45);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const fetchState = vi.fn(async () =>
        Response.json({
            sessionId: 'locale-session',
            rules: [],
            skills: [],
            areas: [],
            diagnostics: [],
            coverage: [],
            settings: DEFAULT_PROJECT_SETTINGS,
            globalSettings: DEFAULT_GLOBAL_SETTINGS,
            metrics: { estimatedTokens: 1234, tokenBudget: 32000, lastUpdated: now.getTime(), rules: { characters: 1234 } }
        })
    );
    vi.stubGlobal('fetch', fetchState);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const render = (language: 'en' | 'ru') =>
        act(async () => {
            const dictionary: Readonly<Record<string, string>> = locales[language];
            root.render(<RouterView sessionId="locale-session" locale={language} t={key => dictionary[key] ?? key} />);
        });
    try {
        await render('en');
        const point = container.querySelector('.ar-chart-point');
        expect(point).not.toBeNull();
        expect(container.querySelector('.ar-chart-labels span')?.textContent).toBe(now.toLocaleTimeString('en'));
        expect(container.querySelector<HTMLElement>('.ar-stack')?.style.gridTemplateColumns).toBe('1234fr 0fr 0fr 0fr');
        const requests = fetchState.mock.calls.length;
        await render('ru');
        expect(container.querySelectorAll('.ar-chart-point')).toHaveLength(1);
        expect(container.querySelector('.ar-chart-point')).toBe(point);
        expect(container.querySelector('.ar-chart-labels span')?.textContent).toBe(now.toLocaleTimeString('ru'));
        expect(fetchState).toHaveBeenCalledTimes(requests);

        const tab = selectTab(container, 'Правила и Skills');
        await act(async () => tab.click());
        const input = container.querySelector<HTMLInputElement>('.ar-rule-filter');
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (!input || !setValue) throw new Error('Missing rule filter');
        await act(async () => {
            setValue.call(input, 'keep this query');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await render('en');
        expect(selectTab(container, 'Rules and Skills')).toBe(tab);
        expect(tab.classList.contains('selected')).toBe(true);
        expect(container.querySelector('.ar-rule-filter')).toBe(input);
        expect(input.placeholder).toBe('Filter by filename or description...');
        expect(input.value).toBe('keep this query');
        expect(fetchState).toHaveBeenCalledTimes(requests);
    } finally {
        await act(async () => root.unmount());
        container.remove();
        clock.mockRestore();
        vi.unstubAllGlobals();
    }
});
