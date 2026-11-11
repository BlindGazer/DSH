import type { GlobalSettings, ProjectSettings, RouterDiagnostic } from '../../shared/models/RouterModels.js';
interface SessionState {
    readonly version: number;
    readonly sessionId: string;
    readonly projectRoot: string;
    readonly activePaths: string[];
    readonly seenDiagnostics: string[];
}
interface JsonRecord extends Record<string, string | number | boolean | object | undefined> {
}
/** Plugin-owned data below DSH home; project roots are read-only instruction sources. */
export declare class RouterStore {
    readonly home: string;
    readonly base: string;
    private readonly queues;
    private readonly auditStorage;
    constructor(dshHome?: string);
    loadGlobalSettings(): Promise<{
        readonly settings: GlobalSettings;
        readonly warning: string | undefined;
    }>;
    saveGlobalSettings(input: object | undefined): Promise<{
        readonly saved: boolean;
        readonly settings: GlobalSettings;
        readonly errors: string[];
    }>;
    loadProjectSettings(projectRoot: string): Promise<{
        readonly settings: ProjectSettings;
        readonly warning: string | undefined;
    }>;
    saveProjectSettings(projectRoot: string, input: object | undefined): Promise<{
        readonly saved: boolean;
        readonly settings: ProjectSettings;
        readonly errors: string[];
    }>;
    appendAuditLog(projectRoot: string, sessionId: string, entry: string): Promise<boolean>;
    readAuditLog(projectRoot: string, sessionId: string): Promise<string>;
    deleteSessionAuditLog(projectRoot: string, sessionId: string): Promise<number>;
    deleteProjectAuditLogs(projectRoot: string): Promise<number>;
    deleteAllAuditLogs(): Promise<number>;
    loadSession(sessionId: string, projectRoot: string): Promise<{
        readonly state: SessionState;
        readonly warning: string | undefined;
        readonly missing: boolean;
    }>;
    updateSession(sessionId: string, projectRoot: string, update: (state: SessionState) => SessionState | Promise<SessionState>): Promise<{
        readonly state: SessionState;
        readonly warning: string | undefined;
    }>;
    markDiagnostics(sessionId: string, projectRoot: string, diagnostics: RouterDiagnostic[]): Promise<RouterDiagnostic[]>;
    resetSession(sessionId: string, projectRoot: string): Promise<{
        readonly state: SessionState;
        readonly warning: string | undefined;
    }>;
    projectId(projectRoot: string): string;
    sessionId(sessionId: string): string;
    projectFile(projectRoot: string): string;
    sessionFile(sessionId: string): string;
    globalSettingsFile(): string;
    logsDirectory(): string;
    auditFile(projectRoot: string, sessionId: string): string;
    readJson(file: string): Promise<JsonRecord>;
    writeJson(file: string, value: JsonRecord | SessionState): Promise<void>;
    serial<T>(key: string, operation: () => Promise<T>): Promise<T>;
}
export {};
