import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { expect, onTestFinished, test, vi } from 'vitest';
import { inspectWorktreeRepository, prepareWorktree } from '../src/host/services/WorktreeService.ts';

function git(path: string, ...args: string[]): string {
    return execFileSync('git', ['-C', path, '-c', 'core.hooksPath=/dev/null', '-c', 'core.autocrlf=false', ...args], {
        encoding: 'utf8',
        env: {
            ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^git_/i.test(key))),
            GIT_CONFIG_GLOBAL: '/dev/null',
            GIT_CONFIG_NOSYSTEM: '1',
        },
    }).trim();
}

function fixture() {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-worktree-')));
    onTestFinished(() => rmSync(root, { recursive: true }));
    const repo = join(root, 'repo');
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'config', 'user.name', 'Fixture');
    git(repo, 'config', 'user.email', 'fixture@example.invalid');
    git(repo, 'config', 'commit.gpgSign', 'false');
    git(repo, 'config', 'core.autocrlf', 'false');
    const basePath = join(root, 'repo-worktrees');
    return { root, repo, basePath };
}

function commit(repo: string, content: string): string {
    writeFileSync(join(repo, 'content.txt'), content);
    git(repo, 'add', '--', 'content.txt');
    git(repo, 'commit', '-qm', 'fixture');
    return git(repo, 'rev-parse', 'HEAD');
}

const writable = () => {};

test('creates from an exact local branch even if its name collides with a tag', async () => {
    const { repo, basePath } = fixture();
    const main = commit(repo, 'main');
    git(repo, 'switch', '-qc', 'source');
    const source = commit(repo, 'source');
    git(repo, 'switch', '-q', 'main');
    git(repo, 'tag', 'source', main);
    git(repo, 'update-ref', 'refs/tags/refs/heads/source', main);
    const check = vi.fn(writable);

    const target = await prepareWorktree(repo, { mode: 'new', sourceBranch: 'source', branch: 'feature/new', basePath, folderName: 'feature new' }, check);

    expect(target).toBe(join(basePath, 'feature new'));
    expect(git(target, 'symbolic-ref', 'HEAD')).toBe('refs/heads/feature/new');
    expect(git(target, 'rev-parse', 'HEAD')).toBe(source);
    expect(readFileSync(join(target, 'content.txt'), 'utf8')).toBe('source');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(main);
    expect(check.mock.calls).toStrictEqual([[join(repo, '.git')], [basePath], [target]]);
});

test('checks out a local branch with a literal refs/heads prefix and opens it without writing', async () => {
    const { repo, basePath } = fixture();
    const main = commit(repo, 'main');
    git(repo, 'branch', 'ordinary');
    git(repo, 'tag', 'refs/heads/ordinary', main);
    git(repo, 'branch', 'refs/heads/ordinary');
    const target = await prepareWorktree(repo, { mode: 'existing', branch: 'refs/heads/ordinary', basePath, folderName: 'linked' }, writable);

    expect(git(target, 'symbolic-ref', 'HEAD')).toBe('refs/heads/refs/heads/ordinary');
    expect(await inspectWorktreeRepository(target)).toStrictEqual({
        currentBranch: 'refs/heads/ordinary',
        defaultBasePath: join(target, '.worktrees'),
        branches: ['main', 'ordinary', 'refs/heads/ordinary'],
        occupiedBranches: ['main', 'refs/heads/ordinary'],
        checkouts: [{ path: repo, branch: 'main' }, { path: target, branch: 'refs/heads/ordinary' }],
    });
    const check = vi.fn(writable);
    await expect(prepareWorktree(repo, { mode: 'open', path: target }, check)).resolves.toBe(target);
    expect(check).not.toHaveBeenCalled();
    await expect(prepareWorktree(repo, { mode: 'open', path: basePath }, check)).rejects.toMatchObject({ code: 'worktreeMissing' });
});

test('checks permissions on the separate Git directory of a linked source before making changes', async () => {
    const { repo, basePath } = fixture();
    commit(repo, 'main');
    const source = await prepareWorktree(repo, { mode: 'new', sourceBranch: 'main', branch: 'linked', basePath, folderName: 'source' }, writable);
    const linkedDir = realpathSync(git(source, 'rev-parse', '--absolute-git-dir'));
    const check = vi.fn((path: string) => {
        if (path === linkedDir) throw new Error('denied');
    });
    const selection = { mode: 'new', sourceBranch: 'main', branch: 'denied', basePath, folderName: 'denied' } as const;

    await expect(prepareWorktree(source, selection, check)).rejects.toMatchObject({ code: 'readOnly' });
    expect(check.mock.calls).toStrictEqual([[join(repo, '.git')], [linkedDir]]);
    expect(existsSync(join(basePath, 'denied'))).toBe(false);
    const target = await prepareWorktree(source, { ...selection, branch: 'allowed', folderName: 'allowed' }, writable);
    expect(git(target, 'symbolic-ref', 'HEAD')).toBe('refs/heads/allowed');
});

test('recognizes detached, unborn, non-repository and stale checkout states', async () => {
    const { repo, root, basePath } = fixture();
    await expect(inspectWorktreeRepository(root)).rejects.toMatchObject({ code: 'notRepository' });
    await expect(inspectWorktreeRepository(repo)).rejects.toMatchObject({ code: 'noCommits' });
    commit(repo, 'main');
    git(repo, 'switch', '-q', '--detach');
    expect((await inspectWorktreeRepository(repo)).currentBranch).toBeNull();
    const stale = await prepareWorktree(repo, { mode: 'new', branch: 'stale', sourceBranch: 'main', basePath, folderName: 'stale' }, writable);
    rmSync(stale, { recursive: true });

    const state = await inspectWorktreeRepository(repo);
    expect(state.checkouts).toStrictEqual([{ path: repo, branch: null }]);
    expect(state.occupiedBranches).toStrictEqual(['stale']);
    await expect(prepareWorktree(repo, { mode: 'open', path: stale }, writable)).rejects.toMatchObject({ code: 'worktreeMissing' });
    await expect(prepareWorktree(repo, { mode: 'existing', branch: 'stale', basePath, folderName: 'different' }, writable)).rejects.toMatchObject({ code: 'branchOccupied' });
});

test('rejects unsafe paths, occupied targets, invalid branch syntax and missing refs', async () => {
    const { repo, root, basePath } = fixture();
    commit(repo, 'main');
    mkdirSync(join(root, 'occupied'));
    const selection = { mode: 'new', branch: 'fresh', sourceBranch: 'main', basePath, folderName: 'fresh' } as const;

    for (const folderName of ['..', 'bad/name', 'bad\\name', 'CoN.txt', 'LPT1', 'trailing.']) {
        await expect(prepareWorktree(repo, { ...selection, folderName }, writable)).rejects.toMatchObject({ code: 'invalidFolder' });
    }
    await expect(prepareWorktree(repo, { ...selection, basePath: 'relative' }, writable)).rejects.toMatchObject({ code: 'invalidBasePath' });
    await expect(prepareWorktree(repo, { ...selection, basePath: `${basePath}/../other` }, writable)).rejects.toMatchObject({ code: 'invalidBasePath' });
    await expect(prepareWorktree(repo, { ...selection, basePath: root, folderName: 'occupied' }, writable)).rejects.toMatchObject({ code: 'pathExists' });
    await expect(prepareWorktree(repo, { ...selection, branch: '@{-1}' }, writable)).rejects.toMatchObject({ code: 'invalidBranch' });
    await expect(prepareWorktree(repo, { ...selection, branch: 'main' }, writable)).rejects.toMatchObject({ code: 'branchExists' });
    await expect(prepareWorktree(repo, { ...selection, sourceBranch: 'HEAD' }, writable)).rejects.toMatchObject({ code: 'sourceMissing' });
    await expect(prepareWorktree(repo, { ...selection, mode: 'existing' }, writable)).rejects.toMatchObject({ code: 'branchMissing' });
    expect(existsSync(basePath)).toBe(false);
});

test('rejects a base inside metadata reached through a symlink or junction', async () => {
    const { repo, root } = fixture();
    commit(repo, 'main');
    const gitDir = join(repo, '.git');
    const alias = join(root, 'metadata');
    symlinkSync(gitDir, alias, 'junction');
    const selection = { mode: 'new', branch: 'fresh', sourceBranch: 'main', folderName: 'fresh' } as const;

    await expect(prepareWorktree(repo, { ...selection, basePath: gitDir }, writable)).rejects.toMatchObject({ code: 'invalidBasePath' });
    await expect(prepareWorktree(repo, { ...selection, basePath: join(alias, 'nested') }, writable)).rejects.toMatchObject({ code: 'invalidBasePath' });
    expect(existsSync(join(gitDir, 'nested'))).toBe(false);
    expect(existsSync(join(gitDir, 'fresh'))).toBe(false);
});

test('excludes the workspace default directory without duplicating an existing rule', async () => {
    const { repo } = fixture();
    commit(repo, 'main');
    const state = await inspectWorktreeRepository(repo);
    const ignore = join(repo, '.gitignore');
    expect(state.defaultBasePath).toBe(join(repo, '.worktrees'));
    expect(existsSync(ignore)).toBe(false);
    writeFileSync(ignore, 'keep-this');
    const destination = { mode: 'new', sourceBranch: 'main', basePath: state.defaultBasePath } as const;
    const first = await prepareWorktree(repo, { ...destination, branch: 'first', folderName: 'first' }, writable);
    const second = await prepareWorktree(repo, { ...destination, branch: 'second', folderName: 'second' }, writable);
    expect(first).toBe(join(repo, '.worktrees', 'first'));
    expect(second).toBe(join(repo, '.worktrees', 'second'));
    expect(readFileSync(ignore, 'utf8')).toBe('keep-this\n/.worktrees/\n');
    expect(git(repo, 'check-ignore', '--', '.worktrees/first', '.worktrees/second')).toBe('.worktrees/first\n.worktrees/second');
});

test('defaults to the selected subdirectory and respects inherited ignore rules', async () => {
    const { repo, basePath } = fixture();
    commit(repo, 'main');
    const workspace = join(repo, 'nested');
    mkdirSync(workspace);
    const ignore = join(repo, '.gitignore');
    const childIgnore = join(workspace, '.gitignore');
    writeFileSync(ignore, '/nested/.worktrees/\n');
    const state = await inspectWorktreeRepository(workspace);
    expect(state.defaultBasePath).toBe(join(workspace, '.worktrees'));
    const selection = { mode: 'new', sourceBranch: 'main' } as const;
    await prepareWorktree(workspace, { ...selection, basePath: state.defaultBasePath, branch: 'nested', folderName: 'nested' }, writable);
    await prepareWorktree(workspace, { ...selection, basePath, branch: 'custom', folderName: 'custom' }, writable);
    expect(readFileSync(ignore, 'utf8')).toBe('/nested/.worktrees/\n');
    expect(existsSync(childIgnore)).toBe(false);
});

test('does not create a worktree when the default ignore file cannot be updated', async () => {
    const { repo } = fixture();
    commit(repo, 'main');
    const { defaultBasePath } = await inspectWorktreeRepository(repo);
    const ignore = join(repo, '.gitignore');
    const selection = { mode: 'new', sourceBranch: 'main', branch: 'denied', basePath: defaultBasePath, folderName: 'denied' } as const;
    await expect(prepareWorktree(repo, selection, path => {
        if (path === ignore) throw new Error('denied');
    })).rejects.toMatchObject({ code: 'readOnly' });
    expect(existsSync(ignore)).toBe(false);
    expect(existsSync(defaultBasePath)).toBe(false);
    await prepareWorktree(repo, selection, writable);
    expect(readFileSync(ignore, 'utf8')).toBe('/.worktrees/\n');
});

test('materializes the checkout without running hooks or configured filters', async () => {
    const { repo, root, basePath } = fixture();
    writeFileSync(join(repo, '.gitattributes'), 'content.txt filter=fixture\n');
    git(repo, 'add', '--', '.gitattributes');
    commit(repo, 'unchanged');
    const marker = posix.join(root.replaceAll('\\', '/'), 'ran');
    const command = `echo unsafe > '${marker}'; exit 1`;
    for (const attribute of ['clean', 'smudge', 'process']) git(repo, 'config', `filter.fixture.${attribute}`, command);
    git(repo, 'config', 'filter.fixture.required', 'true');
    const hooks = join(repo, '.git', 'hooks');
    for (const name of ['post-checkout', 'reference-transaction']) {
        writeFileSync(join(hooks, name), `#!/bin/sh\n${command}\n`, { mode: 0o755 });
    }

    const target = await prepareWorktree(repo, { mode: 'new', branch: 'filtered', sourceBranch: 'main', basePath, folderName: 'filtered' }, writable);

    expect(readFileSync(join(target, 'content.txt'), 'utf8')).toBe('unchanged');
    expect(existsSync(marker)).toBe(false);
});
