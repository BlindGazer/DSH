import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { OpenAIHubClientLogEvent, OpenAIHubLogEvent, OpenAIHubLogRecord, OpenAIHubLogSettings } from '../shared/logging.js';
import {
    OpenAIHubClientLogEventSchema,
    OpenAIHubLoggingSettingsFileSchema,
    OpenAIHubLogRecordSchema,
    OpenAIHubLogSettingsSchema
} from '../shared/logging.js';

const MAX_LOG_ENTRIES = 1000;
const MAX_LOG_BYTES = 1024 * 1024;
const LOG_FILE = 'openai-hub.jsonl';
let loggingQueue: Promise<void> = Promise.resolve();

function inside(parent: string, candidate: string): boolean {
    const relative = path.relative(parent, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function isMissing(error: Error): boolean {
    return 'code' in error && error.code === 'ENOENT';
}

export class OpenAIHubLogging {
    private readonly home: string;
    private readonly base: string;
    private readonly logs: string;

    constructor(
        private readonly onError: (message: string) => void,
        dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
    ) {
        this.home = path.resolve(dshHome);
        this.base = path.join(this.home, 'openai-hub');
        this.logs = path.join(this.base, 'logs');
    }

    async loadSettings(): Promise<OpenAIHubLogSettings> {
        const base = await this.baseDirectory(false);
        if (!base) return OpenAIHubLogSettingsSchema.parse({});
        const file = path.join(base, 'settings.json');
        try {
            const info = await lstat(file);
            if (!info.isFile() || info.nlink !== 1) throw new Error('OpenAI Hub settings path is not a private regular file');
            const parsed = OpenAIHubLoggingSettingsFileSchema.parse(JSON.parse(await readFile(file, 'utf8')));
            return parsed.settings;
        } catch (error) {
            if (error instanceof Error && isMissing(error)) return OpenAIHubLogSettingsSchema.parse({});
            throw error;
        }
    }

    async saveSettings(input: OpenAIHubLogSettings): Promise<OpenAIHubLogSettings> {
        const settings = OpenAIHubLogSettingsSchema.parse(input);
        return this.serial(async () => {
            const directories = await this.directories(true);
            if (!directories) throw new Error('OpenAI Hub settings directory is unavailable');
            await this.writePrivateFile(path.join(directories.base, 'settings.json'), JSON.stringify({ version: 1, settings }));
            if (!settings.enabled) await this.deleteLogs(directories.logs);
            return settings;
        });
    }

    recordHost(event: OpenAIHubLogEvent): Promise<boolean> {
        return this.append('host', event);
    }

    recordClient(input: OpenAIHubClientLogEvent): Promise<boolean> {
        return this.append('client', OpenAIHubClientLogEventSchema.parse(input));
    }

    getLogPath(): string {
        return path.join(this.logs, LOG_FILE);
    }

    private async append(source: OpenAIHubLogRecord['source'], event: OpenAIHubLogEvent): Promise<boolean> {
        try {
            return await this.serial(async () => {
                const settings = await this.loadSettings();
                if (!settings.enabled) return false;
                const record = OpenAIHubLogRecordSchema.parse({ ...event, source, timestamp: new Date().toISOString() });
                const directories = await this.directories(true);
                if (!directories) return false;
                const file = path.join(directories.logs, LOG_FILE);
                let current = '';
                try {
                    const info = await lstat(file);
                    if (!info.isFile() || info.nlink !== 1) throw new Error('OpenAI Hub log path is not a private regular file');
                    current = await readFile(file, 'utf8');
                } catch (error) {
                    if (!(error instanceof Error && isMissing(error))) throw error;
                }
                const lines = current.split(/\r?\n/).filter(Boolean);
                lines.push(JSON.stringify(record));
                while (lines.length > MAX_LOG_ENTRIES || Buffer.byteLength(lines.join('\n'), 'utf8') > MAX_LOG_BYTES) {
                    if (lines.length <= 1) break;
                    lines.shift();
                }
                await this.writePrivateFile(file, `${lines.join('\n')}\n`);
                return true;
            });
        } catch {
            this.onError('OpenAI Hub diagnostic log could not be written');
            return false;
        }
    }

    private async baseDirectory(create: boolean): Promise<string | undefined> {
        if (create) await mkdir(this.home, { recursive: true, mode: 0o700 });
        let safeHome: string;
        try {
            safeHome = await realpath(this.home);
        } catch (error) {
            if (error instanceof Error && isMissing(error) && !create) return undefined;
            throw error;
        }
        if (create) await mkdir(this.base, { recursive: true, mode: 0o700 });
        let safeBase: string;
        try {
            safeBase = await realpath(this.base);
        } catch (error) {
            if (error instanceof Error && isMissing(error) && !create) return undefined;
            throw error;
        }
        const baseInfo = await lstat(this.base);
        if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, safeBase))
            throw new Error('OpenAI Hub storage resolves outside DSH home');
        return safeBase;
    }

    private async directories(create: boolean): Promise<{ base: string; logs: string } | undefined> {
        const safeBase = await this.baseDirectory(create);
        if (!safeBase) return undefined;
        if (create) await mkdir(this.logs, { recursive: true, mode: 0o700 });
        let safeLogs: string;
        try {
            safeLogs = await realpath(this.logs);
        } catch (error) {
            if (error instanceof Error && isMissing(error) && !create) return undefined;
            throw error;
        }
        const logsInfo = await lstat(this.logs);
        if (!logsInfo.isDirectory() || logsInfo.isSymbolicLink() || !inside(safeBase, safeLogs))
            throw new Error('OpenAI Hub log directory resolves outside DSH home');
        return { base: safeBase, logs: safeLogs };
    }

    private async deleteLogs(directory: string): Promise<void> {
        const names = await readdir(directory);
        for (const name of names) {
            if (name !== LOG_FILE && !name.startsWith(`${LOG_FILE}.`)) continue;
            const file = path.join(directory, name);
            const info = await lstat(file);
            if (!info.isFile() || info.nlink !== 1) throw new Error('OpenAI Hub log path is not a private regular file');
            await unlink(file);
        }
    }

    private async writePrivateFile(file: string, text: string): Promise<void> {
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
            await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            await rename(temporary, file);
        } catch (error) {
            try {
                await unlink(temporary);
            } catch (cleanupError) {
                if (!(cleanupError instanceof Error && isMissing(cleanupError))) throw cleanupError;
            }
            throw error;
        }
    }

    private serial<T>(action: () => Promise<T>): Promise<T> {
        const result = loggingQueue.then(action);
        loggingQueue = result.then(
            () => undefined,
            () => undefined
        );
        return result;
    }
}
