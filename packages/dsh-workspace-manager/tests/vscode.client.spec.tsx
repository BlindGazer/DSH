// @vitest-environment jsdom
import { TestId } from '@kalex/dsh-core';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createSnapshotStore } from '../src/client/features/manage-workspaces/services/snapshotStore.ts';
import { en } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.ts';

const api = '../src/client/worktreeApi.ts';

async function setup(files: string[]) {
    const discoverVscode = vi.fn(async () => files);
    const launchVscode = vi.fn<(id: string, file?: string) => Promise<void>>().mockResolvedValue(undefined);
    vi.doMock(api, () => ({ discoverVscode, launchVscode }));
    const { VscodeOverlay } = await import('../src/client/features/vscode/VscodeOverlay.tsx');
    const target = { workspaceId: 'repo', path: '/repo', displayTitle: 'Repo' };
    const request = createSnapshotStore<typeof target | undefined>(target);
    const view = <VscodeOverlay request={request} t={key => en[key]} />;
    return { discoverVscode, launchVscode, request, view };
}

afterEach(() => {
    cleanup();
    vi.doUnmock(api);
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

it.each([[], ['/repo/alpha.code-workspace']].map(files => ({ files })))('launches automatically once in StrictMode for $files', async ({ files }) => {
    const { launchVscode, request, view } = await setup(files);
    render(<StrictMode>{view}</StrictMode>);
    await waitFor(() => expect(request.getSnapshot()).toBeUndefined());
    expect(launchVscode).toHaveBeenCalledExactlyOnceWith('repo', files[0]);
    expect(screen.queryByText(en.vscodeSelectWorkspace)).toBeNull();
});

it('launches only the selected workspace file', async () => {
    const { discoverVscode, launchVscode, request, view } = await setup(['/repo/alpha.code-workspace', '/repo/nested/beta.code-workspace']);
    render(view);
    const selected = await screen.findByRole('radio', { name: /beta\.code-workspace/ });
    expect(launchVscode).not.toHaveBeenCalled();
    fireEvent.click(selected);
    fireEvent.click(screen.getByRole('button', { name: en.vscodeOpen }));
    await waitFor(() => expect(request.getSnapshot()).toBeUndefined());
    expect(launchVscode).toHaveBeenCalledExactlyOnceWith('repo', '/repo/nested/beta.code-workspace');
    expect(discoverVscode).toHaveBeenCalledTimes(1);
});

it('does not show a modal for a quick automatic launch', async () => {
    vi.useFakeTimers();
    const { request, view } = await setup([]);
    render(view);

    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(request.getSnapshot()).toBeUndefined();
    expect(screen.queryByTestId(TestId.Common.ModalBackdrop)).toBeNull();
});

it('shows the modal only after 300 ms during a slow automatic launch', async () => {
    vi.useFakeTimers();
    const { launchVscode, view } = await setup([]);
    const launch = Promise.withResolvers<void>();
    launchVscode.mockReturnValue(launch.promise);
    render(view);

    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(screen.queryByTestId(TestId.Common.ModalBackdrop)).toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByTestId(TestId.Common.ModalCard).contains(screen.getByText(en.vscodeOpening))).toBe(true);

    await act(async () => launch.resolve());
    expect(screen.queryByTestId(TestId.Common.ModalBackdrop)).toBeNull();
});
