import type { JsonValue, LoggerEventContext } from '../../src/index.ts';

const minimal: LoggerEventContext = {};
const event: LoggerEventContext = { event: 'completed', phase: 'done', operation: 'refresh', durationMs: 1, errorCode: 'none' };
const extended: LoggerEventContext = { nested: { items: [null, true, 1, 'text'] } };
const json: JsonValue = event;

// @ts-expect-error Optional known fields must not allow explicit undefined through the JSON index.
const undefinedEvent: LoggerEventContext = { event: undefined };
// @ts-expect-error Unknown context fields must remain JSON values.
const undefinedExtra: LoggerEventContext = { extra: undefined };
// @ts-expect-error The known numeric field must retain its specific type.
const invalidDuration: LoggerEventContext = { durationMs: 'slow' };
// @ts-expect-error Runtime errors are not JSON context values.
const runtimeError: LoggerEventContext = { error: new Error('not JSON') };

export { event, extended, invalidDuration, json, minimal, runtimeError, undefinedEvent, undefinedExtra };
