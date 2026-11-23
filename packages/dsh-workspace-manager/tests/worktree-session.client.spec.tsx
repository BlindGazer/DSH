// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { apply } from '../src/client/index.tsx';
import type { WorkspaceManagerClientContext } from '../src/client/models/WorkspaceManagerClientContext.ts';
import { en } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.ts';
import { inspectWorktrees } from '../src/client/worktreeApi.ts';

vi.mock('../src/client/worktreeApi.ts', () => ({
    inspectWorktrees: vi.fn(async () => ({
        currentBranch: 'main', isLinkedWorktree: false, defaultBasePath: '/repo-worktrees', branches: ['main'], occupiedBranches: ['main'],
        checkouts: [{ path: '/repo-worktrees/work', branch: 'work' }]
    })),
    prepareWorktree: vi.fn(async () => '/repo-worktrees/work'),
    deleteWorktree: vi.fn(async () => ['branchDeleteFailed'])
}));

const dispose: Array<() => void> = [];

it('opens the worktree action in the same menu group as native deletion', async () => {
    const target = { workspaceId: 'work', path: '/repo-worktrees/work', displayTitle: 'Work' };
    vi.mocked(inspectWorktrees).mockResolvedValueOnce({
        currentBranch: 'work', isLinkedWorktree: true, defaultBasePath: '/repo-worktrees',
        branches: ['main', 'work'], occupiedBranches: ['main', 'work'], checkouts: []
    });
    type Menu = Parameters<WorkspaceManagerClientContext['contextMenus']['register']>[0];
    const menus: Menu[] = [];
    let overlay: ComponentType<{ t: (key: keyof typeof en) => string }> | undefined;
    const context = {
        effect: (start: () => () => void) => { const release = start(); dispose.push(release); return release; },
        contextMenus: { register: (menu: Menu) => { menus.push(menu); return () => undefined; } },
        remoteAccess: { source: () => ({ getSnapshot: () => true, subscribe: () => () => undefined }) },
        slots: {
            inject: (_: string, install: () => void) => install(),
            register: ({ id }: { id: string }, component: ComponentType<{ t: (key: keyof typeof en) => string }>) => { if (id.endsWith('.delete-worktree')) overlay = component; return () => undefined; }
        },
        locale: {
            register: () => () => undefined,
            bind: () => (key: string) => key === 'rename' ? 'Rename' : Object.entries(en).find(([name]) => name === key)?.[1] ?? key,
            getLocale: () => ({ active: 'en' as const, revision: 0 }),
            subscribe: () => () => undefined,
            getSnapshot: () => ({ active: 'en' as const, revision: 0 })
        },
        workspaces: { create: vi.fn(), rename: vi.fn(), delete: vi.fn() },
        uiWorkspace: { openSession: vi.fn(), pickDirectory: vi.fn() },
        sessions: { create: vi.fn() }
    };
    apply(context as Parameters<typeof apply>[0]);
    const menu = menus.find(item => item.id.endsWith('.delete-worktree'));
    if (!menu || !overlay) throw new Error('Expected a delete contribution and a shell overlay');
    expect(menu.order).toBeGreaterThan(300);
    const unsubscribe = menu.observe(target).map(source => source.subscribe(() => undefined));
    await waitFor(() => expect(menu.resolve(target)).toHaveLength(1));
    const [action] = menu.resolve(target);
    expect(action).toBeDefined();
    expect(action).not.toHaveProperty('separatorBefore');
    expect(action).not.toHaveProperty('afterContent');
    for (const release of unsubscribe) release();
    action?.run();
    render(createElement(overlay, { t: key => en[key] }));
    expect(screen.getByText(en.worktreeDeleteFolder)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: en.worktreeDeleteBranch }));
    fireEvent.click(screen.getByRole('button', { name: en.worktreeDelete }));
    expect(await screen.findByText(en.worktreeBranchDeleteFailed)).toBeTruthy();
    expect(context.workspaces.delete).toHaveBeenCalledExactlyOnceWith(target.workspaceId);
    expect(screen.queryByText(en.worktreeDeleteFolder)).toBeNull();
});
afterEach(() => {
    cleanup();
    for (const effect of dispose.splice(0)) effect();
});

it('opens an explicitly new session in the selected worktree via the native workspace menu', async () => {
    type Menu = Parameters<WorkspaceManagerClientContext['contextMenus']['register']>[0];
    let menu: Menu | undefined;
    let overlay: ComponentType<{ t: (key: keyof typeof en) => string }> | undefined;
    const workspaceCreate = vi.fn(async () => ({ workspaceId: 'registered-worktree' }));
    const sessionCreate = vi.fn(async () => 'fresh-session');
    const openSession = vi.fn().mockImplementationOnce(() => { throw new Error('Navigation failed'); });
    const target = { workspaceId: 'source', path: '/repo', displayTitle: 'Repo' };
    const allowed = { getSnapshot: vi.fn(() => false), subscribe: () => () => undefined };
    const context = {
        effect: (start: () => () => void) => { dispose.push(start()); },
        contextMenus: { register: (input: Menu) => { if (input.id.endsWith('.worktree')) menu = input; return () => undefined; } },
        remoteAccess: { source: () => allowed },
        slots: {
            inject: (_: string, install: () => void) => install(),
            register: ({ id }: { id: string }, component: ComponentType<{ t: (key: keyof typeof en) => string }>) => {
                if (id.endsWith('.worktree')) overlay = component;
            }
        },
        locale: { register: () => () => undefined, bind: () => (key: keyof typeof en) => en[key], subscribe: () => () => undefined, getSnapshot: () => 0 },
        workspaces: { create: workspaceCreate },
        sessions: { create: sessionCreate },
        uiWorkspace: { openSession }
    } as unknown as Parameters<typeof apply>[0];
    apply(context);
    if (!menu || !overlay) throw new Error('Expected a native menu contribution and a shell overlay');
    expect(menu.target).toBe('workspace');
    expect(menu.order).toBeGreaterThan(100);
    expect(menu.resolve(target)).toEqual([]);
    allowed.getSnapshot.mockReturnValue(true);
    const [action] = menu.resolve(target);
    expect(action?.label).toBe(en.worktreeTitle);
    action?.run();
    render(createElement(overlay, { t: key => en[key] }));
    fireEvent.click(await screen.findByRole('radio', { name: /Open existing worktree/i }));
    fireEvent.click(screen.getByRole('button', { name: en.worktreeCheckout }));
    fireEvent.click(screen.getByRole('button', { name: 'work (/repo-worktrees/work)' }));
    fireEvent.click(screen.getByRole('button', { name: en.worktreeOpenAction }));
    fireEvent.click(await screen.findByRole('button', { name: en.worktreeRetryOpen }));
    await waitFor(() => expect(openSession).toHaveBeenCalledTimes(2));
    expect(openSession).toHaveBeenLastCalledWith('fresh-session');
    expect(workspaceCreate).toHaveBeenCalledExactlyOnceWith({ path: '/repo-worktrees/work' });
    expect(sessionCreate).toHaveBeenCalledExactlyOnceWith({ workspaceId: 'registered-worktree' });
});
