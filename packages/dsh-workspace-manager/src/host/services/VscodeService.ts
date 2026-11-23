import { spawn } from 'node:child_process';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { delimiter, dirname, isAbsolute, join, relative, sep } from 'node:path';
import ignore, { type Ignore } from 'ignore';
import type { VscodeErrorCode } from '../../shared/models/Vscode.ts';
import { canonicalizePath, getHarnessProfilesPath, isWithinCanonicalPath } from './pathUtils.ts';

export class VscodeError extends Error {
    constructor(readonly code: VscodeErrorCode) {
        super(code);
    }
}

async function resolveWorkspace(path: string, profiles: string): Promise<string> {
    if (!isAbsolute(path) || !(await lstat(path).catch(() => undefined))?.isDirectory()) throw new VscodeError('accessDenied');
    const root = await realpath(path).catch(() => undefined);
    if (root === undefined || isWithinCanonicalPath(root, profiles)) throw new VscodeError('accessDenied');
    return root;
}

const ignored = new Set(['.git', '.worktrees', 'node_modules']);
const maxSearchDepth = 3;
const workspaceExtension = /.+\.(?:code-workspace|workspace)$/i;

interface IgnoreRules {
    readonly directory: string;
    readonly matcher: Ignore;
}

function relativePatternPath(directory: string, path: string): string {
    return relative(directory, path).split(sep).join('/');
}

function isIgnored(path: string, directory: boolean, rules: readonly IgnoreRules[]): boolean {
    for (let index = rules.length - 1; index >= 0; index--) {
        const rule = rules[index];
        if (rule === undefined) continue;
        const result = rule.matcher.test(relativePatternPath(rule.directory, path) + (directory ? '/' : ''));
        if (result.ignored || result.unignored) return result.ignored;
    }
    return false;
}

function readable(error: Error): boolean {
    return 'code' in error && ['EACCES', 'EPERM', 'ENOENT', 'ENOTDIR'].includes(String(error.code));
}

async function statIfPresent(path: string) {
    return lstat(path).catch(error => {
        if (error instanceof Error && readable(error)) return undefined;
        throw error;
    });
}

async function loadRules(directory: string, inherited: readonly IgnoreRules[]): Promise<readonly IgnoreRules[]> {
    const file = join(directory, '.gitignore');
    if (!(await statIfPresent(file))?.isFile()) return inherited;
    const contents = await readFile(file, 'utf8');
    return [...inherited, { directory, matcher: ignore({ ignorecase: false }).add(contents) }];
}

async function ancestorRules(root: string, profiles: string): Promise<readonly IgnoreRules[] | undefined> {
    if (await statIfPresent(join(root, '.git'))) return [];
    const parents: string[] = [];
    for (let dir = dirname(root); dir !== root && !isWithinCanonicalPath(dir, profiles); dir = dirname(dir)) {
        parents.unshift(dir);
        if (await statIfPresent(join(dir, '.git'))) {
            let rules: readonly IgnoreRules[] = [];
            for (const directory of parents) {
                if (isIgnored(directory, true, rules)) return undefined;
                rules = await loadRules(directory, rules);
            }
            return isIgnored(root, true, rules) ? undefined : rules;
        }
        if (dirname(dir) === dir) break;
    }
    return [];
}

export async function discoverVscodeWorkspaces(path: string): Promise<string[]> {
    const profiles = canonicalizePath(getHarnessProfilesPath());
    const root = await resolveWorkspace(path, profiles);
    const rootRules = await ancestorRules(root, profiles);
    if (rootRules === undefined) return [];
    const stack = [{ directory: root, inherited: rootRules, depth: 1 }];
    const files: string[] = [];
    while (stack.length > 0) {
        const item = stack.pop();
        if (item === undefined) break;
        const { directory, inherited } = item;
        const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
            if (
                directory !== root &&
                error instanceof Error &&
                'code' in error &&
                ['EACCES', 'EPERM', 'ENOENT'].includes(String(error.code))
            )
                return [];
            throw error;
        });
        let rules = inherited;
        if (entries.some(entry => entry.name === '.gitignore' && entry.isFile())) {
            const contents = await readFile(join(directory, '.gitignore'), 'utf8');
            rules = [...inherited, { directory, matcher: ignore({ ignorecase: false }).add(contents) }];
        }
        for (const entry of entries) {
            const isDirectory = entry.isDirectory();
            if (ignored.has(entry.name.toLowerCase()) || (!isDirectory && (!entry.isFile() || !workspaceExtension.test(entry.name))))
                continue;
            const candidate = join(directory, entry.name);
            if (isWithinCanonicalPath(candidate, profiles) || isIgnored(candidate, isDirectory, rules)) continue;
            if (isDirectory) {
                if (item.depth < maxSearchDepth) stack.push({ directory: candidate, inherited: rules, depth: item.depth + 1 });
            } else files.push(candidate);
        }
        if (directory === root && files.length > 0) break;
    }
    return files.toSorted();
}

function candidates(): string[] {
    const paths = (process.env.PATH ?? '').split(delimiter).filter(path => isAbsolute(path));
    if (process.platform === 'win32') {
        const known = [
            process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs'),
            process.env.ProgramFiles,
            process.env['ProgramFiles(x86)']
        ].filter((path): path is string => Boolean(path));
        // В Windows штатный CLI - cmd-скрипт. Запускаем сам exe без командной оболочки.
        return [
            ...paths.flatMap(path => [join(path, 'Code.exe'), join(dirname(path), 'Code.exe')]),
            ...known.map(path => join(path, 'Microsoft VS Code', 'Code.exe'))
        ];
    }
    return [
        ...paths.map(path => join(path, 'code')),
        ...(process.platform === 'darwin' ? ['/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'] : [])
    ];
}

export async function launchVscode(path: string, workspaceFile?: string): Promise<void> {
    const profiles = canonicalizePath(getHarnessProfilesPath());
    const root = await resolveWorkspace(path, profiles);
    const target = workspaceFile ?? root;
    if (workspaceFile !== undefined) {
        const canonical = isAbsolute(target) ? await realpath(target).catch(() => undefined) : undefined;
        if (
            canonical !== target ||
            !workspaceExtension.test(target) ||
            !isWithinCanonicalPath(target, root) ||
            isWithinCanonicalPath(target, profiles) ||
            !(await lstat(target).catch(() => undefined))?.isFile()
        ) {
            throw new VscodeError('workspaceFileMissing');
        }
    }
    const options = { cwd: dirname(process.execPath), detached: true, stdio: 'ignore' as const, windowsHide: true };
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.VSCODE_IPC_HOOK_CLI;
    for (const executable of new Set(candidates())) {
        const launched = await new Promise<boolean>((resolve, reject) => {
            const child = spawn(executable, ['--new-window', target], { ...options, env });
            child.once('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'ENOENT' || error.code === 'EACCES') resolve(false);
                else reject(new VscodeError('vscodeFailed'));
            });
            child.once('spawn', () => {
                child.unref();
                resolve(true);
            });
        });
        if (launched) return;
    }
    throw new VscodeError('vscodeUnavailable');
}
