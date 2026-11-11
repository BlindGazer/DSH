interface AuditStorageStore {
    loadGlobalSettings(): Promise<{
        settings: {
            globalLogging?: boolean;
        };
    }>;
    loadProjectSettings(projectRoot: string): Promise<{
        settings: {
            projectLogging?: boolean;
        };
    }>;
    auditFile(projectRoot: string, sessionId: string): string;
    serial<T>(file: string, action: () => Promise<T>): Promise<T>;
    projectId(projectRoot: string): string;
    home: string;
    base: string;
    logsDirectory(): string;
}
export declare class AuditStorage {
    private readonly store;
    constructor(store: AuditStorageStore);
    appendAuditLog(projectRoot: string, sessionId: string, entry: string): Promise<boolean>;
    readAuditLog(projectRoot: string, sessionId: string): Promise<string>;
    deleteSessionAuditLog(projectRoot: string, sessionId: string): Promise<number>;
    deleteProjectAuditLogs(projectRoot: string): Promise<number>;
    deleteAllAuditLogs(): Promise<number>;
    deleteAuditFiles(match: (name: string) => boolean): Promise<number>;
    auditDirectory(create: boolean): Promise<string | undefined>;
    writeAuditFile(file: string, text: string): Promise<void>;
}
export {};
