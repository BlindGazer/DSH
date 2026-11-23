import { describe, expect, it, vi } from 'vitest';
import { createLoggerRemote, type LoggerWireRemote } from '../src/client/remote.ts';
import { LoggerConfigSchema, TYPERT_REMOTE } from '../src/shared/remote.ts';

vi.mock('@kalex/dsh-core', () => ({ ensureCoreStyles: vi.fn(), useEffectiveTheme: () => 'dark', Spinner: () => null }));

import { apply, type LoggerClientContext } from '../src/client/index.tsx';

const getSnapshot = () => ({ active: 'en', revision: 0 });

describe('logger settings client', () => {
    const snapshot = { config: LoggerConfigSchema.parse({}), resolvedPath: 'logs', packageNames: [] };
    const wire: LoggerWireRemote = {
        read: async () => ({ ok: true, value: snapshot }),
        save: async input => ({ ok: true, value: { ...snapshot, config: input.config } }),
        previewPath: async input => ({ ok: true, value: { path: input.path, controlled: 0, unknown: 0, deleted: [], preserved: [] } })
    };
    it('uses input as the gateway argument name for parameterized endpoints', () => {
        for (const method of ['save', 'previewPath']) {
            expect(TYPERT_REMOTE.descriptors.find(row => row.method === method)?.parameters).toEqual([
                expect.objectContaining({ name: 'input', wire: 'input', source: 'json' })
            ]);
        }
    });
    it('unwraps read and save remote envelopes', async () => {
        const remote = createLoggerRemote(wire);
        expect(await remote.read()).toStrictEqual(snapshot);
        const updated = { ...snapshot.config, enabled: true };
        expect((await remote.save({ config: updated, expectedConfig: snapshot.config, confirmPathChange: false })).config).toStrictEqual(
            updated
        );
    });
    it('mounts the remote contribution and registers the settings section', async () => {
        const dispose = vi.fn();
        const register = vi.fn(() => () => undefined);
        const mount = vi.fn(async () => dispose);
        const unregister = vi.fn();
        const registerDictionary = vi.fn(() => unregister);
        const context: LoggerClientContext = {
            remote: { $mount: mount },
            locale: {
                register: registerDictionary,
                bind: () => key => key,
                getLocale: getSnapshot,
                getSnapshot,
                subscribe: () => unregister
            },
            slots: { inject: (_name, callback) => callback(), register },
            get: () => wire,
            effect: callback => {
                callback();
            }
        };
        const cleanup = await apply(context);
        expect(mount).toHaveBeenCalledWith(TYPERT_REMOTE);
        expect(register).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'settings.section', id: 'dsh-logger', locale: 'settings.logger' }),
            expect.any(Function)
        );
        expect(registerDictionary.mock.calls).toEqual([
            ['settings.logger', 'en', expect.objectContaining({ save: 'Save' })],
            ['settings.logger', 'ru', expect.objectContaining({ save: 'Сохранить' })]
        ]);
        await cleanup();
        expect(dispose).toHaveBeenCalledOnce();
    });
});
