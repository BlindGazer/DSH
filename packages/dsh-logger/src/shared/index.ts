import type { JsonValue, LogLevel } from '@kalex/dsh-logger-core';

// Preserve manager API compatibility; consumers use logger-core directly.
export {
    type DshLogger,
    type DshLogRecord,
    type JsonPrimitive,
    type JsonValue,
    type LogLevel,
    type LogSource,
    NOOP_LOGGER
} from '@kalex/dsh-logger-core';

export type RuntimeFunction = (...args: never[]) => never;
export type RuntimeValue =
    | JsonValue
    | undefined
    | bigint
    | RuntimeFunction
    | symbol
    | Error
    | RuntimeValue[]
    | { readonly [key: string]: RuntimeValue };

export interface SanitizerRules {
    readonly keys?: readonly string[] | undefined;
    readonly paths?: readonly string[] | undefined;
}

export interface LoggerPolicy {
    readonly enabled: boolean;
    readonly level?: LogLevel | undefined;
    readonly maxFileBytes?: number | undefined;
    readonly sanitizer?: SanitizerRules | undefined;
}

export interface LoggerConfig extends LoggerPolicy {
    readonly path?: string | undefined;
    readonly plugins?: Readonly<Record<string, LoggerPolicy>>;
}

export const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_LEVEL: LogLevel = 'info';

export function defaultLoggerConfig(): LoggerConfig {
    return { enabled: false, level: DEFAULT_LEVEL, maxFileBytes: DEFAULT_MAX_FILE_BYTES, plugins: {} };
}
