import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, rmdirSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { type DshLogger, NOOP_LOGGER } from '@kalex/dsh-logger-core';
import type { LoggerConfig } from '../shared/index.ts';
import { createLogger, type LoggerRuntimeOptions } from './logger.ts';

export interface LoggerContext {
    readonly packageName: string;
}

export interface LoggerServiceOptions {
    readonly profilePath?: string;
    readonly config?: LoggerConfig;
}

/** Управляет жизненным циклом scoped logger и безопасно обнуляет их после выгрузки. */
export class LoggerService {
    private active = false;
    private config: LoggerConfig;
    private directory: string;
    private readonly profilePath: string;
    private readonly issued = new Map<string, MutableLogger>();

    public constructor(options: LoggerServiceOptions = {}) {
        this.config = options.config ?? { enabled: false };
        this.profilePath = options.profilePath ?? process.env.DSH_PROFILE_PATH ?? join(homedir(), '.dsh');
        this.directory = resolveLoggerPath(this.config, this.profilePath);
    }

    public load(config = this.config, confirmCustomPath = false): void {
        const configuredPath = resolveLoggerPath(config, this.profilePath);
        const validatedPath = validateLoggerPath(configuredPath, this.profilePath, { allowOutsideProfile: confirmCustomPath });
        this.config = config;
        this.directory = validatedPath;
        this.active = true;
        for (const holder of this.issued.values()) {
            holder.target = createLogger({
                packageName: holder.packageName,
                source: holder.source,
                config: this.config,
                directory: this.directory
            });
        }
    }

    public listPackageNames(): string[] {
        return [...new Set([...this.issued.values()].map(logger => logger.packageName))].toSorted();
    }

    public unload(): void {
        this.active = false;
        for (const logger of this.issued.values()) logger.target = NOOP_LOGGER;
    }

    public getLogger(context: LoggerContext, source: LoggerRuntimeOptions['source']): DshLogger {
        if (!context || typeof context.packageName !== 'string') return NOOP_LOGGER;
        if (!isValidPackageName(context.packageName)) return NOOP_LOGGER;
        const key = `${context.packageName}:${source}`;
        const existing = this.issued.get(key);
        if (existing !== undefined) return { record: record => existing.target.record(record) };
        const holder: MutableLogger = { target: NOOP_LOGGER, packageName: context.packageName, source };
        holder.target = this.active
            ? createLogger({ packageName: context.packageName, source, config: this.config, directory: this.directory })
            : NOOP_LOGGER;
        this.issued.set(key, holder);
        return { record: record => holder.target.record(record) };
    }
}

interface MutableLogger {
    target: DshLogger;
    readonly packageName: string;
    readonly source: LoggerRuntimeOptions['source'];
}

export function isValidPackageName(value: string): boolean {
    if (value.length === 0 || value.length > 128 || hasControlCharacter(value)) return false;
    const unscoped = /^[a-z0-9][a-z0-9._-]*$/u;
    const scoped = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u;
    return unscoped.test(value) || scoped.test(value);
}

export function resolveLoggerPath(config: LoggerConfig, profilePath?: string): string {
    const profile = profilePath ?? process.env.DSH_PROFILE_PATH ?? join(homedir(), '.dsh');
    const path = config.path ?? join(profile, 'dsh-logs');
    if (!isAbsolute(path)) throw new Error('Logger path must be absolute');
    return resolve(path);
}

export interface LoggerPathValidationOptions {
    readonly allowOutsideProfile?: boolean;
}

export function validateLoggerPath(path: string, profilePath?: string, options: LoggerPathValidationOptions = {}): string {
    const profile = resolve(profilePath ?? process.env.DSH_PROFILE_PATH ?? join(homedir(), '.dsh'));
    const resolved = resolveLoggerPath({ enabled: false, path }, profile);
    const profileReal = existingRealpath(profile);
    if (!options.allowOutsideProfile && !isContained(profileReal, resolved)) throw new Error('Logger path escapes profile');
    if (options.allowOutsideProfile && existsSync(resolved) && lstatSync(resolved).isSymbolicLink())
        throw new Error('Logger path cannot be symbolic link');

    let current = resolved;
    while (true) {
        if (existsSync(current)) {
            const stat = lstatSync(current);
            if (stat.isSymbolicLink()) throw new Error('Logger path cannot be symbolic link');
            if (!stat.isDirectory()) throw new Error('Logger path must be a directory');
            const real = realpathSync(current);
            if (!options.allowOutsideProfile && !isContained(profileReal, real)) throw new Error('Logger path escapes profile');
            return real === resolved ? real : resolved;
        }
        const parent = dirname(current);
        if (parent === current) return resolved;
        current = parent;
    }
}

export function cleanupLoggerDirectory(
    path: string,
    confirm: boolean,
    profilePath?: string,
    allowOutsideProfile = false,
    packageNames?: readonly string[],
    protectedPath?: string,
    confirmedPaths?: readonly string[]
): void {
    if (!confirm) throw new Error('Logger cleanup requires confirmation');
    const resolved = validateLoggerPath(path, profilePath, { allowOutsideProfile });
    if (!existsSync(resolved)) return;
    const directoryStat = lstatSync(resolved);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) return;
    const directoryReal = realpathSync(resolved);
    const profileReal = existingRealpath(profilePath ?? process.env.DSH_PROFILE_PATH ?? join(homedir(), '.dsh'));
    if (!allowOutsideProfile && !isContained(profileReal, directoryReal)) throw new Error('Logger path escapes profile');

    if (protectedPath !== undefined && resolve(protectedPath) === resolved) return;
    const preview = previewLoggerCleanup(resolved, packageNames, protectedPath, profilePath);
    const deletions = preview.deleted.filter(file => confirmedPaths === undefined || confirmedPaths.includes(file));
    for (const file of deletions) {
        if (file === resolved) continue;
        // Повторная проверка перед удалением исключает ссылки и чужие записи.
        if (!existsSync(file)) continue;
        const stat = lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(file) !== file || !isControlledLoggerFile(file)) continue;
        unlinkSync(file);
    }
    if (deletions.includes(resolved) && directoryReal !== profileReal && readdirSync(directoryReal).length === 0) {
        try {
            rmdirSync(directoryReal);
        } catch (error) {
            // Новый файл после проверки пустоты не должен удаляться рекурсивно.
            if (
                !(
                    error instanceof Error &&
                    'code' in error &&
                    (error.code === 'ENOTEMPTY' || error.code === 'EEXIST' || error.code === 'ENOENT')
                )
            ) {
                throw error;
            }
        }
    }
}

export interface LoggerCleanupPreview {
    readonly controlled: number;
    readonly unknown: number;
    readonly deleted: string[];
    readonly preserved: string[];
}

/** К удалению допускаются только проверенные файлы подключённых пакетов непосредственно в каталоге. */
export function previewLoggerCleanup(
    path: string,
    packageNames?: readonly string[],
    protectedPath?: string,
    profilePath?: string
): LoggerCleanupPreview {
    const result: LoggerCleanupPreview = { controlled: 0, unknown: 0, deleted: [], preserved: [] };
    if (!existsSync(path)) return result;
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return { ...result, unknown: 1, preserved: [path] };
    const controlledNames = packageNames?.map(name => `${name.replaceAll('/', '-')}.jsonl`);
    const unchanged = protectedPath !== undefined && resolve(protectedPath) === resolve(path);
    let controlled = 0;
    let foreign = 0;
    for (const name of readdirSync(path).toSorted()) {
        const file = join(path, name);
        const fileStat = lstatSync(file);
        const owned =
            (!controlledNames || controlledNames.includes(name)) &&
            fileStat.isFile() &&
            !fileStat.isSymbolicLink() &&
            realpathSync(file) === file &&
            isControlledLoggerFile(file);
        if (owned) controlled += 1;
        else foreign += 1;
        (owned && !unchanged ? result.deleted : result.preserved).push(file);
    }
    const profile = resolve(profilePath ?? process.env.DSH_PROFILE_PATH ?? join(homedir(), '.dsh'));
    const protectsDescendant = protectedPath !== undefined && isContained(resolve(path), resolve(protectedPath));
    if (!unchanged && !protectsDescendant && foreign === 0 && resolve(path) !== profile && dirname(path) !== path) {
        result.deleted.push(path);
    }
    return { ...result, controlled, unknown: foreign };
}

function existingRealpath(path: string): string {
    if (!existsSync(path)) return resolve(path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Logger profile cannot be symbolic link');
    return realpathSync(path);
}

function isContained(base: string, target: string): boolean {
    const rel = relative(base, target);
    return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export function isControlledLoggerFile(file: string): boolean {
    if (!file.endsWith('.jsonl')) return false;
    const expectedName = file.slice(file.lastIndexOf(sep) + 1);
    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    if (lines.length === 0) return false;
    return lines.every(line => {
        try {
            const value: JsonRecord = JSON.parse(line);
            return (
                typeof value.packageName === 'string' &&
                isValidPackageName(value.packageName) &&
                `${value.packageName.replaceAll('/', '-')}.jsonl` === expectedName
            );
        } catch {
            return false;
        }
    });
}

interface JsonRecord {
    readonly packageName?: string;
}

function hasControlCharacter(value: string): boolean {
    return Array.from(value).some(character => {
        const codePoint = character.codePointAt(0);
        return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
    });
}

export function validateLoggerConfig(config: LoggerConfig): void {
    if (config === null || typeof config !== 'object') throw new Error('config must be an object');
    const allowed = new Set(['enabled', 'level', 'path', 'maxFileBytes', 'sanitizer', 'plugins']);
    if (Object.keys(config).some(key => !allowed.has(key))) throw new Error('Unknown config field');
    if (typeof config.enabled !== 'boolean') throw new Error('enabled must be boolean');
    validateLevel(config.level);
    if (config.path !== undefined && !isAbsolute(config.path)) throw new Error('path must be absolute');
    validateLimit(config.maxFileBytes);
    validateSanitizer(config.sanitizer);
    if (config.plugins !== undefined) {
        if (config.plugins === null || typeof config.plugins !== 'object') throw new Error('plugins must be an object');
        for (const [name, policy] of Object.entries(config.plugins)) {
            if (policy === null || typeof policy !== 'object') throw new Error('Invalid package policy');
            if (Object.keys(policy).some(key => !['enabled', 'level', 'maxFileBytes', 'sanitizer'].includes(key)))
                throw new Error('Unknown package policy field');
            if (!isValidPackageName(name)) throw new Error('Invalid package name');
            if (typeof policy.enabled !== 'boolean') throw new Error('Invalid package policy enabled');
            validateLevel(policy.level);
            validateLimit(policy.maxFileBytes);
            validateSanitizer(policy.sanitizer);
        }
    }
}

function validateLevel(level: string | undefined): void {
    if (level !== undefined && level !== 'debug' && level !== 'info' && level !== 'warn' && level !== 'error') {
        throw new Error('Invalid log level');
    }
}

function validateLimit(limit: number | undefined): void {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1024)) {
        throw new Error('maxFileBytes must be an integer >= 1024');
    }
}

function validateSanitizer(sanitizer: LoggerConfig['sanitizer']): void {
    if (sanitizer === undefined) return;
    if (sanitizer === null || typeof sanitizer !== 'object') throw new Error('Invalid sanitizer');
    if (Object.keys(sanitizer).some(key => key !== 'keys' && key !== 'paths')) throw new Error('Unknown sanitizer field');
    const keys = sanitizer.keys ?? [];
    const paths = sanitizer.paths ?? [];
    if (keys.length > 256 || paths.length > 256) throw new Error('Too many sanitizer rules');
    for (const key of keys) {
        if (key.length === 0 || key.length > 128 || hasControlCharacter(key)) throw new Error('Invalid sanitizer key');
    }
    for (const path of paths) {
        if (!/^(?:[A-Za-z0-9_-]+|\d+)(?:\.(?:[A-Za-z0-9_-]+|\d+))*$/u.test(path)) throw new Error('Invalid sanitizer path');
    }
}
