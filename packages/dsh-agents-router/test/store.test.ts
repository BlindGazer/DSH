import { randomUUID } from 'node:crypto';
import { link, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { RouterStore } from '../src/host/services/store.js';

const sessionId = 'session_test_123';
const projectRoot = fileURLToPath(new URL('../examples/demo-project', import.meta.url));

test('stores global settings and isolates bounded audit logs under DSH home', async () => {
    const home = path.join(tmpdir(), `dsh-router-test-${randomUUID()}`);
    await mkdir(home);
    try {
        const store = new RouterStore(home);
        assert.deepEqual((await store.loadGlobalSettings()).settings, {
            locale: 'auto',
            theme: 'auto',
            pollingIntervalMs: 3000,
            globalLogging: false
        });
        const projectDefaults = (await store.loadProjectSettings(projectRoot)).settings;
        assert.equal(projectDefaults.redirectRootInstructionFiles, false);
        assert.deepEqual(projectDefaults.rootInstructionFileNames, ['AGENTS.md']);
        assert.equal(projectDefaults.redirectInstructionDirectories, false);
        assert.deepEqual(projectDefaults.instructionDirectoryNames, ['.cursor', '.claude']);
        assert.equal((await store.saveGlobalSettings({ globalLogging: true })).saved, true);
        assert.equal((await store.saveProjectSettings(projectRoot, { projectLogging: true })).saved, true);
        assert.equal(await store.appendAuditLog(projectRoot, sessionId, 'event: test'), true);
        assert.match(await store.readAuditLog(projectRoot, sessionId), /event: test/);
        assert.equal(await store.saveProjectSettings(projectRoot, { projectLogging: false }).then(result => result.saved), true);
        assert.equal(await store.readAuditLog(projectRoot, sessionId), '');

        await store.saveProjectSettings(projectRoot, { projectLogging: true });
        for (let index = 0; index < 205; index++) await store.appendAuditLog(projectRoot, sessionId, `event: ${index}`);
        const bounded = await store.readAuditLog(projectRoot, sessionId);
        assert.equal((bounded.match(/^## #/gm) ?? []).length, 200);
        await store.appendAuditLog(projectRoot, sessionId, `event: ${'x'.repeat(300 * 1024)}`);
        assert.ok(Buffer.byteLength(await store.readAuditLog(projectRoot, sessionId), 'utf8') <= 256 * 1024);
        await store.saveGlobalSettings({ globalLogging: false });
        assert.equal(await store.readAuditLog(projectRoot, sessionId), '');
        assert.equal((await store.saveGlobalSettings({ pollingIntervalMs: 2500 })).saved, false);

        const target = await realpath(home);
        assert.equal(path.dirname(target), await realpath(tmpdir()));
        assert.ok(path.basename(target).startsWith('dsh-router-test-'));
    } finally {
        const target = await realpath(home);
        assert.equal(path.dirname(target), await realpath(tmpdir()));
        assert.ok(path.basename(target).startsWith('dsh-router-test-'));
        await rm(target, { recursive: true });
    }
});

test('rejects audit files that have hard links outside the DSH home', async () => {
    const root = path.join(tmpdir(), `dsh-router-test-hardlink-${randomUUID()}`);
    const home = path.join(root, 'home');
    const linkedFile = path.join(root, 'linked.log');
    await mkdir(home, { recursive: true });
    try {
        const store = new RouterStore(home);
        await store.saveGlobalSettings({ globalLogging: true });
        await store.saveProjectSettings(projectRoot, { projectLogging: true });
        await store.appendAuditLog(projectRoot, sessionId, 'event: safe');
        await link(store.auditFile(projectRoot, sessionId), linkedFile);
        await expect(store.readAuditLog(projectRoot, sessionId)).rejects.toThrow(/private regular file/);
        await expect(store.appendAuditLog(projectRoot, sessionId, 'event: blocked')).rejects.toThrow(/private regular file/);
    } finally {
        const target = await realpath(root);
        assert.equal(path.dirname(target), await realpath(tmpdir()));
        assert.ok(path.basename(target).startsWith('dsh-router-test-hardlink-'));
        await rm(target, { recursive: true });
    }
});

test('stores project settings and per-session worksets outside the project root', async () => {
    const home = path.join(tmpdir(), `dsh-router-test-${randomUUID()}`);
    await mkdir(home);
    try {
        const store = new RouterStore(home);
        const changed = await store.saveProjectSettings(projectRoot, {
            tokenBudget: 9000,
            redirectRootInstructionFiles: true,
            rootInstructionFileNames: ['AGENTS.md', 'CLAUDE.md'],
            redirectInstructionDirectories: true,
            instructionDirectoryNames: ['.cursor', 'docs']
        });
        assert.equal(changed.saved, true);
        const reloaded = (await store.loadProjectSettings(projectRoot)).settings;
        assert.equal(reloaded.tokenBudget, 9000);
        assert.equal(reloaded.redirectRootInstructionFiles, true);
        assert.deepEqual(reloaded.rootInstructionFileNames, ['AGENTS.md', 'CLAUDE.md']);
        assert.equal(reloaded.redirectInstructionDirectories, true);
        assert.deepEqual(reloaded.instructionDirectoryNames, ['.cursor', 'docs']);
        const updated = await store.updateSession(sessionId, projectRoot, state => ({
            ...state,
            activePaths: ['src/a.ts', 'src/a.ts']
        }));
        assert.deepEqual(updated.state.activePaths, ['src/a.ts']);
        const restored = await new RouterStore(home).loadSession(sessionId, projectRoot);
        assert.deepEqual(restored.state.activePaths, ['src/a.ts']);
        assert.equal((await store.resetSession(sessionId, projectRoot)).state.activePaths.length, 0);
        const invalid = await store.saveProjectSettings(projectRoot, { instructionsRoot: '../escape' });
        assert.equal(invalid.saved, false);
        assert.equal(invalid.settings.tokenBudget, 9000);
        const invalidName = await store.saveProjectSettings(projectRoot, { rootInstructionFileNames: ['../outside.md'] });
        assert.equal(invalidName.saved, false);
        assert.match(invalidName.errors.join('; '), /single path segments/);
    } finally {
        const target = await realpath(home);
        assert.equal(path.dirname(target), await realpath(tmpdir()));
        assert.ok(path.basename(target).startsWith('dsh-router-test-'));
        await rm(target, { recursive: true });
    }
});
