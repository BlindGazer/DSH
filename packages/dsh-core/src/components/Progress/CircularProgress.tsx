import type { CSSProperties } from 'react';
import { cx } from '../../utils/classNames.js';
import { type DshProgressColor, type DshProgressSize, resolveDshProgressColor } from './progressOptions.js';

export interface CircularProgressProps {
    /** Значение прогресса, ограничиваемое диапазоном 0-100. */
    readonly value: number;
    /** Доступное имя, описывающее назначение кольца. */
    readonly label: string;
    /** Размер small подходит для статусной строки, standard - для списка моделей и настроек. */
    readonly size?: DshProgressSize;
    /** Цвет заливки: tertiary по умолчанию, DSH info для `accent` или произвольный CSS-цвет/токен. */
    readonly color?: DshProgressColor;
    readonly className?: string;
    readonly title?: string;
}

/** Кольцевой индикатор повторяет геометрию DSH 14px/2px при размере small. */
export function CircularProgress({ value, label, size = 'standard', color = 'default', className, title }: CircularProgressProps) {
    const boundedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    const diameter = size === 'small' ? 14 : 20;
    const center = diameter / 2;
    const strokeWidth = size === 'small' ? 2 : 2.5;
    const radius = size === 'small' ? 5.5 : center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <svg
            className={cx('dsh-circular-progress', className)}
            data-size={size}
            viewBox={`0 0 ${diameter} ${diameter}`}
            width={diameter}
            height={diameter}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={boundedValue}
            style={{ '--dsh-progress-color': resolveDshProgressColor(color) } as CSSProperties}>
            <title>{title ?? label}</title>
            <circle className="dsh-circular-progress-track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
            <circle
                className="dsh-circular-progress-fill"
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${(circumference * boundedValue) / 100} ${circumference}`}
                transform={`rotate(-90 ${center} ${center})`}
            />
        </svg>
    );
}
