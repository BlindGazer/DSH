import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** Приводит существующий путь и ближайший существующий родитель к каноническому виду. */
export function canonicalizePath(rawPath: string): string {
    const absolutePath = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
    try {
        return realpathSync.native(absolutePath);
    } catch {
        let currentPath = absolutePath;
        const trailingParts: string[] = [];
        while (true) {
            const parentPath = dirname(currentPath);
            if (parentPath === currentPath) return absolutePath;
            trailingParts.unshift(basename(currentPath));
            currentPath = parentPath;
            try {
                return join(realpathSync.native(currentPath), ...trailingParts);
            } catch {}
        }
    }
}

export function isSubPath(target: string, root: string): boolean {
    const canonicalTarget = canonicalizePath(target);
    const canonicalRoot = canonicalizePath(root);
    return isWithinCanonicalPath(canonicalTarget, canonicalRoot);
}

export function isWithinCanonicalPath(target: string, root: string): boolean {
    const relativePath = relative(root, target);
    return relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

function expandHome(value: string): string {
    if (value === '~') return homedir();
    if (value.startsWith('~/')) return join(homedir(), value.slice(2));
    return value;
}

export function getHarnessProfilesPath(): string {
    const configuredHome = process.env.DSH_HOME?.trim();
    const homePath = configuredHome === undefined || configuredHome === '' ? join(homedir(), '.dsh') : expandHome(configuredHome);
    return join(homePath, 'profiles');
}

export function isHarnessProfilePath(target: string): boolean {
    return isSubPath(target, getHarnessProfilesPath());
}
