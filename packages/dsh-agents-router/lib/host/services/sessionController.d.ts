import type { DiscoveredRule, ProjectDiscoverySnapshot, ProjectSettings, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import type { RouterStore } from './store.js';
export interface RouterSession {
    readonly id: string;
    readonly header: {
        readonly cwd?: string;
    };
    deriveMessages(): RouterMessage[];
}
export interface RouterAgent {
    readonly id: string;
    readonly status: string;
    readonly session: RouterSession;
    readonly inbox: {
        readonly nextTurn: readonly object[];
        readonly nextStep: readonly object[];
    };
    runMaintenance<T>(action: (signal: {
        throwIfAborted(): void;
    }) => Promise<T>): Promise<T>;
}
export interface RouterMessage {
    role?: string;
    content?: {
        type: string;
        text?: string;
    }[];
    source?: {
        kind: string;
        name?: string;
        form?: string;
        summary?: string;
        sections?: {
            name: string;
            text?: string;
        }[];
    };
}
export interface RouterState {
    readonly agent: RouterAgent;
    readonly sessionId: string;
    readonly projectRoot: string;
    settings: ProjectSettings;
    activePaths: string[];
    areaText: string;
    snapshot: ProjectDiscoverySnapshot | undefined;
    rules: ReturnType<typeof selectRules>;
    text: string;
    readonly source: string;
    readonly blockedRoots: Map<string, string>;
    runtimeDiagnostics: Map<string, RouterDiagnostic>;
    forceEmptyWorkset: boolean;
    auditRules?: Map<string, ReturnType<typeof selectRules>[number]>;
    lastLoggedBatchKey?: string;
    lastLoggedDiagKeys?: Set<string>;
    invalidateSkills: () => void;
    restoreWarning?: string | undefined;
    auditWarning?: string;
}
export interface RouterHostContext {
    readonly logger: {
        warn(message: string): void;
        error(message: string): void;
    };
    readonly agents: {
        list(): RouterAgent[];
    };
    readonly workingDirectory: {
        get(session: RouterSession): string | undefined;
    };
    readonly skills: {
        list(options: {
            readonly cwd: string;
            readonly scope?: RouterAgent;
        }): Promise<RouterSkill[]>;
    };
}
export interface RouterSkill {
    readonly name: string;
    readonly description: string;
    readonly path?: string;
    readonly provider?: string;
    readonly invocation?: {
        readonly modelInvocable?: boolean;
        readonly userInvocable?: boolean;
    };
}
import { selectRules } from './ruleSelector.js';
export declare function reportDiagnostics(ctx: RouterHostContext, store: RouterStore, state: RouterState, items: RouterDiagnostic[]): Promise<RouterDiagnostic[]>;
export declare function refreshState(ctx: RouterHostContext, store: RouterStore, state: RouterState): Promise<RouterState>;
export declare function findLiveState(ctx: RouterHostContext, states: ReadonlyMap<string, RouterState>, sessionId: string): {
    readonly agent: RouterAgent;
    readonly state: RouterState;
} | undefined;
export declare function currentDirectory(ctx: RouterHostContext, state: RouterState, agent: RouterAgent): string;
export declare function isTrulyIdle(agent: RouterAgent): boolean;
export declare function historyHasRule(session: RouterSession, rule: DiscoveredRule): boolean;
interface PreflightCall {
    readonly callId: string;
    readonly name: string;
    readonly paths?: readonly string[];
}
interface ToolExecution {
    readonly callId: string;
    readonly rootCallId?: string;
    readonly parent?: string;
}
export declare function denyCalls(calls: readonly PreflightCall[], exec: ToolExecution, pendingFeedback: Map<string, string>, state: RouterState, reason: string): {
    readonly kind: 'deny';
    readonly reason: string;
    readonly info: {
        readonly name: string;
        readonly code: string;
        readonly reason: string;
    };
};
export declare function feedbackKey(agentId: string, callId: string): string;
export declare function preflightEvent(kind: string, tool: string, resolvedPaths: readonly string[] | ReadonlySet<string>, calls: readonly PreflightCall[]): string;
export declare function readRouterState(ctx: RouterHostContext, store: RouterStore, states: ReadonlyMap<string, RouterState>, sessionId: string): Promise<{
    ok: boolean;
    status: number;
    error: string;
    sessionId?: never;
    canReset?: never;
    projectRoot?: never;
    instructionsRoot?: never;
    resolvedInstructionsRoot?: never;
    areasConfigPath?: never;
    settings?: never;
    activePaths?: never;
    rules?: never;
    areas?: never;
    skills?: never;
    diagnostics?: never;
    auditWarning?: never;
    globalSettings?: never;
    metrics?: never;
    coverage?: never;
} | {
    error?: never;
    ok: boolean;
    sessionId: string;
    status: string;
    canReset: boolean;
    projectRoot: string;
    instructionsRoot: string;
    resolvedInstructionsRoot: string | undefined;
    areasConfigPath: string;
    settings: ProjectSettings;
    activePaths: string[];
    rules: {
        source: string;
        sourcePath: string;
        filePath: string;
        area: string;
        description: string | undefined;
        enabled: boolean;
        selected: boolean;
        appliesTo: readonly string[];
        characters: number;
        reason: string;
    }[];
    areas: {
        name: string;
        path: readonly string[];
        keywords: readonly string[];
        enabled: boolean;
        available: boolean | undefined;
        parent: string | undefined;
        reason: string;
    }[];
    skills: {
        name: string;
        description: string;
        sourcePath: string | undefined;
        invocation: {
            readonly modelInvocable?: boolean;
            readonly userInvocable?: boolean;
        } | undefined;
    }[];
    diagnostics: {
        code: string;
        target?: string;
        message: string;
        level?: 'warning' | 'error' | 'info';
        key?: string;
        path: string;
    }[];
    auditWarning: string | undefined;
    globalSettings: import("../../index.js").GlobalSettings;
    metrics: {
        rules: {
            count: number;
            characters: number;
        };
        areaCatalog: {
            count: number;
            characters: number;
        };
        skillCatalog: {
            count: number;
            characters: number;
        };
        ownSkills: {
            count: number;
            userCommands: number;
        };
        loadedSkills: {
            count: number;
            names: string[];
            characters: number;
            scope: string;
        };
        uniqueCurrentSetCharacters: number;
        uniqueRecognizedSkillBodyCharacters: number;
        visibleKnownPluginCharacters: number;
        estimatedTokens: number;
        estimatedOverSoftBudget: boolean;
        unit: string;
        note: string;
        tokenBudget: number;
    };
    coverage: {
        tool: string;
        pathField: string;
        coverage: string;
    }[];
}>;
export {};
