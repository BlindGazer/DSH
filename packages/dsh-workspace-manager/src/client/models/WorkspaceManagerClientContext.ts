import type { DshClientContext } from '@kalex/dsh-core';
import type { ComponentType } from 'react';
import type { CopyKey, Translate } from '../../shared/constants/localizations/WorkspaceManagerLocalization.ts';

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

export interface LocaleSnapshot {
    readonly revision: number;
}

export interface WorkspaceManagerLocaleService {
    register(namespace: string, dictionaries: Record<'en' | 'ru', Record<CopyKey, string>>): () => void;
    bind(namespace: 'dsh-workspace-manager'): Translate;
    bind(namespace: 'workspace'): (key: 'rename') => string;
    getSnapshot(): LocaleSnapshot;
    subscribe(listener: () => void): () => void;
}

export interface WorkspaceManagerSlotOptions {
    readonly name: string;
    readonly id: string;
    readonly key?: string;
    readonly order?: number;
    readonly label?: string | (() => string);
}

export interface WorkspaceManagerSlotsService {
    inject(slotName: string, callback: () => () => void): () => void;
    register<Props extends object>(options: WorkspaceManagerSlotOptions, component: ComponentType<Props>): () => void;
}

export interface WorkspaceManagerClientContext extends Omit<DshClientContext, 'slots' | 'locale'> {
    readonly slots: WorkspaceManagerSlotsService;
    readonly locale: WorkspaceManagerLocaleService;
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
            ): readonly { getSnapshot(): LocaleSnapshot | boolean; subscribe(listener: () => void): () => void }[];
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
