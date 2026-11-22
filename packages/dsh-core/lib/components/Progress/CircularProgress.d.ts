import { type DshProgressColor, type DshProgressSize } from './progressOptions.ts';
export interface CircularProgressProps {
    /** Значение прогресса, ограничиваемое диапазоном 0-100. */
    readonly value: number;
    /** Размер small подходит для статусной строки, standard - для списка моделей и настроек. */
    readonly size?: DshProgressSize;
    /** Цвет заливки: tertiary по умолчанию, DSH info для `accent` или произвольный CSS-цвет/токен. */
    readonly color?: DshProgressColor;
    readonly className?: string;
}
/** Кольцевой индикатор повторяет геометрию DSH 14px/2px при размере small. */
export declare function CircularProgress({ value, size, color, className }: CircularProgressProps): import("react").JSX.Element;
