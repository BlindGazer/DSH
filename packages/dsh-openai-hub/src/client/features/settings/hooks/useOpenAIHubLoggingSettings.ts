import { useCallback, useEffect, useState } from 'react';
import type { OpenAICodexText } from '../../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { OpenAIHubLogSettings } from '../../../../shared/logging.js';
import type { OpenAIHubRemote } from '../../../../shared/remote.js';

export function useOpenAIHubLoggingSettings(remote: OpenAIHubRemote, text: (key: OpenAICodexText) => string) {
    const [settings, setSettings] = useState<OpenAIHubLogSettings>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const reload = useCallback(async (): Promise<void> => {
        setBusy(true);
        setError('');
        try {
            setSettings(await remote.loadLoggingSettings());
        } catch {
            setError(text('loggingLoadError'));
        } finally {
            setBusy(false);
        }
    }, [remote, text]);

    useEffect(() => {
        let active = true;
        void Promise.resolve().then(async () => {
            if (active) await reload();
        });
        void remote.recordClientLog({ event: 'settings', phase: 'opened' }).catch(() => undefined);
        return () => {
            active = false;
        };
    }, [reload, remote]);

    const updateEnabled = (enabled: boolean): void => {
        setSettings(current => (current ? { ...current, enabled } : current));
        setNotice('');
    };

    const save = async (): Promise<void> => {
        if (!settings) return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const saved = await remote.saveLoggingSettings(settings);
            setSettings(saved);
            setNotice(text('loggingSaved'));
            void remote.recordClientLog({ event: 'settings', phase: 'saved', operation: 'setLoggingEnabled' }).catch(() => undefined);
        } catch {
            setError(text('loggingSaveError'));
        } finally {
            setBusy(false);
        }
    };

    return { settings, busy, error, notice, reload, updateEnabled, save };
}
