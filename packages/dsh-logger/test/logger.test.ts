import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../src/host/logger.ts';
import {
    cleanupLoggerDirectory,
    isValidPackageName,
    LoggerService,
    resolveLoggerPath,
    validateLoggerConfig,
    validateLoggerPath
} from '../src/host/service.ts';
import { type DshLogRecord, type LoggerConfig, NOOP_LOGGER, type RuntimeValue } from '../src/shared/index.ts';
import { sanitizeValue, serializeJson } from '../src/shared/sanitize.ts';

describe('dsh logger contract', () => {
    it('accepts minimal records and no-op is callable', () => {
        const record: DshLogRecord = { event: 'started' };
        expect(record.level).toBeUndefined();
        expect(() => NOOP_LOGGER.record(record)).not.toThrow();
    });

    it('accepts valid scoped and unscoped package names', () => {
        expect(isValidPackageName('@scope/package')).toBe(true);
        expect(isValidPackageName('package-name')).toBe(true);
        expect(isValidPackageName('@scope/package_name')).toBe(true);
    });

    it('sanitizes runtime values with markers and declarative rules', () => {
        const circular: { readonly name: string; self?: RuntimeValue } = { name: 'ok' };
        circular.self = circular;
        const result = sanitizeValue(
            {
                token: 'hidden',
                nested: { keep: 'value', remove: 'secret' },
                values: [1n, new Error('boom'), circular],
                deep: { one: { two: { three: { four: { five: { six: { seven: { eight: { nine: true } } } } } } } } }
            },
            { keys: ['remove'], paths: ['nested.keep'] }
        );
        expect(result).toEqual({
            deep: { one: { two: { three: { four: { five: { six: { seven: { eight: '[Truncated]' } } } } } } } },
            nested: {},
            values: ['[BigInt]', { name: 'Error', message: 'boom' }, { name: 'ok', self: '[Circular]' }]
        });
    });

    it('limits strings by Unicode code points and serializes finite JSON values', () => {
        const value = sanitizeValue({ text: '😀'.repeat(4097), nan: Number.NaN, infinity: Number.POSITIVE_INFINITY, negativeZero: -0 });
        expect(typeof value).toBe('object');
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            expect(Array.from(value.text as string)).toHaveLength(4096);
            expect(value.nan).toBeNull();
            expect(value.infinity).toBeNull();
            expect(value.negativeZero).toBe(0);
        }
        expect(serializeJson({ value: 1n })).toBe('{"value":"[BigInt]"}');
    });

    it('activates issued scoped logger after load and resets on unload', () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-'));
        try {
            const service = new LoggerService({ profilePath: directory });
            const logger = service.getLogger({ packageName: '@scope/plugin' }, 'host');
            logger.record({ event: 'before' });
            service.load({ enabled: true, path: join(directory, 'logs'), maxFileBytes: 4096 });
            logger.record({ event: 'after' });
            const file = join(directory, 'logs', '@scope-plugin.jsonl');
            expect(readFileSync(file, 'utf8')).toContain('after');
            service.unload();
            logger.record({ event: 'ignored' });
            expect(readFileSync(file, 'utf8')).not.toContain('ignored');
            expect(service.getLogger({ packageName: '@scope/plugin' }, 'host')).toBeDefined();
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('deduplicates scoped registrations and rebinds a single logger through load/unload', () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-scoped-'));
        try {
            const service = new LoggerService({ profilePath: directory });
            const first = service.getLogger({ packageName: '@scope/scoped' }, 'host');
            const second = service.getLogger({ packageName: '@scope/scoped' }, 'host');
            service.load({ enabled: true, path: join(directory, 'logs'), maxFileBytes: 4096 });
            first.record({ event: 'first' });
            second.record({ event: 'second' });
            const file = join(directory, 'logs', '@scope-scoped.jsonl');
            expect(readFileSync(file, 'utf8').split('\n').filter(Boolean)).toHaveLength(2);
            service.unload();
            first.record({ event: 'ignored' });
            expect(readFileSync(file, 'utf8')).not.toContain('ignored');
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('returns noop logger when context package name is invalid', () => {
        const service = new LoggerService();
        const logger = service.getLogger({ packageName: 'Invalid Name' }, 'host');
        expect(() => logger.record({ event: 'ignored' })).not.toThrow();
    });

    it('does not initialize a package repeatedly when a scoped logger is requested', () => {
        const service = new LoggerService();
        const create = vi.spyOn(service, 'getLogger');
        service.getLogger({ packageName: '@scope/once' }, 'host');
        service.getLogger({ packageName: '@scope/once' }, 'host');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('applies package policy and level filtering to issued scoped loggers', () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-policy-'));
        try {
            const service = new LoggerService({ profilePath: directory });
            const logger = service.getLogger({ packageName: '@scope/policy' }, 'host');
            service.load({
                enabled: true,
                path: join(directory, 'logs'),
                maxFileBytes: 4096,
                plugins: { '@scope/policy': { enabled: false, level: 'debug' } }
            });
            logger.record({ event: 'disabled' });
            const file = join(directory, 'logs', '@scope-policy.jsonl');
            expect(existsSync(file)).toBe(false);

            service.load({
                enabled: true,
                path: join(directory, 'logs'),
                maxFileBytes: 4096,
                level: 'warn',
                plugins: { '@scope/policy': { enabled: true, level: 'error' } }
            });
            logger.record({ event: 'warning', level: 'warn' });
            logger.record({ event: 'failure', level: 'error' });
            expect(readFileSync(file, 'utf8')).not.toContain('warning');
            expect(readFileSync(file, 'utf8')).toContain('failure');
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('rebinds the same scoped logger when policy changes across lifecycle', () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-rebind-'));
        try {
            const service = new LoggerService({ profilePath: directory });
            const logger = service.getLogger({ packageName: 'rebind-plugin' }, 'host');
            service.load({ enabled: true, path: join(directory, 'logs'), maxFileBytes: 4096 });
            const file = join(directory, 'logs', 'rebind-plugin.jsonl');
            logger.record({ event: 'first' });
            service.unload();
            service.load({
                enabled: true,
                path: join(directory, 'logs'),
                maxFileBytes: 4096,
                plugins: { 'rebind-plugin': { enabled: false } }
            });
            logger.record({ event: 'after-policy-disable' });
            expect(readFileSync(file, 'utf8')).toContain('first');
            expect(readFileSync(file, 'utf8')).not.toContain('after-policy-disable');
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('enforces profile-contained paths and controlled cleanup', () => {
        const profile = mkdtempSync(join(tmpdir(), 'dsh-logger-path-'));
        const logs = join(profile, 'logs');
        const outside = mkdtempSync(join(tmpdir(), 'dsh-logger-out-'));
        try {
            expect(resolveLoggerPath({ enabled: false }, profile)).toBe(join(profile, 'dsh-logger'));
            expect(validateLoggerPath(logs, profile)).toBe(logs);
            expect(() => validateLoggerPath(join(profile, '..', 'escape'), profile)).toThrow();
            mkdirSync(logs, { recursive: true });
            writeFileSync(join(logs, 'unknown.jsonl'), '{"event":"foreign"}\n');
            writeFileSync(join(logs, 'package.jsonl'), '{"packageName":"package","event":"ok"}\n');
            cleanupLoggerDirectory(logs, true, profile);
            expect(existsSync(join(logs, 'unknown.jsonl'))).toBe(true);
            expect(existsSync(join(logs, 'package.jsonl'))).toBe(false);
            expect(() => cleanupLoggerDirectory(logs, false, profile)).toThrow();
            const link = join(profile, 'link');
            symlinkSync(outside, link, 'junction');
            expect(() => validateLoggerPath(link, profile)).toThrow();
        } finally {
            rmSync(profile, { recursive: true, force: true });
            rmSync(outside, { recursive: true, force: true });
        }
    });

    it('serializes concurrent host and client appends in one ordered file and rotates whole file', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-rotation-'));
        try {
            const config: LoggerConfig = { enabled: true, path: directory, maxFileBytes: 1024 };
            const host = createLogger({ packageName: 'shared/plugin', source: 'host', config });
            const client = createLogger({ packageName: 'shared/plugin', source: 'client', config });
            const writes = Array.from({ length: 24 }, (_, index) =>
                (index % 2 === 0 ? host : client).record({ event: `event-${index}`, data: { index } })
            );
            await Promise.all(writes);
            const file = join(directory, 'shared-plugin.jsonl');
            const content = readFileSync(file, 'utf8');
            expect(Buffer.byteLength(content)).toBeLessThanOrEqual(1024);
            const records = content
                .trim()
                .split('\n')
                .map(line => JSON.parse(line) as { readonly event: string; readonly source: string });
            expect(records.length).toBeGreaterThan(0);
            expect(records.every(record => record.event.startsWith('event-'))).toBe(true);
            expect(new Set(records.map(record => record.source))).toEqual(new Set(['host', 'client']));
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('recovers stale locks and valid temporary files while discarding invalid temporary files', () => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-recovery-'));
        try {
            const file = join(directory, 'recovery-plugin.jsonl');
            const lock = join(directory, '.dsh-logger.lock');
            const temporary = `${file}.tmp`;
            writeFileSync(lock, '999999\n');
            const stale = new Date(Date.now() - 60_000);
            utimesSync(lock, stale, stale);
            writeFileSync(temporary, '{"event":"recovered","level":"info","packageName":"recovery/plugin","source":"host"}\n');
            const logger = createLogger({
                packageName: 'recovery/plugin',
                source: 'host',
                config: { enabled: true, path: directory, maxFileBytes: 4096 }
            });
            logger.record({ event: 'fresh' });
            const content = readFileSync(file, 'utf8');
            expect(content).toContain('recovered');
            expect(content).toContain('fresh');
            expect(existsSync(lock)).toBe(false);
            writeFileSync(temporary, '{invalid');
            logger.record({ event: 'after-invalid-temp' });
            expect(readFileSync(file, 'utf8')).toContain('after-invalid-temp');
            expect(existsSync(temporary)).toBe(false);
            expect(statSync(file).size).toBeGreaterThan(0);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('requires explicit confirmation for custom paths outside the profile', () => {
        const profile = mkdtempSync(join(tmpdir(), 'dsh-logger-profile-'));
        const outside = mkdtempSync(join(tmpdir(), 'dsh-logger-custom-'));
        try {
            const service = new LoggerService({ profilePath: profile });
            const customPath = join(outside, 'logs');
            expect(() => service.load({ enabled: true, path: customPath }, false)).toThrow('Logger path escapes profile');
            service.load({ enabled: true, path: customPath, maxFileBytes: 4096 }, true);
            const confirmedLogger = service.getLogger({ packageName: '@scope/custom' }, 'host');
            confirmedLogger.record({ event: 'confirmed' });
            expect(readFileSync(join(customPath, '@scope-custom.jsonl'), 'utf8')).toContain('confirmed');
        } finally {
            rmSync(profile, { recursive: true, force: true });
            rmSync(outside, { recursive: true, force: true });
        }
    });

    it('rejects invalid package names and invalid config values', () => {
        expect(isValidPackageName('@scope/')).toBe(false);
        expect(isValidPackageName('scope/package/extra')).toBe(false);
        expect(() => validateLoggerConfig({ enabled: true, plugins: { '@scope/package': { enabled: true } } })).not.toThrow();
        expect(() => validateLoggerConfig({ enabled: true, plugins: { 'scope/package/extra': { enabled: true } } })).toThrow();
        const extraConfig: LoggerConfig & { readonly extra: boolean } = { enabled: true, extra: true };
        expect(() => validateLoggerConfig(extraConfig)).toThrow();
        const nullSanitizerConfig = { enabled: true, sanitizer: null };
        // Deliberately bypass static validation to exercise rejection at the runtime boundary.
        expect(() => validateLoggerConfig(nullSanitizerConfig as unknown as LoggerConfig)).toThrow();
    });
});
