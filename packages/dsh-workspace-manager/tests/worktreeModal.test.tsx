// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorktreeModal, type WorktreeModalProps } from '../src/client/features/worktree/WorktreeModal.tsx';
import { ru } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository } from '../src/shared/models/Worktree.ts';

import { inspectWorktrees, prepareWorktree } from '../src/client/worktreeApi.ts';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function repository(overrides: Partial<WorktreeRepository> = {}): WorktreeRepository {
    return {
        currentBranch: 'main',
        isLinkedWorktree: false,
        defaultBasePath: '/projects/repo-worktrees',
        branches: ['main', 'feature', 'busy'],
        occupiedBranches: ['main', 'busy'],
        checkouts: [{ path: '/projects/repo-worktrees/detached', branch: null }],
        ...overrides
    };
}

function renderDialog(overrides: Partial<WorktreeModalProps> = {}) {
    const props = {
        target: { workspaceId: 'project', displayTitle: 'Project', path: '/projects/repo' },
        t: key => ru[key],
        inspect: vi.fn<WorktreeModalProps['inspect']>().mockResolvedValue(repository()),
        prepare: vi.fn<WorktreeModalProps['prepare']>().mockResolvedValue('/prepared'),
        openSession: vi.fn<WorktreeModalProps['openSession']>().mockResolvedValue(undefined),
        pick: vi.fn<WorktreeModalProps['pick']>().mockResolvedValue('/selected'),
        onClose: vi.fn(),
        ...overrides
    } satisfies WorktreeModalProps;
    return { ...render(<WorktreeModal {...props} />), ...props };
}

it('shows an inspection error for an incomplete success response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true })));
    renderDialog({ inspect: signal => inspectWorktrees('project', signal) });
    expect(await screen.findByText(ru.worktreeInspectFailed)).toBeTruthy();
    expect(screen.queryByText(ru.worktreeMode)).toBeNull();
});

it.each([{}, { path: ' ' }, { path: 42 }])('shows a preparation error for an invalid success response: %j', async result => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true, ...result })));
    const { openSession } = renderDialog({ prepare: selection => prepareWorktree('project', selection) });
    await screen.findByRole('button', { name: ru.worktreeSourceBranch });
    fillNewBranch();
    fireEvent.click(button(ru.worktreeCreate));
    expect(await screen.findByText(ru.worktreeGitFailed)).toBeTruthy();
    expect(openSession).not.toHaveBeenCalled();
});

function button(name: string) {
    return screen.getByRole('button', { name });
}

function type(name: string, value: string) {
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
}

function fillNewBranch(): void {
    type(ru.worktreeBranchName, 'feature/new');
    type(ru.worktreeFolderName, 'feature-new');
}

it('starts from the current branch and creates a session for the chosen destination', async () => {
    const props = renderDialog();
    await screen.findByRole('button', { name: ru.worktreeSourceBranch });
    expect(screen.getByText('Project')).toBeTruthy();
    expect(screen.getByLabelText(ru.worktreeSourceBranch)).toHaveProperty('textContent', 'main');
    expect(screen.getByDisplayValue('/projects/repo-worktrees')).toBeTruthy();
    expect(button(ru.worktreeCreate)).toHaveProperty('disabled', true);

    fireEvent.click(button(ru.browse));
    await screen.findByDisplayValue('/selected');
    fillNewBranch();
    expect(screen.getByText('/selected/feature-new')).toBeTruthy();
    fireEvent.click(button(ru.worktreeCreate));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(props.prepare).toHaveBeenCalledWith({
        mode: 'new', branch: 'feature/new', sourceBranch: 'main', basePath: '/selected', folderName: 'feature-new'
    });
    expect(props.openSession).toHaveBeenCalledExactlyOnceWith('/prepared');
});

it('starts with no source selected on a detached HEAD and lists all local branches', async () => {
    renderDialog({ inspect: vi.fn().mockResolvedValue(repository({ currentBranch: null })) });
    await screen.findByText(ru.worktreeDetached);
    fillNewBranch();
    expect(button(ru.worktreeCreate)).toHaveProperty('disabled', true);

    fireEvent.click(button(ru.worktreeSourceBranch));
    fireEvent.click(button('busy'));

    expect(button(ru.worktreeCreate)).toHaveProperty('disabled', false);
});

it('closes the open branch select before closing the dialog on Escape', async () => {
    const { onClose } = renderDialog();
    const trigger = await screen.findByRole('button', { name: ru.worktreeSourceBranch });
    fillNewBranch();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const option = button('feature');
    act(() => option.focus());
    fireEvent.keyDown(option, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'feature' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByDisplayValue('feature/new')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
});

it('only offers free local branches in existing branch mode', async () => {
    const props = renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(`^${ru.worktreeExisting}`) }));
    fireEvent.click(button(ru.worktreeFreeBranch));
    expect(screen.queryByRole('button', { name: 'busy' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'main' })).toBeNull();
    fireEvent.click(button('feature'));
    type(ru.worktreeFolderName, 'free-feature');
    fireEvent.click(button(ru.worktreeCreate));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(props.prepare).toHaveBeenCalledWith({
        mode: 'existing', branch: 'feature', basePath: '/projects/repo-worktrees', folderName: 'free-feature'
    });
});

it('opens a detached worktree by its full path without destination fields', async () => {
    const props = renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(`^${ru.worktreeOpen}`) }));
    expect(screen.queryByRole('textbox', { name: ru.worktreeBasePath })).toBeNull();
    fireEvent.click(button(ru.worktreeCheckout));
    fireEvent.click(button(`${ru.worktreeDetached} (/projects/repo-worktrees/detached)`));
    fireEvent.click(button(ru.worktreeOpenAction));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(props.prepare).toHaveBeenCalledExactlyOnceWith({ mode: 'open', path: '/projects/repo-worktrees/detached' });
    expect(props.openSession).toHaveBeenCalledExactlyOnceWith('/prepared');
});

it.each([
    [ru.worktreeNew, ru.worktreeNoBranches, ru.worktreeCreate],
    [ru.worktreeExisting, ru.worktreeNoFreeBranches, ru.worktreeCreate],
    [ru.worktreeOpen, ru.worktreeNoCheckouts, ru.worktreeOpenAction]
])('keeps %s blocked when no options are available', async (mode, emptyMessage, action) => {
    renderDialog({ inspect: vi.fn().mockResolvedValue(repository({ currentBranch: null, branches: [], checkouts: [] })) });
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(`^${mode}`) }));
    expect(screen.getByText(emptyMessage)).toBeTruthy();
    expect(button(action)).toHaveProperty('disabled', true);
});

it('refreshes after a stale source error and preserves the editable draft', async () => {
    const inspect = vi.fn<WorktreeModalProps['inspect']>()
        .mockResolvedValueOnce(repository())
        .mockResolvedValueOnce(repository({ branches: ['main', 'busy'] }));
    const prepare = vi.fn<WorktreeModalProps['prepare']>().mockRejectedValue(Object.assign(new Error('raw Git detail'), { code: 'sourceMissing' }));
    renderDialog({ inspect, prepare });
    await screen.findByRole('button', { name: ru.worktreeSourceBranch });
    fireEvent.click(button(ru.worktreeSourceBranch));
    fireEvent.click(button('feature'));
    fillNewBranch();
    type(ru.worktreeBasePath, '/custom');
    fireEvent.click(button(ru.worktreeCreate));

    await screen.findByText(ru.worktreeSourceMissing);
    await waitFor(() => expect(screen.getByLabelText(ru.worktreeSourceBranch)).toHaveProperty('textContent', ru.worktreeSelectBranch));
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(screen.getByDisplayValue('feature/new')).toBeTruthy();
    expect(screen.getByText('/custom/feature-new')).toBeTruthy();
    expect(screen.queryByText('raw Git detail')).toBeNull();
    expect(button(ru.worktreeCreate)).toHaveProperty('disabled', true);
});

it('blocks repeated actions during preparation and retries only opening after a session failure', async () => {
    const pending = Promise.withResolvers<string>();
    const prepare = vi.fn<WorktreeModalProps['prepare']>().mockReturnValue(pending.promise);
    const openSession = vi.fn<WorktreeModalProps['openSession']>()
        .mockRejectedValueOnce(new Error('private detail'))
        .mockResolvedValueOnce(undefined);
    const { onClose } = renderDialog({ prepare, openSession });
    await screen.findByRole('button', { name: ru.worktreeSourceBranch });
    fillNewBranch();
    const create = button(ru.worktreeCreate);

    fireEvent.click(create);
    fireEvent.click(create);
    expect(create).toHaveProperty('disabled', true);
    expect(button(ru.cancel)).toHaveProperty('disabled', true);
    pending.resolve('/prepared');
    await screen.findByText(ru.worktreeSessionFailed);
    expect(screen.queryByText('private detail')).toBeNull();
    fireEvent.click(button(ru.worktreeRetryOpen));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(prepare).toHaveBeenCalledOnce();
    expect(openSession.mock.calls).toStrictEqual([['/prepared'], ['/prepared']]);
});

it('cancels repository inspection when the modal unmounts', () => {
    const pending = Promise.withResolvers<WorktreeRepository>();
    const inspect = vi.fn<WorktreeModalProps['inspect']>().mockReturnValue(pending.promise);
    const { unmount } = renderDialog({ inspect });
    expect(screen.getByText(ru.loading)).toBeTruthy();
    const signal = inspect.mock.calls[0]?.[0];

    unmount();

    expect(signal?.aborted).toBe(true);
});
