import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';

/**
 * Свойства индикатора вращения Spinner.
 */
export interface SpinnerProps {
    readonly size?: 'small' | 'standard';
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}

/**
 * Компактный индикатор загрузки для кнопок, строк и списков.
 */
export function Spinner({ size = 'standard', markLoadingRoot = true, className }: SpinnerProps) {
    return (
        <span
            data-testid={markLoadingRoot ? TestId.Common.Loading : undefined}
            className={cx('dsh-spinner', size === 'small' && 'dsh-spinner-sm', className)}
            data-size={size}
        />
    );
}
