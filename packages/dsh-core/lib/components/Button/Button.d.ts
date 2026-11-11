import type { ReactNode } from 'react';
/**
 * Свойства стандартной кнопки Button дизайн-системы @kalex/dsh-core.
 */
export interface ButtonProps {
    readonly children: ReactNode;
    readonly onClick?: () => void;
    readonly variant?: 'secondary' | 'primary' | 'danger';
    readonly size?: 'md' | 'sm';
    readonly disabled?: boolean;
    readonly title?: string;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly type?: 'button' | 'submit';
}
/**
 * Кнопка управления в стилистике DSH с поддержкой вариантов оформления и размеров.
 */
export declare function Button({ children, onClick, variant, size, disabled, title, ariaLabel, className, type }: ButtonProps): import("react").JSX.Element;
