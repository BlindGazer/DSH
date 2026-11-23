import type { DshLocaleSnapshot, DshLocalizedClientContext } from '@kalex/dsh-core';

export interface WorkspaceView {
    readonly workspaceId: string;
    readonly path: string;
    readonly title: string;
    readonly sessionIds: readonly string[];
    readonly createdAt: string;
    readonly updatedAt: string;
}

interface MenuWorkspaceTarget {
    readonly workspaceId: string;
    readonly path: string;
    readonly displayTitle: string;
}

export interface WorkspaceSnapshot {
    readonly items: readonly WorkspaceView[];
}

export interface WorkspaceManagerClientContext extends DshLocalizedClientContext {
    readonly workspaces: {
        create(input: { path: string }): Promise<WorkspaceView>;
        rename(workspaceId: string, title: string): Promise<WorkspaceView>;
        delete(workspaceId: string): Promise<void>;
    };
    readonly uiWorkspace: {
        openSession(sessionId: string): void;
        pickDirectory(): Promise<string | null>;
    };
    readonly sessions: {
        create(options: { workspaceId: string }): Promise<string>;
    };
    readonly contextMenus: {
        register(contribution: {
            readonly id: string;
            readonly target: 'workspace';
            readonly order: number;
            observe(
                target: MenuWorkspaceTarget
            ): readonly { getSnapshot(): DshLocaleSnapshot | boolean; subscribe(listener: () => void): () => void }[];
            resolve(target: MenuWorkspaceTarget): readonly { id: string; label: string; icon: { key: string }; run: () => void }[];
        }): () => void;
    };
    readonly remoteAccess: {
        source(
            resource: 'workspace',
            workspaceId: string,
            endpoint: 'session/create'
        ): { getSnapshot(): boolean; subscribe(listener: () => void): () => void };
    };
    effect(callback: () => undefined | (() => void), label?: string): () => void;
}

export type WorkspaceSelector<Selected> = (snapshot: WorkspaceSnapshot) => Selected;
export type UseWorkspaceSnapshot = <Selected>(selector: WorkspaceSelector<Selected>) => Selected;
