// Compatibility forwarding only; optional consumers must import logger-core directly.
export {
    type ClientLoggerOptions,
    createClientLogger,
    createHostLogger,
    createOptionalLogger,
    type LoggerEventContext,
    type LoggerFacade,
    type OptionalLoggerContext,
    type OptionalLoggerScope
} from '@kalex/dsh-logger-core';
