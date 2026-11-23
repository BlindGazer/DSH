import type { Context } from '@deepseek-ai/cordis';
import { type DshLogger, NOOP_LOGGER } from '@kalex/dsh-logger-core';
import { discoverVscodeWorkspaces, launchVscode, VscodeError } from '../services/VscodeService.ts';

interface VscodeRoute {
    readonly path: string;
    readonly methods: readonly ['POST'];
    readonly requestBody: 'buffered';
    readonly fetch: (request: Request) => Promise<Response>;
}

interface VscodeContext {
    readonly connection: { readonly fetch: { register(route: VscodeRoute): () => Promise<void> } };
    readonly workspaceRegistry: { list(): readonly { readonly id: string; readonly path: string }[] };
}

function response(value: object, status = 200): Response {
    return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function text(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 32768 && !value.includes('\0');
}

export function registerVscodeRoutes(ctx: Context, enabled: () => boolean, logger: DshLogger = NOOP_LOGGER) {
    return ctx.inject(['connection', 'workspaceRegistry'], scope => {
        const { connection, workspaceRegistry } = scope as Context & VscodeContext;
        const discoveries = new Map<string, { path: string; files: readonly string[] }>();
        for (const action of ['discover', 'launch'] as const) {
            scope.effect(() =>
                connection.fetch.register({
                    path: `/api/dsh-workspace-vscode/${action}`,
                    methods: ['POST'],
                    requestBody: 'buffered',
                    fetch: async request => {
                        if (!enabled()) return response({ ok: false, code: 'vscodeDisabled' }, 403);
                        if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
                            return response({ ok: false }, 415);
                        }
                        const body: unknown = await request.json().catch(() => undefined);
                        if (!body || typeof body !== 'object' || !('workspaceId' in body) || !text(body.workspaceId))
                            return response({ ok: false }, 400);
                        const file = 'workspaceFile' in body ? body.workspaceFile : undefined;
                        if (file !== undefined && !text(file)) return response({ ok: false }, 400);
                        const workspace = workspaceRegistry.list().find(item => item.id === body.workspaceId);
                        if (workspace === undefined) return response({ ok: false, code: 'accessDenied' }, 404);
                        try {
                            if (action === 'discover') {
                                discoveries.delete(workspace.id);
                                const files = await discoverVscodeWorkspaces(workspace.path);
                                discoveries.set(workspace.id, { path: workspace.path, files });
                                return response({ ok: true, workspaceFiles: files });
                            }
                            const discovery = discoveries.get(workspace.id);
                            if (
                                discovery?.path !== workspace.path ||
                                (file === undefined ? discovery.files.length > 0 : !discovery.files.includes(file))
                            ) {
                                throw new VscodeError('workspaceFileMissing');
                            }
                            await launchVscode(workspace.path, file);
                            return response({ ok: true });
                        } catch (error) {
                            const code = error instanceof VscodeError ? error.code : 'vscodeFailed';
                            if (code !== 'accessDenied') {
                                logger.record({
                                    event: 'workspace-vscode-failed',
                                    level: 'error',
                                    operation: action,
                                    data: { code }
                                });
                            }
                            return response({ ok: false, code }, code === 'accessDenied' ? 404 : code === 'vscodeFailed' ? 500 : 409);
                        }
                    }
                })
            );
        }
    });
}
