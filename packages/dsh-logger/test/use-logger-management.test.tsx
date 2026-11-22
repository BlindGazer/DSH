// @vitest-environment jsdom
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoggerManagement } from '../src/client/useLoggerManagement.ts';
import { loggerDictionaries } from '../src/shared/localization.ts';
import {
    LoggerConfigSchema,
    type LoggerPathPreview,
    type LoggerSettingsRemote,
    type LoggerSettingsSnapshot
} from '../src/shared/remote.ts';

interface Deferred<T> {
    readonly promise: Promise<T>;
    resolve(value: T): void;
    reject(error: Error): void;
}
function rejectUninitialized(error: Error): void {
    throw error;
}
function deferred<T>(): Deferred<T> {
    let resolveValue = (_value: T): void => {
        throw new Error('Deferred is not initialized');
    };
    let rejectValue = rejectUninitialized;
    const promise = new Promise<T>((resolve, reject) => {
        resolveValue = resolve;
        rejectValue = reject;
    });
    return { promise, resolve: resolveValue, reject: rejectValue };
}
function snapshot(): LoggerSettingsSnapshot {
    return { config: LoggerConfigSchema.parse({ path: 'C:/old-logs' }), resolvedPath: 'C:/old-logs', packageNames: [] };
}
function remoteStub() {
    return {
        read: vi.fn<LoggerSettingsRemote['read']>().mockResolvedValue(snapshot()),
        save: vi.fn<LoggerSettingsRemote['save']>().mockResolvedValue(snapshot()),
        previewPath: vi
            .fn<LoggerSettingsRemote['previewPath']>()
            .mockResolvedValue({ path: 'C:/new-logs', controlled: 2, unknown: 1, deleted: [], preserved: [] })
    };
}
interface HarnessProps {
    readonly remote: LoggerSettingsRemote;
    readonly onState: (state: ReturnType<typeof useLoggerManagement>) => void;
}
function Harness({ remote, onState }: HarnessProps): React.JSX.Element {
    const state = useLoggerManagement(remote);
    onState(state);
    return <output>{state.status}</output>;
}
let root: Root | undefined;
function renderHook(remote: LoggerSettingsRemote): () => ReturnType<typeof useLoggerManagement> {
    let current: ReturnType<typeof useLoggerManagement> | undefined;
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
        root?.render(
            <Harness
                remote={remote}
                onState={state => {
                    current = state;
                }}
            />
        );
    });
    return () => {
        if (!current) throw new Error('Hook did not render');
        return current;
    };
}
beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(() => {
    act(() => {
        root?.unmount();
    });
    root = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('useLoggerManagement', () => {
    it('starts loading, reads the snapshot and reloads settings', async () => {
        const remote = remoteStub();
        const first = deferred<LoggerSettingsSnapshot>();
        remote.read.mockReturnValueOnce(first.promise);
        const state = renderHook(remote);
        expect(state().status).toBe('loading');
        expect(state().config).toBeUndefined();
        await act(async () => {
            first.resolve(snapshot());
        });
        expect(state().status).toBe('ready');
        expect(state().config).toStrictEqual(snapshot().config);
        await act(async () => {
            state().reload();
        });
        expect(remote.read).toHaveBeenCalledTimes(2);
        expect(state().reloadVersion).toBe(1);
        expect(state().status).toBe('ready');
    });

    it('reports a localized read error without logging raw error details', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const remote = remoteStub();
        remote.read.mockRejectedValueOnce(new Error('synthetic-sensitive-read-detail'));
        const state = renderHook(remote);
        await act(async () => undefined);
        expect(state().status).toBe('error');
        expect(state().errorKey).toBe('errorRead');
        expect(loggerDictionaries.ru[state().errorKey]).toBe('Не удалось загрузить настройки логирования.');
        expect(consoleError).toHaveBeenCalledExactlyOnceWith('dsh-logger: client request failed (internal)');
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('synthetic-sensitive-read-detail');
        await act(async () => {
            state().reload();
        });
        expect(state().status).toBe('ready');
    });

    it('ignores an older successful path preview', async () => {
        const remote = remoteStub();
        const first = deferred<LoggerPathPreview>();
        const second = deferred<LoggerPathPreview>();
        remote.previewPath.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        const state = renderHook(remote);
        await act(async () => undefined);
        let firstRequest: Promise<void> = Promise.resolve();
        let secondRequest: Promise<void> = Promise.resolve();
        act(() => {
            firstRequest = state().previewPath('C:/first');
        });
        act(() => {
            secondRequest = state().previewPath('C:/second');
        });
        expect(state().previewStatus).toBe('loading');
        await act(async () => {
            second.resolve({ path: 'C:/second', controlled: 3, unknown: 1, deleted: [], preserved: [] });
            await secondRequest;
        });
        await act(async () => {
            first.resolve({ path: 'C:/first', controlled: 9, unknown: 0, deleted: [], preserved: [] });
            await firstRequest;
        });
        expect(state().previewDraft).toBe('C:/second');
        expect(state().previewStatus).toBe('ready');
        expect(state().preview).toStrictEqual({ path: 'C:/second', controlled: 3, unknown: 1, deleted: [], preserved: [] });
    });

    it('ignores stale preview errors and safely reports the current preview failure', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const remote = remoteStub();
        const old = deferred<LoggerPathPreview>();
        remote.previewPath.mockReturnValueOnce(old.promise);
        const state = renderHook(remote);
        await act(async () => undefined);
        let oldRequest: Promise<void> = Promise.resolve();
        act(() => {
            oldRequest = state().previewPath('C:/old-draft');
        });
        await act(async () => {
            await state().previewPath('C:/new-logs');
        });
        await act(async () => {
            old.reject(new Error('synthetic-sensitive-stale-detail'));
            await oldRequest;
        });
        expect(state().previewStatus).toBe('ready');
        expect(consoleError).not.toHaveBeenCalled();
        remote.previewPath.mockRejectedValueOnce(new Error('synthetic-sensitive-preview-detail'));
        await act(async () => {
            await state().previewPath('C:/invalid');
        });
        expect(state().previewStatus).toBe('error');
        expect(state().noticeOpen).toBe(false);
        expect(state().preview).toBeUndefined();
        expect(consoleError).toHaveBeenCalledExactlyOnceWith('dsh-logger: path preview failed (internal)');
    });

    it('invalidates in-flight path previews when reloading', async () => {
        const remote = remoteStub();
        const pending = deferred<LoggerPathPreview>();
        remote.previewPath.mockReturnValueOnce(pending.promise);
        const state = renderHook(remote);
        await act(async () => undefined);
        let request: Promise<void> = Promise.resolve();
        act(() => {
            request = state().previewPath('C:/discarded');
        });
        await act(async () => {
            state().reload();
        });
        await act(async () => {
            pending.resolve({ path: 'C:/discarded', controlled: 1, unknown: 0, deleted: [], preserved: [] });
            await request;
        });
        expect(state().status).toBe('ready');
        expect(state().previewStatus).toBe('idle');
        expect(state().preview).toBeUndefined();
    });

    it('blocks path saves until a ready preview matches the exact draft', async () => {
        const remote = remoteStub();
        const pending = deferred<LoggerPathPreview>();
        remote.previewPath.mockReturnValueOnce(pending.promise);
        const state = renderHook(remote);
        await act(async () => undefined);
        const next = { ...snapshot().config, path: 'C:/new-logs' };
        await act(async () => {
            await state().save(next);
        });
        expect(remote.save).not.toHaveBeenCalled();
        let request: Promise<void> = Promise.resolve();
        act(() => {
            request = state().previewPath(next.path);
        });
        await act(async () => {
            await state().save(next);
        });
        expect(remote.save).not.toHaveBeenCalled();
        await act(async () => {
            pending.resolve({ path: next.path, controlled: 2, unknown: 1, deleted: [], preserved: [] });
            await request;
        });
        await act(async () => {
            await state().save({ ...next, path: 'C:/different' });
        });
        expect(remote.save).not.toHaveBeenCalled();
        remote.save.mockResolvedValueOnce({ ...snapshot(), config: next, resolvedPath: next.path });
        await act(async () => {
            await state().save(next);
        });
        expect(remote.save).toHaveBeenCalledExactlyOnceWith({
            config: next,
            expectedConfig: snapshot().config,
            confirmPathChange: true,
            cleanupPaths: []
        });
        expect(state().status).toBe('saved');
        expect(state().config).toStrictEqual(next);
        expect(state().busy).toBe(false);
    });

    it('saves the confirmed path after cancelling another draft and revalidating it', async () => {
        const remote = remoteStub();
        remote.previewPath.mockImplementation(async ({ path }) => ({ path, controlled: 2, unknown: 1, deleted: [], preserved: [] }));
        const state = renderHook(remote);
        await act(async () => undefined);
        const confirmed = { ...snapshot().config, path: 'C:/confirmed-A' };
        await act(async () => {
            await state().previewPath(confirmed.path);
        });
        act(() => {
            state().setConfig(confirmed);
        });
        await act(async () => {
            await state().previewPath('C:/cancelled-B');
        });
        await act(async () => {
            await state().save(confirmed);
        });
        expect(remote.save).not.toHaveBeenCalled();
        await act(async () => {
            await state().previewPath(confirmed.path);
        });
        remote.save.mockResolvedValueOnce({ ...snapshot(), config: confirmed, resolvedPath: confirmed.path });
        await act(async () => {
            await state().save(confirmed);
        });
        expect(remote.previewPath.mock.calls).toStrictEqual([
            [{ path: confirmed.path }],
            [{ path: 'C:/cancelled-B' }],
            [{ path: confirmed.path }]
        ]);
        expect(remote.save).toHaveBeenCalledExactlyOnceWith({
            config: confirmed,
            expectedConfig: snapshot().config,
            confirmPathChange: true,
            cleanupPaths: []
        });
        expect(state().status).toBe('saved');
        expect(state().config?.path).toBe(confirmed.path);
    });

    it('saves ordinary settings without preview and localizes stale configuration failures', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const remote = remoteStub();
        const state = renderHook(remote);
        await act(async () => undefined);
        const next = { ...snapshot().config, enabled: true };
        remote.save.mockResolvedValueOnce({ ...snapshot(), config: next });
        await act(async () => {
            await state().save(next);
        });
        expect(state().status).toBe('saved');
        expect(remote.save).toHaveBeenLastCalledWith({ config: next, expectedConfig: snapshot().config, confirmPathChange: false });
        remote.save.mockRejectedValueOnce(new RemoteError('gateway/bad-request', 'dsh-logger: save failed (conflict)', {}));
        await act(async () => {
            await state().save({ ...next, level: 'debug' });
        });
        expect(state().status).toBe('error');
        expect(state().errorKey).toBe('errorConflict');
        expect(loggerDictionaries.ru[state().errorKey]).toBe('Настройки изменились. Перезагрузите их перед сохранением.');
        expect(state().snapshot?.config).toStrictEqual(next);
        expect(state().busy).toBe(false);
        expect(consoleError).toHaveBeenCalledExactlyOnceWith('dsh-logger: client request failed (conflict)');
    });
});
