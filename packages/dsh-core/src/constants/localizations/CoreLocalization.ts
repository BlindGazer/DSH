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
export const CoreLocalization: Record<DshLocaleCode, CoreMessages> = {
    en: {
        Close: 'Close',
        Save: 'Save',
        Cancel: 'Cancel',
        Reset: 'Reset',
        Loading: 'Loading...',
        InterfaceLanguage: 'Interface language',
        LanguageAuto: 'Automatic (DSH)',
        LanguageEnglish: 'English',
        LanguageRussian: 'Russian',
        ThemeAuto: 'Automatic (DSH)',
        ThemeDark: 'Dark',
        ThemeLight: 'Light'
    },
    ru: {
        Close: 'Закрыть',
        Save: 'Сохранить',
        Cancel: 'Отмена',
        Reset: 'Сбросить',
        Loading: 'Загрузка...',
        InterfaceLanguage: 'Язык интерфейса',
        LanguageAuto: 'Авто (DSH)',
        LanguageEnglish: 'Английский',
        LanguageRussian: 'Русский',
        ThemeAuto: 'Авто (DSH)',
        ThemeDark: 'Темная',
        ThemeLight: 'Светлая'
    }
};
