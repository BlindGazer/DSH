import type { DshThemeDefinition, DshThemeTokens } from '../models/ThemePalette.js';

/**
 * Стандартная темная палитра DSH с расширенными токенами состояний Google Material 3.
 */
export const darkThemeTokens: DshThemeTokens = {
    bgPage: 'transparent',
    bgModal: '#1b1b1e',
    surface: '#1c1c1f',
    elevated: '#242428',
    hover: '#2c2c31',
    active: '#35353b',
    border: 'rgba(255, 255, 255, 0.09)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    focusRing: 'rgba(59, 130, 246, 0.45)',
    text: '#f2f2f5',
    muted: '#a1a1aa',
    tertiary: '#71717a',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    onAccent: '#ffffff',
    primaryBg: '#f2f2f5',
    primaryFg: '#151517',
    switchOff: 'rgba(255, 255, 255, 0.24)',
    switchOn: '#f2f2f5',
    switchThumbOff: '#a1a1aa',
    switchThumbOn: '#151517',
    info: '#60a5fa',
    infoSoft: 'rgba(37, 99, 235, 0.16)',
    success: '#34d399',
    successSoft: 'rgba(16, 185, 129, 0.16)',
    warning: '#fbbf24',
    warningSoft: 'rgba(217, 119, 6, 0.16)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.12)',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    shadowElevated: '0 10px 28px rgba(0, 0, 0, 0.28)'
};

/**
 * Стандартная светлая палитра DSH с гарантированным контрастом текста в интерактивных состояниях.
 */
export const lightThemeTokens: DshThemeTokens = {
    bgPage: 'transparent',
    bgModal: '#ffffff',
    surface: '#ffffff',
    elevated: '#f4f4f5',
    hover: '#e4e4e7',
    active: '#d4d4d8',
    border: '#e4e4e7',
    borderStrong: '#d4d4d8',
    focusRing: 'rgba(37, 99, 235, 0.35)',
    text: '#0f1115',
    muted: '#52525b',
    tertiary: '#71717a',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    onAccent: '#ffffff',
    primaryBg: '#0f1115',
    primaryFg: '#ffffff',
    switchOff: '#d4d4d8',
    switchOn: '#0f1115',
    switchThumbOff: '#ffffff',
    switchThumbOn: '#ffffff',
    info: '#1d4ed8',
    infoSoft: 'rgba(37, 99, 235, 0.1)',
    success: '#047857',
    successSoft: 'rgba(5, 150, 105, 0.1)',
    warning: '#b45309',
    warningSoft: 'rgba(180, 83, 9, 0.1)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220, 38, 38, 0.1)',
    backdrop: 'rgba(0, 0, 0, 0.48)',
    shadowElevated: '0 10px 28px rgba(15, 17, 21, 0.14)'
};

const themeRegistry = new Map<string, DshThemeDefinition>([
    ['dark', { id: 'dark', baseMode: 'dark', tokens: darkThemeTokens }],
    ['light', { id: 'light', baseMode: 'light', tokens: lightThemeTokens }]
]);
const themeChangeListeners = new Set<() => void>();
let themeRevision = 0;

/** Возвращает версию реестра, используемую React-подписками на изменения тем. */
export function getDshThemeRevision(): number {
    return themeRevision;
}

/** Подписывает интерфейс на регистрацию или переопределение темы. */
export function subscribeDshThemeChanges(listener: () => void): () => void {
    themeChangeListeners.add(listener);
    return () => {
        themeChangeListeners.delete(listener);
    };
}

/**
 * Регистрирует новую или переопределенную тему в дизайн-системе.
 * Позволяет проектам расширять палитру без изменения базового кода компонентов.
 */
export function registerDshTheme(definition: DshThemeDefinition): void {
    themeRegistry.set(definition.id, definition);
    themeRevision += 1;
    themeChangeListeners.forEach(listener => {
        listener();
    });
}

/**
 * Возвращает определение темы по идентификатору (по умолчанию 'dark').
 */
export function getDshTheme(themeId: string): DshThemeDefinition {
    return themeRegistry.get(themeId) ?? { id: 'dark', baseMode: 'dark', tokens: darkThemeTokens };
}

/**
 * Возвращает список всех зарегистрированных тем.
 */
export function listDshThemes(): readonly DshThemeDefinition[] {
    return [...themeRegistry.values()];
}

const TOKEN_CSS_MAP: ReadonlyArray<readonly [keyof DshThemeTokens, string]> = [
    ['bgPage', '--dsh-ui-bg-page'],
    ['bgModal', '--dsh-ui-bg-modal'],
    ['surface', '--dsh-ui-surface'],
    ['elevated', '--dsh-ui-elevated'],
    ['hover', '--dsh-ui-hover'],
    ['active', '--dsh-ui-active'],
    ['border', '--dsh-ui-border'],
    ['borderStrong', '--dsh-ui-border-strong'],
    ['focusRing', '--dsh-ui-focus-ring'],
    ['text', '--dsh-ui-text'],
    ['muted', '--dsh-ui-muted'],
    ['tertiary', '--dsh-ui-tertiary'],
    ['accent', '--dsh-ui-accent'],
    ['accentHover', '--dsh-ui-accent-hover'],
    ['onAccent', '--dsh-ui-on-accent'],
    ['primaryBg', '--dsh-ui-primary-bg'],
    ['primaryFg', '--dsh-ui-primary-fg'],
    ['switchOff', '--dsh-ui-switch-off'],
    ['switchOn', '--dsh-ui-switch-on'],
    ['switchThumbOff', '--dsh-ui-switch-thumb-off'],
    ['switchThumbOn', '--dsh-ui-switch-thumb-on'],
    ['info', '--dsh-ui-info'],
    ['infoSoft', '--dsh-ui-info-soft'],
    ['success', '--dsh-ui-success'],
    ['successSoft', '--dsh-ui-success-soft'],
    ['warning', '--dsh-ui-warning'],
    ['warningSoft', '--dsh-ui-warning-soft'],
    ['danger', '--dsh-ui-danger'],
    ['dangerSoft', '--dsh-ui-danger-soft'],
    ['backdrop', '--dsh-ui-backdrop'],
    ['shadowElevated', '--dsh-ui-shadow-elevated']
];

/**
 * Формирует строку CSS-переменных (--dsh-ui-*) для переданной палитры и необязательных локальных переопределений.
 */
export function buildThemeCssVariables(tokens: DshThemeTokens, overrides?: Partial<DshThemeTokens>): string {
    const merged: DshThemeTokens = overrides ? { ...tokens, ...overrides } : tokens;
    return TOKEN_CSS_MAP.map(([key, cssVar]) => `${cssVar}:${merged[key]}`).join(';');
}
