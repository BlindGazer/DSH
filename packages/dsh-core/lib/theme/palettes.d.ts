import type { DshThemeDefinition, DshThemeTokens } from '../models/ThemePalette.js';
/**
 * Стандартная темная палитра DSH с расширенными токенами состояний Google Material 3.
 */
export declare const darkThemeTokens: DshThemeTokens;
/**
 * Стандартная светлая палитра DSH с гарантированным контрастом текста в интерактивных состояниях.
 */
export declare const lightThemeTokens: DshThemeTokens;
/** Возвращает версию реестра, используемую React-подписками на изменения тем. */
export declare function getDshThemeRevision(): number;
/** Подписывает интерфейс на регистрацию или переопределение темы. */
export declare function subscribeDshThemeChanges(listener: () => void): () => void;
/**
 * Регистрирует новую или переопределенную тему в дизайн-системе.
 * Позволяет проектам расширять палитру без изменения базового кода компонентов.
 */
export declare function registerDshTheme(definition: DshThemeDefinition): void;
/**
 * Возвращает определение темы по идентификатору (по умолчанию 'dark').
 */
export declare function getDshTheme(themeId: string): DshThemeDefinition;
/**
 * Возвращает список всех зарегистрированных тем.
 */
export declare function listDshThemes(): readonly DshThemeDefinition[];
/**
 * Формирует строку CSS-переменных (--dsh-ui-*) для переданной палитры и необязательных локальных переопределений.
 */
export declare function buildThemeCssVariables(tokens: DshThemeTokens, overrides?: Partial<DshThemeTokens>): string;
