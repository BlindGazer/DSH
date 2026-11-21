import { readFileSync } from 'node:fs';
import { preprocessCSS, resolveConfig } from 'vite';
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
        expect(styles).toMatch(/\.dsh-input\s*\{[^}]*box-sizing: border-box/);
        expect(styles).toContain('.dsh-core-root input[type="checkbox"]');
        expect(styles).toContain('accent-color: var(--dsw-alias-brand-primary)');
        expect(styles).toContain('position-try-fallbacks');
        expect(styles).not.toContain('.dsh-tooltip-content::after');
    });

    it('styles collection add actions with native DSH tokens and interaction states', () => {
        const styles = readFileSync(new URL('../src/theme/coreStyles.module.scss', import.meta.url), 'utf8');
        expect(styles).toMatch(/\.dsh-btn\.dsh-collection-add-btn\s*\{[^}]*min-height: 44px/);
        expect(styles).toContain('border: 1px dashed var(--dsw-alias-border-l3, var(--dsh-ui-border-strong))');
        expect(styles).toContain('border-radius: var(--dsw-radius-lg, 12px)');
        expect(styles).toContain('color: var(--dsw-alias-label-primary, var(--dsh-ui-text))');
        expect(styles).toContain('.dsh-collection-add-btn:hover:not(:disabled)');
        expect(styles).toContain('.dsh-collection-add-btn:active:not(:disabled)');
        expect(styles).toContain('.dsh-collection-add-btn:focus-visible');
        expect(styles).toContain('.dsh-collection-add-btn:disabled');
    });

    it('styles responsive radio cards with selected, focus and disabled states', () => {
        const styles = readFileSync(new URL('../src/theme/coreStyles.module.scss', import.meta.url), 'utf8');
        expect(styles).toContain('minmax(min(100%, 220px), 1fr)');
        expect(styles).toContain('.dsh-radio-card:has(input:checked)');
        expect(styles).toContain('.dsh-radio-card:has(input:focus-visible)');
        expect(styles).toContain('.dsh-radio-card:has(input:disabled)');
        expect(styles).toMatch(/\.dsh-radio-card\s*\{[^}]*min-height: 44px/);
        expect(styles).toContain('outline: 2px solid var(--dsh-ui-focus-ring)');
    });

    it('keeps the shared spinner circular, neutral and fixed-size inside native DSH surfaces', () => {
        const source = readFileSync(new URL('../src/theme/coreStyles.module.scss', import.meta.url), 'utf8');
        const spinner = /\.dsh-spinner\s*\{([^}]+)\}/.exec(source)?.[1] ?? '';
        expect(spinner).toContain('corner-shape: round');
        expect(spinner).toContain('border-radius: 50%');
        expect(spinner).toContain('box-sizing: border-box');
        expect(spinner).toContain('flex-shrink: 0');
        expect(spinner).toContain('width: 20px');
        expect(spinner).toContain('height: 20px');
        expect(spinner).toContain('var(--dsw-alias-border-l2, var(--dsh-ui-border-strong))');
        expect(spinner).toContain('var(--dsw-alias-label-tertiary, var(--dsh-ui-muted))');
        expect(spinner).not.toContain('accent');
        expect(spinner).toContain('animation: dsh-spin 0.8s linear infinite');
    });

    it('keeps global animation references bound to existing compiled keyframes', async () => {
        const source = readFileSync(new URL('../src/theme/coreStyles.module.scss', import.meta.url), 'utf8');
        const config = await resolveConfig({ configFile: false }, 'build');
        const { code: css } = await preprocessCSS(source, 'spinner-regression.module.scss', config);
        for (const name of ['dsh-spin', 'dsh-pulse']) {
            expect(css).toMatch(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
            expect(css).toMatch(new RegExp(`animation:[^;}]*\\b${name}\\b`));
        }
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
