import { Context } from '@deepseek-ai/cordis';
import { createOptionalLogger, type DshLogger, type DshLogRecord } from '@kalex/dsh-logger-core';
import { describe, expect, it } from 'vitest';

describe('optional Cordis logger dependency', () => {
    it('starts without the logger and binds, unbinds and rebinds it without restarting the consumer', async () => {
        const root = new Context();
        const records: DshLogRecord[] = [];
        let logger: DshLogger | undefined;
        let starts = 0;
        await root.plugin({
            name: 'optional-logger-consumer',
            apply(context: Context) {
                starts += 1;
                logger = createOptionalLogger(context, '@kalex/dsh-openai-hub');
                logger.record({ event: 'without-service' });
            }
        });
        expect(starts).toBe(1);
        expect(records).toEqual([]);
        const dispose = root.provide('dshLoggerService', { getLogger: () => ({ record: (record: DshLogRecord) => records.push(record) }) });
        await root.plugin({ name: 'flush-injection', apply() {} });
        logger?.record({ event: 'with-service' });
        expect(records.map(record => record.event)).toEqual(['with-service']);
        await dispose();
        logger?.record({ event: 'after-unload' });
        expect(records.map(record => record.event)).toEqual(['with-service']);
        const reboundRecords: DshLogRecord[] = [];
        const disposeRebound = root.provide('dshLoggerService', {
            getLogger: () => ({ record: (record: DshLogRecord) => reboundRecords.push(record) })
        });
        await root.plugin({ name: 'flush-rebinding', apply() {} });
        logger?.record({ event: 'with-rebound-service' });
        expect(reboundRecords.map(record => record.event)).toEqual(['with-rebound-service']);
        expect(records.map(record => record.event)).toEqual(['with-service']);
        await disposeRebound();
        logger?.record({ event: 'after-second-unload' });
        expect(reboundRecords.map(record => record.event)).toEqual(['with-rebound-service']);
        expect(starts).toBe(1);
    });
});
