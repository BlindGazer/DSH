export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogSource = 'host' | 'client';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface DshLogRecord {
    readonly event: string;
    readonly level?: LogLevel | undefined;
    readonly source?: string;
    readonly phase?: string;
    readonly operation?: string;
    readonly data?: JsonValue;
}

export interface DshLogger {
    record(record: DshLogRecord): void;
}

export const NOOP_LOGGER: DshLogger = Object.freeze({ record: () => undefined });
