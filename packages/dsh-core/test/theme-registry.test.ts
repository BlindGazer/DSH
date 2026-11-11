import { describe, expect, it } from 'vitest';
import { buildCoreThemeStyles, darkThemeTokens, getDshThemeRevision, registerDshTheme, subscribeDshThemeChanges } from '../src/index.js';

describe('@kalex/dsh-core theme registry', () => {
    it('notifies subscribers and rebuilds styles when a registered theme is replaced', () => {
        const themeId = 'theme-revision-test';
        registerDshTheme({ id: themeId, baseMode: 'dark', tokens: darkThemeTokens });
        const initialRevision = getDshThemeRevision();
        let notifications = 0;
        const unsubscribe = subscribeDshThemeChanges(() => {
            notifications += 1;
        });

        registerDshTheme({ id: themeId, baseMode: 'dark', tokens: { ...darkThemeTokens, accent: '#a855f7' } });
        registerDshTheme({ id: 'dark', baseMode: 'dark', tokens: { ...darkThemeTokens, accent: '#14b8a6' } });
        unsubscribe();

        expect(notifications).toBe(2);
        expect(getDshThemeRevision()).toBe(initialRevision + 2);
        expect(buildCoreThemeStyles()).toContain(`[data-theme="${themeId}"]`);
        expect(buildCoreThemeStyles()).toContain('--dsh-ui-accent:#a855f7');
        expect(buildCoreThemeStyles()).toContain('--dsh-ui-accent:#14b8a6');
        registerDshTheme({ id: 'dark', baseMode: 'dark', tokens: darkThemeTokens });
    });
});
