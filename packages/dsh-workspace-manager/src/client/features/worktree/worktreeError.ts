import type { CopyKey } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeErrorCode } from '../../../shared/models/Worktree.ts';

const errorKeys = {
    accessDenied: 'worktreeAccessDenied',
    gitMissing: 'worktreeGitMissing',
    notRepository: 'worktreeNotRepository',
    noCommits: 'worktreeNoCommits',
    invalidBranch: 'worktreeInvalidBranch',
    sourceMissing: 'worktreeSourceMissing',
    branchExists: 'worktreeBranchExists',
    branchMissing: 'worktreeBranchMissing',
    branchOccupied: 'worktreeBranchOccupied',
    invalidFolder: 'worktreeInvalidFolder',
    invalidBasePath: 'worktreeInvalidBasePath',
    pathExists: 'worktreePathExists',
    ignoreFailed: 'worktreeIgnoreFailed',
    readOnly: 'worktreeReadOnly',
    worktreeMissing: 'worktreeMissing',
    gitFailed: 'worktreeGitFailed'
} as const satisfies Record<WorktreeErrorCode, CopyKey>;

function isWorktreeErrorCode(code: string): code is WorktreeErrorCode {
    return Object.hasOwn(errorKeys, code);
}

export function getWorktreeErrorKey(error: Error | undefined, fallback: CopyKey): CopyKey {
    const code = error && 'code' in error ? error.code : undefined;
    return typeof code === 'string' && isWorktreeErrorCode(code) ? errorKeys[code] : fallback;
}

export function shouldRefreshWorktree(key: CopyKey): boolean {
    return (
        key === 'worktreeSourceMissing' || key === 'worktreeBranchMissing' || key === 'worktreeBranchOccupied' || key === 'worktreeMissing'
    );
}
