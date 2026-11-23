import { Notification, useEffectiveTheme } from '@kalex/dsh-core';
import { useSyncExternalStore } from 'react';
import { type CopyKey, en, ru } from '../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import { AddirSettingsSection } from './features/manage-workspaces/components/SettingsSection.tsx';
import { WorkspaceEditOverlay } from './features/manage-workspaces/components/WorkspaceEditOverlay.tsx';
import type { WorkspaceEditTarget } from './features/manage-workspaces/models/WorkspaceEditTarget.ts';
import { fetchGlobalConfig, vscodeEnabled } from './features/manage-workspaces/services/addirApi.ts';
import { createSnapshotStore } from './features/manage-workspaces/services/snapshotStore.ts';
import { getWorkspaceDisplayTitle } from './features/manage-workspaces/services/workspaceLabels.ts';
import { installWorkspaceMenu } from './features/manage-workspaces/services/workspaceMenuAdapter.ts';
import { ensureWorkspaceManagerStyles } from './features/manage-workspaces/workspaceManagerStyles.ts';
import { VscodeMenuIcon } from './features/vscode/VscodeMenuIcon.tsx';
import { VscodeOverlay } from './features/vscode/VscodeOverlay.tsx';
import { WorkspaceFeaturesSettings } from './features/vscode/WorkspaceFeaturesSettings.tsx';
import { DeleteWorktreeModal, type DeleteWorktreeModalProps } from './features/worktree/DeleteWorktreeModal.tsx';
import { WorktreeOverlay, type WorktreeRequest } from './features/worktree/WorktreeOverlay.tsx';
import { createWorktreeMenuSource } from './features/worktree/worktreeMenuSource.ts';
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

const vscodeIconKey = '@kalex/dsh-workspace-manager.vscode';

export const inject = ['slots', 'locale', 'workspaces', 'uiWorkspace', 'sessions', 'contextMenus', 'remoteAccess'];

export function apply(context: WorkspaceManagerClientContext): void {
    const editRequest = createSnapshotStore<WorkspaceEditTarget | undefined>(undefined);
    const worktreeRequest = createSnapshotStore<WorktreeRequest | undefined>(undefined);
    const deleteRequest = createSnapshotStore<Omit<DeleteWorktreeModalProps, 't' | 'onClose'> | undefined>(undefined);
    const deleteWarnings = createSnapshotStore<readonly CopyKey[]>([]);
    const vscodeRequest = createSnapshotStore<WorkspaceEditTarget | undefined>(undefined);
    const worktreeSources = new WeakMap<WorkspaceEditTarget, ReturnType<typeof createWorktreeMenuSource>>();
    const worktreeSource = (target: WorkspaceEditTarget) => {
        const source = worktreeSources.get(target) ?? createWorktreeMenuSource(target.workspaceId);
        worktreeSources.set(target, source);
        return source;
    };
    const workspaceSnapshot = createSnapshotStore<WorkspaceSnapshot>({
        items: []
    });
    const t = context.locale.bind('dsh-workspace-manager');

    context.effect(() => context.locale.register('dsh-workspace-manager', { en, ru }), 'workspace-manager: localized copy');
    ensureWorkspaceManagerStyles();
    void fetchGlobalConfig().catch(() => undefined);

    const canCreate = (workspaceId: string) => context.remoteAccess.source('workspace', workspaceId, 'session/create');
    const pick = async () => (await context.uiWorkspace.pickDirectory()) ?? undefined;

    context.effect(
        () =>
            context.contextMenus.register({
                id: '@kalex/dsh-workspace-manager.worktree',
                target: 'workspace',
                order: 150,
                observe: target => [context.locale, canCreate(target.workspaceId), vscodeEnabled],
                resolve: target =>
                    canCreate(target.workspaceId).getSnapshot()
                        ? [
                              {
                                  id: 'worktree',
                                  label: t('worktreeTitle'),
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
                              },
                              ...(vscodeEnabled.getSnapshot()
                                  ? [
                                        {
                                            id: 'vscode',
                                            label: t('vscodeTitle'),
                                            icon: { key: vscodeIconKey },
                                            run: () => {
                                                if (vscodeEnabled.getSnapshot() && !vscodeRequest.getSnapshot()) vscodeRequest.set(target);
                                            }
                                        }
                                    ]
                                  : [])
                          ]
                        : []
            }),
        'workspace-manager: worktree menu action'
    );

    context.effect(
        () =>
            context.contextMenus.register({
                id: '@kalex/dsh-workspace-manager.delete-worktree',
                target: 'workspace',
                order: 1000,
                observe: target => [context.locale, canCreate(target.workspaceId), worktreeSource(target)],
                resolve: target => (canCreate(target.workspaceId).getSnapshot() ? deleteMenuActions(target) : [])
            }),
        'workspace-manager: delete worktree menu action'
    );

    context.slots.inject('contextMenu.icon', () =>
        context.slots.register({ name: 'contextMenu.icon', key: vscodeIconKey, id: vscodeIconKey }, VscodeMenuIcon)
    );

    function deleteMenuActions(target: WorkspaceEditTarget) {
        const repository = worktreeSource(target).getRepository();
        if (!repository?.isLinkedWorktree) return [];
        return [
            {
                id: 'delete-worktree',
                label: t('worktreeDelete'),
                icon: { key: 'workspace.delete' },
                danger: true,
                run: () => {
                    if (deleteRequest.getSnapshot()) return;
                    deleteRequest.set({
                        target,
                        repository,
                        onDeleted: async gitWarnings => {
                            const warnings = gitWarnings.map<CopyKey>(code =>
                                code === 'mergeCleanupFailed' ? 'worktreeMergeCleanupFailed' : 'worktreeBranchDeleteFailed'
                            );
                            try {
                                await context.workspaces.delete(target.workspaceId);
                            } catch (error) {
                                console.error('[workspace-manager] Workspace removal failed', error);
                                warnings.push('worktreeWorkspaceDeleteFailed');
                            }
                            deleteWarnings.set(warnings);
                            deleteRequest.set(undefined);
                        }
                    });
                }
            }
        ];
    }

    context.effect(
        () =>
            installWorkspaceMenu(document, {
                label: () => t('edit'),
                nativeRenameLabel: () => context.locale.bind('workspace')('rename'),
                resolve: workspaceId => resolveWorkspace(workspaceSnapshot.getSnapshot(), workspaceId),
                open: target => editRequest.set(target)
            }),
        'workspace-manager: workspace menu adapter'
    );

    context.slots.inject('shell.overlay', () =>
        context.slots.register<{ readonly useWorkspaces: UseWorkspaceSnapshot }>(
            {
                name: 'shell.overlay',
                id: '@kalex/dsh-workspace-manager.editor'
            },
            ({ useWorkspaces }) => (
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
        context.slots.register({ name: 'shell.overlay', id: '@kalex/dsh-workspace-manager.worktree' }, () => (
            <WorktreeOverlay request={worktreeRequest} locale={context.locale} t={t} pick={pick} />
        ))
    );

    context.slots.inject('shell.overlay', () =>
        context.slots.register({ name: 'shell.overlay', id: '@kalex/dsh-workspace-manager.delete-worktree' }, () => {
            const current = useSyncExternalStore(deleteRequest.subscribe, deleteRequest.getSnapshot);
            useSyncExternalStore(
                listener => context.locale.subscribe(listener),
                () => context.locale.getSnapshot()
            );
            const warnings = useSyncExternalStore(deleteWarnings.subscribe, deleteWarnings.getSnapshot);
            const theme = useEffectiveTheme();
            return (
                <>
                    {current ? <DeleteWorktreeModal {...current} t={t} onClose={() => deleteRequest.set(undefined)} /> : null}
                    {warnings.length > 0 ? (
                        <div className="dsh-core-root" data-theme={theme}>
                            <Notification
                                severity="warning"
                                title={t('worktreeFolderRemoved')}
                                message={warnings.map(t).join('\n')}
                                copyLabel={t('vscodeCopy')}
                                closeLabel={t('close')}
                                onClose={() => deleteWarnings.set([])}
                            />
                        </div>
                    ) : null}
                </>
            );
        })
    );

    context.slots.inject('shell.overlay', () =>
        context.slots.register({ name: 'shell.overlay', id: '@kalex/dsh-workspace-manager.vscode' }, () => (
            <VscodeOverlay request={vscodeRequest} locale={context.locale} t={t} />
        ))
    );

    context.slots.inject('plugins.bundle.config', () =>
        context.slots.register(
            { name: 'plugins.bundle.config', key: '@kalex/dsh-workspace-manager', id: 'workspace-manager-features', order: 30 },
            () => <WorkspaceFeaturesSettings locale={context.locale} t={t} />
        )
    );

    context.slots.inject('settings.section', () =>
        context.slots.register<{ readonly useWorkspaces: UseWorkspaceSnapshot }>(
            {
                name: 'settings.section',
                id: '@kalex/dsh-workspace-manager.directories',
                order: 250,
                label: () => t('globalTitle')
            },
            ({ useWorkspaces }) => (
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
