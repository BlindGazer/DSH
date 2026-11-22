import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';

/**
 * Свойства полосы загрузки ProgressBar.
 */
export interface ProgressBarProps {
    readonly className?: string;
}

/**
 * Горизонтальная полоса загрузки страницы или вкладки с тестовой меткой TestId.Common.Loading.
 */
export function ProgressBar({ className }: ProgressBarProps) {
    return <div data-testid={TestId.Common.Loading} className={cx('dsh-progress-bar', className)} />;
}
