import { useState } from 'react';
import type { CopyKey } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository } from '../../../../shared/models/Worktree.ts';
import { deleteWorktree } from '../../../worktreeApi.ts';
import type { WorkspaceEditTarget } from '../../manage-workspaces/models/WorkspaceEditTarget.ts';
import { getWorktreeErrorKey } from '../worktreeError.ts';

export function useDeleteWorktree(
    target: WorkspaceEditTarget,
    repository: WorktreeRepository,
    onDeleted: (warnings: readonly string[]) => Promise<void>
) {
    const [folder, setFolder] = useState(true);
    const [branch, setBranch] = useState(false);
    const [merge, setMerge] = useState(false);
    const branches = repository.branches.filter(item => item !== repository.currentBranch);
    const [mergeInto, setMergeInto] = useState(
        () => branches.find(item => item === 'main') ?? branches.find(item => item === 'master') ?? ''
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<CopyKey>();
    const canSubmit = folder && (!merge || mergeInto !== '') && !busy;

    async function submit() {
        if (!canSubmit) return;
        setBusy(true);
        setError(undefined);
        try {
            const warnings = await deleteWorktree(target.workspaceId, {
                worktreePath: target.path,
                expectedBranch: repository.currentBranch,
                deleteBranch: branch,
                ...(merge ? { mergeInto } : {})
            });
            await onDeleted(warnings);
        } catch (failure) {
            console.error('[workspace-manager] Worktree deletion failed', failure);
            setError(getWorktreeErrorKey(failure instanceof Error ? failure : undefined, 'worktreeDeleteFailed'));
        } finally {
            setBusy(false);
        }
    }

    return {
        folder,
        setFolder,
        branch,
        setBranch,
        merge,
        setMerge,
        branches,
        mergeInto,
        setMergeInto,
        busy,
        error,
        setError,
        canSubmit,
        submit
    };
}
