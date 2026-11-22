export interface WorktreeCheckout {
    readonly path: string;
    readonly branch: string | null;
}

export interface WorktreeRepository {
    readonly currentBranch: string | null;
    readonly defaultBasePath: string;
    readonly branches: readonly string[];
    readonly occupiedBranches: readonly string[];
    readonly checkouts: readonly WorktreeCheckout[];
}

interface WorktreeDestination {
    readonly basePath: string;
    readonly folderName: string;
}

export type WorktreeSelection =
    | (WorktreeDestination & { readonly mode: 'new'; readonly branch: string; readonly sourceBranch: string })
    | (WorktreeDestination & { readonly mode: 'existing'; readonly branch: string })
    | { readonly mode: 'open'; readonly path: string };

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
    | 'gitFailed';
