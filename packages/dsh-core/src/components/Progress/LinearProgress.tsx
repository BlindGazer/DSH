import type { CSSProperties } from 'react';
import { cx } from '../../utils/classNames.js';
import { type DshProgressColor, type DshProgressSize, resolveDshProgressColor } from './progressOptions.js';

/** Свойства общего горизонтального индикатора прогресса DSH. */
export interface LinearProgressProps {
    /** Значение прогресса, ограничиваемое диапазоном 0-100. */
    readonly value: number;
    /** Доступное имя, описывающее назначение индикатора. */
    readonly label: string;
    /** small подходит для статусной строки, standard - для моделей и настроек. */
    readonly size?: DshProgressSize;
    /** Цвет заливки: tertiary по умолчанию, DSH info для `accent` или произвольный CSS-цвет/токен. */
    readonly color?: DshProgressColor;
    readonly className?: string;
    readonly title?: string;
}

/** Горизонтальный индикатор DSH использует общий размер и цвет с CircularProgress. */
export function LinearProgress({ value, label, size = 'standard', color = 'accent', className, title }: LinearProgressProps) {
    const boundedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    return (
        <div
            className={cx('dsh-linear-progress', className)}
            data-size={size}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={boundedValue}
            title={title}
            style={
                {
                    '--dsh-progress-value': `${boundedValue}%`,
                    '--dsh-progress-color': resolveDshProgressColor(color)
                } as CSSProperties
            }
        />
    );
}
