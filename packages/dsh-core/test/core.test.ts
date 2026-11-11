import { describe, expect, it } from 'vitest';
import {
    buildCoreThemeStyles,
    buildThemeCssVariables,
    CoreLocalization,
    cx,
    Delay,
    darkThemeTokens,
    detectHostTheme,
    extractHost,
    formatMessage,
    getDshTheme,
    lightThemeTokens,
    listDshThemes,
    persistLocale,
    readSavedLocale,
    registerDshTheme,
    resolveDshLocale,
    sanitizeHostInput,
    TestId
} from '../src/index.js';

describe('@kalex/dsh-core Design System and Utilities', () => {
    it('provides theme palettes and supports custom theme registration', () => {
        expect(getDshTheme('dark').baseMode).toBe('dark');
        expect(getDshTheme('light').baseMode).toBe('light');

        registerDshTheme({
            id: 'ocean-contrast',
            baseMode: 'dark',
            tokens: {
                ...darkThemeTokens,
                accent: '#06b6d4',
                surface: '#0f172a'
            }
        });
        expect(getDshTheme('ocean-contrast').tokens.accent).toBe('#06b6d4');
        expect(listDshThemes().some(t => t.id === 'ocean-contrast')).toBe(true);

        const cssVars = buildThemeCssVariables(lightThemeTokens, { accent: '#7c3aed' });
        expect(cssVars).toContain('--dsh-ui-accent:#7c3aed');
        expect(cssVars).toContain('--dsh-ui-text:#0f1115');

        const fullCss = buildCoreThemeStyles();
        expect(fullCss).toContain('.ar-root');
        expect(fullCss).toContain('[data-theme="light"]');
        expect(fullCss).toContain('[data-theme="ocean-contrast"]');
        expect(fullCss).toContain('--dsh-ui-success:#34d399');
        expect(fullCss).toContain('--dsh-ui-focus-ring:');
        expect(fullCss).toContain('--dsh-ui-danger:');
    });

    it('detects host theme correctly', () => {
        expect(detectHostTheme(undefined)).toBe('dark');
    });

    it('formats messages and handles localization preferences', () => {
        expect(formatMessage('Агентство {0} заблокировано ({1})', 'Альфа', 2)).toBe('Агентство Альфа заблокировано (2)');
        expect(resolveDshLocale('ru', 'en-US')).toBe('ru');
        expect(resolveDshLocale('auto', 'ru-RU')).toBe('ru');
        expect(resolveDshLocale('auto', 'zh-CN')).toBe('en');
        expect(CoreLocalization.ru.Close).toBe('Закрыть');
        expect(CoreLocalization.en.Close).toBe('Close');

        const memoryStore = new Map<string, string>();
        const storageMock = {
            getItem: (key: string): string | undefined => memoryStore.get(key),
            setItem: (key: string, val: string): void => {
                memoryStore.set(key, val);
            }
        };
        persistLocale('test-locale-key', 'ru', storageMock);
        expect(readSavedLocale('test-locale-key', storageMock)).toBe('ru');
    });

    it('sanitizes hosts and exports common constants', () => {
        expect(cx('a', false, undefined, 'b')).toBe('a b');
        expect(sanitizeHostInput('https://Proxy.Corp.Local:8443/path')).toBe('proxy.corp.local');
        expect(extractHost('https://api.deepseek.com/v1/chat')).toBe('api.deepseek.com');
        expect(Delay.Animation).toBe(300);
        expect(TestId.Common.Loading).toBe('dsh-common-loading');
    });
});
