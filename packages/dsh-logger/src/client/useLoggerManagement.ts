import { useEffect, useRef, useState } from 'react';
import { loggerFailureKind } from '../shared/failure.ts';
import type { LoggerConfig } from '../shared/index.ts';
import type { LoggerTextKey } from '../shared/localization.ts';
import { LoggerConfigSchema, type LoggerPathPreview, type LoggerSettingsRemote, type LoggerSettingsSnapshot } from '../shared/remote.ts';

function failureText(error: Error | undefined, fallback: LoggerTextKey): LoggerTextKey {
    const kind = loggerFailureKind(error);
    console.error(`dsh-logger: client request failed (${kind})`);
    if (kind === 'conflict') return 'errorConflict';
    if (kind === 'invalid') return 'errorInvalid';
    if (kind === 'unavailable') return 'errorUnavailable';
    return fallback;
}

export function useLoggerManagement(remote: LoggerSettingsRemote) {
    const [snapshot, setSnapshot] = useState<LoggerSettingsSnapshot>();
    const [config, setConfig] = useState<LoggerConfig>();
    const [busy, setBusy] = useState(false);
    const [reloadVersion, setReloadVersion] = useState(0);
    const [errorKey, setErrorKey] = useState<LoggerTextKey>('errorRead');
    const [errorMessage, setErrorMessage] = useState('');
    const [noticeOpen, setNoticeOpen] = useState(false);
    const [noticeSeverity, setNoticeSeverity] = useState<'error' | 'success' | 'warning'>('error');
    const [status, setStatus] = useState<'loading' | 'ready' | 'saved' | 'error'>('loading');
    const [preview, setPreview] = useState<LoggerPathPreview>();
    const [previewDraft, setPreviewDraft] = useState('');
    const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const previewSequence = useRef(0);
    const mounted = useRef(true);
    const saving = useRef(false);
    const reload = (): void => {
        previewSequence.current += 1;
        setPreviewStatus('idle');
        setStatus('loading');
        setReloadVersion(value => value + 1);
    };
    const updateConfig = (value: LoggerConfig): void => {
        setConfig(value);
        setStatus('ready');
        if (noticeSeverity === 'success') setNoticeOpen(false);
    };
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            previewSequence.current += 1;
        };
    }, []);
    useEffect(() => {
        let active = reloadVersion >= 0;
        void remote
            .read()
            .then(value => {
                if (!active) return;
                setSnapshot(value);
                setConfig(value.config);
                setStatus('ready');
            })
            .catch(error => {
                if (!active) return;
                setErrorKey(failureText(error instanceof Error ? error : undefined, 'errorRead'));
                setErrorMessage(error instanceof Error ? error.message : '');
                setNoticeSeverity('error');
                setNoticeOpen(true);
                setStatus('error');
            });
        return () => {
            active = false;
        };
    }, [remote, reloadVersion]);
    const previewPath = async (path: string): Promise<void> => {
        const sequence = ++previewSequence.current;
        setPreviewDraft(path);
        setPreview(undefined);
        setPreviewStatus('loading');
        try {
            const result = await remote.previewPath({ path });
            if (!mounted.current || sequence !== previewSequence.current) return;
            setPreview(result);
            setPreviewStatus('ready');
        } catch (error) {
            if (!mounted.current || sequence !== previewSequence.current) return;
            console.error(`dsh-logger: path preview failed (${loggerFailureKind(error instanceof Error ? error : undefined)})`);
            setPreviewStatus('error');
        }
    };
    const save = async (next: LoggerConfig): Promise<void> => {
        if (!snapshot || saving.current) return;
        const pathChanged = next.path !== snapshot.config.path;
        if (pathChanged && (previewStatus !== 'ready' || previewDraft !== (next.path ?? '') || !preview)) return;
        saving.current = true;
        setBusy(true);
        try {
            const value = await remote.save({
                config: LoggerConfigSchema.parse(next),
                expectedConfig: snapshot.config,
                confirmPathChange: pathChanged,
                ...(pathChanged && preview ? { cleanupPaths: preview.deleted } : {})
            });
            if (!mounted.current) return;
            setSnapshot(value);
            setConfig(value.config);
            setStatus('saved');
            setNoticeSeverity(value.cleanupWarning ? 'warning' : 'success');
            if (value.cleanupWarning) setErrorMessage(value.cleanupWarning);
            setNoticeOpen(true);
        } catch (error) {
            if (!mounted.current) return;
            const failure = error instanceof Error ? error : undefined;
            if (pathChanged && loggerFailureKind(failure) === 'invalid') {
                console.error('dsh-logger: path rejected during save');
                setPreviewStatus('error');
                return;
            }
            setErrorKey(failureText(failure, 'errorSave'));
            setErrorMessage(error instanceof Error ? error.message : '');
            setNoticeSeverity('error');
            setNoticeOpen(true);
            setStatus('error');
        } finally {
            saving.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    return {
        config,
        snapshot,
        busy,
        status,
        errorKey,
        errorMessage,
        noticeOpen,
        noticeSeverity,
        closeNotice: () => setNoticeOpen(false),
        closeSuccessNotice: () => {
            if (noticeSeverity === 'success') setNoticeOpen(false);
        },
        setConfig: updateConfig,
        save,
        reload,
        reloadVersion,
        preview,
        previewDraft,
        previewStatus,
        previewPath
    };
}
