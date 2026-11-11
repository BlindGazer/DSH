import type { DshLocaleCode, DshLocalePreference } from '@kalex/dsh-core';
import { type KeyValueStorage } from '@kalex/dsh-core/hooks/useLocalePreference.js';
export declare const ProxyRussianDictionary: Readonly<Record<string, string>>;
/**
 * Вычисляет активный язык интерфейса прокси ('en' или 'ru') с учетом выбора пользователя и языка DSH.
 */
export declare function resolveProxyLocale(choice?: DshLocalePreference | string, hostLocale?: string): DshLocaleCode;
/**
 * Читает сохраненный выбор языка прокси из хранилища.
 */
export declare function readSavedProxyLocale(storage?: KeyValueStorage): DshLocaleCode | undefined;
/**
 * Сохраняет выбранный пользователем язык прокси в хранилище.
 */
export declare function persistProxyLocale(storage: KeyValueStorage | undefined, locale: string): void;
/**
 * Переводит статические и шаблонные строки интерфейса прокси на выбранный язык.
 */
export declare function translateProxyText(value: string, locale?: DshLocaleCode): string;
