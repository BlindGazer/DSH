import type { CSSProperties } from 'react';
import { cx } from '../../utils/classNames.ts';
import { type DshProgressColor, type DshProgressSize, resolveDshProgressColor } from './progressOptions.ts';

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
export function LinearProgress({ value, size = 'standard', color = 'accent', className }: LinearProgressProps) {
    const boundedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    return (
        <div
            className={cx('dsh-linear-progress', className)}
            data-size={size}
            style={
                {
                    '--dsh-progress-value': `${boundedValue}%`,
                    '--dsh-progress-color': resolveDshProgressColor(color)
                } as CSSProperties
            }
        />
    );
}
