// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { apply } from '../src/client/index.tsx';
import type { WorkspaceManagerClientContext } from '../src/client/models/WorkspaceManagerClientContext.ts';
import { en } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.ts';

vi.mock('../src/client/worktreeApi.ts', () => ({
    inspectWorktrees: vi.fn(async () => ({
        currentBranch: 'main', defaultBasePath: '/repo-worktrees', branches: ['main'], occupiedBranches: ['main'],
        checkouts: [{ path: '/repo-worktrees/work', branch: 'work' }]
    })),
    prepareWorktree: vi.fn(async () => '/repo-worktrees/work')
}));

const dispose: Array<() => void> = [];
afterEach(() => {
    cleanup();
    for (const effect of dispose.splice(0)) effect();
});

it('opens an explicitly new session in the selected worktree via the native workspace menu', async () => {
    type Menu = Parameters<WorkspaceManagerClientContext['contextMenus']['register']>[0];
    let menu: Menu | undefined;
    let overlay: ComponentType | undefined;
    const workspaceCreate = vi.fn(async () => ({ workspaceId: 'registered-worktree' }));
    const sessionCreate = vi.fn(async () => 'fresh-session');
    const openSession = vi.fn().mockImplementationOnce(() => { throw new Error('Navigation failed'); });
    const target = { workspaceId: 'source', path: '/repo', displayTitle: 'Repo' };
    const allowed = { getSnapshot: vi.fn(() => false), subscribe: () => () => undefined };
    const context = {
        effect: (start: () => () => void) => { dispose.push(start()); },
        contextMenus: { register: (input: Menu) => { menu = input; return () => undefined; } },
        remoteAccess: { source: () => allowed },
        slots: {
            inject: (_: string, install: () => void) => install(),
            register: ({ id }: { id: string }, component: ComponentType) => { if (id.endsWith('.worktree')) overlay = component; }
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
    render(createElement(overlay));
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
