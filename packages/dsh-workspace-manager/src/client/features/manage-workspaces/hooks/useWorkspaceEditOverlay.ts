import { useEffect, useSyncExternalStore } from 'react';
import type { UseWorkspaceSnapshot, WorkspaceSnapshot } from '../../../models/WorkspaceManagerClientContext.js';
import type { WorkspaceEditTarget } from '../models/WorkspaceEditTarget.js';
import type { SnapshotStore } from '../services/snapshotStore.js';

export interface WorkspaceEditOverlayOptions {
    readonly editRequest: SnapshotStore<WorkspaceEditTarget | undefined>;
    readonly workspaceSnapshot: SnapshotStore<WorkspaceSnapshot>;
    readonly useWorkspaces: UseWorkspaceSnapshot;
}

export function useWorkspaceEditOverlay({ editRequest, workspaceSnapshot, useWorkspaces }: WorkspaceEditOverlayOptions) {
    // oxlint-disable-next-line react/rules-of-hooks -- Хук приходит из стабильного слота DSH.
    const items = useWorkspaces(snapshot => snapshot.items);
    useEffect(() => workspaceSnapshot.set({ items }), [items, workspaceSnapshot]);
    const target = useSyncExternalStore(editRequest.subscribe, editRequest.getSnapshot);
    return {
        target,
        close: () => editRequest.set(undefined)
    };
}
