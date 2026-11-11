import type { DshLocaleCode } from '../../models/DshContext.js';
/**
 * Словарь базовых локализованных подписей общих компонентов ядра.
 */
export interface CoreMessages {
    readonly Close: string;
    readonly Save: string;
    readonly Cancel: string;
    readonly Reset: string;
    readonly Loading: string;
    readonly InterfaceLanguage: string;
    readonly LanguageAuto: string;
    readonly LanguageEnglish: string;
    readonly LanguageRussian: string;
    readonly ThemeAuto: string;
    readonly ThemeDark: string;
    readonly ThemeLight: string;
}
/**
 * Базовые локализации для английского и русского языков.
 */
export declare const CoreLocalization: Record<DshLocaleCode, CoreMessages>;
