import type { DshClientContext } from '@kalex/dsh-core';
import { en, ru } from '../shared/constants/localizations/WorkspaceManagerLocalization.js';
import { AddirSettingsSection } from './features/manage-workspaces/components/SettingsSection.js';
import { WorkspaceEditOverlay } from './features/manage-workspaces/components/WorkspaceEditOverlay.js';
import type { WorkspaceEditTarget } from './features/manage-workspaces/models/WorkspaceEditTarget.js';
import { createSnapshotStore } from './features/manage-workspaces/services/snapshotStore.js';
import { getWorkspaceDisplayTitle } from './features/manage-workspaces/services/workspaceLabels.js';
import { installWorkspaceMenu } from './features/manage-workspaces/services/workspaceMenuAdapter.js';
import { ensureWorkspaceManagerStyles } from './features/manage-workspaces/workspaceManagerStyles.js';
import type { UseWorkspaceSnapshot, WorkspaceManagerClientContext, WorkspaceSnapshot } from './models/WorkspaceManagerClientContext.js';

export * from './features/manage-workspaces/components/SettingsSection.js';
export * from './features/manage-workspaces/components/WorkspaceAddirModal.js';
export * from './features/manage-workspaces/services/addirApi.js';

function resolveWorkspace(snapshot: WorkspaceSnapshot, workspaceId: string): WorkspaceEditTarget | undefined {
    const workspace = snapshot.items.find(item => item.workspaceId === workspaceId);
    if (workspace === undefined) return undefined;
    return {
        workspaceId: workspace.workspaceId,
        displayTitle: getWorkspaceDisplayTitle(workspace),
        path: workspace.path
    };
}

export const inject = ['slots', 'locale', 'workspaces', 'uiWorkspace'];

export function apply(context: DshClientContext & WorkspaceManagerClientContext): void {
    const editRequest = createSnapshotStore<WorkspaceEditTarget | undefined>(undefined);
    const workspaceSnapshot = createSnapshotStore<WorkspaceSnapshot>({ items: [] });
    const t = context.locale.bind('addir');

    context.effect(() => context.locale.register('addir', { en, ru }), 'workspace-manager: localized copy');
    ensureWorkspaceManagerStyles();

    context.effect(
        () =>
            installWorkspaceMenu(document, {
                label: () => t('edit'),
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
                    pick={async () => {
                        const path = await context.uiWorkspace.pickDirectory();
                        return typeof path === 'string' ? path : undefined;
                    }}
                />
            )
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
