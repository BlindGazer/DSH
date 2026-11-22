import { createHostLogger, type DshLogger, type JsonValue } from '@kalex/dsh-logger-core';
import type { OpenAIHubLogEvent } from '../shared/logging.ts';

export type HubLogger = (event: OpenAIHubLogEvent) => Promise<boolean>;

export function createHubLogger(logger?: DshLogger): HubLogger {
    const facade = createHostLogger(logger);
    return event => recordHubEvent(facade, event);
}

function recordHubEvent(logger: ReturnType<typeof createHostLogger>, event: OpenAIHubLogEvent): Promise<boolean> {
    const context: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) context[key] = value as JsonValue;
    }
    logger.info(event.event, context);
    return Promise.resolve(true);
}
