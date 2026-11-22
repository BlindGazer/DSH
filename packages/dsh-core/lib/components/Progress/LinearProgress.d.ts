import { type DshProgressColor, type DshProgressSize } from './progressOptions.ts';
/** Свойства общего горизонтального индикатора прогресса DSH. */
export interface LinearProgressProps {
    /** Значение прогресса, ограничиваемое диапазоном 0-100. */
    readonly value: number;
    /** small подходит для статусной строки, standard - для моделей и настроек. */
    readonly size?: DshProgressSize;
    /** Цвет заливки: tertiary по умолчанию, DSH info для `accent` или произвольный CSS-цвет/токен. */
    readonly color?: DshProgressColor;
    readonly className?: string;
}
/** Горизонтальный индикатор DSH использует общий размер и цвет с CircularProgress. */
export declare function LinearProgress({ value, size, color, className }: LinearProgressProps): import("react").JSX.Element;
