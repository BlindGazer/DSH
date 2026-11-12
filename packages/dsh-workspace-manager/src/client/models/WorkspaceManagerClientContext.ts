import type { DshClientContext } from '@kalex/dsh-core';
import type { ComponentType } from 'react';
import type { CopyKey, Translate } from '../../shared/constants/localizations/WorkspaceManagerLocalization.js';

export interface WorkspaceView {
    readonly workspaceId: string;
    readonly path: string;
    readonly title: string;
    readonly sessionIds: readonly string[];
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface WorkspaceSnapshot {
    readonly items: readonly WorkspaceView[];
}

export interface LocaleSnapshot {
    readonly revision: number;
}

export interface WorkspaceManagerLocaleService {
    register(namespace: string, dictionaries: Record<'en' | 'ru', Record<CopyKey, string>>): () => void;
    bind(namespace: string): Translate;
    getSnapshot(): LocaleSnapshot;
    subscribe(listener: () => void): () => void;
}

export interface WorkspaceManagerSlotOptions {
    readonly name: string;
    readonly id: string;
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
        rename(workspaceId: string, title: string): Promise<WorkspaceView>;
        delete(workspaceId: string): Promise<void>;
    };
    readonly uiWorkspace: {
        pickDirectory(): Promise<string | undefined>;
    };
    effect(callback: () => undefined | (() => void), label?: string): () => void;
}

export type WorkspaceSelector<Selected> = (snapshot: WorkspaceSnapshot) => Selected;
export type UseWorkspaceSnapshot = <Selected>(selector: WorkspaceSelector<Selected>) => Selected;
