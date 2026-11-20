import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { darkThemeTokens, ensureCoreStyles, registerDshTheme } from '../src/index.js';

interface FakeStyleElement {
    id: string;
    textContent: string;
}

interface FakeDocument {
    readonly head: {
        appendChild: (element: FakeStyleElement) => void;
    };
    createElement: (tagName: string) => FakeStyleElement;
    getElementById: (id: string) => FakeStyleElement | undefined;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('@kalex/dsh-core injected theme styles', () => {
    it('matches native DSH surfaces and progress colors without a tooltip arrow', () => {
        const styles = readFileSync(new URL('../src/theme/coreStyles.module.scss', import.meta.url), 'utf8');
        expect(styles).toContain('var(--dsw-specific-menu)');
        expect(styles).toContain('var(--dsw-radius-lg)');
        expect(styles).toContain('var(--dsw-alias-label-tertiary)');
        expect(styles).toContain('var(--dsw-alias-border-l3)');
        expect(styles).toContain('.dsh-core-root input[type="checkbox"]');
        expect(styles).toContain('accent-color: var(--dsw-alias-brand-primary)');
        expect(styles).toContain('position-try-fallbacks');
        expect(styles).not.toContain('.dsh-tooltip-content::after');
    });

    it('refreshes already injected CSS when a registered theme changes', () => {
        const elements = new Map<string, FakeStyleElement>();
        const fakeDocument: FakeDocument = {
            head: {
                appendChild: element => elements.set(element.id, element)
            },
            createElement: () => ({ id: '', textContent: '' }),
            getElementById: id => elements.get(id)
        };
        vi.stubGlobal('document', fakeDocument);
        const styleId = 'theme-refresh-test-styles';
        const themeId = 'theme-refresh-test';

        ensureCoreStyles(styleId, '.local-style { color: red; }');
        const injectedStyle = elements.get(styleId);
        expect(injectedStyle?.textContent).toContain('.local-style { color: red; }');

        registerDshTheme({ id: themeId, baseMode: 'dark', tokens: { ...darkThemeTokens, accent: '#a855f7' } });

        expect(injectedStyle?.textContent).toContain(`[data-theme="${themeId}"]`);
        expect(injectedStyle?.textContent).toContain('--dsh-ui-accent:#a855f7');
        expect(injectedStyle?.textContent).toContain('.local-style { color: red; }');
    });
});
