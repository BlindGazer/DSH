import coreStyles from './coreStyles.module.scss';
import coreStyleText from './coreStyles.module.scss?inline';
import { buildThemeCssVariables, getDshTheme, listDshThemes, subscribeDshThemeChanges } from './palettes.js';

const CORE_STYLE_ELEMENT_ID = 'kalex-dsh-core-theme-styles';

export const coreStyleScopeClass = coreStyles.scope;

/**
 * Формирует таблицу базовых стилей и переменных зарегистрированных тем.
 */
export function buildCoreThemeStyles(
    rootSelectors: readonly string[] = [
        '.dsh-core-root',
        '.ar-root',
        '.ar-settings-root',
        '.kpp-root',
        '.kpp-card-bar',
        '.kpp-footer-row',
        '.kpp-modal-backdrop',
        '.kpp-locale-settings'
    ]
): string {
    const baseSelector = rootSelectors.join(',');
    const darkVars = buildThemeCssVariables(getDshTheme('dark').tokens);
    const lightSelectors = rootSelectors.map(sel => `${sel}[data-theme="light"]`).join(',');
    const lightVars = buildThemeCssVariables(getDshTheme('light').tokens);
    const customThemeRules = listDshThemes()
        .filter(theme => theme.id !== 'dark' && theme.id !== 'light')
        .map(theme => {
            const selectors = rootSelectors.map(selector => `${selector}[data-theme="${theme.id}"]`).join(',');
            return `${selectors}{${buildThemeCssVariables(theme.tokens)}}`;
        })
        .join('\n');

    return `${baseSelector}{${darkVars}}\n${lightSelectors}{${lightVars}}\n${customThemeRules}\n${coreStyleText}`;
}

/**
 * Экземпляр базовой таблицы стилей темы по умолчанию.
 */
export const coreThemeStyles: string = buildCoreThemeStyles();

const injectedCoreStyles = new Map<string, string | undefined>();
let themeChangesSubscribed = false;

function refreshInjectedCoreStyles(): void {
    if (typeof document === 'undefined') return;
    for (const [styleId, customCss] of injectedCoreStyles) {
        const styleEl = document.getElementById(styleId);
        if (styleEl) styleEl.textContent = customCss ? `${buildCoreThemeStyles()}\n${customCss}` : buildCoreThemeStyles();
    }
}

/**
 * Обновляет базовые стили в head при каждом вызове и после изменений реестра тем.
 */
export function ensureCoreStyles(styleId = CORE_STYLE_ELEMENT_ID, customCss?: string): void {
    if (typeof document === 'undefined' || !document.head) return;
    injectedCoreStyles.set(styleId, customCss);
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = customCss ? `${buildCoreThemeStyles()}\n${customCss}` : buildCoreThemeStyles();
    if (!themeChangesSubscribed) {
        subscribeDshThemeChanges(refreshInjectedCoreStyles);
        themeChangesSubscribed = true;
    }
}
