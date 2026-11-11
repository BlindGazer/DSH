import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства индикатора вращения Spinner.
 */
export interface SpinnerProps {
    readonly label?: string;
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}

/**
 * Компактный индикатор загрузки для кнопок, строк и списков.
 */
export function Spinner({ label = 'Loading...', markLoadingRoot = true, className }: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            data-testid={markLoadingRoot ? TestId.Common.Loading : undefined}
            className={cx('dsh-spinner', className)}
        />
    );
}
