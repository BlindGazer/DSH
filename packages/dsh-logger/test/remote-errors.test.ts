import { Context } from '@deepseek-ai/cordis';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLoggerRemote, type LoggerWireRemote } from '../src/client/remote.ts';
import { LoggerSettingsRemoteService } from '../src/host/remote-service.ts';
import {
    LoggerConfigSchema,
    type LoggerSaveRequest,
    type LoggerSettingsRemote,
    type LoggerSettingsSnapshot
} from '../src/shared/remote.ts';

class InspectableLoggerSettingsRemoteService extends LoggerSettingsRemoteService {
    public get hostLogger() {
        return this.ctx.logger;
    }
}

function snapshot(): LoggerSettingsSnapshot {
    return { config: LoggerConfigSchema.parse({}), resolvedPath: 'C:/test-logs', packageNames: [] };
}
function saveRequest(): LoggerSaveRequest {
    return { config: snapshot().config, expectedConfig: snapshot().config, confirmPathChange: false };
}
afterEach(() => {
    vi.restoreAllMocks();
});

describe('logger remote errors', () => {
    it.each(['read', 'save', 'previewPath'] as const)('preserves the original %s wire error identity', async method => {
        const error = new RemoteError('gateway/bad-request', 'sanitized conflict', {});
        const wire: LoggerWireRemote = {
            read: async () => ({ ok: false, error }),
            save: async () => ({ ok: false, error }),
            previewPath: async () => ({ ok: false, error })
        };
        const remote = createLoggerRemote(wire);
        const call =
            method === 'read' ? remote.read() : method === 'save' ? remote.save(saveRequest()) : remote.previewPath({ path: 'C:/new' });
        await expect(call).rejects.toBe(error);
    });

    it.each(['read', 'save', 'previewPath'] as const)('logs a safe %s failure at both Host boundaries', async method => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const context = new Context();
        try {
            const failure = new Error('Logger configuration changed; synthetic-sensitive-host-detail');
            const handlers: LoggerSettingsRemote = {
                read: async () => {
                    throw failure;
                },
                save: async () => {
                    throw failure;
                },
                previewPath: async () => {
                    throw failure;
                }
            };
            const service = new InspectableLoggerSettingsRemoteService(context, handlers);
            const hostError = vi.spyOn(service.hostLogger, 'error').mockImplementation(() => undefined);
            const call =
                method === 'read'
                    ? service.read()
                    : method === 'save'
                      ? service.save(saveRequest())
                      : service.previewPath({ path: 'C:/new' });
            const safeMessage = `dsh-logger: ${method} failed (conflict)`;
            await expect(call).rejects.toMatchObject({ code: 'gateway/bad-request', message: safeMessage });
            expect(consoleError).toHaveBeenCalledExactlyOnceWith(safeMessage);
            expect(hostError).toHaveBeenCalledExactlyOnceWith(safeMessage);
            expect(JSON.stringify(consoleError.mock.calls)).not.toContain('synthetic-sensitive-host-detail');
            expect(JSON.stringify(hostError.mock.calls)).not.toContain('synthetic-sensitive-host-detail');
        } finally {
            await context.fiber.dispose();
        }
    });

    it('passes successful Host requests and values through unchanged', async () => {
        const context = new Context();
        try {
            const value = snapshot();
            const preview = { path: 'C:/new', controlled: 2, unknown: 1, deleted: [], preserved: [] };
            const handlers = {
                read: vi.fn<LoggerSettingsRemote['read']>().mockResolvedValue(value),
                save: vi.fn<LoggerSettingsRemote['save']>().mockResolvedValue(value),
                previewPath: vi.fn<LoggerSettingsRemote['previewPath']>().mockResolvedValue(preview)
            };
            const service = new LoggerSettingsRemoteService(context, handlers);
            const request = saveRequest();
            await expect(service.read()).resolves.toBe(value);
            await expect(service.save(request)).resolves.toBe(value);
            await expect(service.previewPath({ path: preview.path })).resolves.toBe(preview);
            expect(handlers.save).toHaveBeenCalledExactlyOnceWith(request);
            expect(handlers.previewPath).toHaveBeenCalledExactlyOnceWith({ path: preview.path });
        } finally {
            await context.fiber.dispose();
        }
    });
});
