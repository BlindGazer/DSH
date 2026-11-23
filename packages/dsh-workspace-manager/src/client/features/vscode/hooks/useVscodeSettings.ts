import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fetchGlobalConfig, saveVscodeEnabled, vscodeEnabled } from '../../manage-workspaces/services/addirApi.ts';

type SettingsError = 'featuresLoadFailed' | 'featuresSaveFailed';

export function useVscodeSettings() {
    const enabled = useSyncExternalStore(vscodeEnabled.subscribe, vscodeEnabled.getSnapshot);
    const [ready, setReady] = useState(false);
    const [loadRequested, setLoadRequested] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<SettingsError>();
    const inFlight = useRef(false);

    useEffect(() => {
        if (!loadRequested) return;
        const controller = new AbortController();
        void fetchGlobalConfig(controller.signal)
            .then(() => {
                if (!controller.signal.aborted) setReady(true);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setError('featuresLoadFailed');
                setLoadRequested(false);
            });
        return () => controller.abort();
    }, [loadRequested]);

    const update = async (value: boolean) => {
        if (!ready || inFlight.current) return;
        inFlight.current = true;
        setSaving(true);
        setError(undefined);
        try {
            await saveVscodeEnabled(value);
        } catch {
            setError('featuresSaveFailed');
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    };

    return {
        enabled,
        ready,
        saving,
        error,
        update,
        dismissError: () => setError(undefined),
        retry: () => {
            setError(undefined);
            setLoadRequested(true);
        }
    };
}
