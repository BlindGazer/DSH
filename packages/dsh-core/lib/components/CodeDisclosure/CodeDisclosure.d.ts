import type { ReactNode } from 'react';
export interface CodeDisclosureProps {
    readonly code: string;
    readonly children?: ReactNode;
    readonly label?: string;
}
export declare function CodeDisclosure({ code, children, label }: CodeDisclosureProps): import("react").JSX.Element;
