import { type ReactNode, Suspense } from 'react';

import { ProgressBar } from './ProgressBar.js';
import { Skeleton } from './Skeleton.js';
import { Spinner } from './Spinner.js';

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
export function ChildrenLazy({ variant = 'spinner', loader, children }: ChildrenLazyProps) {
    const fallbackNode =
        loader !== undefined ? loader : variant === 'progress' ? <ProgressBar /> : variant === 'skeleton' ? <Skeleton /> : <Spinner />;

    return <Suspense fallback={fallbackNode}>{children}</Suspense>;
}
