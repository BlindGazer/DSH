import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства полосы загрузки ProgressBar.
 */
export interface ProgressBarProps {
    readonly label?: string;
    readonly className?: string;
}

/**
 * Горизонтальная полоса загрузки страницы или вкладки с тестовой меткой TestId.Common.Loading.
 */
export function ProgressBar({ label = 'Loading...', className }: ProgressBarProps) {
    return <div role="progressbar" aria-label={label} data-testid={TestId.Common.Loading} className={cx('dsh-progress-bar', className)} />;
}
