import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, onTestFinished, test, vi } from 'vitest';
import * as fs from 'node:fs/promises';

import { discoverVscodeWorkspaces, launchVscode } from '../src/host/services/VscodeService.ts';

vi.mock('node:fs/promises', { spy: true });

function fixture() {
    const temp = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-vscode-test-')));
    onTestFinished(() => rmSync(temp, { recursive: true }));
    const root = join(temp, 'root');
    const nested = join(root, 'nested');
    mkdirSync(nested, { recursive: true });
    return { temp, root, nested };
}

test('prefers both workspace file extensions at the root to recursive matches', async () => {
    const { root, nested } = fixture();
    const standard = join(root, 'a.code-workspace');
    const legacy = join(root, 'b.workspace');
    for (const file of [standard, legacy, join(nested, 'hidden.workspace')]) writeFileSync(file, '{}');

    await expect(discoverVscodeWorkspaces(root)).resolves.toStrictEqual([standard, legacy]);
});

test('discovers recursive files without following links outside a registered workspace', async () => {
    const { temp, root, nested } = fixture();
    const outside = join(temp, 'outside');
    mkdirSync(outside);
    const external = join(outside, 'external.code-workspace');
    const internal = join(nested, 'internal.workspace');
    writeFileSync(external, '{}');
    writeFileSync(internal, '{}');
    const link = join(root, 'linked');
    symlinkSync(outside, link, 'junction');

    await expect(discoverVscodeWorkspaces(root)).resolves.toStrictEqual([internal]);
    await expect(launchVscode(root, external)).rejects.toMatchObject({ code: 'workspaceFileMissing' });
    vi.mocked(fs.readdir).mockClear();
    await expect(launchVscode(root, join(link, 'external.code-workspace'))).rejects.toMatchObject({ code: 'workspaceFileMissing' });
    expect(fs.readdir).not.toHaveBeenCalled();
});

test('applies nested exceptions without reading excluded directories', async () => {
    const { root, nested } = fixture();
    const blocked = join(root, 'blocked');
    mkdirSync(blocked);
    writeFileSync(join(root, '.gitignore'), '*.workspace\n/blocked/\n');
    writeFileSync(join(blocked, '.gitignore'), '!secret.workspace\n');
    writeFileSync(join(blocked, 'secret.workspace'), '{}');
    writeFileSync(join(root, 'ignored.workspace'), '{}');
    writeFileSync(join(nested, '.gitignore'), '!keep.workspace\n');
    const kept = join(nested, 'keep.workspace');
    writeFileSync(kept, '{}');
    vi.mocked(fs.readdir).mockClear();

    await expect(discoverVscodeWorkspaces(root)).resolves.toStrictEqual([kept]);
    expect(fs.readdir).not.toHaveBeenCalledWith(blocked, expect.anything());
});

test('skips worktree containers and does not read directories below level three', async () => {
    const { root, nested } = fixture();
    const worktrees = join(root, '.worktrees');
    const levelThree = join(nested, 'level-three');
    const levelFour = join(levelThree, 'level-four');
    mkdirSync(worktrees);
    mkdirSync(levelFour, { recursive: true });
    const kept = join(levelThree, 'keep.code-workspace');
    for (const file of [kept, join(levelFour, 'too-deep.workspace'), join(worktrees, 'other.workspace')]) writeFileSync(file, '{}');
    vi.mocked(fs.readdir).mockClear();

    await expect(discoverVscodeWorkspaces(root)).resolves.toStrictEqual([kept]);
    expect(fs.readdir).not.toHaveBeenCalledWith(worktrees, expect.anything());
    expect(fs.readdir).not.toHaveBeenCalledWith(levelFour, expect.anything());
});

test('applies ancestor rules within the enclosing Git worktree', async () => {
    const { temp, root } = fixture();
    mkdirSync(join(temp, '.git'));
    writeFileSync(join(temp, '.gitignore'), '/root/*.workspace\n');
    writeFileSync(join(root, 'ignored.workspace'), '{}');
    const kept = join(root, 'keep.code-workspace');
    writeFileSync(kept, '{}');

    await expect(discoverVscodeWorkspaces(root)).resolves.toStrictEqual([kept]);
});
