import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
    AreaDefinition,
    DiscoveredRule,
    DiscoveredSkill,
    ProjectSettings,
    RouterDiagnostic,
    SourceVendor
} from '../../shared/models/RouterModels.js';
import { parentsAvailable } from './areaHierarchy.js';
import { parseInstruction, type RuleParseContext, readSkillMetadata } from './frontmatter.js';

export const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface RuleDiscoveryOptions {
    readonly sourceVendor?: SourceVendor;
    readonly forceAlwaysApply?: boolean;
    readonly defaultAlwaysApply?: boolean;
    readonly seenFiles?: Set<string>;
}

export async function discoverAreaFolders(
    instructionsRoot: string,
    areas: Map<string, AreaDefinition>,
    settings: ProjectSettings,
    projectRoot: string,
    diagnostics: RouterDiagnostic[]
): Promise<void> {
    const reserved = new Set(['dsh', settings.rulesFolder.toLowerCase(), settings.skillsFolder.toLowerCase()]);
    let entries: Dirent[];
    try {
        entries = await readdir(instructionsRoot, { withFileTypes: true });
    } catch (error) {
        diagnostics.push(
            diagnostic(
                'instructions-root',
                posixRelative(projectRoot, instructionsRoot),
                `cannot list instruction root: ${error instanceof Error ? error.message : String(error)}`
            )
        );
        return;
    }
    for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        if (reserved.has(entry.name.toLowerCase())) continue;
        if (![...areas.keys()].some(name => name.split('/')[0] === entry.name)) {
            diagnostics.push(
                diagnostic(
                    'unconfigured-area',
                    posixRelative(projectRoot, path.join(instructionsRoot, entry.name)),
                    'unconfigured area folder is ignored'
                )
            );
        }
    }
    for (const [name, area] of areas) {
        if (!area.enabled || !parentsAvailable(area, areas)) {
            area.available = false;
            continue;
        }
        const folder = path.join(instructionsRoot, ...name.split('/'));
        area.directory = folder;
        area.available = Boolean(await safeDirectory(folder, projectRoot, diagnostics, 'missing-area'));
    }
    for (const [name, area] of areas) {
        if (!area.available || !area.directory) continue;
        let children: Dirent[];
        try {
            children = await readdir(area.directory, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of children) {
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
            if (reserved.has(entry.name.toLowerCase()) || areas.has(`${name}/${entry.name}`)) continue;
            diagnostics.push(
                diagnostic(
                    'unconfigured-area',
                    posixRelative(projectRoot, path.join(area.directory, entry.name)),
                    'unconfigured area folder is ignored'
                )
            );
        }
    }
}

export async function addRuleFile(
    filePath: string,
    area: string,
    projectRoot: string,
    rules: DiscoveredRule[],
    diagnostics: RouterDiagnostic[],
    optional: boolean,
    options: RuleDiscoveryOptions = {}
): Promise<void> {
    const existing = await findCaseInsensitiveEntry(path.dirname(filePath), path.basename(filePath), diagnostics, projectRoot);
    if (!existing) {
        if (!optional)
            diagnostics.push(diagnostic('missing-rule-folder', posixRelative(projectRoot, filePath), 'configured rule source is missing'));
        return;
    }
    await parseRuleFile(existing, area, projectRoot, rules, diagnostics, options);
}

export async function collectRules(
    directory: string,
    area: string,
    projectRoot: string,
    rules: DiscoveredRule[],
    diagnostics: RouterDiagnostic[],
    options: RuleDiscoveryOptions = {}
): Promise<void> {
    for (const file of await collectMarkdown(directory, projectRoot, diagnostics))
        await parseRuleFile(file, area, projectRoot, rules, diagnostics, options);
}

export async function collectTopLevelRules(
    directory: string,
    area: string,
    projectRoot: string,
    rules: DiscoveredRule[],
    diagnostics: RouterDiagnostic[],
    options: RuleDiscoveryOptions = {}
): Promise<void> {
    const canonicalDirectory = await safeDirectory(directory, projectRoot, diagnostics, 'rules-folder', true);
    if (!canonicalDirectory) return;
    let entries: Dirent[];
    try {
        entries = await readdir(canonicalDirectory, { withFileTypes: true });
    } catch (error) {
        diagnostics.push(
            diagnostic(
                'rules-folder',
                posixRelative(projectRoot, canonicalDirectory),
                `cannot list rules: ${error instanceof Error ? error.message : String(error)}`
            )
        );
        return;
    }
    const files = entries
        .filter(entry => (entry.isFile() || entry.isSymbolicLink()) && /\.(?:md|mdc)$/i.test(entry.name))
        .map(entry => path.join(canonicalDirectory, entry.name))
        .toSorted(compare);
    for (const file of files) await parseRuleFile(file, area, projectRoot, rules, diagnostics, options);
}

async function parseRuleFile(
    filePath: string,
    area: string,
    projectRoot: string,
    rules: DiscoveredRule[],
    diagnostics: RouterDiagnostic[],
    options: RuleDiscoveryOptions
): Promise<void> {
    try {
        const canonical = await realpath(filePath);
        if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project');
        if (options.seenFiles?.has(canonical)) return;
        options.seenFiles?.add(canonical);
        const text = await readFile(canonical, 'utf8');
        const sourcePath = posixRelative(projectRoot, filePath);
        const context: RuleParseContext = {
            sourcePath,
            sourceVendor: options.sourceVendor ?? 'agents',
            ...(options.forceAlwaysApply === undefined ? {} : { forceAlwaysApply: options.forceAlwaysApply }),
            ...(options.defaultAlwaysApply === undefined ? {} : { defaultAlwaysApply: options.defaultAlwaysApply })
        };
        const { metadata, content } = parseInstruction(text, 'rule', context);
        const hash = digest(text);
        rules.push({
            id: `${sourcePath}:${hash}`,
            hash,
            sourcePath,
            filePath,
            area,
            ...metadata,
            content
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        diagnostics.push(diagnostic('rule-file', posixRelative(projectRoot, filePath), errorMessage));
    }
}

export async function collectCommandSkills(
    directory: string,
    projectRoot: string,
    skills: DiscoveredSkill[],
    diagnostics: RouterDiagnostic[],
    seenFiles: Set<string> = new Set()
): Promise<void> {
    for (const filePath of await collectMarkdown(directory, projectRoot, diagnostics)) {
        try {
            const canonicalFile = await realpath(filePath);
            if (!inside(projectRoot, canonicalFile)) throw new Error('symbolic link points outside the project');
            if (seenFiles.has(canonicalFile)) continue;
            seenFiles.add(canonicalFile);
            const metadata = await readSkillMetadata(canonicalFile);
            const commandPath = path.relative(directory, filePath).replace(/\.(?:md|mdc)$/i, '');
            const fallbackName = commandPath.split(path.sep).join('-').toLowerCase();
            const name = metadata.name ?? fallbackName;
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
                diagnostics.push(
                    diagnostic(
                        'skill-name',
                        posixRelative(projectRoot, filePath),
                        'command name must use lowercase letters, digits, and hyphens'
                    )
                );
                continue;
            }
            const fileInfo = await stat(canonicalFile);
            const hash = digest(`${metadata.description}\0${metadata.whenToUse ?? ''}\0${fileInfo.size}\0${fileInfo.mtimeMs}`);
            skills.push({
                name,
                folderName: name,
                sourcePath: posixRelative(projectRoot, filePath),
                filePath,
                area: 'global',
                description: metadata.description,
                ...(metadata.whenToUse === undefined ? {} : { whenToUse: metadata.whenToUse }),
                enabled: metadata.enabled,
                invocation: { modelInvocable: metadata.modelInvocable, userInvocable: metadata.userInvocable },
                ...(metadata.metadata === undefined ? {} : { metadata: metadata.metadata }),
                hash,
                ...(metadata.license === undefined ? {} : { license: metadata.license }),
                ...(metadata.compatibility === undefined ? {} : { compatibility: metadata.compatibility }),
                ...(metadata['allowed-tools'] === undefined ? {} : { 'allowed-tools': metadata['allowed-tools'] })
            });
        } catch (error) {
            diagnostics.push(
                diagnostic('skill-file', posixRelative(projectRoot, filePath), error instanceof Error ? error.message : String(error))
            );
        }
    }
}

export async function collectSkills(
    directory: string,
    area: string,
    projectRoot: string,
    skills: DiscoveredSkill[],
    diagnostics: RouterDiagnostic[],
    seenFiles: Set<string> = new Set()
): Promise<void> {
    const canonical = await safeDirectory(directory, projectRoot, diagnostics, 'skills-folder', true);
    if (!canonical) return;
    let entries: Dirent[];
    try {
        entries = await readdir(canonical, { withFileTypes: true });
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
            diagnostics.push(
                diagnostic(
                    'skills-folder',
                    posixRelative(projectRoot, canonical),
                    `cannot list skills: ${error instanceof Error ? error.message : String(error)}`
                )
            );
        return;
    }
    for (const entry of entries.toSorted((a, b) => compare(a.name, b.name))) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
            diagnostics.push(
                diagnostic(
                    'skill-name',
                    posixRelative(projectRoot, path.join(canonical, entry.name)),
                    'skill folder name must use lowercase letters, digits, and hyphens'
                )
            );
            continue;
        }
        const skillDir = await safeDirectory(path.join(canonical, entry.name), projectRoot, diagnostics, 'skill-folder');
        if (!skillDir) continue;
        const skillFile = await findCaseInsensitiveEntry(skillDir, 'SKILL.md', diagnostics, projectRoot);
        if (!skillFile) {
            diagnostics.push(diagnostic('skill-file', posixRelative(projectRoot, skillDir), 'missing SKILL.md; skill is ignored'));
            continue;
        }
        try {
            const canonicalFile = await realpath(skillFile);
            if (!inside(projectRoot, canonicalFile)) throw new Error('symbolic link points outside the project');
            if (seenFiles.has(canonicalFile)) continue;
            seenFiles.add(canonicalFile);
            const metadata = await readSkillMetadata(canonicalFile);
            const fileInfo = await stat(canonicalFile);
            const name = area === 'global' ? entry.name : `${area.replaceAll('/', '-')}-${entry.name}`;
            const hash = digest(`${metadata.description}\0${metadata.whenToUse ?? ''}\0${fileInfo.size}\0${fileInfo.mtimeMs}`);
            skills.push({
                name,
                folderName: entry.name,
                sourcePath: posixRelative(projectRoot, skillFile),
                filePath: skillFile,
                area,
                description: metadata.description,
                ...(metadata.whenToUse === undefined ? {} : { whenToUse: metadata.whenToUse }),
                enabled: metadata.enabled,
                invocation: {
                    modelInvocable: metadata.modelInvocable,
                    userInvocable: metadata.userInvocable
                },
                ...(metadata.metadata === undefined ? {} : { metadata: metadata.metadata }),
                hash,
                ...(metadata.license === undefined ? {} : { license: metadata.license }),
                ...(metadata.compatibility === undefined ? {} : { compatibility: metadata.compatibility }),
                ...(metadata['allowed-tools'] === undefined ? {} : { 'allowed-tools': metadata['allowed-tools'] })
            });
        } catch (error) {
            diagnostics.push(
                diagnostic('skill-file', posixRelative(projectRoot, skillFile), error instanceof Error ? error.message : String(error))
            );
        }
    }
}

async function collectMarkdown(directory: string, projectRoot: string, diagnostics: RouterDiagnostic[]): Promise<string[]> {
    const files: string[] = [];
    const seenDirectories = new Set();
    const seenFiles = new Set();
    await walk(directory);
    return files.toSorted(compare);

    async function walk(current: string, viaSymlink = false): Promise<void> {
        const canonical = await safeDirectory(current, projectRoot, diagnostics, 'rules-folder', true);
        if (!canonical) return;
        if (seenDirectories.has(canonical)) {
            if (viaSymlink)
                diagnostics.push(
                    diagnostic('symlink-cycle', posixRelative(projectRoot, current), 'cyclic or duplicate directory link skipped')
                );
            return;
        }
        seenDirectories.add(canonical);
        let entries: Dirent[];
        try {
            entries = await readdir(current, { withFileTypes: true });
        } catch (error) {
            diagnostics.push(
                diagnostic(
                    'rules-folder',
                    posixRelative(projectRoot, current),
                    `cannot list rules: ${error instanceof Error ? error.message : String(error)}`
                )
            );
            return;
        }
        for (const entry of entries.toSorted((a, b) => compare(a.name, b.name))) {
            const candidate = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(candidate);
                continue;
            }
            if (entry.isSymbolicLink()) {
                try {
                    const target = await realpath(candidate);
                    if (!inside(projectRoot, target)) throw new Error('symbolic link points outside the project');
                    const info = await stat(target);
                    if (info.isDirectory()) await walk(candidate, true);
                    else if (info.isFile()) await addFile(candidate, target);
                } catch (error) {
                    diagnostics.push(
                        diagnostic('symlink', posixRelative(projectRoot, candidate), error instanceof Error ? error.message : String(error))
                    );
                }
            } else if (entry.isFile()) await addFile(candidate, candidate);
        }
    }

    async function addFile(displayPath: string, targetPath: string): Promise<void> {
        if (!/\.(?:md|mdc)$/i.test(displayPath)) return;
        try {
            const canonical = await realpath(targetPath);
            if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project');
            if (seenFiles.has(canonical)) return;
            seenFiles.add(canonical);
            files.push(displayPath);
        } catch (error) {
            diagnostics.push(
                diagnostic('rule-file', posixRelative(projectRoot, displayPath), error instanceof Error ? error.message : String(error))
            );
        }
    }
}

export async function safeDirectory(
    candidate: string,
    projectRoot: string,
    diagnostics: RouterDiagnostic[],
    code: string,
    quietMissing = false
): Promise<string | undefined> {
    try {
        const canonical = await realpath(candidate);
        if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project');
        if (!(await stat(canonical)).isDirectory()) throw new Error('expected a directory');
        return canonical;
    } catch (error) {
        if (!(quietMissing && error instanceof Error && 'code' in error && error.code === 'ENOENT'))
            diagnostics.push(
                diagnostic(code, posixRelative(projectRoot, candidate), error instanceof Error ? error.message : String(error))
            );
        return undefined;
    }
}

export async function findCaseInsensitiveEntry(
    directory: string,
    wanted: string,
    diagnostics: RouterDiagnostic[],
    projectRoot: string
): Promise<string | undefined> {
    let entries: string[];
    try {
        const canonicalDirectory = await realpath(directory);
        if (!inside(projectRoot, canonicalDirectory)) throw new Error('symbolic link points outside the project');
        if (!(await stat(canonicalDirectory)).isDirectory()) throw new Error('expected a directory');
        entries = await readdir(canonicalDirectory);
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
            diagnostics.push(
                diagnostic('file-discovery', posixRelative(projectRoot, directory), error instanceof Error ? error.message : String(error))
            );
        return undefined;
    }
    const matches = entries.filter(name => name.toLowerCase() === wanted.toLowerCase()).toSorted(compare);
    if (matches.length > 1) {
        diagnostics.push(
            diagnostic('case-collision', posixRelative(projectRoot, directory), `multiple case variants of ${wanted}; none selected`)
        );
        return undefined;
    }
    const match = matches[0];
    if (!match) return undefined;
    const filePath = path.join(directory, match);
    try {
        const canonical = await realpath(filePath);
        if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project');
        if (!(await stat(canonical)).isFile()) throw new Error('expected a file');
        return filePath;
    } catch (error) {
        diagnostics.push(
            diagnostic('file-discovery', posixRelative(projectRoot, filePath), error instanceof Error ? error.message : String(error))
        );
        return undefined;
    }
}

export function inside(root: string, target: string): boolean {
    const rel = path.relative(root, target);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

export function posixRelative(root: string, target: string): string {
    return path.relative(root, target).split(path.sep).join('/');
}

export function areaOrder(area: string): string {
    return area === 'global' ? '' : area;
}

function digest(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function diagnostic(code: string, pathValue: string, message: string): RouterDiagnostic {
    return { code, target: pathValue, message, key: `${code}:${pathValue}:${message}` };
}
