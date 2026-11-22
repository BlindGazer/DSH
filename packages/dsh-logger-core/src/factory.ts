import { type DshLogger, type JsonValue, type LogLevel, NOOP_LOGGER } from './types.ts';

export type LoggerEventContext = {
    readonly event?: string;
    readonly phase?: string;
    readonly operation?: string;
    readonly durationMs?: number;
    readonly errorCode?: string;
} & { readonly [key: string]: JsonValue };

export interface ClientLoggerOptions {
    readonly sink?: (level: LogLevel, message: string, context?: LoggerEventContext) => void;
}

export interface LoggerFacade {
    readonly debug: (message: string, context?: LoggerEventContext) => void;
    readonly info: (message: string, context?: LoggerEventContext) => void;
    readonly warn: (message: string, context?: LoggerEventContext) => void;
    readonly error: (message: string, context?: LoggerEventContext) => void;
}

function createFacade(logger: DshLogger, sink?: ClientLoggerOptions['sink']): LoggerFacade {
    const write = (level: LogLevel, message: string, context?: LoggerEventContext): void => {
        sink?.(level, message, context);
        logger.record(context === undefined ? { event: message, level } : { event: context.event ?? message, level, data: context });
    };
    return {
        debug: (message, context) => write('debug', message, context),
        info: (message, context) => write('info', message, context),
        warn: (message, context) => write('warn', message, context),
        error: (message, context) => write('error', message, context)
    };
}

export interface OptionalLoggerScope {
    readonly dshLoggerService?: {
        getLogger(context: { readonly packageName: string }, source: 'host'): DshLogger;
    };
    effect(action: () => () => void, name: string): void;
}

export interface OptionalLoggerContext {
    inject?(keys: readonly string[], action: (scope: OptionalLoggerScope) => void): void;
}

/** Ожидаем реальный сервис, а имя пакета передаём явно: имя fiber не является идентификатором пакета. */
export function createOptionalLogger(context: OptionalLoggerContext, packageName: string): DshLogger {
    let target = NOOP_LOGGER;
    context.inject?.(['dshLoggerService'], scope => {
        target = scope.dshLoggerService?.getLogger({ packageName }, 'host') ?? NOOP_LOGGER;
        scope.effect(
            () => () => {
                target = NOOP_LOGGER;
            },
            'optional dsh-logger binding'
        );
    });
    return { record: record => target.record(record) };
}

export function createHostLogger(logger?: DshLogger): LoggerFacade {
    return createFacade(logger ?? NOOP_LOGGER);
}

export function createClientLogger(options: ClientLoggerOptions = {}, logger?: DshLogger): LoggerFacade {
    return createFacade(logger ?? NOOP_LOGGER, options.sink);
}
