export type DshProgressSize = 'small' | 'standard';

/** `default` и `accent` задают семантические цвета DSH, другие строки принимают CSS-цвет или `var(...)`. */
export type DshProgressColor = 'default' | 'accent' | (string & {});

/** Преобразует семантический выбор, сохраняя пользовательские CSS-цвета и токены темы. */
export function resolveDshProgressColor(color: DshProgressColor): string {
    if (!color || color === 'default') return 'var(--dsw-alias-label-tertiary)';
    if (color === 'accent') return 'var(--dsw-alias-button-info-fill)';
    return color;
}
