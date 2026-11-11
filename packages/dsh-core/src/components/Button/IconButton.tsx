import type { ReactNode } from 'react';

import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства компактной иконочной кнопки IconButton.
 */
export interface IconButtonProps {
    readonly children: ReactNode;
    readonly ariaLabel: string;
    readonly title?: string;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
    readonly className?: string;
}

/**
 * Квадратная кнопка с иконкой фиксированной высоты (32px) вровень с выпадающими списками и кнопками DSH.
 */
export function IconButton({ children, ariaLabel, title, onClick, disabled = false, className }: IconButtonProps) {
    return (
        <button
            type="button"
            data-testid={TestId.Common.IconButton}
            aria-label={ariaLabel}
            title={title ?? ariaLabel}
            disabled={disabled}
            onClick={onClick}
            className={cx('dsh-icon-btn', className)}>
            {children}
        </button>
    );
}
