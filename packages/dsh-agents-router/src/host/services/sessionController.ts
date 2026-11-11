import path from 'node:path';
import { RULE_CONTEXT } from '../../shared/constants/index.js';
import type { DiscoveredRule, ProjectDiscoverySnapshot, ProjectSettings, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import type { RouterStore } from './store.js';

export interface RouterSession {
    readonly id: string;
    readonly header: { readonly cwd?: string };
    deriveMessages(): RouterMessage[];
}

export interface RouterAgent {
    readonly id: string;
    readonly status: string;
    readonly session: RouterSession;
    readonly inbox: { readonly nextTurn: readonly object[]; readonly nextStep: readonly object[] };
    runMaintenance<T>(action: (signal: { throwIfAborted(): void }) => Promise<T>): Promise<T>;
}

export interface RouterMessage {
    role?: string;
    content?: { type: string; text?: string }[];
    source?: {
        kind: string;
        name?: string;
        form?: string;
        summary?: string;
        sections?: { name: string; text?: string }[];
    };
}

export interface RouterState {
    readonly agent: RouterAgent;
    readonly sessionId: string;
    readonly projectRoot: string;
    settings: ProjectSettings;
    activePaths: string[];
    areaText: string;
    snapshot: ProjectDiscoverySnapshot | undefined;
    rules: ReturnType<typeof selectRules>;
    text: string;
    readonly source: string;
    readonly blockedRoots: Map<string, string>;
    runtimeDiagnostics: Map<string, RouterDiagnostic>;
    forceEmptyWorkset: boolean;
    auditRules?: Map<string, ReturnType<typeof selectRules>[number]>;
    lastLoggedBatchKey?: string;
    lastLoggedDiagKeys?: Set<string>;
    invalidateSkills: () => void;
    restoreWarning?: string | undefined;
    auditWarning?: string;
}

export interface RouterHostContext {
    readonly logger: { warn(message: string): void; error(message: string): void };
    readonly agents: { list(): RouterAgent[] };
    readonly workingDirectory: { get(session: RouterSession): string | undefined };
    readonly skills: { list(options: { readonly cwd: string; readonly scope?: RouterAgent }): Promise<RouterSkill[]> };
}

export interface RouterSkill {
    readonly name: string;
    readonly description: string;
    readonly path?: string;
    readonly provider?: string;
    readonly invocation?: { readonly modelInvocable?: boolean; readonly userInvocable?: boolean };
}

import { discoverProject } from './discovery.js';
import { computeContextMetrics } from './metrics.js';
import { renderAreas, renderRules, selectRules } from './ruleSelector.js';

export async function reportDiagnostics(
    ctx: RouterHostContext,
    store: RouterStore,
    state: RouterState,
    items: RouterDiagnostic[]
): Promise<RouterDiagnostic[]> {
    for (const item of items) state.runtimeDiagnostics.set(diagnosticKey(item), item);
    if (!items.length) return [];
    try {
        const fresh = await store.markDiagnostics(state.sessionId, state.projectRoot, items);
        for (const item of fresh) ctx.logger.warn(`agents-router: ${item.path}: ${item.message}`);
        return fresh;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger.error(`agents-router: could not persist diagnostics for ${state.sessionId}: ${message}`);
        return items;
    }
}

export async function refreshState(ctx: RouterHostContext, store: RouterStore, state: RouterState): Promise<RouterState> {
    const project = await store.loadProjectSettings(state.projectRoot);
    const session = await store.loadSession(state.sessionId, state.projectRoot);
    state.settings = project.settings;
    state.activePaths = state.forceEmptyWorkset ? [] : session.state.activePaths;
    state.snapshot = await discoverProject(state.projectRoot, project.settings);
    state.runtimeDiagnostics = new Map(state.snapshot.diagnostics.map(item => [diagnosticKey(item), item]));
    state.areaText = renderAreas(state.snapshot);
    state.rules = selectRules(state.snapshot, state.activePaths);
    state.text = renderRules(state.rules);
    if (!state.snapshot.rulesComplete)
        state.text = [
            state.text,
            'Router warning: project rule discovery is incomplete; do not perform project file operations until access is restored.'
        ]
            .filter(Boolean)
            .join('\n\n');
    const warnings = [project.warning, session.warning, state.restoreWarning]
        .filter((message): message is string => typeof message === 'string')
        .map(message => ({
            code: 'restore-warning',
            path: state.projectRoot,
            message,
            key: `restore-warning:${state.projectRoot}:${message}`
        }));
    if (
        (project.settings.redirectRootInstructionFiles || project.settings.redirectInstructionDirectories) &&
        !state.snapshot.areasConfigValid
    ) {
        const configPath = `${project.settings.instructionsRoot}/dsh/agents-router.json`;
        warnings.push({
            code: 'instruction-redirection-config',
            path: configPath,
            message: 'Instruction redirection is disabled until agents-router.json exists and is valid; original reads are unchanged.',
            key: `instruction-redirection-config:${state.projectRoot}:${configPath}`
        });
    }
    await reportDiagnostics(ctx, store, state, [...state.snapshot.diagnostics, ...warnings]);
    return state;
}

export function findLiveState(
    ctx: RouterHostContext,
    states: ReadonlyMap<string, RouterState>,
    sessionId: string
): { readonly agent: RouterAgent; readonly state: RouterState } | undefined {
    const agent = ctx.agents.list().find(item => item.session.id === sessionId);
    const state = agent ? states.get(agent.id) : undefined;
    return agent && state ? { agent, state } : undefined;
}

export function currentDirectory(ctx: RouterHostContext, state: RouterState, agent: RouterAgent): string {
    try {
        const value = ctx.workingDirectory.get(agent.session);
        if (typeof value === 'string' && path.isAbsolute(value)) return value;
    } catch {
        /* The immutable Session header remains the fallback. */
    }
    return state.projectRoot;
}

export function isTrulyIdle(agent: RouterAgent): boolean {
    return agent.status === 'idle' && agent.inbox.nextTurn.length === 0 && agent.inbox.nextStep.length === 0;
}

export function historyHasRule(session: RouterSession, rule: DiscoveredRule): boolean {
    const messages = session.deriveMessages();
    let latestSections: readonly { readonly name: string; readonly text?: string }[] = [];
    for (const message of messages) {
        const source = message.source;
        if (source?.kind !== 'runtime-context') continue;
        latestSections = source.form === 'snapshot' && Array.isArray(source.sections) ? source.sections : [];
    }
    const contribution = latestSections.find(section => section.name === RULE_CONTEXT);
    return typeof contribution?.text === 'string' && contribution.text.includes(`Revision: ${rule.hash}`);
}

interface PreflightCall {
    readonly callId: string;
    readonly name: string;
    readonly paths?: readonly string[];
}

interface ToolExecution {
    readonly callId: string;
    readonly rootCallId?: string;
    readonly parent?: string;
}

export function denyCalls(
    calls: readonly PreflightCall[],
    exec: ToolExecution,
    pendingFeedback: Map<string, string>,
    state: RouterState,
    reason: string
): {
    readonly kind: 'deny';
    readonly reason: string;
    readonly info: { readonly name: string; readonly code: string; readonly reason: string };
} {
    for (const call of calls) pendingFeedback.set(feedbackKey(state.agent.id, call.callId), reason);
    if (exec.parent !== undefined) state.blockedRoots.set(exec.rootCallId ?? exec.callId, reason);
    return { kind: 'deny', reason, info: { name: 'AgentsRouterPreflightError', code: 'AGENTS_ROUTER_REPLAN_REQUIRED', reason } };
}

export function feedbackKey(agentId: string, callId: string): string {
    return `${agentId}:${callId}`;
}

export function preflightEvent(
    kind: string,
    tool: string,
    resolvedPaths: readonly string[] | ReadonlySet<string>,
    calls: readonly PreflightCall[]
): string {
    const resolved = [...resolvedPaths];
    if (kind === 'file_preflight') {
        const count = resolved.length;
        return `${kind} tool="${tool}" (${count ? `+${count} paths` : 'cached workset'})`;
    }
    const paths = resolved.length ? resolved : calls.flatMap(call => call.paths ?? []);
    return `${kind} tool="${tool}" (${paths.join(', ')})`;
}

export async function readRouterState(
    ctx: RouterHostContext,
    store: RouterStore,
    states: ReadonlyMap<string, RouterState>,
    sessionId: string
) {
    const found = findLiveState(ctx, states, sessionId);
    if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' };
    const { agent, state } = found;
    await refreshState(ctx, store, state);
    const snapshot = state.snapshot;
    if (!snapshot) throw new Error('project discovery is unavailable after refresh');
    state.invalidateSkills();
    const availableSkills = (await ctx.skills.list({ cwd: state.projectRoot, scope: agent })).filter(
        skill => skill.provider === 'agents-router-project'
    );
    const modelSkills = availableSkills.filter(skill => skill.invocation?.modelInvocable !== false);
    const selected = new Map(state.rules.map(rule => [rule.id ?? rule.sourcePath, rule]));
    const rules = snapshot.rules.map(rule => {
        const current = selected.get(rule.id ?? rule.sourcePath);
        return {
            source: rule.sourcePath,
            sourcePath: rule.sourcePath,
            filePath: rule.filePath,
            area: rule.area,
            description: rule.description,
            enabled: rule.enabled,
            selected: Boolean(current),
            appliesTo: current?.appliesTo ?? [],
            characters: rule.content?.length ?? 0,
            reason: current
                ? current.appliesTo.includes('always')
                    ? 'always'
                    : 'matches active workset'
                : !rule.enabled
                  ? 'disabled'
                  : !state.activePaths.length
                    ? 'requires a matching project path'
                    : 'path or area filters did not match'
        };
    });
    const messages = agent.session.deriveMessages();
    const metrics = computeContextMetrics(
        {
            text: state.text,
            areaText: state.areaText,
            rules: state.rules.map(rule => ({ id: rule.id ?? rule.sourcePath })),
            snapshot: {
                areas: new Map(
                    [...snapshot.areas].map(([name, area]) => [
                        name,
                        { enabled: Boolean(area.enabled), available: Boolean(area.available) }
                    ])
                )
            },
            settings: { tokenBudget: state.settings.tokenBudget }
        },
        availableSkills,
        modelSkills,
        messages
    );
    return {
        ok: true,
        sessionId,
        status: agent.status,
        canReset: isTrulyIdle(agent),
        projectRoot: state.projectRoot,
        instructionsRoot: state.settings.instructionsRoot,
        resolvedInstructionsRoot: snapshot.instructionsRoot,
        areasConfigPath: path.posix.join(
            snapshot.instructionsRoot
                ? path.relative(state.projectRoot, snapshot.instructionsRoot).split(path.sep).join('/')
                : state.settings.instructionsRoot,
            'dsh',
            'agents-router.json'
        ),
        settings: state.settings,
        activePaths: state.activePaths,
        rules,
        areas: [...snapshot.areas].map(([name, area]) => ({
            name,
            path: area.path,
            keywords: area.keywords,
            enabled: area.enabled,
            available: area.available,
            parent: area.parent,
            reason: !area.enabled
                ? 'disabled'
                : !area.available
                  ? area.parent
                      ? 'parent or area folder unavailable'
                      : 'area folder unavailable'
                  : 'available'
        })),
        skills: availableSkills.map(({ name, description, path: sourcePath, invocation }) => ({
            name,
            description,
            sourcePath,
            invocation
        })),
        diagnostics: [...state.runtimeDiagnostics.values()].map(item => ({
            ...item,
            path: path.resolve(state.projectRoot, item.path ?? item.target ?? '')
        })),
        auditWarning: state.auditWarning,
        globalSettings: (await store.loadGlobalSettings()).settings,
        metrics,
        coverage: [
            { tool: 'read', pathField: 'file_path', coverage: 'single path; all assistant file calls preflighted before execution' },
            { tool: 'read_image', pathField: 'file_path', coverage: 'single path; all assistant file calls preflighted before execution' },
            { tool: 'write', pathField: 'file_path', coverage: 'single target path; new files supported' },
            { tool: 'edit', pathField: 'file_path', coverage: 'single target path' },
            { tool: 'str_replace_editor', pathField: 'path', coverage: 'single path; supported command required' },
            { tool: 'glob / grep', pathField: 'none', coverage: 'search only; results do not enter workset' },
            {
                tool: 'terminal / scripts / other tools',
                pathField: 'agents_router_paths(paths)',
                coverage: 'opaque accesses are not guaranteed; declared paths are advisory inputs'
            }
        ]
    };
}

function diagnosticKey(item: RouterDiagnostic): string {
    return item.key ?? `${item.code}:${item.path ?? ''}:${item.message}`;
}
