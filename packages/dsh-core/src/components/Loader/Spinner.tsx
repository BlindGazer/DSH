import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства индикатора вращения Spinner.
 */
export interface SpinnerProps {
    readonly label?: string;
    readonly size?: 'small' | 'standard';
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}

/**
 * Компактный индикатор загрузки для кнопок, строк и списков.
 */
export function Spinner({ label = 'Loading...', size = 'standard', markLoadingRoot = true, className }: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            data-testid={markLoadingRoot ? TestId.Common.Loading : undefined}
            className={cx('dsh-spinner', size === 'small' && 'dsh-spinner-sm', className)}
            data-size={size}
        />
    );
}
