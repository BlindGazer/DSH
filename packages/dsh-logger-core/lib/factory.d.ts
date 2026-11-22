import { type DshLogger, type JsonValue, type LogLevel } from './types.ts';
export type LoggerEventContext = {
    readonly event?: string;
    readonly phase?: string;
    readonly operation?: string;
    readonly durationMs?: number;
    readonly errorCode?: string;
} & {
    readonly [key: string]: JsonValue;
};
export interface ClientLoggerOptions {
    readonly sink?: (level: LogLevel, message: string, context?: LoggerEventContext) => void;
}
export interface LoggerFacade {
    readonly debug: (message: string, context?: LoggerEventContext) => void;
    readonly info: (message: string, context?: LoggerEventContext) => void;
    readonly warn: (message: string, context?: LoggerEventContext) => void;
    readonly error: (message: string, context?: LoggerEventContext) => void;
}
export interface OptionalLoggerScope {
    readonly dshLoggerService?: {
        getLogger(context: {
            readonly packageName: string;
        }, source: 'host'): DshLogger;
    };
    effect(action: () => () => void, name: string): void;
}
export interface OptionalLoggerContext {
    inject?(keys: readonly string[], action: (scope: OptionalLoggerScope) => void): void;
}
/** Ожидаем реальный сервис, а имя пакета передаём явно: имя fiber не является идентификатором пакета. */
export declare function createOptionalLogger(context: OptionalLoggerContext, packageName: string): DshLogger;
export declare function createHostLogger(logger?: DshLogger): LoggerFacade;
export declare function createClientLogger(options?: ClientLoggerOptions, logger?: DshLogger): LoggerFacade;
