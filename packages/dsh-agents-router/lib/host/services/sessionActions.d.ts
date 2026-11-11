import type { RouterHostContext, RouterState } from './sessionController.js';
import type { RouterStore } from './store.js';
export declare function readAuditLog(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string): Promise<{
    ok: boolean;
    status: number;
    error: string;
    text?: never;
} | {
    error?: never;
    status?: never;
    ok: boolean;
    text: string;
}>;
export declare function deleteAuditLog(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string): Promise<{
    ok: boolean;
    status: number;
    error: string;
} | {
    error?: never;
    status?: never;
    ok: boolean;
}>;
export declare function saveRouterSettings(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string, settings: object): Promise<{
    settings?: never;
    ok: boolean;
    status: number;
    error: string;
} | {
    error?: never;
    status?: never;
    ok: boolean;
    settings: import("../../index.js").ProjectSettings;
}>;
export declare function refreshRouterProject(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string): Promise<{
    projectRoot?: never;
    ok: boolean;
    status: number;
    error: string;
} | {
    error?: never;
    status?: never;
    ok: boolean;
    projectRoot: string;
}>;
export declare function refreshProjectStates(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, projectRoot: string): Promise<void>;
export declare function resetRouterWorkset(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string): Promise<{
    ok: boolean;
    status: number;
    error: string;
} | {
    ok: boolean;
    activePaths: string[];
    note: string;
}>;
export declare function diagnoseRouterPath(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string, filePath: string): Promise<{
    rules?: never;
    ok: boolean;
    status: number;
    error: string;
    filePath?: never;
    projectPaths?: never;
    results?: never;
    note?: never;
} | {
    error?: never;
    status?: never;
    ok: boolean;
    filePath: string;
    projectPaths: never[];
    rules: never[];
    note: string;
    results?: never;
} | {
    error?: never;
    rules?: never;
    status?: never;
    ok: boolean;
    filePath: string;
    projectPaths: string[];
    results: {
        path: string;
        rules: {
            source: string;
            area: string;
            applies: boolean;
            reason: string;
        }[];
    }[];
    note: string;
}>;
export declare function updateRouterWorkset(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string, action: string, filePath: string): Promise<{
    ok: boolean;
    status: number;
    error: string;
} | {
    ok: boolean;
    activePaths: string[];
    ignored: number;
}>;
