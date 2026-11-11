import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS, validateGlobalSettings, validateProjectSettings } from '../../shared/index.js';
import type { GlobalSettings, ProjectSettings, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import { AuditStorage } from './auditStorage.js';
import { inside } from './discoveryFs.js';

const VERSION = 1;

interface SessionState {
    readonly version: number;
    readonly sessionId: string;
    readonly projectRoot: string;
    readonly activePaths: string[];
    readonly seenDiagnostics: string[];
}

interface JsonRecord extends Record<string, string | number | boolean | object | undefined> {}

const EMPTY_SESSION = (sessionId: string, projectRoot: string): SessionState => ({
    version: VERSION,
    sessionId,
    projectRoot,
    activePaths: [],
    seenDiagnostics: []
});

/** Plugin-owned data below DSH home; project roots are read-only instruction sources. */
export class RouterStore {
    readonly home: string;
    readonly base: string;
    private readonly queues: Map<string, Promise<void>>;
    private readonly auditStorage: AuditStorage;

    constructor(
        dshHome: string = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DSH_HOME ||
            path.join(os.homedir(), '.dsh')
    ) {
        this.home = path.resolve(dshHome);
        this.base = path.join(this.home, 'agents-router');
        this.queues = new Map();
        this.auditStorage = new AuditStorage(this);
    }

    async loadGlobalSettings(): Promise<{ readonly settings: GlobalSettings; readonly warning: string | undefined }> {
        try {
            const record = await this.readJson(this.globalSettingsFile());
            const checked = validateGlobalSettings(record.settings);
            if (record.version !== VERSION || !checked.valid) throw new Error(checked.errors.join('; ') || 'unsupported settings version');
            return { settings: checked.settings, warning: undefined };
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
                return { settings: DEFAULT_GLOBAL_SETTINGS, warning: undefined };
            const message = error instanceof Error ? error.message : String(error);
            return { settings: DEFAULT_GLOBAL_SETTINGS, warning: `global settings could not be restored: ${message}` };
        }
    }

    async saveGlobalSettings(
        input: object | undefined
    ): Promise<{ readonly saved: boolean; readonly settings: GlobalSettings; readonly errors: string[] }> {
        const checked = validateGlobalSettings(input);
        if (!checked.valid) return { saved: false, settings: (await this.loadGlobalSettings()).settings, errors: checked.errors };
        return this.serial('global-settings', async () => {
            await this.writeJson(this.globalSettingsFile(), { version: VERSION, settings: checked.settings });
            if (!checked.settings.globalLogging) await this.deleteAllAuditLogs();
            return { saved: true, settings: checked.settings, errors: [] };
        });
    }

    async loadProjectSettings(projectRoot: string): Promise<{ readonly settings: ProjectSettings; readonly warning: string | undefined }> {
        const file = this.projectFile(projectRoot);
        try {
            const record = await this.readJson(file);
            if (record.projectRoot !== projectRoot) throw new Error('stored project identity does not match');
            const checked = validateProjectSettings(record.settings);
            if (!checked.valid) throw new Error(checked.errors.join('; '));
            return { settings: checked.settings, warning: undefined };
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
                return { settings: DEFAULT_PROJECT_SETTINGS, warning: undefined };
            const message = error instanceof Error ? error.message : String(error);
            return { settings: DEFAULT_PROJECT_SETTINGS, warning: `project settings could not be restored: ${message}` };
        }
    }

    async saveProjectSettings(
        projectRoot: string,
        input: object | undefined
    ): Promise<{ readonly saved: boolean; readonly settings: ProjectSettings; readonly errors: string[] }> {
        const checked = validateProjectSettings(input);
        if (!checked.valid)
            return { saved: false, settings: (await this.loadProjectSettings(projectRoot)).settings, errors: checked.errors };
        return this.serial(`project:${this.projectId(projectRoot)}`, async () => {
            await this.writeJson(this.projectFile(projectRoot), { version: VERSION, projectRoot, settings: checked.settings });
            if (!checked.settings.projectLogging) await this.deleteProjectAuditLogs(projectRoot);
            return { saved: true, settings: checked.settings, errors: [] };
        });
    }

    appendAuditLog(projectRoot: string, sessionId: string, entry: string): Promise<boolean> {
        return this.auditStorage.appendAuditLog(projectRoot, sessionId, entry);
    }
    readAuditLog(projectRoot: string, sessionId: string): Promise<string> {
        return this.auditStorage.readAuditLog(projectRoot, sessionId);
    }
    deleteSessionAuditLog(projectRoot: string, sessionId: string): Promise<number> {
        return this.auditStorage.deleteSessionAuditLog(projectRoot, sessionId);
    }
    deleteProjectAuditLogs(projectRoot: string): Promise<number> {
        return this.auditStorage.deleteProjectAuditLogs(projectRoot);
    }
    deleteAllAuditLogs(): Promise<number> {
        return this.auditStorage.deleteAllAuditLogs();
    }

    async loadSession(
        sessionId: string,
        projectRoot: string
    ): Promise<{ readonly state: SessionState; readonly warning: string | undefined; readonly missing: boolean }> {
        try {
            const state = await this.readJson(this.sessionFile(sessionId));
            if (state.version !== VERSION || state.sessionId !== sessionId || state.projectRoot !== projectRoot) {
                throw new Error('stored session identity does not match the current DSH session');
            }
            return { state: normalizeSession(state, sessionId, projectRoot), warning: undefined, missing: false };
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
                return { state: EMPTY_SESSION(sessionId, projectRoot), warning: undefined, missing: true };
            const message = error instanceof Error ? error.message : String(error);
            return {
                state: EMPTY_SESSION(sessionId, projectRoot),
                warning: `session working set could not be restored: ${message}`,
                missing: false
            };
        }
    }

    async updateSession(
        sessionId: string,
        projectRoot: string,
        update: (state: SessionState) => SessionState | Promise<SessionState>
    ): Promise<{ readonly state: SessionState; readonly warning: string | undefined }> {
        return this.serial(`session:${this.sessionId(sessionId)}`, async () => {
            const { state, warning } = await this.loadSession(sessionId, projectRoot);
            const next = normalizeSession(await update(state), sessionId, projectRoot);
            await this.writeJson(this.sessionFile(sessionId), next);
            return { state: next, warning };
        });
    }

    async markDiagnostics(sessionId: string, projectRoot: string, diagnostics: RouterDiagnostic[]): Promise<RouterDiagnostic[]> {
        const fresh: RouterDiagnostic[] = [];
        await this.updateSession(sessionId, projectRoot, state => {
            const seen = new Set(state.seenDiagnostics);
            for (const item of diagnostics) {
                if (item.key === undefined || !seen.has(item.key)) fresh.push(item);
                if (item.key !== undefined) seen.add(item.key);
            }
            return { ...state, seenDiagnostics: [...seen].slice(-1000) };
        });
        return fresh;
    }

    async resetSession(
        sessionId: string,
        projectRoot: string
    ): Promise<{ readonly state: SessionState; readonly warning: string | undefined }> {
        return this.updateSession(sessionId, projectRoot, state => ({ ...state, activePaths: [] }));
    }

    projectId(projectRoot: string): string {
        const key =
            (globalThis as { process?: { platform?: string } }).process?.platform === 'win32' ? projectRoot.toLowerCase() : projectRoot;
        return hash(key);
    }

    sessionId(sessionId: string): string {
        if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sessionId)) throw new Error('invalid DSH session id');
        return hash(sessionId);
    }

    projectFile(projectRoot: string): string {
        return path.join(this.base, 'projects', `${this.projectId(projectRoot)}.json`);
    }

    sessionFile(sessionId: string): string {
        return path.join(this.base, 'sessions', `${this.sessionId(sessionId)}.json`);
    }

    globalSettingsFile(): string {
        return path.join(this.base, 'global-settings.json');
    }

    logsDirectory(): string {
        return path.join(this.base, 'logs');
    }

    auditFile(projectRoot: string, sessionId: string): string {
        return path.join(this.logsDirectory(), `${this.projectId(projectRoot)}-${this.sessionId(sessionId)}.log.md`);
    }

    async readJson(file: string): Promise<JsonRecord> {
        const text = await readFile(file, 'utf8');
        const value = JSON.parse(text);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('sidecar JSON must be an object');
        return value;
    }

    async writeJson(file: string, value: JsonRecord | SessionState): Promise<void> {
        await mkdir(this.home, { recursive: true, mode: 0o700 });
        const safeHome = await realpath(this.home);
        await mkdir(this.base, { recursive: true, mode: 0o700 });
        let directory = this.base;
        const baseInfo = await lstat(directory);
        if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, await realpath(directory))) {
            throw new Error('sidecar storage resolves outside DSH home');
        }
        const subdirectory = path.relative(this.base, path.dirname(file));
        if (subdirectory.startsWith('..') || path.isAbsolute(subdirectory)) throw new Error('sidecar path is outside plugin storage');
        for (const segment of subdirectory.split(path.sep).filter(Boolean)) {
            directory = path.join(directory, segment);
            await mkdir(directory, { recursive: false, mode: 0o700 }).catch(error => {
                if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
            });
            const info = await lstat(directory);
            if (!info.isDirectory() || info.isSymbolicLink() || !inside(safeHome, await realpath(directory))) {
                throw new Error('sidecar directory resolves outside DSH home');
            }
        }
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
            await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            await rename(temporary, file);
        } catch (error) {
            try {
                await unlink(temporary);
            } catch (cleanupError) {
                if (!(cleanupError instanceof Error && 'code' in cleanupError && cleanupError.code === 'ENOENT')) throw cleanupError;
            }
            throw error;
        }
    }

    serial<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const previous = this.queues.get(key) ?? Promise.resolve();
        const current = previous.then(operation, operation);
        this.queues.set(
            key,
            current.then(
                () => undefined,
                () => undefined
            )
        );
        return current;
    }
}

function normalizeSession(value: JsonRecord | SessionState, sessionId: string, projectRoot: string): SessionState {
    if (!isStringArray(value.activePaths)) throw new Error('session sidecar has invalid active paths');
    if (!isStringArray(value.seenDiagnostics)) throw new Error('session sidecar has invalid diagnostic history');
    const activePaths = [...new Map(value.activePaths.map(item => [item.toLowerCase(), item])).values()];
    return { version: VERSION, sessionId, projectRoot, activePaths, seenDiagnostics: value.seenDiagnostics.slice(-1000) };
}

function isStringArray(value: string | number | boolean | object | undefined): value is string[] {
    return Array.isArray(value) && value.every((item: string) => typeof item === 'string');
}

function hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}
