import { useEffect, useState } from 'react';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import type { WorkspaceEditActions } from '../models/WorkspaceEditActions.js';
import type { WorkspaceEditTarget } from '../models/WorkspaceEditTarget.js';
import { type ClientLinkedDirectory, fetchWorkspaceDirectories, replaceWorkspaceDirectories } from '../services/addirApi.js';

interface WorkspaceLoadState {
    readonly requestKey: string;
    readonly status: 'loading' | 'loaded' | 'failed';
    readonly error?: string;
}

interface WorkspaceActionError {
    readonly requestKey: string;
    readonly message: string;
}

export function useWorkspaceEditor(target: WorkspaceEditTarget, actions: WorkspaceEditActions, onClose: () => void, t: Translate) {
    const [title, setTitle] = useState(target.displayTitle);
    const [directories, setDirectories] = useState<ClientLinkedDirectory[]>([]);
    const [reload, setReload] = useState(0);
    const [busy, setBusy] = useState(false);
    const [loadState, setLoadState] = useState<WorkspaceLoadState>(() => ({
        requestKey: JSON.stringify([target.path, reload]),
        status: 'loading'
    }));
    const [actionError, setActionError] = useState<WorkspaceActionError>();
    const [picking, setPicking] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const requestKey = JSON.stringify([target.path, reload]);
    const currentLoad = loadState.requestKey === requestKey ? loadState : undefined;
    const loading = currentLoad === undefined || currentLoad.status === 'loading';
    const loaded = currentLoad?.status === 'loaded';
    const error = currentLoad?.error ?? (actionError?.requestKey === requestKey ? actionError.message : undefined);

    const setError = (message: string | undefined): void => {
        setActionError(message === undefined ? undefined : { requestKey, message });
    };

    useEffect(() => {
        const controller = new AbortController();
        const currentRequestKey = JSON.stringify([target.path, reload]);
        fetchWorkspaceDirectories(target.path, controller.signal)
            .then(rows => {
                if (controller.signal.aborted) return;
                setDirectories(rows);
                setLoadState({ requestKey: currentRequestKey, status: 'loaded' });
            })
            .catch(reason => {
                if (controller.signal.aborted) return;
                setLoadState({
                    requestKey: currentRequestKey,
                    status: 'failed',
                    error: reason instanceof Error ? reason.message : String(reason)
                });
            });
        return () => controller.abort();
    }, [target.path, reload]);

    const close = (): void => {
        if (!busy && !picking) onClose();
    };

    const add = async (): Promise<void> => {
        setPicking(true);
        setError(undefined);
        try {
            const path = await actions.pick();
            if (path === undefined) return;
            if ([target.path, ...directories.map(directory => directory.path)].includes(path)) {
                setError(t('duplicate'));
                return;
            }
            setDirectories(current => [...current, { path, alias: '', readOnly: false }]);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setPicking(false);
        }
    };

    const save = async (): Promise<void> => {
        setBusy(true);
        setError(undefined);
        let renamed = false;
        try {
            if (title.trim() !== target.displayTitle) {
                await actions.rename(target.workspaceId, title.trim());
                renamed = true;
            }
            await replaceWorkspaceDirectories(target.path, directories);
            onClose();
        } catch (reason) {
            if (renamed) {
                try {
                    await actions.rename(target.workspaceId, target.displayTitle);
                } catch (restoreError) {
                    setError(restoreError instanceof Error ? restoreError.message : String(restoreError));
                    return;
                }
            }
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (): Promise<void> => {
        setBusy(true);
        setError(undefined);
        try {
            await actions.removeWorkspace(target.workspaceId);
            onClose();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    };

    return {
        title,
        setTitle,
        directories,
        setDirectories,
        loading,
        loaded,
        setReload,
        busy,
        error,
        picking,
        confirmRemove,
        setConfirmRemove,
        close,
        add,
        save,
        remove
    };
}
