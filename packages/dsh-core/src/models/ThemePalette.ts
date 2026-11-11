import type { DshThemeMode } from './DshContext.js';

/**
 * Набор дизайн-токенов цветовой палитры, объединяющий стилистику DSH и Google Material Design 3.
 */
export interface DshThemeTokens {
    readonly bgPage: string;
    readonly bgModal: string;
    readonly surface: string;
    readonly elevated: string;
    readonly hover: string;
    readonly active: string;
    readonly border: string;
    readonly borderStrong: string;
    readonly focusRing: string;
    readonly text: string;
    readonly muted: string;
    readonly tertiary: string;
    readonly accent: string;
    readonly accentHover: string;
    readonly onAccent: string;
    readonly primaryBg: string;
    readonly primaryFg: string;
    readonly switchOff: string;
    readonly switchOn: string;
    readonly switchThumbOff: string;
    readonly switchThumbOn: string;
    readonly info: string;
    readonly infoSoft: string;
    readonly success: string;
    readonly successSoft: string;
    readonly warning: string;
    readonly warningSoft: string;
    readonly danger: string;
    readonly dangerSoft: string;
    readonly backdrop: string;
    readonly shadowElevated: string;
}

/**
 * Описание темы в реестре дизайн-системы @kalex/dsh-core.
 */
export interface DshThemeDefinition {
    readonly id: string;
    readonly baseMode: DshThemeMode;
    readonly tokens: DshThemeTokens;
}
