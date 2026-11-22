import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type DshLogger, type DshLogRecord, type JsonValue, type LogSource, NOOP_LOGGER } from '@kalex/dsh-logger-core';
import { DEFAULT_LEVEL, DEFAULT_MAX_FILE_BYTES, type LoggerConfig, type LoggerPolicy } from '../shared/index.ts';
import { sanitizeValue } from '../shared/sanitize.ts';

const LOCK_TIMEOUT_MS = 5_000;
const STALE_LOCK_MS = 30_000;

export interface LoggerRuntimeOptions {
    readonly packageName: string;
    readonly source: LogSource;
    readonly config?: LoggerConfig;
    readonly directory?: string;
}

export function createLogger(options: LoggerRuntimeOptions): DshLogger {
    const config = options.config;
    const policy = config?.plugins?.[options.packageName];
    if (!config?.enabled || policy?.enabled === false) return NOOP_LOGGER;
    const maxBytes = policy?.maxFileBytes ?? config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    const level = policy?.level ?? config.level ?? DEFAULT_LEVEL;
    const directory = options.directory ?? config.path;
    if (!directory) return NOOP_LOGGER;
    try {
        mkdirSync(directory, { recursive: true });
    } catch {
        return NOOP_LOGGER;
    }
    const file = join(directory, `${options.packageName.replaceAll('/', '-')}.jsonl`);
    return {
        record(record: DshLogRecord): void {
            try {
                if (!record.event || !isLevelAllowed(record.level ?? DEFAULT_LEVEL, level)) return;
                const envelope = {
                    event: record.event,
                    level: record.level ?? DEFAULT_LEVEL,
                    packageName: options.packageName,
                    source: options.source,
                    ...(record.phase ? { phase: record.phase } : {}),
                    ...(record.operation ? { operation: record.operation } : {}),
                    ...(record.data !== undefined ? { data: sanitizeValue(record.data, mergeRules(config, policy)) } : {})
                };
                const line = `${JSON.stringify(envelope)}\n`;
                if (Buffer.byteLength(line) > maxBytes) {
                    const truncated = truncateEnvelope(envelope, maxBytes);
                    if (truncated !== undefined) appendLine(file, `${JSON.stringify(truncated)}\n`, maxBytes);
                    return;
                }
                appendLine(file, line, maxBytes);
            } catch {
                return;
            }
        }
    };
}

type LoggerEnvelope = { readonly [key: string]: JsonValue };

function truncateEnvelope(envelope: LoggerEnvelope, maxBytes: number): LoggerEnvelope | undefined {
    const marker = '[Truncated]';
    const data = envelope.data;
    if (typeof data === 'string') {
        for (let length = data.length; length >= 0; length -= 1) {
            const candidate = { ...envelope, data: `${data.slice(0, length)}${marker}` };
            if (Buffer.byteLength(JSON.stringify(candidate)) + 1 <= maxBytes) return candidate;
        }
    }
    if (Array.isArray(data)) {
        for (let length = data.length; length >= 0; length -= 1) {
            const candidate = { ...envelope, data: [...data.slice(0, length), marker] };
            if (Buffer.byteLength(JSON.stringify(candidate)) + 1 <= maxBytes) return candidate;
        }
    }
    if (typeof data === 'object' && data !== undefined && data !== null && !Array.isArray(data)) {
        const entries = Object.entries(data);
        for (let length = entries.length; length >= 0; length -= 1) {
            const candidate = { ...envelope, data: { ...Object.fromEntries(entries.slice(0, length)), _truncated: marker } };
            if (Buffer.byteLength(JSON.stringify(candidate)) + 1 <= maxBytes) return candidate;
        }
    }
    const fallback = { ...envelope, data: marker };
    return Buffer.byteLength(JSON.stringify(fallback)) <= maxBytes ? fallback : undefined;
}

function appendLine(file: string, line: string, maxBytes: number): void {
    const lockPath = join(dirname(file), '.dsh-logger.lock');
    const lock = acquireLock(lockPath);
    if (lock === undefined) return;
    try {
        recoverTemp(file);
        const prior = existsSync(file) ? readFileSync(file, 'utf8') : '';
        const lines = prior.split('\n').filter(Boolean);
        lines.push(line.trimEnd());
        let output = `${lines.join('\n')}\n`;
        while (Buffer.byteLength(output) > maxBytes && lines.length > 1) {
            lines.shift();
            output = `${lines.join('\n')}\n`;
        }
        if (Buffer.byteLength(output) > maxBytes) return;
        const temporary = `${file}.tmp`;
        let temporaryHandle: number | undefined;
        try {
            temporaryHandle = openSync(temporary, 'w');
            writeSync(temporaryHandle, output, undefined, 'utf8');
            fsyncSync(temporaryHandle);
        } finally {
            if (temporaryHandle !== undefined) closeSync(temporaryHandle);
        }
        renameSync(temporary, file);
    } finally {
        try {
            closeSync(lock);
        } finally {
            try {
                unlinkSync(lockPath);
            } catch {
                /* lock already stale or recovered by another writer */
            }
        }
    }
}

function acquireLock(path: string): number | undefined {
    const started = Date.now();
    while (Date.now() - started < LOCK_TIMEOUT_MS) {
        try {
            const handle = openSync(path, 'wx');
            try {
                writeSync(handle, `${process.pid}\n`, undefined, 'utf8');
            } catch (error) {
                closeSync(handle);
                throw error;
            }
            return handle;
        } catch {
            if (existsSync(path)) {
                try {
                    const age = Date.now() - statSync(path).mtimeMs;
                    if (age > STALE_LOCK_MS && !isLockOwnerAlive(path)) unlinkSync(path);
                } catch {
                    /* retry until timeout */
                }
            }
        }
    }
    return undefined;
}

function isLockOwnerAlive(path: string): boolean {
    try {
        const owner = Number(readFileSync(path, 'utf8').trim());
        if (!Number.isInteger(owner) || owner <= 0) return false;
        process.kill(owner, 0);
        return true;
    } catch {
        return false;
    }
}

function recoverTemp(file: string): void {
    const temporary = `${file}.tmp`;
    if (!existsSync(temporary)) return;
    try {
        const temporaryText = readFileSync(temporary, 'utf8');
        for (const line of temporaryText.split('\n').filter(Boolean)) JSON.parse(line);
        if (!existsSync(file) || statSync(temporary).mtimeMs >= statSync(file).mtimeMs) {
            renameSync(temporary, file);
            return;
        }
    } catch {
        /* invalid or incomplete temporary file */
    }
    try {
        unlinkSync(temporary);
    } catch {
        /* another recovery already removed it */
    }
}

function isLevelAllowed(value: string, threshold: string): boolean {
    const order = ['debug', 'info', 'warn', 'error'];
    return order.indexOf(value) >= order.indexOf(threshold);
}

function mergeRules(
    config: LoggerConfig | undefined,
    policy: LoggerPolicy | undefined
): { readonly keys?: readonly string[]; readonly paths?: readonly string[] } {
    return {
        keys: [...new Set([...(config?.sanitizer?.keys ?? []), ...(policy?.sanitizer?.keys ?? [])])],
        paths: [...new Set([...(config?.sanitizer?.paths ?? []), ...(policy?.sanitizer?.paths ?? [])])]
    };
}
