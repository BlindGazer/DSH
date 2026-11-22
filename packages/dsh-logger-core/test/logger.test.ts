import { describe, expect, it, vi } from 'vitest';
import {
    createClientLogger,
    createHostLogger,
    createOptionalLogger,
    type DshLogger,
    type DshLogRecord,
    type LoggerEventContext,
    NOOP_LOGGER,
    type OptionalLoggerScope
} from '../src/index.ts';

const noop = () => {};

function optionalContext() {
    let inject: ((scope: OptionalLoggerScope) => void) | undefined;
    const context = {
        inject: vi.fn((keys: readonly string[], action: (scope: OptionalLoggerScope) => void) => {
            expect(keys).toEqual(['dshLoggerService']);
            inject = action;
        })
    };
    const bind = (logger?: DshLogger): (() => void) => {
        let dispose = noop;
        inject?.({
            ...(logger === undefined
                ? {}
                : {
                      dshLoggerService: {
                          getLogger: (owner: { readonly packageName: string }, source: 'host') => {
                              expect(owner).toEqual({ packageName: '@kalex/test-consumer' });
                              expect(source).toBe('host');
                              return logger;
                          }
                      }
                  }),
            effect(action) {
                dispose = action();
            }
        });
        return dispose;
    };
    return { context, bind };
}

describe('logger-core no-op and optional binding', () => {
    it('discards records without inspecting them or requiring a service', () => {
        const record: DshLogRecord = {
            get event(): string {
                throw new Error('no-op must not inspect records');
            }
        };
        expect(Object.isFrozen(NOOP_LOGGER)).toBe(true);
        expect(NOOP_LOGGER.record(record)).toBeUndefined();
        expect(createOptionalLogger({}, '@kalex/test-consumer').record(record)).toBeUndefined();
        expect(() => createHostLogger().info('ignored')).not.toThrow();
        expect(() => createClientLogger().error('ignored')).not.toThrow();
    });

    it('keeps one handle through absent, bound, disposed and rebound receivers', () => {
        const { context, bind } = optionalContext();
        const logger = createOptionalLogger(context, '@kalex/test-consumer');
        const first = vi.fn();
        const second = vi.fn();
        logger.record({ event: 'before-service' });
        const disposeFirst = bind({ record: first });
        const record = { event: 'first-service' };
        logger.record(record);
        expect(first).toHaveBeenCalledExactlyOnceWith(record);
        expect(first.mock.calls[0]?.[0]).toBe(record);
        disposeFirst();
        logger.record({ event: 'after-dispose' });
        expect(first).toHaveBeenCalledTimes(1);
        const disposeSecond = bind({ record: second });
        logger.record({ event: 'second-service' });
        expect(second).toHaveBeenCalledExactlyOnceWith({ event: 'second-service' });
        disposeSecond();
        logger.record({ event: 'after-second-dispose' });
        expect(second).toHaveBeenCalledTimes(1);
        expect(context.inject).toHaveBeenCalledTimes(1);
    });

    it('uses no-op when an injected scope has no receiver', () => {
        const { context, bind } = optionalContext();
        const logger = createOptionalLogger(context, '@kalex/test-consumer');
        const dispose = bind();
        expect(() => logger.record({ event: 'missing-receiver' })).not.toThrow();
        dispose();
        expect(() => logger.record({ event: 'disposed' })).not.toThrow();
    });

    it('does not share binding state between consumers', () => {
        const first = optionalContext();
        const second = optionalContext();
        const firstLogger = createOptionalLogger(first.context, '@kalex/test-consumer');
        const secondLogger = createOptionalLogger(second.context, '@kalex/test-consumer');
        const record = vi.fn();
        first.bind({ record });
        secondLogger.record({ event: 'other-consumer' });
        expect(record).not.toHaveBeenCalled();
        firstLogger.record({ event: 'owner' });
        expect(record).toHaveBeenCalledExactlyOnceWith({ event: 'owner' });
    });
});

describe('logger facade compatibility', () => {
    it('maps all levels and preserves event overrides and context identity', () => {
        const record = vi.fn();
        const logger = createHostLogger({ record });
        const context: LoggerEventContext = { event: 'override', phase: 'completed', operation: 'refresh', durationMs: 3 };
        logger.debug('debug-message');
        logger.info('info-message', context);
        logger.warn('warn-message', {});
        logger.error('error-message', { event: '' });
        expect(record.mock.calls).toEqual([
            [{ event: 'debug-message', level: 'debug' }],
            [{ event: 'override', level: 'info', data: context }],
            [{ event: 'warn-message', level: 'warn', data: {} }],
            [{ event: '', level: 'error', data: { event: '' } }]
        ]);
        expect(record.mock.calls[1]?.[0].data).toBe(context);
    });

    it('calls the client sink before the receiver with the original message', () => {
        const order: string[] = [];
        const sink = vi.fn(() => order.push('sink'));
        const record = vi.fn(() => order.push('record'));
        const context = { event: 'record-event' };
        createClientLogger({ sink }, { record }).warn('sink-message', context);
        expect(order).toEqual(['sink', 'record']);
        expect(sink).toHaveBeenCalledExactlyOnceWith('warn', 'sink-message', context);
        expect(record).toHaveBeenCalledExactlyOnceWith({ event: 'record-event', level: 'warn', data: context });
    });

    it('still calls a client sink without a logger receiver', () => {
        const sink = vi.fn();
        createClientLogger({ sink }).info('sink-only');
        expect(sink).toHaveBeenCalledExactlyOnceWith('info', 'sink-only', undefined);
    });

    it('preserves propagation of receiver and sink errors', () => {
        const failure = new Error('receiver failed');
        const record = vi.fn(() => {
            throw failure;
        });
        expect(() => createHostLogger({ record }).error('message')).toThrow(failure);
        record.mockClear();
        const sink = () => {
            throw failure;
        };
        expect(() => createClientLogger({ sink }, { record }).info('message')).toThrow(failure);
        expect(record).not.toHaveBeenCalled();
    });
});
