import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalSettings } from '../../../../shared/models/RouterModels.js';
import { globalSettingsApi } from '../globalSettingsApi.js';

const DEFAULT_SETTINGS: GlobalSettings = {
    locale: 'auto',
    theme: 'auto',
    pollingIntervalMs: 3000,
    globalLogging: false
};

export function useGlobalSettings() {
    const [settings, setSettings] = useState<GlobalSettings>();
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const requestsRef = useRef(new Set<AbortController>());

    const reload = useCallback(async (): Promise<void> => {
        const controller = new AbortController();
        requestsRef.current.add(controller);
        try {
            const result = await globalSettingsApi.load(controller.signal);
            if (!controller.signal.aborted) {
                setSettings(result.settings);
                setError('');
            }
        } catch (cause) {
            if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            requestsRef.current.delete(controller);
        }
    }, []);

    useEffect(() => {
        const requests = requestsRef.current;
        const startup = new AbortController();
        void Promise.resolve().then(async () => {
            if (!startup.signal.aborted) await reload();
        });
        return () => {
            startup.abort();
            for (const controller of requests) controller.abort();
        };
    }, [reload]);

    const update = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]): void => {
        setSettings(current => (current ? { ...current, [key]: value } : current));
        setNotice('');
    };

    const resetDefaults = (): void => {
        setSettings(DEFAULT_SETTINGS);
        setNotice('');
        setError('');
    };

    const save = async (savedMessage: string): Promise<void> => {
        if (!settings) return;
        const controller = new AbortController();
        requestsRef.current.add(controller);
        setBusy(true);
        setError('');
        try {
            const result = await globalSettingsApi.save(settings, controller.signal);
            if (!controller.signal.aborted) {
                setSettings(result.settings);
                setNotice(savedMessage);
            }
        } catch (cause) {
            if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            requestsRef.current.delete(controller);
            if (!controller.signal.aborted) setBusy(false);
        }
    };

    return { settings, notice, error, busy, reload, update, resetDefaults, save, setNotice };
}
