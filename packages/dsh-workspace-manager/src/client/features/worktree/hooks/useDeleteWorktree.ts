import { useState } from 'react';
import type { CopyKey } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository } from '../../../../shared/models/Worktree.ts';
import { deleteWorktree } from '../../../worktreeApi.ts';
import { getWorktreeErrorKey } from '../worktreeError.ts';

export function useDeleteWorktree(
    workspaceId: string,
    repository: WorktreeRepository,
    onDeleted: (warnings: readonly string[], checkoutPath: string) => Promise<void>
) {
    const checkouts = repository.deletableCheckouts ?? [];
    const [path, setPath] = useState('');
    const checkout = checkouts.find(item => item.path === path);
    const [folder, setFolder] = useState(true);
    const [branch, setBranch] = useState(false);
    const [merge, setMerge] = useState(false);
    const branches = repository.branches.filter(item => item !== checkout?.branch);
    const [mergeChoice, setMergeInto] = useState<string>();
    const mergeInto = mergeChoice ?? branches.find(item => item === 'main') ?? branches.find(item => item === 'master') ?? '';
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<CopyKey>();
    const canUseBranch = typeof checkout?.branch === 'string' && folder && !busy;
    const canSubmit = checkout !== undefined && folder && (!merge || (canUseBranch && branches.includes(mergeInto))) && !busy;

    function selectCheckout(value: string) {
        setPath(value);
        setFolder(true);
        setBranch(false);
        setMerge(false);
        setMergeInto(undefined);
        setError(undefined);
    }

    async function submit() {
        if (!canSubmit || !checkout) return;
        setBusy(true);
        setError(undefined);
        try {
            const warnings = await deleteWorktree(workspaceId, {
                worktreePath: checkout.path,
                expectedBranch: checkout.branch,
                deleteBranch: canUseBranch && branch,
                ...(merge ? { mergeInto } : {})
            });
            await onDeleted(warnings, checkout.path);
        } catch (failure) {
            console.error('[workspace-manager] Worktree deletion failed', failure);
            setError(getWorktreeErrorKey(failure instanceof Error ? failure : undefined, 'worktreeDeleteFailed'));
        } finally {
            setBusy(false);
        }
    }

    return {
        checkouts,
        checkout,
        selectCheckout,
        canUseBranch,
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
