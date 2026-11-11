import { afterEach, expect, test, vi } from 'vitest';
import { startRouterPolling } from '../src/client/features/router/services/routerPolling.js';

afterEach(() => {
    vi.useRealTimers();
});

test('uses the configured interval after success and clears the timer', async () => {
    vi.useFakeTimers();
    const reload = vi.fn((_signal: AbortSignal) => Promise.resolve(true));
    const stop = startRouterPolling(reload, 2000);

    await vi.advanceTimersByTimeAsync(0);
    expect(reload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(reload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(reload).toHaveBeenCalledTimes(2);
});

test('uses the backoff interval after a failed reload', async () => {
    vi.useFakeTimers();
    const reload = vi.fn((_signal: AbortSignal) => Promise.reject(new Error('offline')));
    const stop = startRouterPolling(reload, 2000);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(9999);
    expect(reload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledTimes(2);

    stop();
});

test('aborts an in-flight reload and stops polling during cleanup', async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const reload = vi.fn((signal: AbortSignal) => {
        requestSignal = signal;
        return new Promise<boolean>(resolve => signal.addEventListener('abort', () => resolve(false), { once: true }));
    });
    const stop = startRouterPolling(reload, 2000);

    expect(requestSignal?.aborted).toBe(false);
    stop();
    expect(requestSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(reload).toHaveBeenCalledTimes(1);
});
