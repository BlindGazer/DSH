import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, lstat, mkdir, mkdtemp, readFile, realpath, rmdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import type {
    WorktreeCheckout,
    WorktreeDeletion,
    WorktreeDeletionResult,
    WorktreeDeletionWarning,
    WorktreeErrorCode,
    WorktreeRepository,
    WorktreeSelection
} from '../../shared/models/Worktree.ts';

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
    readonly diagnostic: GitDiagnostic;
}

interface GitDiagnostic {
    readonly command: string;
    readonly status: number | string;
    readonly reason: string;
}

class GitCommandError extends Error {
    constructor(readonly diagnostic: GitDiagnostic) {
        super(diagnostic.reason);
    }
}

function gitDiagnostic(args: readonly string[], status: number | string, stderr: string, signal?: string | null): GitDiagnostic {
    let index = 0;
    while (args[index] === '-c') index += 2;
    const command = args[index] ?? 'git';
    const subcommand = command === 'worktree' ? ` ${args[index + 1]}` : command === 'branch' && args[index + 1] === '-d' ? ' -d' : '';
    // Вывод Git может содержать локальные пути, имена веток и значения из конфигурации.
    const reason = signal
        ? `terminated:${signal}`
        : /not fully merged/i.test(stderr)
          ? 'branch-not-fully-merged'
          : /checked out at|used by worktree/i.test(stderr)
            ? 'branch-in-use'
            : /Permission denied|Access is denied/i.test(stderr)
              ? 'permission-denied'
              : /unable to (unlink|rmdir)|failed to (delete|remove)|could not (remove|unlink)/i.test(stderr)
                ? 'filesystem-remove-failed'
                : /directory not empty/i.test(stderr)
                  ? 'directory-not-empty'
                  : /resource busy|being used by another process/i.test(stderr)
                    ? 'filesystem-busy'
                    : /modified or untracked/i.test(stderr)
                      ? 'worktree-has-local-changes'
                      : /locked working tree|is locked/i.test(stderr)
                        ? 'worktree-locked'
                        : /not a git repository/i.test(stderr)
                          ? 'not-a-repository'
                          : /unable to create .*\.lock|cannot lock ref/i.test(stderr)
                            ? 'git-lock-failed'
                            : /identity unknown|unable to auto-detect email/i.test(stderr)
                              ? 'git-identity-missing'
                              : /CONFLICT|automatic merge failed/i.test(stderr)
                                ? 'merge-conflict'
                                : /no such file or directory/i.test(stderr)
                                  ? 'path-missing'
                                  : status === 0
                                    ? 'ok'
                                    : stderr.trim()
                                      ? 'unclassified-git-stderr'
                                      : 'no-git-stderr';
    return { command: `${command}${subcommand}`, status, reason };
}

export function worktreeFailureDetails(error: Error): Record<string, string | number> {
    const details: Record<string, string | number> = { errorType: error instanceof WorktreeError ? error.code : 'unexpected-error' };
    let cause: Error | undefined = error;
    while (cause !== undefined) {
        if (cause instanceof GitCommandError) return { ...details, ...cause.diagnostic };
        if (cause instanceof WorktreeError && cause !== error) details.causeCode = cause.code;
        if ('code' in cause && typeof cause.code === 'string' && /^E[A-Z_]+$/.test(cause.code)) details.systemCode = cause.code;
        cause = cause.cause instanceof Error ? cause.cause : undefined;
    }
    return details;
}

interface Registration extends WorktreeCheckout {
    readonly bare: boolean;
    readonly prunable: boolean;
    readonly locked: boolean;
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
            (error, stdout, stderr) => {
                const status = error === null ? 0 : error.code;
                const diagnostic = gitDiagnostic(args, status ?? (error?.killed ? 'killed' : 'unknown'), stderr, error?.signal);
                if (typeof status === 'number' && allowed.includes(status)) resolveResult({ status, stdout, diagnostic });
                else
                    reject(new WorktreeError(status === 'ENOENT' ? 'gitMissing' : 'gitFailed', { cause: new GitCommandError(diagnostic) }));
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
                prunable: fields.some(field => field === 'prunable' || field.startsWith('prunable ')),
                locked: fields.some(field => field === 'locked' || field.startsWith('locked '))
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
            isLinkedWorktree:
                relative(workspace, root) === '' &&
                checkouts.some(checkout => relative(checkout.path, root) === '') &&
                relative(await gitDirectory(root, '--absolute-git-dir'), await gitDirectory(root, '--git-common-dir')) !== '',
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
    if (path === null) {
        throw new WorktreeError('gitFailed', {
            cause: new GitCommandError({
                command: `rev-parse ${option}`,
                status: result.status,
                reason: 'git-directory-missing-or-inaccessible'
            })
        });
    }
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

async function assertClean(path: string, gitDir: string, code: WorktreeErrorCode): Promise<void> {
    const filters = await disableFilters(path, gitDir);
    const status = await git(path, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none'], [0], filters);
    const busy = await Promise.all(
        ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'].map(name =>
            pathEntry(join(gitDir, name), 'gitFailed')
        )
    );
    if (status.stdout !== '' || busy.some(entry => entry !== null)) throw new WorktreeError(code);
}

async function localBranchTip(path: string, branch: string): Promise<string> {
    const tip = await git(path, ['show-ref', '--hash', '--verify', '--', `${BRANCH_PREFIX}${branch}`], [0, 128]);
    if (tip.status !== 0) throw new WorktreeError('branchMissing');
    return line(tip.stdout);
}

async function assertMerged(path: string, tip: string, mergeInto: string): Promise<void> {
    const destinationTip = await localBranchTip(path, mergeInto);
    const merged = await git(path, ['merge-base', '--is-ancestor', tip, destinationTip], [0, 1]);
    if (merged.status !== 0) throw new WorktreeError('branchNotMerged');
}

async function mergeCheckout(path: string, gitDir: string, branch: string, sourceTip: string): Promise<void> {
    const filters = await disableFilters(path, gitDir);
    const config = await git(path, ['config', '--null', '--name-only', '--get-regexp', '^merge\\..*\\.driver$'], [0, 1]);
    const drivers = [...new Set(config.stdout.split('\0').filter(Boolean))];
    const result = await git(
        path,
        [
            '-c',
            `branch.${branch}.mergeOptions=`,
            '-c',
            'rerere.enabled=false',
            '-c',
            'merge.autoStash=false',
            ...drivers.flatMap(driver => ['-c', `${driver}=false`]),
            'merge',
            '--no-edit',
            '--no-autostash',
            '--no-gpg-sign',
            '--',
            sourceTip
        ],
        [0, 1, 2, 128],
        filters
    );
    if (result.status === 0) return;
    const conflicts = await git(path, ['ls-files', '--unmerged']);
    if (await pathEntry(join(gitDir, 'MERGE_HEAD'), 'gitFailed')) await git(path, ['merge', '--abort'], [0], filters);
    throw new WorktreeError(conflicts.stdout ? 'mergeConflict' : 'mergeFailed', { cause: new GitCommandError(result.diagnostic) });
}

async function deleteSelectedWorktree(
    workspacePath: string,
    selection: WorktreeDeletion,
    checkWritable: (path: string) => void,
    reportWarning: (code: WorktreeDeletionWarning, error: Error) => void = () => undefined
): Promise<WorktreeDeletionResult> {
    const state = await inspectRepository(workspacePath);
    const path = await openCheckout(state, selection.worktreePath);
    const gitDir = await gitDirectory(path, '--absolute-git-dir');
    const common = await gitDirectory(path, '--git-common-dir');
    if (relative(gitDir, common) === '') throw new WorktreeError('primaryWorktree');
    const registration = state.registrations.find(item => relative(item.path, path) === '');
    if (registration === undefined) throw new WorktreeError('worktreeMissing');
    if (registration.locked) throw new WorktreeError('worktreeLocked');
    if (
        state.registrations.some(item => {
            const child = relative(path, item.path);
            return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
        })
    )
        throw new WorktreeError('worktreeDirty');
    const { expectedBranch: branch, deleteBranch, mergeInto } = selection;
    const assertAttachment = async () => {
        const attachment = await git(path, ['symbolic-ref', '--quiet', 'HEAD'], [0, 1]);
        if (branchName(line(attachment.stdout)) !== branch) throw new WorktreeError('worktreeChanged');
    };
    const writable = (target: string) => {
        try {
            checkWritable(target);
        } catch (error) {
            throw new WorktreeError('readOnly', { cause: error });
        }
    };
    for (const target of [common, gitDir, dirname(path), path]) writable(target);
    await assertAttachment();
    await assertClean(path, gitDir, 'worktreeDirty');
    if (branch === null && (deleteBranch || mergeInto !== undefined)) throw new WorktreeError('invalidBranch');
    const sourceTip = branch === null ? undefined : await localBranchTip(path, branch);

    const primary = state.repository.checkouts.find(item => relative(item.path, state.registrations[0]?.path ?? '') === '');
    let commandPath = relative(state.root, path) === '' ? primary?.path : state.root;
    // Удаление запускаем из Git-метаданных, если живого рабочего каталога больше нет.
    commandPath ??= common;
    let temporary: string | undefined;
    let temporaryAdded = false;
    let branchDeleted = false;
    const warnings: WorktreeDeletionWarning[] = [];
    let worktreeRemoved = false;
    try {
        if (mergeInto !== undefined) {
            if (mergeInto === branch || !state.repository.branches.includes(mergeInto) || sourceTip === undefined) {
                throw new WorktreeError('mergeTargetInvalid');
            }
            const occupied = state.registrations.filter(item => item.branch === mergeInto);
            if (occupied.length > 1) throw new WorktreeError('mergeTargetInvalid');
            const destination = occupied[0];
            if (destination === undefined) {
                temporary = await mkdtemp(join(tmpdir(), 'dsh-worktree-merge-'));
                writable(temporary);
                await git(commandPath, ['worktree', 'add', '--no-checkout', '--no-guess-remote', '--', temporary, mergeInto]);
                temporaryAdded = true;
                commandPath = temporary;
            } else {
                commandPath = await openCheckout(state, destination.path);
            }
            const destinationGitDir = await gitDirectory(commandPath, '--absolute-git-dir');
            writable(commandPath);
            writable(destinationGitDir);
            const attachment = await git(commandPath, ['symbolic-ref', '--quiet', 'HEAD'], [0, 1]);
            if (line(attachment.stdout) !== `${BRANCH_PREFIX}${mergeInto}`) throw new WorktreeError('mergeTargetInvalid');
            if (temporary !== undefined) {
                const filters = await disableFilters(commandPath, destinationGitDir);
                await git(commandPath, ['read-tree', '-m', '-u', '--no-recurse-submodules', 'HEAD'], [0], filters);
            }
            await assertClean(commandPath, destinationGitDir, 'mergeTargetDirty');
            await mergeCheckout(commandPath, destinationGitDir, mergeInto, sourceTip);
        }
        await assertAttachment();
        if (mergeInto !== undefined && branch !== null && (await localBranchTip(path, branch)) !== sourceTip) {
            throw new WorktreeError('worktreeChanged');
        }
        await assertClean(path, gitDir, 'worktreeDirty');
        const filters = await disableFilters(path, gitDir);
        try {
            await git(commandPath, ['worktree', 'remove', '--', path], [0], filters);
            worktreeRemoved = true;
        } catch (error) {
            throw new WorktreeError('worktreeRemoveFailed', { cause: error });
        }
        if (deleteBranch && branch !== null && sourceTip !== undefined) {
            try {
                if ((await localBranchTip(commandPath, branch)) !== sourceTip) throw new WorktreeError('worktreeChanged');
                if (mergeInto !== undefined) {
                    await assertMerged(commandPath, sourceTip, mergeInto);
                    const attachment = await git(commandPath, ['symbolic-ref', '--quiet', 'HEAD'], [0, 1]);
                    if (line(attachment.stdout) !== `${BRANCH_PREFIX}${mergeInto}`) throw new WorktreeError('mergeTargetInvalid');
                    // Git проверяет HEAD цели вместо upstream, не меняя сохраненную конфигурацию и не используя -D.
                    await git(commandPath, ['-c', `branch.${branch}.remote=dsh-${randomUUID()}`, 'branch', '-d', '--', branch]);
                } else {
                    await git(commandPath, ['branch', '-d', '--', branch]);
                }
                branchDeleted = true;
            } catch (error) {
                warnings.push('branchDeleteFailed');
                if (error instanceof Error) reportWarning('branchDeleteFailed', error);
            }
        }
    } finally {
        try {
            if (temporaryAdded && temporary !== undefined) await git(common, ['worktree', 'remove', '--', temporary]);
            else if (temporary !== undefined) await rmdir(temporary);
        } catch (error) {
            if (worktreeRemoved) warnings.push('mergeCleanupFailed');
            if (error instanceof Error) reportWarning('mergeCleanupFailed', error);
        }
    }
    return { worktreeRemoved: true, branchDeleted, warnings };
}

let deletionQueue = Promise.resolve();

export function deleteWorktree(
    workspacePath: string,
    selection: WorktreeDeletion,
    checkWritable: (path: string) => void,
    reportWarning: (code: WorktreeDeletionWarning, error: Error) => void = () => undefined
): Promise<WorktreeDeletionResult> {
    const operation = deletionQueue.then(() => deleteSelectedWorktree(workspacePath, selection, checkWritable, reportWarning));
    deletionQueue = operation.then(
        () => undefined,
        () => undefined
    );
    return operation;
}
