import type { ReactNode } from 'react';
/**
 * Свойства компактной иконочной кнопки IconButton.
 */
export interface IconButtonProps {
    readonly children: ReactNode;
    readonly ariaLabel: string;
    readonly title?: string;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
    readonly className?: string;
}
/**
 * Квадратная кнопка с иконкой фиксированной высоты (32px) вровень с выпадающими списками и кнопками DSH.
 */
export declare function IconButton({ children, ariaLabel, title, onClick, disabled, className }: IconButtonProps): import("react").JSX.Element;
