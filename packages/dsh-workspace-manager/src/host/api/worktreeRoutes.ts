import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceDirectoriesService } from '../../shared/models/WorkspaceDirectories.ts';
import type { WorktreeSelection } from '../../shared/models/Worktree.ts';
import { isHarnessProfilePath, isSubPath } from '../services/pathUtils.ts';
import { inspectWorktreeRepository, prepareWorktree, WorktreeError } from '../services/WorktreeService.ts';

const prefix = '/api/dsh-workspace-worktree';

interface WorktreeFetchRoute {
    readonly path: string;
    readonly methods: readonly ['POST'];
    readonly requestBody: 'buffered';
    readonly fetch: (request: Request) => Promise<Response>;
}

interface WorktreeHostContext {
    readonly connection: { readonly fetch: { register(route: WorktreeFetchRoute): () => Promise<void> } };
    readonly workspaceRegistry: { list(): readonly { readonly id: string; readonly path: string }[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 32768 && !value.includes('\0');
}

function parseSelection(value: unknown): WorktreeSelection | undefined {
    if (!isRecord(value)) return undefined;
    const { mode, path, basePath, folderName, branch, sourceBranch } = value;
    if (mode === 'open' && text(path)) return { mode, path };
    if (!text(basePath) || !text(folderName) || !text(branch)) return undefined;
    if (mode === 'new' && text(sourceBranch)) return { mode, basePath, folderName, branch, sourceBranch };
    if (mode === 'existing') return { mode, basePath, folderName, branch };
    return undefined;
}

function response(value: object, status = 200): Response {
    return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function registerWorktreeRoutes(ctx: Context, service: WorkspaceDirectoriesService) {
    return ctx.inject(['connection', 'workspaceRegistry'], scope => {
        const { connection, workspaceRegistry } = scope as Context & WorktreeHostContext;
        const route = (action: 'inspect' | 'prepare'): WorktreeFetchRoute => ({
            path: `${prefix}/${action}`,
            methods: ['POST'],
            requestBody: 'buffered',
            fetch: async request => {
                // Exact Connection Fetch routes admit only an authenticated owner.
                if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
                    return response({ ok: false }, 415);
                }
                const body: unknown = await request.json().catch(() => undefined);
                if (!isRecord(body) || !text(body.workspaceId)) return response({ ok: false }, 400);
                try {
                    const workspace = workspaceRegistry.list().find(item => item.id === body.workspaceId);
                    if (workspace === undefined || isHarnessProfilePath(workspace.path)) return response({ ok: false }, 404);
                    if (action === 'inspect') return response({ ok: true, repository: await inspectWorktreeRepository(workspace.path) });
                    const selection = parseSelection(body.selection);
                    if (selection === undefined) return response({ ok: false }, 400);
                    const protectedDirs = [...service.list(), ...service.getDirectoriesForWorkspace(workspace.path)].filter(
                        dir => dir.readOnly
                    );
                    const checkWritable = (path: string): void => {
                        if (isHarnessProfilePath(path) || protectedDirs.some(dir => isSubPath(path, dir.path))) {
                            throw new WorktreeError('readOnly');
                        }
                    };
                    const path = await prepareWorktree(workspace.path, selection, checkWritable);
                    checkWritable(path);
                    return response({ ok: true, path });
                } catch (error) {
                    const code = error instanceof WorktreeError ? error.code : 'gitFailed';
                    if (code === 'gitFailed') {
                        const name = error instanceof Error ? error.name : 'unknown';
                        console.error('[dsh-workspace-manager] worktree operation failed', action, name);
                        scope.get('dshLoggerService')?.getLogger({ packageName: '@kalex/dsh-workspace-manager' }, 'host').record({
                            event: 'workspace-worktree-failed',
                            level: 'error',
                            operation: action,
                            data: { code, name }
                        });
                    }
                    return response({ ok: false, code }, code === 'gitFailed' ? 500 : 409);
                }
            }
        });
        for (const action of ['inspect', 'prepare'] as const) scope.effect(() => connection.fetch.register(route(action)));
    });
}
