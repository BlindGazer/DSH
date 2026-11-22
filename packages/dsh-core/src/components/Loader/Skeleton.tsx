import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';

/**
 * Свойства скелетона загрузки Skeleton.
 */
export interface SkeletonProps {
    readonly width?: string | number;
    readonly height?: string | number;
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}

/**
 * Скелетон поля, кнопки или карточки для сохранения структуры разметки во время загрузки данных.
 */
export function Skeleton({ width = '100%', height = 32, markLoadingRoot = true, className }: SkeletonProps) {
    return (
        <div
            data-testid={markLoadingRoot ? TestId.Common.Loading : undefined}
            style={{ width, height }}
            className={cx('dsh-skeleton', className)}
        />
    );
}
