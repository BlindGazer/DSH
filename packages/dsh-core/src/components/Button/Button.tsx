import type { ReactNode } from 'react';

import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства стандартной кнопки Button дизайн-системы @kalex/dsh-core.
 */
export interface ButtonProps {
    readonly children: ReactNode;
    readonly onClick?: () => void;
    readonly variant?: 'secondary' | 'primary' | 'danger';
    readonly size?: 'md' | 'sm';
    readonly disabled?: boolean;
    readonly title?: string;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly type?: 'button' | 'submit';
}

/**
 * Кнопка управления в стилистике DSH с поддержкой вариантов оформления и размеров.
 */
export function Button({
    children,
    onClick,
    variant = 'secondary',
    size = 'md',
    disabled = false,
    title,
    ariaLabel,
    className,
    type = 'button'
}: ButtonProps) {
    return (
        <button
            type={type}
            data-testid={TestId.Common.Button}
            disabled={disabled}
            title={title}
            aria-label={ariaLabel}
            onClick={onClick}
            className={cx(
                'dsh-btn',
                variant === 'primary' && 'dsh-btn-primary',
                variant === 'danger' && 'dsh-btn-danger',
                size === 'sm' && 'dsh-btn-sm ar-btn-sm',
                className
            )}>
            {children}
        </button>
    );
}
