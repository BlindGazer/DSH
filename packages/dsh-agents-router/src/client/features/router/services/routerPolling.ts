export interface PollingTimers {
    setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
    clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

const defaultTimers: PollingTimers = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: timer => clearTimeout(timer)
};

export function startRouterPolling(
    reload: (signal: AbortSignal) => Promise<boolean>,
    interval: number,
    timers: PollingTimers = defaultTimers
): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestController: AbortController | undefined;
    const poll = async (): Promise<void> => {
        const controller = new AbortController();
        requestController = controller;
        let succeeded = false;
        try {
            succeeded = await reload(controller.signal);
        } catch {
            succeeded = false;
        }
        if (requestController === controller) requestController = undefined;
        if (!stopped) timer = timers.setTimeout(() => void poll(), succeeded ? interval : 10000);
    };
    void poll();
    return () => {
        stopped = true;
        requestController?.abort();
        if (timer !== undefined) timers.clearTimeout(timer);
    };
}
