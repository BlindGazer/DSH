import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PROJECT_SETTINGS, type ProjectSettings, parseAreasConfig } from '../../shared/index.js';
import type { AreaDefinition, DiscoveredRule, DiscoveredSkill, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import {
    addRuleFile,
    areaOrder,
    collectCommandSkills,
    collectRules,
    collectSkills,
    collectTopLevelRules,
    compare,
    diagnostic,
    discoverAreaFolders,
    findCaseInsensitiveEntry,
    inside,
    posixRelative,
    safeDirectory
} from './discoveryFs.js';
import { parseInstruction } from './frontmatter.js';

interface ProjectDiscoverySnapshot {
    projectRoot?: string;
    instructionsRoot?: string;
    rules: DiscoveredRule[];
    skills: DiscoveredSkill[];
    areas: Map<string, AreaDefinition>;
    areasConfigValid: boolean;
    diagnostics: RouterDiagnostic[];
    complete: boolean;
    rulesComplete: boolean;
}

interface SkillLocator {
    name?: string;
    sourcePath?: string;
}

/** Discover configured project instructions without creating or modifying project files. */
export async function discoverProject(
    projectPath: string,
    settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS
): Promise<ProjectDiscoverySnapshot> {
    const diagnostics: RouterDiagnostic[] = [];
    const snapshot: ProjectDiscoverySnapshot = {
        rules: [],
        skills: [],
        areas: new Map(),
        areasConfigValid: false,
        diagnostics,
        complete: true,
        rulesComplete: true
    };
    let projectRoot: string;
    try {
        projectRoot = await realpath(projectPath);
        if (!(await stat(projectRoot)).isDirectory()) throw new Error('project root is not a directory');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as NodeJS.ErrnoException).code;
        diagnostics.push(diagnostic('project-root', projectPath, `cannot open project root: ${errorMessage}`));
        snapshot.complete = !['EACCES', 'EPERM', 'EIO'].includes(errorCode ?? '');
        snapshot.rulesComplete = snapshot.complete;
        return snapshot;
    }
    snapshot.projectRoot = projectRoot;
    const mode = settings.discoveryMode ?? 'merge';
    const rootLexical = path.resolve(projectRoot, ...settings.instructionsRoot.split('/'));
    const configuredInstructionsRoot = await safeDirectory(rootLexical, projectRoot, diagnostics, 'instructions-root', mode !== 'strict');
    let instructionsRoot = configuredInstructionsRoot;
    if (!instructionsRoot && mode !== 'strict' && settings.instructionsRoot === DEFAULT_PROJECT_SETTINGS.instructionsRoot) {
        instructionsRoot = await safeDirectory(path.join(projectRoot, '.agents'), projectRoot, diagnostics, 'instructions-root', true);
    }
    if (!instructionsRoot && mode === 'strict') {
        snapshot.rulesComplete = !diagnostics.some(({ message }) => /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message));
        return snapshot;
    }

    const seenRuleFiles = new Set<string>();
    const seenSkillFiles = new Set<string>();
    if (instructionsRoot) {
        snapshot.instructionsRoot = instructionsRoot;
        const configDirectory = path.join(instructionsRoot, 'dsh');
        const configFile = await findCaseInsensitiveEntry(configDirectory, 'agents-router.json', diagnostics, projectRoot);
        let configText: string | undefined;
        if (configFile) {
            try {
                const canonicalConfig = await realpath(configFile);
                if (!inside(projectRoot, canonicalConfig)) throw new Error('symbolic link points outside the project');
                configText = await readFile(canonicalConfig, 'utf8');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                diagnostics.push(
                    diagnostic('area-config', posixRelative(projectRoot, configFile), `cannot read area config: ${errorMessage}`)
                );
            }
        }
        const parsed =
            configText === undefined
                ? { areas: new Map<string, AreaDefinition>(), errors: [], valid: true }
                : parseAreasConfig(configText, settings);
        snapshot.areasConfigValid = Boolean(configFile && configText !== undefined && parsed.valid && parsed.errors.length === 0);
        for (const message of parsed.errors)
            diagnostics.push(
                diagnostic(
                    'area-config',
                    posixRelative(projectRoot, configFile ?? path.join(configDirectory, 'agents-router.json')),
                    message
                )
            );
        await discoverAreaFolders(instructionsRoot, parsed.areas, settings, projectRoot, diagnostics);
        snapshot.areas = parsed.areas;

        const agentRules = { sourceVendor: 'agents' as const, seenFiles: seenRuleFiles };
        await addRuleFile(
            path.join(instructionsRoot, settings.mainFile),
            'global',
            projectRoot,
            snapshot.rules,
            diagnostics,
            true,
            agentRules
        );
        await collectRules(
            path.join(instructionsRoot, settings.rulesFolder),
            'global',
            projectRoot,
            snapshot.rules,
            diagnostics,
            agentRules
        );
        await collectSkills(
            path.join(instructionsRoot, settings.skillsFolder),
            'global',
            projectRoot,
            snapshot.skills,
            diagnostics,
            seenSkillFiles
        );
        for (const [name, area] of [...parsed.areas].toSorted(([a], [b]) => compare(a, b))) {
            if (!area.available || !area.enabled) continue;
            const directory = path.join(instructionsRoot, ...name.split('/'));
            await addRuleFile(path.join(directory, settings.mainFile), name, projectRoot, snapshot.rules, diagnostics, true, agentRules);
            await collectRules(path.join(directory, settings.rulesFolder), name, projectRoot, snapshot.rules, diagnostics, agentRules);
            await collectSkills(
                path.join(directory, settings.skillsFolder),
                name,
                projectRoot,
                snapshot.skills,
                diagnostics,
                seenSkillFiles
            );
        }
    }
    if (mode === 'merge' || !configuredInstructionsRoot) {
        await discoverWorkspaceSources(projectRoot, snapshot, diagnostics, seenRuleFiles, seenSkillFiles);
    }
    snapshot.rules.sort((a, b) => compare(areaOrder(a.area), areaOrder(b.area)) || compare(a.sourcePath, b.sourcePath));
    snapshot.skills.sort((a, b) => compare(a.name, b.name) || compare(a.sourcePath, b.sourcePath));
    snapshot.complete = !diagnostics.some(
        ({ code, message }) =>
            ['skills-folder', 'skill-folder', 'file-discovery'].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message)
    );
    snapshot.rulesComplete = !diagnostics.some(
        ({ code, message }) => ['rules-folder', 'file-discovery'].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message)
    );
    return snapshot;
}

async function discoverWorkspaceSources(
    projectRoot: string,
    snapshot: ProjectDiscoverySnapshot,
    diagnostics: RouterDiagnostic[],
    seenRuleFiles: Set<string>,
    seenSkillFiles: Set<string>
): Promise<void> {
    for (const name of ['AGENTS.md', 'AGENT.md', 'CLAUDE.md', '.cursorrules']) {
        await addRuleFile(path.join(projectRoot, name), 'global', projectRoot, snapshot.rules, diagnostics, true, {
            sourceVendor: 'root-file',
            forceAlwaysApply: true,
            seenFiles: seenRuleFiles
        });
    }

    const cursor = path.join(projectRoot, '.cursor');
    await collectRules(path.join(cursor, 'rules'), 'global', projectRoot, snapshot.rules, diagnostics, {
        sourceVendor: 'cursor',
        seenFiles: seenRuleFiles
    });
    await collectSkills(path.join(cursor, 'skills'), 'global', projectRoot, snapshot.skills, diagnostics, seenSkillFiles);

    const claude = path.join(projectRoot, '.claude');
    await addRuleFile(path.join(claude, 'CLAUDE.md'), 'global', projectRoot, snapshot.rules, diagnostics, true, {
        sourceVendor: 'claude',
        forceAlwaysApply: true,
        seenFiles: seenRuleFiles
    });
    await collectRules(path.join(claude, 'rules'), 'global', projectRoot, snapshot.rules, diagnostics, {
        sourceVendor: 'claude',
        seenFiles: seenRuleFiles
    });
    await collectSkills(path.join(claude, 'skills'), 'global', projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
    await collectCommandSkills(path.join(claude, 'commands'), projectRoot, snapshot.skills, diagnostics, seenSkillFiles);

    const codex = path.join(projectRoot, '.codex');
    const codexRules = { sourceVendor: 'codex' as const, defaultAlwaysApply: true, seenFiles: seenRuleFiles };
    await collectRules(path.join(codex, 'rules'), 'global', projectRoot, snapshot.rules, diagnostics, codexRules);
    await collectTopLevelRules(codex, 'global', projectRoot, snapshot.rules, diagnostics, codexRules);
    await collectSkills(path.join(codex, 'skills'), 'global', projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
}

/** Load a skill's full body only after the native DSH loader asks for it. */
export async function loadSkillDefinition(
    projectRoot: string,
    settings: ProjectSettings,
    locator?: SkillLocator
): Promise<DiscoveredSkill | undefined> {
    let canonicalRoot: string;
    try {
        canonicalRoot = await realpath(projectRoot);
    } catch {
        return undefined;
    }
    const snapshot = await discoverProject(canonicalRoot, settings);
    const matchingNames = snapshot.skills.filter(skill => skill.name === locator?.name && skill.enabled);
    if (matchingNames.length !== 1) return undefined;
    const current = matchingNames.find(skill => skill.sourcePath === locator?.sourcePath);
    if (!current) return undefined;
    try {
        const canonicalFile = await realpath(current.filePath);
        if (!inside(canonicalRoot, canonicalFile)) return undefined;
        const text = await readFile(canonicalFile, 'utf8');
        const { metadata, content } = parseInstruction(text, 'skill');
        if (!metadata.enabled) return undefined;
        return {
            ...current,
            description: metadata.description,
            ...(metadata.whenToUse === undefined ? {} : { whenToUse: metadata.whenToUse }),
            invocation: {
                modelInvocable: metadata.modelInvocable,
                userInvocable: metadata.userInvocable
            },
            ...(metadata.metadata === undefined ? {} : { metadata: metadata.metadata }),
            content
        };
    } catch {
        return undefined;
    }
}

export { diagnosePath, renderRules, selectRules } from './ruleSelector.js';
