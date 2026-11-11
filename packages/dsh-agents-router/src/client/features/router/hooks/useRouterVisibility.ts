import { useEffect, useState } from 'react';
import type { EventListenerPort } from '../services/routerVisibility.js';
import { subscribeToRouterVisibility } from '../services/routerVisibility.js';

interface RootElementRef {
    current: HTMLElement | null;
}

export function useRouterVisibility(rootRef: RootElementRef): boolean {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const lifecycle = new AbortController();
        const syncVisibility = (): void => {
            if (lifecycle.signal.aborted) return;
            const element = rootRef.current;
            const style = element ? getComputedStyle(element) : undefined;
            setVisible(
                Boolean(
                    element &&
                        document.visibilityState === 'visible' &&
                        document.hasFocus() &&
                        style?.display !== 'none' &&
                        style?.visibility !== 'hidden' &&
                        !element.closest('[hidden], [aria-hidden="true"]') &&
                        element.offsetWidth > 0 &&
                        element.offsetHeight > 0
                )
            );
        };
        const observer = new MutationObserver(syncVisibility);
        for (let element = rootRef.current; element; element = element.parentElement) {
            observer.observe(element, {
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
            });
        }
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncVisibility);
        if (rootRef.current) resizeObserver?.observe(rootRef.current);
        const documentEvents: EventListenerPort<'visibilitychange'> = {
            add: (event, listener) => document.addEventListener(event, listener),
            remove: (event, listener) => document.removeEventListener(event, listener)
        };
        const windowEvents: EventListenerPort<'focus' | 'blur'> = {
            add: (event, listener) => window.addEventListener(event, listener),
            remove: (event, listener) => window.removeEventListener(event, listener)
        };
        const removeEventListeners = subscribeToRouterVisibility(documentEvents, windowEvents, syncVisibility);
        queueMicrotask(() => {
            if (!lifecycle.signal.aborted) syncVisibility();
        });
        return () => {
            lifecycle.abort();
            observer.disconnect();
            resizeObserver?.disconnect();
            removeEventListeners();
        };
    }, [rootRef]);
    return visible;
}
