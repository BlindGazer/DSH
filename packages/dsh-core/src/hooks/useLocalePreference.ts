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
export function resolveDshLocale(choice?: DshLocalePreference, hostLocale?: string): DshLocaleCode {
    if (choice === 'ru' || choice === 'en') return choice;
    const rawHost = String(hostLocale || (typeof document !== 'undefined' ? document.documentElement?.lang : '') || '').toLowerCase();
    return rawHost.startsWith('ru') ? 'ru' : 'en';
}

/**
 * Читает сохраненный пользователем язык из хранилища по ключу плагина.
 */
export function readSavedLocale(storageKey: string, storage?: KeyValueStorage): DshLocaleCode | undefined {
    try {
        const target = storage ?? (typeof localStorage !== 'undefined' ? (localStorage as KeyValueStorage) : undefined);
        const saved = target?.getItem(storageKey);
        return saved === 'ru' || saved === 'en' ? saved : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Сохраняет выбранный пользователем язык в хранилище по ключу плагина.
 */
export function persistLocale(storageKey: string, locale: DshLocaleCode, storage?: KeyValueStorage): void {
    if (locale !== 'ru' && locale !== 'en') return;
    try {
        const target = storage ?? (typeof localStorage !== 'undefined' ? (localStorage as KeyValueStorage) : undefined);
        target?.setItem(storageKey, locale);
    } catch {
        // Игнорируем ошибки квоты или недоступности хранилища в изолированных окнах
    }
}
