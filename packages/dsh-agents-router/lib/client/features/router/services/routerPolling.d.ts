export interface PollingTimers {
    setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
    clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}
export declare function startRouterPolling(reload: (signal: AbortSignal) => Promise<boolean>, interval: number, timers?: PollingTimers): () => void;
