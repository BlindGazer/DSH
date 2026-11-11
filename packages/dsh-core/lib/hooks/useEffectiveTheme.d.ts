import type { DshThemeId, DshThemeMode, DshThemePreference } from '../models/DshContext.js';
interface RefLike {
    readonly current: Element | null;
}
/**
 * Определяет активную тему оболочки DSH ('light' или 'dark') по DOM-атрибутам, классам и вычисленным цветам фона.
 */
export declare function detectHostTheme(anchorEl?: Element, ignoredSelector?: string): DshThemeMode;
/**
 * Реактивный хук получения активной темы ('dark', 'light' или зарегистрированной пользовательской темы)
 * с подпиской на изменения темы оболочки DSH.
 */
export declare function useEffectiveTheme(preference?: DshThemePreference, rootRef?: RefLike): DshThemeId;
export {};
