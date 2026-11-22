import type { ReactNode } from 'react';
/**
 * Свойства компактной иконочной кнопки IconButton.
 */
export interface IconButtonProps {
    readonly children: ReactNode;
    readonly size?: 'small' | 'standard';
    readonly variant?: 'neutral' | 'danger';
    readonly tooltip?: string;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
    readonly className?: string;
}
/**
 * Квадратная кнопка с иконкой. Без варианта сохраняет рамку и фон обычных элементов управления DSH.
 */
export declare function IconButton({ children, size, variant, tooltip, onClick, disabled, className }: IconButtonProps): import("react").JSX.Element;
