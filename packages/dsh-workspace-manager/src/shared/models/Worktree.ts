export interface WorktreeCheckout {
    readonly path: string;
    readonly branch: string | null;
}

export interface WorktreeRepository {
    readonly currentBranch: string | null;
    readonly isLinkedWorktree: boolean;
    readonly defaultBasePath: string;
    readonly branches: readonly string[];
    readonly remoteBranches?: readonly string[];
    readonly occupiedBranches: readonly string[];
    readonly checkouts: readonly WorktreeCheckout[];
    readonly deletableCheckouts?: readonly WorktreeCheckout[];
}

interface WorktreeDestination {
    readonly basePath: string;
    readonly folderName: string;
}

export type WorktreeSelection =
    | (WorktreeDestination & {
          readonly mode: 'new';
          readonly branch: string;
          readonly sourceBranch: string;
          readonly sourceRemote?: boolean;
      })
    | (WorktreeDestination & { readonly mode: 'existing'; readonly branch: string; readonly originBranch?: string })
    | { readonly mode: 'open'; readonly path: string };

export interface WorktreeDeletion {
    readonly worktreePath: string;
    readonly expectedBranch: string | null;
    readonly deleteBranch?: boolean;
    readonly mergeInto?: string;
}

export type WorktreeDeletionWarning = 'branchDeleteFailed' | 'mergeCleanupFailed';

export interface WorktreeDeletionResult {
    readonly worktreeRemoved: true;
    readonly branchDeleted: boolean;
    readonly warnings: readonly WorktreeDeletionWarning[];
}

export type WorktreeErrorCode =
    | 'accessDenied'
    | 'gitMissing'
    | 'notRepository'
    | 'noCommits'
    | 'invalidBranch'
    | 'sourceMissing'
    | 'branchExists'
    | 'branchMissing'
    | 'branchOccupied'
    | 'invalidFolder'
    | 'invalidBasePath'
    | 'pathExists'
    | 'ignoreFailed'
    | 'readOnly'
    | 'worktreeMissing'
    | 'primaryWorktree'
    | 'worktreeChanged'
    | 'worktreeDirty'
    | 'worktreeLocked'
    | 'mergeTargetInvalid'
    | 'mergeTargetDirty'
    | 'mergeConflict'
    | 'mergeFailed'
    | 'branchNotMerged'
    | 'worktreeRemoveFailed'
    | 'gitFailed'
    | WorktreeDeletionWarning;
