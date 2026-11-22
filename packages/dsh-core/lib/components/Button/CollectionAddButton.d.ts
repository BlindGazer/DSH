import { type ButtonProps } from './Button.tsx';
export interface CollectionAddButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
}
/** Отдельная точка добавления в коллекцию, а не обычная кнопка действия. */
export declare function CollectionAddButton({ children, className, ...props }: CollectionAddButtonProps): import("react").JSX.Element;
