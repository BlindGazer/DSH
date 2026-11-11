import { useEffect } from 'react';
import { startRouterPolling } from '../services/routerPolling.js';

export function useRouterPolling(enabled: boolean, interval: number, reload: (signal: AbortSignal) => Promise<boolean>): void {
    useEffect(() => {
        if (!enabled) return undefined;
        return startRouterPolling(reload, interval);
    }, [enabled, interval, reload]);
}
