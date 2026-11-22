export type DshProgressSize = 'small' | 'standard';
/** `default` и `accent` задают семантические цвета DSH, другие строки принимают CSS-цвет или `var(...)`. */
export type DshProgressColor = 'default' | 'accent' | (string & {});
/** Преобразует семантический выбор, сохраняя пользовательские CSS-цвета и токены темы. */
export declare function resolveDshProgressColor(color: DshProgressColor): string;
