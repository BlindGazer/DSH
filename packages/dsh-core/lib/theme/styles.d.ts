export declare const coreStyleScopeClass: string | undefined;
/**
 * Формирует таблицу базовых стилей и переменных зарегистрированных тем.
 */
export declare function buildCoreThemeStyles(rootSelectors?: readonly string[]): string;
/**
 * Экземпляр базовой таблицы стилей темы по умолчанию.
 */
export declare const coreThemeStyles: string;
/**
 * Обновляет базовые стили в head при каждом вызове и после изменений реестра тем.
 */
export declare function ensureCoreStyles(styleId?: string, customCss?: string): void;
