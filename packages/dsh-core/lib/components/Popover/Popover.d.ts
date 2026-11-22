import { type ReactNode } from 'react';
export interface PopoverProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
}
export declare function Popover({ children, content, triggerClassName, contentClassName, triggerElement }: PopoverProps): import("react").JSX.Element;
