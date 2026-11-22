import type { Context } from '@deepseek-ai/cordis';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { loggerFailureKind } from '../shared/failure.ts';
import type {
    LoggerPathPreview,
    LoggerPathRequest,
    LoggerSaveRequest,
    LoggerSettingsRemote,
    LoggerSettingsSnapshot
} from '../shared/remote.ts';

export class LoggerSettingsRemoteService extends TypertRemoteService {
    public constructor(
        context: Context,
        private readonly handlers: LoggerSettingsRemote
    ) {
        super(context, 'dshLoggerSettings', { namespace: 'loggerSettings' });
    }
    @Remote public read(): Promise<LoggerSettingsSnapshot> {
        return this.run('read', () => this.handlers.read());
    }
    @Remote public save(input: LoggerSaveRequest): Promise<LoggerSettingsSnapshot> {
        return this.run('save', () => this.handlers.save(input));
    }
    @Remote public previewPath(input: LoggerPathRequest): Promise<LoggerPathPreview> {
        return this.run('previewPath', () => this.handlers.previewPath(input));
    }
    private async run<T>(operation: string, action: () => Promise<T>): Promise<T> {
        try {
            return await action();
        } catch (error) {
            const kind = loggerFailureKind(error instanceof Error ? error : undefined);
            const message = `dsh-logger: ${operation} failed (${kind})`;
            console.error(message);
            this.ctx.logger.error(message);
            throw new RemoteError('gateway/bad-request', message, {});
        }
    }
}
