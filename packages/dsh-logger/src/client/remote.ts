import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import { LoggerPathPreviewSchema, type LoggerSettingsRemote, LoggerSettingsSnapshotSchema } from '../shared/remote.ts';

export type LoggerWireRemote = {
    [Method in keyof LoggerSettingsRemote]: (
        ...args: Parameters<LoggerSettingsRemote[Method]>
    ) => Promise<RemoteResult<Awaited<ReturnType<LoggerSettingsRemote[Method]>>>>;
};

export function createLoggerRemote(wire: LoggerWireRemote): LoggerSettingsRemote {
    return {
        read: async () => {
            const result = await wire.read();
            if (!result.ok) throw result.error;
            return LoggerSettingsSnapshotSchema.parse(result.value);
        },
        save: async request => {
            const result = await wire.save(request);
            if (!result.ok) throw result.error;
            return LoggerSettingsSnapshotSchema.parse(result.value);
        },
        previewPath: async request => {
            const result = await wire.previewPath(request);
            if (!result.ok) throw result.error;
            return LoggerPathPreviewSchema.parse(result.value);
        }
    };
}
