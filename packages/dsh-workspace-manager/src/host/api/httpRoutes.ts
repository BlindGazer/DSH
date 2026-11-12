/**
 * HTTP / REST API routes for Addir directory management.
 * Consumed by the workspace editor and profile-wide settings.
 *
 * @module dsh-workspace-manager/api
 */

import { existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { ConfigEditor } from '@deepseek-ai/dsh-config-editor';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { AddDirectoryOptions, WorkspaceDirectoriesService } from '../../shared/models/WorkspaceDirectories.js';
import { type ResolvedConfig, resolveConfig } from '../config.js';
import { canonicalizePath } from '../services/pathUtils.js';

function writeJson(res: ServerResponse, status: number, body: object): void {
    const json = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(json),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(json);
}

function readJsonBody<T extends object>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf-8');
                if (!raw.trim()) {
                    resolve({} as T);
                    return;
                }
                resolve(JSON.parse(raw) as T);
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

export function registerAddirRoutes(ctx: Context, service: WorkspaceDirectoriesService, config: ResolvedConfig = resolveConfig()) {
    return ctx.inject(['webServer'], webCtx => {
        webCtx.effect(() =>
            webCtx.webServer.register({
                kind: 'prefix',
                path: '/api/dsh-workspace-manager',
                handler: async (req, res) => {
                    if (req.method === 'OPTIONS') {
                        res.writeHead(204, {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                        });
                        res.end();
                        return;
                    }

                    const url = new URL(req.url ?? '/', 'http://dsh.internal');
                    const action = url.pathname.replace(/^\/api\/dsh-workspace-manager\/?/, '');

                    try {
                        if (action === 'config') {
                            if (req.method === 'GET') {
                                writeJson(res, 200, { ok: true, config });
                                return;
                            }
                            if (req.method !== 'POST') {
                                writeJson(res, 405, { ok: false, error: 'Method not allowed' });
                                return;
                            }
                            const body = await readJsonBody<{
                                enableTools?: boolean;
                                enableContextInjection?: boolean;
                                enforceReadOnly?: boolean;
                            }>(req);
                            const keys = ['enableTools', 'enableContextInjection', 'enforceReadOnly'] as const;
                            if (!body || keys.some(key => typeof body[key] !== 'boolean')) {
                                writeJson(res, 400, {
                                    ok: false,
                                    error: 'Configuration switches must be booleans'
                                });
                                return;
                            }
                            const editor: ConfigEditor | undefined = ctx.get('configEditor');
                            const entry = editor?.entries().find(row => row.options.name === 'dsh-workspace-manager');
                            if (!editor || !entry) {
                                writeJson(res, 409, {
                                    ok: false,
                                    error: 'Profile configuration editor is unavailable'
                                });
                                return;
                            }
                            await editor.edit(entry, current => ({
                                ...current,
                                ...Object.fromEntries(keys.map(key => [key, body[key]]))
                            }));
                            writeJson(res, 200, { ok: true });
                            return;
                        }

                        if (action === 'replace') {
                            if (req.method !== 'POST') {
                                writeJson(res, 405, { ok: false, error: 'Method not allowed' });
                                return;
                            }
                            const body = await readJsonBody<{
                                workspacePath?: string;
                                directories?: AddDirectoryOptions[];
                            }>(req);
                            if (!body || typeof body.workspacePath !== 'string' || !Array.isArray(body.directories)) {
                                writeJson(res, 400, {
                                    ok: false,
                                    error: 'Workspace path and directories are required'
                                });
                                return;
                            }
                            const directories: AddDirectoryOptions[] = [];
                            for (const item of body.directories) {
                                if (
                                    !item ||
                                    typeof item !== 'object' ||
                                    typeof item.path !== 'string' ||
                                    (item.alias !== undefined && typeof item.alias !== 'string') ||
                                    (item.description !== undefined && typeof item.description !== 'string') ||
                                    typeof item.readOnly !== 'boolean'
                                ) {
                                    writeJson(res, 400, {
                                        ok: false,
                                        error: 'Invalid directory fields'
                                    });
                                    return;
                                }
                                directories.push({
                                    path: item.path,
                                    alias: item.alias,
                                    description: item.description,
                                    readOnly: item.readOnly
                                });
                            }
                            try {
                                writeJson(res, 200, {
                                    ok: true,
                                    directories: service.replaceWorkspaceDirectories(body.workspacePath, directories)
                                });
                            } catch (error) {
                                writeJson(res, 400, {
                                    ok: false,
                                    error: error instanceof Error ? error.message : String(error)
                                });
                            }
                            return;
                        }
                        if (action === 'list') {
                            let workspacePath = url.searchParams.get('workspacePath');
                            let sessionId = url.searchParams.get('sessionId') ?? undefined;

                            if (req.method === 'POST') {
                                const body = await readJsonBody<{
                                    workspacePath?: string;
                                    sessionId?: string;
                                }>(req);
                                if (body.workspacePath) workspacePath = body.workspacePath;
                                if (body.sessionId) sessionId = body.sessionId;
                            }

                            if (workspacePath) {
                                const dirs = service.getDirectoriesForWorkspace(workspacePath);
                                writeJson(res, 200, {
                                    ok: true,
                                    workspacePath: canonicalizePath(workspacePath),
                                    directories: dirs
                                });
                                return;
                            }

                            const dirs = service.list(sessionId);
                            writeJson(res, 200, {
                                ok: true,
                                directories: dirs
                            });
                            return;
                        }

                        if (action === 'add') {
                            if (req.method !== 'POST') {
                                writeJson(res, 405, { ok: false, error: 'Method not allowed' });
                                return;
                            }
                            const body = await readJsonBody<{
                                workspacePath?: string;
                                sessionId?: string;
                                path: string;
                                alias?: string;
                                readOnly?: boolean;
                                description?: string;
                            }>(req);

                            if (!body.path) {
                                writeJson(res, 400, { ok: false, error: 'Path is required' });
                                return;
                            }

                            const options: AddDirectoryOptions = {
                                path: body.path,
                                alias: body.alias,
                                readOnly: body.readOnly,
                                description: body.description
                            };

                            const entry = body.workspacePath
                                ? await service.addDirectoryToWorkspace(body.workspacePath, options)
                                : await service.add(options, body.sessionId);

                            writeJson(res, 200, { ok: true, entry });
                            return;
                        }

                        if (action === 'remove') {
                            if (req.method !== 'POST') {
                                writeJson(res, 405, { ok: false, error: 'Method not allowed' });
                                return;
                            }
                            const body = await readJsonBody<{
                                workspacePath?: string;
                                sessionId?: string;
                                pathOrAlias: string;
                            }>(req);

                            if (!body.pathOrAlias) {
                                writeJson(res, 400, {
                                    ok: false,
                                    error: 'pathOrAlias is required'
                                });
                                return;
                            }

                            let success: boolean;
                            if (body.workspacePath) {
                                success = await service.removeDirectoryFromWorkspace(body.workspacePath, body.pathOrAlias);
                            } else {
                                success = await service.remove(body.pathOrAlias, body.sessionId);
                            }

                            writeJson(res, 200, { ok: true, removed: success });
                            return;
                        }

                        if (action === 'validate') {
                            const body = await readJsonBody<{ path: string }>(req);
                            if (!body.path) {
                                writeJson(res, 400, { ok: false, error: 'Path is required' });
                                return;
                            }
                            const exists = existsSync(body.path);
                            const isDir = exists && statSync(body.path).isDirectory();
                            writeJson(res, 200, {
                                ok: true,
                                exists,
                                isDirectory: isDir,
                                canonicalPath: exists ? canonicalizePath(body.path) : undefined
                            });
                            return;
                        }

                        writeJson(res, 404, {
                            ok: false,
                            error: `Unknown endpoint "${action}"`
                        });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        writeJson(res, 500, { ok: false, error: message });
                    }
                }
            } satisfies WebRoute)
        );
    });
}
