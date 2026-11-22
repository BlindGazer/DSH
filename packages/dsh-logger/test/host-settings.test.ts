import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import { describe, expect, it } from 'vitest';
import { LoggerService } from '../src/host/service.ts';
import { LoggerSettings } from '../src/host/settings.ts';
import { LoggerConfigSchema } from '../src/shared/remote.ts';

describe('logger settings persistence', () => {
    it.each([false, true])('cleans connected logs after confirmed save, preserving foreign files: %s', async foreign => {
        const root = mkdtempSync(join(tmpdir(), 'logger-save-cleanup-'));
        try {
            const oldPath = join(root, 'old');
            mkdirSync(oldPath);
            const log = join(oldPath, '@scope-plugin.jsonl');
            writeFileSync(log, '{"packageName":"@scope/plugin","event":"old"}\n');
            if (foreign) writeFileSync(join(oldPath, 'keep.txt'), 'keep');
            const context = new Context();
            let stored = LoggerConfigSchema.parse({ path: oldPath });
            const entry = { options: { name: '@kalex/dsh-logger/host' } };
            Object.defineProperty(context, 'get', {
                value: (name: string) =>
                    name === 'configEditor'
                        ? {
                              entries: () => [entry, { options: { name: '@scope/plugin' } }],
                              edit: async (_entry: typeof entry, change: (current: typeof stored) => typeof stored) => {
                                  stored = change(stored);
                              }
                          }
                        : name === 'dshLoggerService'
                          ? { listPackageNames: () => ['@scope/plugin'] }
                          : undefined
            });
            const settings = new LoggerSettings(context, stored);
            const next = { ...stored, path: join(root, 'new') };
            await expect(settings.save({ config: next, expectedConfig: stored, confirmPathChange: false })).rejects.toThrow('confirmation');
            expect(existsSync(log)).toBe(true);
            const preview = await settings.previewPath({ path: next.path });
            await settings.save({ config: next, expectedConfig: stored, confirmPathChange: true, cleanupPaths: preview.deleted });
            expect(existsSync(log)).toBe(false);
            expect(existsSync(oldPath)).toBe(foreign);
            if (foreign) expect(readFileSync(join(oldPath, 'keep.txt'), 'utf8')).toBe('keep');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('lists only issued logger requests and configured policies, not installed plugins', async () => {
        const context = new Context();
        const runtime = new LoggerService();
        runtime.getLogger({ packageName: '@scope/connected' }, 'host');
        runtime.getLogger({ packageName: '@scope/connected' }, 'client');
        runtime.getLogger({ packageName: 'Invalid Name' }, 'host');
        Object.defineProperty(context, 'get', {
            value: (name: string) =>
                name === 'dshLoggerService'
                    ? runtime
                    : name === 'configEditor'
                      ? { entries: () => [{ options: { name: '@scope/unrelated/host' } }] }
                      : undefined
        });
        const settings = new LoggerSettings(context, { enabled: false, plugins: { '@scope/policy': { enabled: false } } });
        expect((await settings.read()).packageNames).toEqual(['@scope/connected', '@scope/policy']);
    });

    it('previews concrete connected deletion paths and preserves unconnected logs', async () => {
        const root = mkdtempSync(join(tmpdir(), 'logger-preview-'));
        try {
            const log = join(root, '@scope-connected.jsonl');
            const other = join(root, '@scope-other.jsonl');
            const text = join(root, 'notes.txt');
            writeFileSync(log, '{"packageName":"@scope/connected"}\n');
            writeFileSync(other, '{"packageName":"@scope/other"}\n');
            writeFileSync(text, 'keep');
            const settings = new LoggerSettings(new Context(), {
                enabled: false,
                path: root,
                plugins: { '@scope/connected': { enabled: true } }
            });
            expect(await settings.previewPath({ path: join(root, 'next') })).toEqual({
                path: join(root, 'next'),
                controlled: 1,
                unknown: 2,
                deleted: [log],
                preserved: [other, text]
            });
            expect((await settings.previewPath({ path: root })).deleted).toEqual([]);
            expect(existsSync(log)).toBe(true);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('keeps an old directory when the new path is nested and not created yet', async () => {
        const root = mkdtempSync(join(tmpdir(), 'logger-nested-'));
        try {
            const entry = { options: { name: '@kalex/dsh-logger/host' } };
            let stored = LoggerConfigSchema.parse({ path: root, plugins: { connected: { enabled: true } } });
            writeFileSync(join(root, 'connected.jsonl'), '{"packageName":"connected"}\n');
            const context = new Context();
            Object.defineProperty(context, 'get', {
                value: (name: string) =>
                    name === 'configEditor'
                        ? {
                              entries: () => [entry],
                              edit: async (_entry: typeof entry, change: (current: typeof stored, inherited: object) => typeof stored) => {
                                  stored = change(stored, {});
                              }
                          }
                        : undefined
            });
            const settings = new LoggerSettings(context, stored);
            const preview = await settings.previewPath({ path: join(root, 'next') });
            expect(preview.deleted).toEqual([join(root, 'connected.jsonl')]);
            await settings.save({
                config: { ...stored, path: join(root, 'next') },
                expectedConfig: stored,
                confirmPathChange: true,
                cleanupPaths: preview.deleted
            });
            expect(existsSync(root)).toBe(true);
            expect(existsSync(join(root, 'connected.jsonl'))).toBe(false);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('rejects changed previews and preserves new files created during persistence', async () => {
        const root = mkdtempSync(join(tmpdir(), 'logger-confirmed-'));
        try {
            const oldPath = join(root, 'old');
            mkdirSync(oldPath);
            const first = join(oldPath, 'first.jsonl');
            const second = join(oldPath, 'second.jsonl');
            writeFileSync(first, '{"packageName":"first"}\n');
            let stored = LoggerConfigSchema.parse({ path: oldPath, plugins: { first: { enabled: true }, second: { enabled: true } } });
            const entry = { options: { name: '@kalex/dsh-logger/host' } };
            const context = new Context();
            Object.defineProperty(context, 'get', {
                value: (name: string) =>
                    name === 'configEditor'
                        ? {
                              entries: () => [entry],
                              edit: async (_entry: typeof entry, change: (current: typeof stored) => typeof stored) => {
                                  stored = change(stored);
                                  writeFileSync(second, '{"packageName":"second"}\n');
                              }
                          }
                        : undefined
            });
            const settings = new LoggerSettings(context, stored);
            const next = { ...stored, path: join(root, 'next') };
            await expect(
                settings.save({ config: next, expectedConfig: stored, confirmPathChange: true, cleanupPaths: [] })
            ).rejects.toThrow('preview changed');
            const preview = await settings.previewPath({ path: next.path });
            await settings.save({ config: next, expectedConfig: stored, confirmPathChange: true, cleanupPaths: preview.deleted });
            expect(existsSync(first)).toBe(false);
            expect(existsSync(second)).toBe(true);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('returns the saved snapshot with a warning when postcommit cleanup fails', async () => {
        const root = mkdtempSync(join(tmpdir(), 'logger-cleanup-warning-'));
        try {
            const oldPath = join(root, 'old');
            mkdirSync(oldPath);
            let stored = LoggerConfigSchema.parse({ path: oldPath });
            const entry = { options: { name: '@kalex/dsh-logger/host' } };
            const context = new Context();
            Object.defineProperty(context, 'get', {
                value: (name: string) =>
                    name === 'configEditor'
                        ? {
                              entries: () => [entry],
                              edit: async (_entry: typeof entry, change: (current: typeof stored) => typeof stored) => {
                                  stored = change(stored);
                                  rmSync(oldPath, { recursive: true });
                                  writeFileSync(oldPath, 'foreign replacement');
                              }
                          }
                        : undefined
            });
            const settings = new LoggerSettings(context, stored);
            const next = { ...stored, path: join(root, 'next') };
            const preview = await settings.previewPath({ path: next.path });
            const saved = await settings.save({
                config: next,
                expectedConfig: stored,
                confirmPathChange: true,
                cleanupPaths: preview.deleted
            });
            expect(saved.config.path).toBe(next.path);
            expect(saved.cleanupWarning).toContain('settings saved');
            expect(readFileSync(oldPath, 'utf8')).toBe('foreign replacement');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('reads defaults and rejects save without configEditor', async () => {
        const settings = new LoggerSettings(new Context(), { enabled: false });
        const snapshot = await settings.read();
        expect(snapshot.config).toMatchObject({ enabled: false, maxFileBytes: 10485760 });
        await expect(settings.save({ config: snapshot.config, expectedConfig: snapshot.config, confirmPathChange: false })).rejects.toThrow(
            'cannot be saved'
        );
    });

    it('persists only the logger entry and rejects stale expected config', async () => {
        const context = new Context();
        let stored = LoggerConfigSchema.parse({});
        const entry = { options: { name: '@kalex/dsh-logger/host' } };
        let edits = 0;
        Object.defineProperty(context, 'get', {
            value: (name: string) =>
                name === 'configEditor'
                    ? {
                          entries: () => [entry],
                          edit: async (target: typeof entry, change: (current: typeof stored) => typeof stored) => {
                              expect(target).toBe(entry);
                              const next = change(stored);
                              stored = next;
                              edits += 1;
                          }
                      }
                    : undefined
        });
        const settings = new LoggerSettings(context, stored);
        const snapshot = await settings.read();
        const result = await settings.save({
            config: { ...snapshot.config, enabled: true },
            expectedConfig: snapshot.config,
            confirmPathChange: false
        });
        expect(result.config.enabled).toBe(true);
        expect(edits).toBe(1);
        await expect(settings.save({ config: snapshot.config, expectedConfig: snapshot.config, confirmPathChange: false })).rejects.toThrow(
            'changed'
        );
        expect(stored.enabled).toBe(true);
        expect(edits).toBe(1);
    });
});
