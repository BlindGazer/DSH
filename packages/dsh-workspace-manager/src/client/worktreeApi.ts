import type { WorktreeDeletionWarning, WorktreeRepository, WorktreeSelection } from '../shared/models/Worktree.ts';

type Json = null | boolean | number | string | Json[] | JsonRecord;
interface JsonRecord {
    readonly [key: string]: Json | undefined;
}

function isRecord(value: Json | undefined): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: Json | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isBranch(value: Json | undefined): value is string | null {
    return value === null || isText(value);
}

function parseRepository(value: Json | undefined): WorktreeRepository {
    if (isRecord(value)) {
        const { currentBranch, defaultBasePath, branches, occupiedBranches, checkouts, isLinkedWorktree } = value;
        if (
            isBranch(currentBranch) &&
            isText(defaultBasePath) &&
            Array.isArray(branches) &&
            branches.every(isText) &&
            Array.isArray(occupiedBranches) &&
            occupiedBranches.every(isText) &&
            Array.isArray(checkouts)
        ) {
            return {
                currentBranch,
                isLinkedWorktree: isLinkedWorktree === true,
                defaultBasePath,
                branches,
                occupiedBranches,
                checkouts: checkouts.map(checkout => {
                    if (!isRecord(checkout) || !isText(checkout.path) || !isBranch(checkout.branch))
                        throw new Error('Invalid worktree checkout');
                    return { path: checkout.path, branch: checkout.branch };
                })
            };
        }
    }
    throw new Error('Invalid worktree repository');
}

async function request(route: string, body: object, signal?: AbortSignal): Promise<JsonRecord> {
    const response = await fetch(new URL(`api/dsh-workspace-${route}`, document.baseURI), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        ...(signal === undefined ? {} : { signal })
    });
    if (response.status === 401 || response.status === 403)
        throw Object.assign(new Error('Worktree access denied'), { code: 'accessDenied' });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Worktree API unavailable');
    const result: Json = await response.json();
    if (!isRecord(result)) throw new Error('Invalid worktree response');
    if (!response.ok || result.ok !== true) throw Object.assign(new Error('Worktree request failed'), { code: result.code });
    return result;
}

export async function inspectWorktrees(workspaceId: string, signal?: AbortSignal): Promise<WorktreeRepository> {
    return parseRepository((await request('worktree/inspect', { workspaceId }, signal)).repository);
}

export async function prepareWorktree(workspaceId: string, selection: WorktreeSelection): Promise<string> {
    const { path } = await request('worktree/prepare', { workspaceId, selection });
    if (!isText(path)) throw new Error('Invalid worktree path');
    return path;
}

interface DeleteWorktreeRequest {
    readonly worktreePath: string;
    readonly expectedBranch: string | null;
    readonly deleteBranch: boolean;
    readonly mergeInto?: string;
}

function isDeletionWarning(value: Json): value is WorktreeDeletionWarning {
    return value === 'branchDeleteFailed' || value === 'mergeCleanupFailed';
}

export async function deleteWorktree(workspaceId: string, input: DeleteWorktreeRequest): Promise<readonly WorktreeDeletionWarning[]> {
    const { result } = await request('worktree/delete', { workspaceId, ...input });
    if (
        !isRecord(result) ||
        result.worktreeRemoved !== true ||
        !Array.isArray(result.warnings) ||
        !result.warnings.every(isDeletionWarning)
    ) {
        throw new Error('Invalid worktree removal result');
    }
    return result.warnings;
}

export async function discoverVscode(workspaceId: string, signal?: AbortSignal): Promise<string[]> {
    const { workspaceFiles } = await request('vscode/discover', { workspaceId }, signal);
    if (!Array.isArray(workspaceFiles) || !workspaceFiles.every(isText)) throw new Error('Invalid workspace files');
    return workspaceFiles;
}

export async function launchVscode(workspaceId: string, workspaceFile?: string): Promise<void> {
    await request('vscode/launch', { workspaceId, workspaceFile });
}
