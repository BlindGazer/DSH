import type { LogLevel } from '@kalex/dsh-logger-core';
import { DEFAULT_LEVEL, DEFAULT_MAX_FILE_BYTES, defaultLoggerConfig, type LoggerConfig, type LoggerPolicy } from '../shared/index.ts';
import { isValidPackageName, validateLoggerConfig } from './service.ts';

export interface LoggerConfigStore {
    readonly get: () => LoggerConfig;
    readonly update: (next: LoggerConfig) => void;
}

export function mergeLoggerPolicy(config: LoggerConfig, packageName: string): LoggerPolicy {
    const override = config.plugins?.[packageName];
    return {
        enabled: config.enabled && (override?.enabled ?? true),
        level: override?.level ?? config.level ?? DEFAULT_LEVEL,
        maxFileBytes: override?.maxFileBytes ?? config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
        sanitizer: {
            keys: [...new Set([...(config.sanitizer?.keys ?? []), ...(override?.sanitizer?.keys ?? [])])],
            paths: [...new Set([...(config.sanitizer?.paths ?? []), ...(override?.sanitizer?.paths ?? [])])]
        }
    };
}

export class InMemoryLoggerConfigService implements LoggerConfigStore {
    private current: LoggerConfig;

    public constructor(initial?: LoggerConfig) {
        this.current = structuredClone(initial ?? defaultLoggerConfig());
        validateLoggerConfig(this.current);
    }

    public get = (): LoggerConfig => this.current;

    public update = (next: LoggerConfig): void => {
        validateLoggerConfig(next);
        this.current = structuredClone(next);
    };

    public removePackagePolicy = (packageName: string): void => {
        if (!isValidPackageName(packageName) || !this.current.plugins?.[packageName]) return;
        const plugins = { ...this.current.plugins };
        delete plugins[packageName];
        this.current = { ...this.current, plugins };
    };
}

export function isValidLogLevel(value: string): value is LogLevel {
    return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
}
