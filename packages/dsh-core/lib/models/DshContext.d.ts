import type { JSX } from 'react/jsx-runtime';
/**
 * Поддерживаемые коды языков интерфейса плагинов DSH.
 */
export type DshLocaleCode = 'en' | 'ru';
/**
 * Настройка выбора языка (автоматически от хоста DSH или фиксированный код).
 */
export type DshLocalePreference = 'auto' | DshLocaleCode;
/**
 * Базовые цветовые режимы темы интерфейса.
 */
export type DshThemeMode = 'dark' | 'light';
/**
 * Идентификатор темы (встроенные 'dark' | 'light' или имя зарегистрированной пользовательской темы).
 */
export type DshThemeId = DshThemeMode | string;
/**
 * Настройка темы (автоматическое определение темы DSH или явный идентификатор темы).
 */
export type DshThemePreference = 'auto' | DshThemeId;
/**
 * Параметры регистрации UI-компонента в слоте оболочки DSH.
 */
export interface DshSlotRegistrationOptions {
    readonly name: string;
    readonly id?: string;
    readonly key?: string;
    readonly order?: number;
    readonly label?: string | (() => string);
    readonly inject?: (sessionId: string) => Record<string, string | undefined>;
}
/**
 * Контракт сервиса слотов клиентского интерфейса DSH.
 */
export interface DshSlotsService {
    inject(slotName: string, callback: () => void): void;
    register<TProps = Record<string, string | undefined>>(options: DshSlotRegistrationOptions, component: (props: TProps) => JSX.Element | undefined): () => void;
}
/**
 * Контракт сервиса локализации клиентского интерфейса DSH.
 */
export interface DshLocaleService {
    readonly preference?: string;
}
/**
 * Контекст клиентского плагина DSH, передаваемый в функцию apply(ctx).
 */
export interface DshClientContext {
    readonly slots: DshSlotsService;
    readonly locale?: DshLocaleService;
}
