import { Delay } from '@kalex/dsh-core';
import { useEffect, useRef, useState } from 'react';
import { discoverVscode, launchVscode } from '../../../worktreeApi.ts';
import type { WorkspaceEditTarget } from '../../manage-workspaces/models/WorkspaceEditTarget.ts';
import type { SnapshotStore } from '../../manage-workspaces/services/snapshotStore.ts';

type VscodeErrorKey = 'vscodeDiscoverFailed' | 'vscodeLaunchFailed' | 'vscodeUnavailable';

type VscodeView =
    | { readonly kind: 'pending'; readonly target: WorkspaceEditTarget }
    | { readonly kind: 'choose'; readonly target: WorkspaceEditTarget; readonly files: readonly string[] }
    | { readonly kind: 'error'; readonly target: WorkspaceEditTarget; readonly key: VscodeErrorKey; readonly path: string };

export function useVscodeWorkflow(request: SnapshotStore<WorkspaceEditTarget | undefined>, target: WorkspaceEditTarget | undefined) {
    const [view, setView] = useState<VscodeView>();
    const [selection, setSelection] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    const submitRef = useRef<((file: string) => void) | undefined>(undefined);

    useEffect(() => {
        if (target === undefined) return;
        const current = target;
        const controller = new AbortController();
        const { signal } = controller;
        const isCurrent = () => !signal.aborted && request.getSnapshot() === target;
        let launching = false;
        const pendingTimer = setTimeout(() => {
            if (isCurrent()) setView({ kind: 'pending', target: current });
        }, Delay.Animation);

        async function launch(file?: string) {
            if (!isCurrent() || launching) return;
            launching = true;
            setIsLaunching(true);
            try {
                await launchVscode(current.workspaceId, file);
                if (isCurrent()) request.set(undefined);
            } catch (error) {
                if (!isCurrent()) return;
                clearTimeout(pendingTimer);
                const unavailable = error instanceof Error && 'code' in error && error.code === 'vscodeUnavailable';
                const key = unavailable ? 'vscodeUnavailable' : 'vscodeLaunchFailed';
                console.error(`[workspace-manager] ${key}`);
                setView({ kind: 'error', target: current, key, path: file ?? current.path });
            } finally {
                if (isCurrent()) setIsLaunching(false);
            }
        }

        async function discover() {
            try {
                const files = await discoverVscode(current.workspaceId, signal);
                // Первый запуск эффекта в StrictMode уже отменен к моменту ответа.
                if (!isCurrent()) return;
                if (files.length <= 1) {
                    await launch(files[0]);
                } else {
                    clearTimeout(pendingTimer);
                    submitRef.current = file => {
                        if (files.includes(file)) void launch(file);
                    };
                    setSelection('');
                    setIsLaunching(false);
                    setView({ kind: 'choose', target: current, files });
                }
            } catch {
                if (!isCurrent()) return;
                clearTimeout(pendingTimer);
                console.error('[workspace-manager] vscodeDiscoverFailed');
                setView({ kind: 'error', target: current, key: 'vscodeDiscoverFailed', path: current.path });
            }
        }

        void discover();
        return () => {
            controller.abort();
            clearTimeout(pendingTimer);
            submitRef.current = undefined;
        };
    }, [request, target]);

    return {
        view: view?.target === target ? view : undefined,
        selection,
        setSelection,
        isLaunching,
        submit: () => submitRef.current?.(selection),
        close: () => {
            if (view?.target === target && view?.kind !== 'error' && isLaunching) return;
            if (request.getSnapshot() === target) request.set(undefined);
        }
    };
}
