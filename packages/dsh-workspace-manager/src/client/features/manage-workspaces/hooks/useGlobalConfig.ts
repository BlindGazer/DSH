import { useEffect, useState } from 'react';
import { fetchGlobalConfig, type GlobalConfig, saveGlobalConfig } from '../services/addirApi.js';

export function useGlobalConfig() {
    const [config, setConfig] = useState<GlobalConfig>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetchGlobalConfig(controller.signal)
            .then(setConfig)
            .catch(reason => {
                if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
            });
        return () => controller.abort();
    }, []);

    const update = (key: keyof GlobalConfig, value: boolean): void => {
        setConfig(current => (current === undefined ? current : { ...current, [key]: value }));
        setSaved(false);
    };

    const save = async (): Promise<void> => {
        if (config === undefined) return;
        setBusy(true);
        setError(undefined);
        setSaved(false);
        try {
            await saveGlobalConfig(config);
            setSaved(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    };

    return { config, busy, error, saved, update, save };
}
