import { Context } from '@deepseek-ai/cordis';
import { expect, it, onTestFinished, vi } from 'vitest';
import { registerWorktreeRoutes } from '../src/host/api/worktreeRoutes.ts';
import { resolveConfig } from '../src/host/config.ts';
import { AddirStorage } from '../src/host/services/AddirStorage.ts';
import { WorkspaceDirectoriesServiceImpl } from '../src/host/services/WorkspaceDirectoriesService.ts';
import * as worktrees from '../src/host/services/WorktreeService.ts';

// The root Vitest suite shares the module cache between files in a worker.
vi.hoisted(() => vi.resetModules());

const { prepareWorktree } = worktrees;

vi.mock('../src/host/services/WorktreeService.ts', async importOriginal => ({
    ...(await importOriginal<typeof worktrees>()),
    prepareWorktree: vi.fn()
}));

interface TestRoute {
    path: string;
    methods: readonly string[];
    fetch(request: Request): Promise<Response>;
}

it('accepts only registered workspace identities and validated worktree operations on Connection routes', async () => {
    const ctx = new Context();
    onTestFinished(() => ctx.fiber.dispose());
    const service = new WorkspaceDirectoriesServiceImpl(resolveConfig(), process.cwd(), new AddirStorage(':memory:'));
    const routes = new Map<string, TestRoute>();
    const protectedPath = `${process.cwd()}/protected`;
    vi.spyOn(service, 'getDirectoriesForWorkspace').mockReturnValue([
        { path: protectedPath, alias: 'protected', readOnly: true, addedAt: 0, source: 'dynamic' }
    ]);
    ctx.provide('connection', {
        fetch: { register: (route: TestRoute) => {
            routes.set(route.path, route);
            return () => routes.delete(route.path);
        } }
    });
    ctx.provide('workspaceRegistry', { list: () => [{ id: 'one', path: process.cwd() }] });
    await registerWorktreeRoutes(ctx, service).await();
    const route = routes.get('/api/dsh-workspace-worktree/prepare');
    if (!route) throw new Error('Expected Connection Fetch route');
    expect(route.methods).toEqual(['POST']);
    const send = (body: object, contentType = 'application/json') => route.fetch(new Request(`http://localhost${route.path}`, {
        method: 'POST', headers: { 'Content-Type': contentType }, body: JSON.stringify(body)
    }));
    const selection = { mode: 'open', path: protectedPath };
    expect((await send({ workspaceId: 'one', selection }, 'text/plain')).status).toBe(415);
    expect((await send({ workspaceId: 'unknown', workspacePath: process.cwd(), selection })).status).toBe(404);
    expect((await send({ workspaceId: 'one', selection: { mode: 'new', branch: 'new' } })).status).toBe(400);
    expect(prepareWorktree).not.toHaveBeenCalled();
    vi.mocked(prepareWorktree).mockImplementation(async (_path, input) => input.mode === 'open' ? input.path : '');
    const denied = await send({ workspaceId: 'one', selection });
    expect(denied.status).toBe(409);
    expect(await denied.json()).toEqual({ ok: false, code: 'readOnly' });
    const allowedPath = `${process.cwd()}/worktree-target`;
    const allowed = await send({ workspaceId: 'one', selection: { mode: 'open', path: allowedPath } });
    expect(await allowed.json()).toEqual({ ok: true, path: allowedPath });
    expect(prepareWorktree).toHaveBeenLastCalledWith(process.cwd(), { mode: 'open', path: allowedPath }, expect.any(Function));
});
