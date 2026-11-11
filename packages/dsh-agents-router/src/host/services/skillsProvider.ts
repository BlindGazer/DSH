import path from 'node:path';
import type { DiscoveredSkill, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import { discoverProject, loadSkillDefinition } from './discovery.js';
import type { RouterStore } from './store.js';

const PROVIDER_NAME = 'agents-router-project';
const PROJECT_AGENTS_RANK = 200;
const noop = (): void => {};

interface CancellationSignal {
    throwIfAborted(): void;
}

interface ProjectSkillCandidate {
    readonly path: string;
    readonly name: string;
    readonly description: string | undefined;
    readonly whenToUse?: string;
    readonly invocation: DiscoveredSkill['invocation'];
    readonly source: 'project-agents';
    readonly provider: string;
    readonly resourceBase: { readonly kind: 'directory'; readonly path: string };
    readonly rank: number;
    readonly locator: { readonly name: string; readonly sourcePath: string };
    readonly metadata?: DiscoveredSkill['metadata'];
}

interface ProjectSkill {
    readonly path: string;
    readonly name: string;
    readonly description: string | undefined;
    readonly whenToUse?: string;
    readonly invocation: DiscoveredSkill['invocation'];
    readonly source: 'project-agents';
    readonly provider: string;
    readonly resourceBase: { readonly kind: 'directory'; readonly path: string };
    readonly content: string | undefined;
    readonly metadata?: DiscoveredSkill['metadata'];
}

interface ProviderOptions {
    readonly signal?: CancellationSignal;
}

interface SkillProviderControl {
    readonly signal: CancellationSignal;
    invalidate(): void;
}

interface SkillProviderScope {
    readonly skills: {
        registerProvider(
            factory: (control: SkillProviderControl) => {
                readonly name: string;
                list(options: ProviderOptions): Promise<{ readonly candidates: ProjectSkillCandidate[]; readonly complete: boolean }>;
                get(candidate: ProjectSkillCandidate, options: ProviderOptions): Promise<ProjectSkill | undefined>;
            }
        ): void;
    };
}

export interface ScopedAgent {
    readonly ctx: {
        inject(keys: readonly string[], action: (scope: SkillProviderScope) => void): Promise<void>;
    };
}

interface SkillHostContext {
    readonly skills: {
        list(options: {
            readonly cwd: string;
            readonly signal?: CancellationSignal | undefined;
        }): Promise<{ readonly name: string; readonly provider?: string; readonly path?: string }[]>;
    };
}

/** Register this provider inside one Agent scope so its skills stay project-bound. */
export async function registerSkillsProvider(
    agent: ScopedAgent,
    rootContext: SkillHostContext,
    projectRoot: string,
    store: RouterStore,
    reportDiagnostics: (items: RouterDiagnostic[]) => Promise<RouterDiagnostic[]> = async () => []
): Promise<() => void> {
    let invalidate = noop;
    await agent.ctx.inject(['skills'], scope => {
        scope.skills.registerProvider(control => {
            invalidate = control.invalidate;
            let lastGood: ProjectSkillCandidate[] = [];
            return {
                name: PROVIDER_NAME,
                async list(options) {
                    options.signal?.throwIfAborted();
                    control.signal.throwIfAborted();
                    const { settings } = await store.loadProjectSettings(projectRoot);
                    const snapshot = await discoverProject(projectRoot, settings);
                    await reportDiagnostics(snapshot.diagnostics);
                    if (!snapshot.complete) return { candidates: lastGood, complete: false };

                    // The unscoped view is global-only; the provider itself is Agent-scoped.
                    const globalSkills = await rootContext.skills.list({ cwd: projectRoot, signal: options.signal });
                    options.signal?.throwIfAborted();
                    const globalByName = new Map<string, { readonly name: string; readonly provider?: string; readonly path?: string }[]>();
                    for (const skill of globalSkills) {
                        const list = globalByName.get(skill.name) ?? [];
                        list.push(skill);
                        globalByName.set(skill.name, list);
                    }
                    const ownByName = new Map<string, DiscoveredSkill[]>();
                    for (const skill of snapshot.skills)
                        if (skill.enabled) {
                            const list = ownByName.get(skill.name) ?? [];
                            list.push(skill);
                            ownByName.set(skill.name, list);
                        }
                    const conflicts = snapshot.skills.filter(
                        skill => skill.enabled && (globalByName.has(skill.name) || (ownByName.get(skill.name)?.length ?? 0) > 1)
                    );
                    if (conflicts.length) {
                        await reportDiagnostics(
                            conflicts.map(skill => {
                                const own = ownByName.get(skill.name) ?? [];
                                const global = globalByName.get(skill.name) ?? [];
                                const sources = [
                                    ...(own.length > 1 ? own.map(entry => entry.sourcePath) : []),
                                    ...global.map(entry => `${entry.provider ?? 'another provider'}${entry.path ? ` (${entry.path})` : ''}`)
                                ];
                                return {
                                    code: 'skill-name-conflict',
                                    path: skill.sourcePath,
                                    message: `skill /${skill.name} conflicts with ${sources.join(', ')}; every project copy of this name is unavailable`,
                                    key: `skill-name-conflict:${skill.sourcePath}:${skill.name}:${sources.join('|')}`
                                };
                            })
                        );
                    }

                    const blocked = new Set(conflicts.map(skill => skill.sourcePath));
                    lastGood = snapshot.skills
                        .filter(skill => skill.enabled && !blocked.has(skill.sourcePath))
                        .map(skill => ({
                            path: skill.filePath,
                            name: skill.name,
                            description: skill.description,
                            ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
                            invocation: skill.invocation,
                            source: 'project-agents',
                            provider: PROVIDER_NAME,
                            resourceBase: { kind: 'directory', path: path.dirname(skill.filePath) },
                            rank: PROJECT_AGENTS_RANK,
                            locator: { name: skill.name, sourcePath: skill.sourcePath },
                            ...(skill.metadata ? { metadata: skill.metadata } : {})
                        }));
                    return { candidates: lastGood, complete: true };
                },
                async get(candidate, options) {
                    options.signal?.throwIfAborted();
                    control.signal.throwIfAborted();
                    const globalSkills = await rootContext.skills.list({ cwd: projectRoot, signal: options.signal });
                    if (globalSkills.some(skill => skill.name === candidate.name)) return undefined;
                    const { settings } = await store.loadProjectSettings(projectRoot);
                    const definition = await loadSkillDefinition(projectRoot, settings, candidate.locator);
                    options.signal?.throwIfAborted();
                    if (!definition) return undefined;
                    return {
                        path: definition.filePath,
                        name: definition.name,
                        description: definition.description,
                        ...(definition.whenToUse ? { whenToUse: definition.whenToUse } : {}),
                        invocation: definition.invocation,
                        source: 'project-agents',
                        provider: PROVIDER_NAME,
                        resourceBase: { kind: 'directory', path: path.dirname(definition.filePath) },
                        content: definition.content,
                        ...(definition.metadata ? { metadata: definition.metadata } : {})
                    };
                }
            };
        });
    });
    return () => invalidate();
}
