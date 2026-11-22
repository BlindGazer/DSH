import { type ReactNode } from 'react';
import { type TooltipSide } from './tooltip-placement.ts';
export interface TooltipProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerMode?: 'hover' | 'click';
    readonly delayMs?: number;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
    readonly side?: TooltipSide;
    readonly align?: 'center' | 'end';
    readonly portal?: boolean | 'body';
    readonly 'data-testid'?: string;
}
export declare function Tooltip({ children, content, triggerMode, delayMs, className, triggerClassName, contentClassName, triggerElement, side, align, portal, 'data-testid': testId }: TooltipProps): import("react").JSX.Element;
