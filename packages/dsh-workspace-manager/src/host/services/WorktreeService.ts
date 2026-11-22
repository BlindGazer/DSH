import { execFile } from 'node:child_process';
import { appendFile, lstat, mkdir, readFile, realpath, rmdir, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import type { WorktreeCheckout, WorktreeErrorCode, WorktreeRepository, WorktreeSelection } from '../../shared/models/Worktree.ts';

const BRANCH_PREFIX = 'refs/heads/';
const FILTER_ATTRIBUTES = ['clean', 'smudge', 'process', 'required'];
const DEFAULT_WORKTREE_DIRECTORY = '.worktrees';
let ignoreUpdates = Promise.resolve();

export class WorktreeError extends Error {
    constructor(
        readonly code: WorktreeErrorCode,
        options?: ErrorOptions
    ) {
        super(code, options);
        this.name = 'WorktreeError';
    }
}

interface GitResult {
    readonly stdout: string;
    readonly status: number;
}

interface Registration extends WorktreeCheckout {
    readonly bare: boolean;
    readonly prunable: boolean;
}

interface RepositoryState {
    readonly repository: WorktreeRepository;
    readonly root: string;
    readonly workspace: string;
    readonly registrations: readonly Registration[];
}

function gitEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    // Не наследуем переменные, которые подменяют репозиторий, индекс или параметры Git.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^git_/i.test(key)));
    return {
        ...env,
        LC_ALL: 'C',
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_NO_LAZY_FETCH: '1',
        GIT_NO_REPLACE_OBJECTS: '1',
        GIT_ALLOW_PROTOCOL: '',
        ...overrides
    };
}

function git(path: string, args: string[], allowed = [0], overrides?: NodeJS.ProcessEnv): Promise<GitResult> {
    return new Promise((resolveResult, reject) => {
        execFile(
            'git',
            ['-C', path, '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args],
            { cwd: dirname(process.execPath), env: gitEnv(overrides), windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
            (error, stdout) => {
                const status = error === null ? 0 : error.code;
                if (typeof status === 'number' && allowed.includes(status)) resolveResult({ status, stdout });
                else reject(new WorktreeError(status === 'ENOENT' ? 'gitMissing' : 'gitFailed', { cause: error }));
            }
        );
    });
}

function line(output: string): string {
    return output.replace(/\r?\n$/, '');
}

function branchName(ref = ''): string | null {
    return ref.startsWith(BRANCH_PREFIX) ? ref.slice(BRANCH_PREFIX.length) : null;
}

function parseRegistrations(output: string): Registration[] {
    return output.split('\0\0').flatMap(record => {
        const [path, ...fields] = record.split('\0');
        if (!path?.startsWith('worktree ')) return [];
        return [
            {
                path: path.slice('worktree '.length),
                branch: branchName(fields.find(field => field.startsWith('branch '))?.slice('branch '.length)),
                bare: fields.includes('bare'),
                prunable: fields.some(field => field === 'prunable' || field.startsWith('prunable '))
            }
        ];
    });
}

async function canonicalDirectory(path: string): Promise<string | null> {
    try {
        const canonical = await realpath(path);
        return (await stat(canonical)).isDirectory() ? canonical : null;
    } catch {
        return null;
    }
}

async function inspectRepository(workspacePath: string): Promise<RepositoryState> {
    const workspace = await canonicalDirectory(workspacePath);
    if (workspace === null) throw new WorktreeError('notRepository');
    const top = await git(workspace, ['rev-parse', '--show-toplevel'], [0, 128]);
    if (top.status !== 0) throw new WorktreeError('notRepository');
    const root = await canonicalDirectory(line(top.stdout));
    if (root === null) throw new WorktreeError('notRepository');

    const [listed, local, head] = await Promise.all([
        git(root, ['worktree', 'list', '--porcelain', '-z']),
        git(root, ['for-each-ref', '--format=%(refname)', BRANCH_PREFIX]),
        git(root, ['symbolic-ref', '--quiet', 'HEAD'], [0, 1])
    ]);
    const branches = local.stdout.split(/\r?\n/).flatMap(ref => {
        const branch = branchName(ref);
        return branch === null ? [] : [branch];
    });
    if (branches.length === 0 && (await git(root, ['rev-parse', '--verify', 'HEAD^{commit}'], [0, 128])).status !== 0) {
        throw new WorktreeError('noCommits');
    }

    const currentBranch = branchName(line(head.stdout));
    const registrations = parseRegistrations(listed.stdout);
    const checkouts = (
        await Promise.all(
            registrations.map(async (registration): Promise<WorktreeCheckout | null> => {
                if (registration.bare || registration.prunable) return null;
                const path = await canonicalDirectory(registration.path);
                return path === null ? null : { path, branch: registration.branch };
            })
        )
    ).filter(checkout => checkout !== null);
    return {
        root,
        workspace,
        registrations,
        repository: {
            currentBranch: currentBranch !== null && branches.includes(currentBranch) ? currentBranch : null,
            defaultBasePath: join(workspace, DEFAULT_WORKTREE_DIRECTORY),
            branches,
            // Даже stale-регистрация блокирует ветку в Git, пока пользователь не удалит ее.
            occupiedBranches: [...new Set(registrations.flatMap(({ branch }) => (branch === null ? [] : [branch])))],
            checkouts
        }
    };
}

export async function inspectWorktreeRepository(workspacePath: string): Promise<WorktreeRepository> {
    return (await inspectRepository(workspacePath)).repository;
}

async function gitDirectory(root: string, option: '--absolute-git-dir' | '--git-common-dir'): Promise<string> {
    const result = await git(root, ['rev-parse', '--path-format=absolute', option]);
    const path = await canonicalDirectory(line(result.stdout));
    if (path === null) throw new WorktreeError('gitFailed');
    return path;
}

async function openCheckout(state: RepositoryState, path: string): Promise<string> {
    const selected = isAbsolute(path) ? await canonicalDirectory(path) : null;
    if (selected === null || !state.repository.checkouts.some(checkout => relative(checkout.path, selected) === '')) {
        throw new WorktreeError('worktreeMissing');
    }
    const top = await git(selected, ['rev-parse', '--show-toplevel'], [0, 128]);
    const checkoutRoot = top.status === 0 ? await canonicalDirectory(line(top.stdout)) : null;
    if (
        checkoutRoot === null ||
        relative(checkoutRoot, selected) !== '' ||
        (await gitDirectory(selected, '--git-common-dir')) !== (await gitDirectory(state.root, '--git-common-dir'))
    ) {
        throw new WorktreeError('worktreeMissing');
    }
    return selected;
}

async function resolveBranch(state: RepositoryState, selection: Exclude<WorktreeSelection, { mode: 'open' }>): Promise<string> {
    const { branch } = selection;
    const { root, repository } = state;
    if (
        !branch ||
        branch === 'HEAD' ||
        branch.startsWith('-') ||
        branch.includes('\0') ||
        (await git(root, ['check-ref-format', `${BRANCH_PREFIX}${branch}`], [0, 1])).status !== 0
    ) {
        throw new WorktreeError('invalidBranch');
    }
    if (selection.mode === 'existing') {
        if (!repository.branches.includes(branch)) throw new WorktreeError('branchMissing');
        if (repository.occupiedBranches.includes(branch)) throw new WorktreeError('branchOccupied');
        // Только короткое имя подсоединяет HEAD: refs/heads/... Git может принять за ревизию.
        return branch;
    }
    if (repository.branches.includes(branch)) throw new WorktreeError('branchExists');
    if (!repository.branches.includes(selection.sourceBranch)) throw new WorktreeError('sourceMissing');
    const ref = `${BRANCH_PREFIX}${selection.sourceBranch}`;
    const commit = await git(root, ['show-ref', '--hash', '--verify', '--', ref], [0, 128]);
    if (commit.status !== 0) throw new WorktreeError('sourceMissing');
    return line(commit.stdout);
}

function validFolder(name: string): boolean {
    return (
        name.length > 0 &&
        !/[<>:"/\\|?*\p{Cc}]/u.test(name) &&
        !/[. ]$/.test(name) &&
        !/^(?:CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|(?:COM|LPT)[1-9¹²³]) *(?:\.|$)/i.test(name)
    );
}

async function baseDirectory(path: string): Promise<string> {
    const windows = process.platform === 'win32';
    if (
        !isAbsolute(path) ||
        path.includes('\0') ||
        (windows && !/^(?:[a-z]:[\\/]|[\\/]{2}[^\\/.?])/i.test(path)) ||
        path.split(windows ? /[\\/]/ : '/').includes('..')
    ) {
        throw new WorktreeError('invalidBasePath');
    }
    const normalized = resolve(path);
    if (
        windows &&
        relative(parse(normalized).root, normalized)
            .split(sep)
            .some(component => component !== '' && !validFolder(component))
    ) {
        throw new WorktreeError('invalidBasePath');
    }
    const existing = await pathEntry(normalized, 'invalidBasePath');
    if (existing === null) {
        const parent = dirname(normalized);
        if (parent === normalized) throw new WorktreeError('invalidBasePath');
        return join(await baseDirectory(parent), basename(normalized));
    }
    const canonical = await canonicalDirectory(normalized);
    if (canonical === null) throw new WorktreeError('invalidBasePath');
    return canonical;
}

async function pathEntry(path: string, errorCode: WorktreeErrorCode) {
    try {
        return await lstat(path);
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw new WorktreeError(errorCode, { cause: error });
    }
}

function ensureWorktreeIgnored(state: RepositoryState, checkWritable: (path: string) => void): Promise<void> {
    const update = ignoreUpdates.then(async () => {
        const { root, workspace, repository } = state;
        const directory = `${relative(root, repository.defaultBasePath).split(sep).join('/')}/`;
        const ignored = await git(root, ['check-ignore', '--quiet', '--no-index', '--', directory], [0, 1]);
        if (ignored.status === 0) return;

        const path = join(workspace, '.gitignore');
        const entry = await pathEntry(path, 'ignoreFailed');
        if (entry !== null && !entry.isFile()) throw new WorktreeError('ignoreFailed');
        try {
            checkWritable(path);
        } catch (error) {
            throw new WorktreeError('readOnly', { cause: error });
        }
        const content = entry === null ? '' : await readFile(path, 'utf8');
        const newline = content.includes('\r\n') ? '\r\n' : '\n';
        const separator = content.length > 0 && !content.endsWith('\n') ? newline : '';
        await appendFile(path, `${separator}/${DEFAULT_WORKTREE_DIRECTORY}/${newline}`, { flag: entry === null ? 'ax' : 'a' });
    });
    ignoreUpdates = update.catch(() => undefined);
    return update.catch((error: unknown) => {
        if (error instanceof WorktreeError && error.code === 'readOnly') throw error;
        throw new WorktreeError('ignoreFailed', { cause: error });
    });
}

async function disableFilters(target: string, gitDir: string): Promise<NodeJS.ProcessEnv> {
    const list = await git(
        target,
        ['--git-dir', gitDir, '--work-tree', target, 'config', '--null', '--name-only', '--get-regexp', '^filter\\.'],
        [0, 1]
    );
    const drivers = new Set<string>();
    for (const key of list.stdout.split('\0')) {
        const separator = key.lastIndexOf('.');
        if (separator > 'filter.'.length && FILTER_ATTRIBUTES.includes(key.slice(separator + 1))) {
            drivers.add(key.slice('filter.'.length, separator));
        }
    }
    const env: NodeJS.ProcessEnv = { GIT_CONFIG_COUNT: String(drivers.size * FILTER_ATTRIBUTES.length) };
    let index = 0;
    for (const driver of drivers) {
        for (const attribute of FILTER_ATTRIBUTES) {
            env[`GIT_CONFIG_KEY_${index}`] = `filter.${driver}.${attribute}`;
            env[`GIT_CONFIG_VALUE_${index}`] = attribute === 'required' ? 'false' : '';
            index++;
        }
    }
    return env;
}

export async function prepareWorktree(
    workspacePath: string,
    selection: WorktreeSelection,
    checkWritable: (path: string) => void
): Promise<string> {
    const state = await inspectRepository(workspacePath);
    if (selection.mode === 'open') return openCheckout(state, selection.path);
    if (!validFolder(selection.folderName)) throw new WorktreeError('invalidFolder');
    const base = await baseDirectory(selection.basePath);
    const target = join(base, selection.folderName);
    const { root } = state;
    const [common, sourceGitDir] = await Promise.all([gitDirectory(root, '--git-common-dir'), gitDirectory(root, '--absolute-git-dir')]);
    if (
        [common, sourceGitDir].some(directory => {
            const path = relative(directory, target);
            return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
        })
    )
        throw new WorktreeError('invalidBasePath');
    if ((await pathEntry(target, 'gitFailed')) !== null || state.registrations.some(({ path }) => relative(path, target) === '')) {
        throw new WorktreeError('pathExists');
    }
    const revision = await resolveBranch(state, selection);
    try {
        for (const path of new Set([common, sourceGitDir, base, target])) checkWritable(path);
    } catch (error) {
        throw new WorktreeError('readOnly', { cause: error });
    }
    const defaultBase = state.repository.defaultBasePath;
    if (relative(defaultBase, resolve(selection.basePath)) === '' || relative(defaultBase, base) === '') {
        await ensureWorktreeIgnored(state, checkWritable);
    }
    try {
        await mkdir(base, { recursive: true });
        await mkdir(target);
    } catch (error) {
        const occupied = error instanceof Error && 'code' in error && error.code === 'EEXIST';
        throw new WorktreeError(occupied ? 'pathExists' : 'gitFailed', { cause: error });
    }
    const branchArgs = selection.mode === 'new' ? ['--no-track', '-b', selection.branch] : [];
    try {
        await git(root, [
            '--git-dir',
            sourceGitDir,
            '--work-tree',
            root,
            'worktree',
            'add',
            '--no-checkout',
            '--no-guess-remote',
            ...branchArgs,
            '--',
            target,
            revision
        ]);
    } catch (error) {
        // Only remove an empty reservation; leave any Git artifacts for recovery.
        await rmdir(target).catch(() => undefined);
        throw error;
    }
    const checkoutGitDir = await gitDirectory(target, '--absolute-git-dir');
    const attachment = await git(target, ['--git-dir', checkoutGitDir, 'symbolic-ref', '--quiet', 'HEAD'], [0, 1]);
    if (line(attachment.stdout) !== `${BRANCH_PREFIX}${selection.branch}`) throw new WorktreeError('gitFailed');
    const filters = await disableFilters(target, checkoutGitDir);
    // Заполняем только новый checkout и индекс, не перезаписывая ссылку ветки.
    await git(
        target,
        ['--git-dir', checkoutGitDir, '--work-tree', target, 'read-tree', '-m', '-u', '--no-recurse-submodules', 'HEAD'],
        [0],
        filters
    );
    return target;
}
