import { useSyncExternalStore } from 'react';
import type { WorkspaceManagerClientContext } from '../../models/WorkspaceManagerClientContext.ts';
import { inspectWorktrees, prepareWorktree } from '../../worktreeApi.ts';
import type { WorkspaceEditTarget } from '../manage-workspaces/models/WorkspaceEditTarget.ts';
import type { SnapshotStore } from '../manage-workspaces/services/snapshotStore.ts';
import { WorktreeModal, type WorktreeModalProps } from './WorktreeModal.tsx';

export interface WorktreeRequest {
    readonly target: WorkspaceEditTarget;
    readonly openSession: WorktreeModalProps['openSession'];
}

interface WorktreeOverlayProps {
    readonly request: SnapshotStore<WorktreeRequest | undefined>;
    readonly locale: WorkspaceManagerClientContext['locale'];
    readonly t: WorktreeModalProps['t'];
    readonly pick: WorktreeModalProps['pick'];
}

export function WorktreeOverlay({ request, locale, t, pick }: WorktreeOverlayProps) {
    const current = useSyncExternalStore(request.subscribe, request.getSnapshot);
    useSyncExternalStore(
        listener => locale.subscribe(listener),
        () => locale.getSnapshot()
    );
    if (current === undefined) return null;
    const { target, openSession } = current;
    return (
        <WorktreeModal
            key={target.workspaceId}
            target={target}
            t={t}
            onClose={() => request.set(undefined)}
            inspect={signal => inspectWorktrees(target.workspaceId, signal)}
            prepare={selection => prepareWorktree(target.workspaceId, selection)}
            openSession={openSession}
            pick={pick}
        />
    );
}
