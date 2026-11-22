import type { ReactNode } from 'react';

import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';
import { Tooltip } from '../Tooltip/Tooltip.tsx';

/**
 * Свойства компактной иконочной кнопки IconButton.
 */
export interface IconButtonProps {
    readonly children: ReactNode;
    readonly size?: 'small' | 'standard';
    readonly variant?: 'neutral' | 'danger';
    readonly tooltip?: string;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
    readonly className?: string;
}

/**
 * Квадратная кнопка с иконкой. Без варианта сохраняет рамку и фон обычных элементов управления DSH.
 */
export function IconButton({ children, size = 'standard', variant, tooltip, onClick, disabled = false, className }: IconButtonProps) {
    const button = (
        <button
            type="button"
            data-testid={TestId.Common.IconButton}
            aria-label={tooltip}
            disabled={disabled}
            onClick={onClick}
            className={cx(
                'dsh-icon-btn',
                size === 'small' && 'dsh-icon-btn-sm',
                variant !== undefined && 'dsh-icon-btn-flat',
                variant === 'danger' && 'dsh-icon-btn-danger',
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
