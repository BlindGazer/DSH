import { en, ru } from '../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import { AddirSettingsSection } from './features/manage-workspaces/components/SettingsSection.tsx';
import { WorkspaceEditOverlay } from './features/manage-workspaces/components/WorkspaceEditOverlay.tsx';
import type { WorkspaceEditTarget } from './features/manage-workspaces/models/WorkspaceEditTarget.ts';
import { createSnapshotStore } from './features/manage-workspaces/services/snapshotStore.ts';
import { getWorkspaceDisplayTitle } from './features/manage-workspaces/services/workspaceLabels.ts';
import { installWorkspaceMenu } from './features/manage-workspaces/services/workspaceMenuAdapter.ts';
import { ensureWorkspaceManagerStyles } from './features/manage-workspaces/workspaceManagerStyles.ts';
import { WorktreeOverlay, type WorktreeRequest } from './features/worktree/WorktreeOverlay.tsx';
import type { UseWorkspaceSnapshot, WorkspaceManagerClientContext, WorkspaceSnapshot } from './models/WorkspaceManagerClientContext.ts';

export * from './features/manage-workspaces/components/SettingsSection.tsx';
export * from './features/manage-workspaces/components/WorkspaceAddirModal.tsx';
export * from './features/manage-workspaces/services/addirApi.ts';

function resolveWorkspace(snapshot: WorkspaceSnapshot, workspaceId: string): WorkspaceEditTarget | undefined {
    const workspace = snapshot.items.find(item => item.workspaceId === workspaceId);
    if (workspace === undefined) return undefined;
    return {
        workspaceId: workspace.workspaceId,
        displayTitle: getWorkspaceDisplayTitle(workspace),
        path: workspace.path
    };
}

export const inject = ['slots', 'locale', 'workspaces', 'uiWorkspace', 'sessions', 'contextMenus', 'remoteAccess'];

const namespace = 'dsh-workspace-manager';

export function apply(context: WorkspaceManagerClientContext): void {
    const editRequest = createSnapshotStore<WorkspaceEditTarget | undefined>(undefined);
    const worktreeRequest = createSnapshotStore<WorktreeRequest | undefined>(undefined);
    const workspaceSnapshot = createSnapshotStore<WorkspaceSnapshot>({
        items: []
    });
    const translateLabel = context.locale.bind(namespace);
    const translateNative = context.locale.bind('workspace');

    context.effect(() => context.locale.register(namespace, 'en', en), 'workspace-manager: localized copy (en)');
    context.effect(() => context.locale.register(namespace, 'ru', ru), 'workspace-manager: localized copy (ru)');
    ensureWorkspaceManagerStyles();

    const canCreate = (workspaceId: string) => context.remoteAccess.source('workspace', workspaceId, 'session/create');
    const pick = async () => (await context.uiWorkspace.pickDirectory()) ?? undefined;

    context.effect(
        () =>
            context.contextMenus.register({
                id: '@kalex/dsh-workspace-manager.worktree',
                target: 'workspace',
                order: 150,
                observe: ({ workspaceId }) => [context.locale, canCreate(workspaceId)],
                resolve: target =>
                    canCreate(target.workspaceId).getSnapshot()
                        ? [
                              {
                                  id: 'worktree',
                                  label: translateLabel('worktreeTitle'),
                                  icon: { key: 'workspace.fork' },
                                  run: () => {
                                      if (worktreeRequest.getSnapshot() || !canCreate(target.workspaceId).getSnapshot()) return;
                                      let sessionId: string | undefined;
                                      worktreeRequest.set({
                                          target,
                                          openSession: async path => {
                                              if (sessionId === undefined) {
                                                  const workspace = await context.workspaces.create({ path });
                                                  sessionId = await context.sessions.create({ workspaceId: workspace.workspaceId });
                                              }
                                              context.uiWorkspace.openSession(sessionId);
                                          }
                                      });
                                  }
                              }
                          ]
                        : []
            }),
        'workspace-manager: worktree menu action'
    );

    context.effect(
        () =>
            installWorkspaceMenu(document, {
                label: () => translateLabel('edit'),
                nativeRenameLabel: () => translateNative('rename'),
                subscribe: listener => context.locale.subscribe(listener),
                resolve: workspaceId => resolveWorkspace(workspaceSnapshot.getSnapshot(), workspaceId),
                open: target => editRequest.set(target)
            }),
        'workspace-manager: workspace menu adapter'
    );

    context.slots.inject('shell.overlay', () =>
        context.slots.register<{ readonly useWorkspaces: UseWorkspaceSnapshot }>(
            {
                name: 'shell.overlay',
                id: '@kalex/dsh-workspace-manager.editor',
                locale: namespace
            },
            ({ useWorkspaces, t }) => (
                <WorkspaceEditOverlay
                    editRequest={editRequest}
                    workspaceSnapshot={workspaceSnapshot}
                    useWorkspaces={useWorkspaces}
                    t={t}
                    rename={async (workspaceId, title) => {
                        await context.workspaces.rename(workspaceId, title);
                    }}
                    removeWorkspace={workspaceId => context.workspaces.delete(workspaceId)}
                    pick={pick}
                />
            )
        )
    );

    context.slots.inject('shell.overlay', () =>
        context.slots.register({ name: 'shell.overlay', id: '@kalex/dsh-workspace-manager.worktree', locale: namespace }, ({ t }) => (
            <WorktreeOverlay request={worktreeRequest} t={t} pick={pick} />
        ))
    );

    context.slots.inject('settings.section', () =>
        context.slots.register<{ readonly useWorkspaces: UseWorkspaceSnapshot }>(
            {
                name: 'settings.section',
                id: '@kalex/dsh-workspace-manager.directories',
                order: 250,
                locale: namespace,
                label: () => translateLabel('globalTitle')
            },
            ({ useWorkspaces, t }) => (
                <AddirSettingsSection
                    t={t}
                    useWorkspaces={useWorkspaces}
                    openEdit={workspaceId => {
                        const target = resolveWorkspace(workspaceSnapshot.getSnapshot(), workspaceId);
                        if (target !== undefined) editRequest.set(target);
                    }}
                />
            )
        )
    );
}
