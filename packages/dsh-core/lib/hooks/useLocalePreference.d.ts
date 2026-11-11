import type { DshLocaleCode, DshLocalePreference } from '../models/DshContext.js';
/**
 * Интерфейс хранилища настроек языка (совместимый с localStorage).
 */
export interface KeyValueStorage {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
}
/**
 * Вычисляет итоговый язык интерфейса ('en' или 'ru') на основе явного выбора и языка оболочки DSH.
 */
export declare function resolveDshLocale(choice?: DshLocalePreference, hostLocale?: string): DshLocaleCode;
/**
 * Читает сохраненный пользователем язык из хранилища по ключу плагина.
 */
export declare function readSavedLocale(storageKey: string, storage?: KeyValueStorage): DshLocaleCode | undefined;
/**
 * Сохраняет выбранный пользователем язык в хранилище по ключу плагина.
 */
export declare function persistLocale(storageKey: string, locale: DshLocaleCode, storage?: KeyValueStorage): void;
