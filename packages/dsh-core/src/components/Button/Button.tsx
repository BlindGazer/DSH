import type { ReactNode } from 'react';

import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';
import { Tooltip } from '../Tooltip/Tooltip.tsx';

/**
 * Свойства стандартной кнопки Button дизайн-системы @kalex/dsh-core.
 */
export interface ButtonProps {
    readonly children: ReactNode;
    readonly onClick?: () => void;
    readonly variant?: 'secondary' | 'primary' | 'danger';
    readonly size?: 'standard' | 'small' | 'md' | 'sm';
    readonly disabled?: boolean;
    readonly tooltip?: string;
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
    tooltip,
    className,
    type = 'button'
}: ButtonProps) {
    const button = (
        <button
            type={type}
            data-testid={TestId.Common.Button}
            disabled={disabled}
            onClick={onClick}
            className={cx(
                'dsh-btn',
                variant === 'primary' && 'dsh-btn-primary',
                variant === 'danger' && 'dsh-btn-danger',
                (size === 'sm' || size === 'small') && 'dsh-btn-sm ar-btn-sm',
                className
            )}>
            {children}
        </button>
    );
    return tooltip ? (
        <Tooltip content={tooltip} triggerElement="span" side="top">
            {button}
        </Tooltip>
    ) : (
        button
    );
}
