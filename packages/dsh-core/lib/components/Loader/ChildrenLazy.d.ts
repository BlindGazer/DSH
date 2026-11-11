import { type ReactNode } from 'react';
/**
 * Свойства обертки отложенной загрузки ChildrenLazy.
 */
export interface ChildrenLazyProps {
    readonly variant?: 'spinner' | 'progress' | 'skeleton';
    readonly loader?: ReactNode;
    readonly children: ReactNode;
}
/**
 * Обертка над Suspense со стандартизированным индикатором загрузки (заменяет прямые вызовы <Suspense fallback={...}>).
 */
export declare function ChildrenLazy({ variant, loader, children }: ChildrenLazyProps): import("react").JSX.Element;
