import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectSettings, RouterPostBody, RouterStateResponse } from '../../../../shared/models/RouterModels.js';
import { routerApi } from '../services/routerApi.js';

export function useRouterData(sessionId: string) {
    const [data, setData] = useState<RouterStateResponse>();
    const [settings, setSettings] = useState<ProjectSettings>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [slowPoll, setSlowPoll] = useState(false);
    const [points, setPoints] = useState<Array<{ label: string; tokens: number }>>([]);
    const loadRequestRef = useRef<AbortController | undefined>(undefined);
    const postRequestsRef = useRef(new Set<AbortController>());
    const activeRef = useRef(true);

    const reload = useCallback(
        async (signal?: AbortSignal): Promise<boolean> => {
            const activeRequest = loadRequestRef.current;
            if (activeRequest && !activeRequest.signal.aborted) return false;
            const controller = new AbortController();
            const abortLoad = (): void => controller.abort();
            if (signal?.aborted) controller.abort();
            else signal?.addEventListener('abort', abortLoad, { once: true });
            loadRequestRef.current = controller;
            try {
                const body = await routerApi.loadState(sessionId, controller.signal);
                if (controller.signal.aborted) return false;
                setError('');
                setData(body);
                setSettings(body.settings);
                setSlowPoll(false);
                setPoints(current =>
                    [...current, { label: new Date().toLocaleTimeString(), tokens: body.metrics.estimatedTokens }].slice(-30)
                );
                return true;
            } catch (cause) {
                if (!controller.signal.aborted) {
                    setError(cause instanceof Error ? cause.message : String(cause));
                    setSlowPoll(true);
                }
                return false;
            } finally {
                signal?.removeEventListener('abort', abortLoad);
                if (loadRequestRef.current === controller) loadRequestRef.current = undefined;
            }
        },
        [sessionId]
    );

    useEffect(() => {
        const postRequests = postRequestsRef.current;
        const startup = new AbortController();
        activeRef.current = true;
        void Promise.resolve().then(async () => {
            if (!startup.signal.aborted) await reload(startup.signal);
        });
        return () => {
            activeRef.current = false;
            startup.abort();
            loadRequestRef.current?.abort();
            loadRequestRef.current = undefined;
            for (const controller of postRequests) controller.abort();
        };
    }, [reload]);

    const post = useCallback(
        async <T = void>(route: string, body: RouterPostBody = {}): Promise<T> => {
            const controller = new AbortController();
            postRequestsRef.current.add(controller);
            try {
                return await routerApi.post<T>(sessionId, route, body, controller.signal);
            } finally {
                postRequestsRef.current.delete(controller);
            }
        },
        [sessionId]
    );

    const run = useCallback(
        async (action: () => Promise<void>): Promise<void> => {
            setBusy(true);
            setError('');
            try {
                await action();
                if (activeRef.current) await reload();
            } catch (cause) {
                if (activeRef.current) setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
                if (activeRef.current) setBusy(false);
            }
        },
        [reload]
    );

    return { data, settings, setSettings, error, setError, busy, notice, setNotice, slowPoll, points, reload, post, run };
}
