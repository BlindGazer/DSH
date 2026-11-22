export type LoggerFailureKind = 'conflict' | 'invalid' | 'unavailable' | 'internal';

export function loggerFailureKind(error: Error | undefined): LoggerFailureKind {
    if (!error) return 'internal';
    if (
        error.message.includes('configuration changed') ||
        error.message.includes('preview changed') ||
        error.message.endsWith('(conflict)')
    )
        return 'conflict';
    if (error.message.includes('cannot be saved') || error.message.endsWith('(unavailable)')) return 'unavailable';
    if (error.message.endsWith('(internal)')) return 'internal';
    if (error.name === 'ZodError' || ('code' in error && error.code === 'gateway/bad-request')) return 'invalid';
    if ('code' in error && (error.code === 'gateway/invocation-unavailable' || error.code === 'gateway/definition-unavailable'))
        return 'unavailable';
    if (error.message.startsWith('Logger path') || error.message.startsWith('path must') || error.message.includes('confirmation'))
        return 'invalid';
    return 'internal';
}
