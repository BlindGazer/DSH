import { cx } from '../../utils/classNames.js';
import { Button, type ButtonProps } from './Button.js';

export interface CollectionAddButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {}

/** Отдельная точка добавления в коллекцию, а не обычная кнопка действия. */
export function CollectionAddButton({ children, className, ...props }: CollectionAddButtonProps) {
    return (
        <Button {...props} className={cx('dsh-collection-add-btn', className)}>
            <svg className="dsh-collection-add-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path d="M7 2v10M2 7h10" fill="none" stroke="currentColor" strokeWidth="1.25" />
            </svg>
            <span>{children}</span>
        </Button>
    );
}
