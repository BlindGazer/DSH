import type { WorktreeRepository } from '../../../shared/models/Worktree.ts';
import { inspectWorktrees } from '../../worktreeApi.ts';
import { createSnapshotStore } from '../manage-workspaces/services/snapshotStore.ts';

export function createWorktreeMenuSource(workspaceId: string) {
    const visible = createSnapshotStore(false);
    let controller: AbortController | undefined;
    let repository: WorktreeRepository | undefined;
    let subscriptions = 0;
    return {
        getSnapshot: visible.getSnapshot,
        getRepository: () => repository,
        subscribe(listener: () => void) {
            const unsubscribe = visible.subscribe(listener);
            if (++subscriptions === 1) {
                const current = new AbortController();
                controller = current;
                void inspectWorktrees(workspaceId, current.signal)
                    .then(result => {
                        if (current.signal.aborted) return;
                        repository = result;
                        visible.set(result.isLinkedWorktree);
                    })
                    .catch(() => undefined);
            }
            return () => {
                unsubscribe();
                if (--subscriptions !== 0) return;
                controller?.abort();
                repository = undefined;
                visible.set(false);
            };
        }
    };
}
