import { realpath, stat } from 'node:fs/promises';
import type { RouterAgent, RouterHostContext, RouterMessage, RouterState } from './sessionController.js';
import type { ScopedAgent } from './skillsProvider.js';

interface UserMessageInput {
    readonly content: { readonly type: 'text'; readonly text: string }[];
    readonly source: { readonly kind: string; readonly form: string; readonly summary: string };
}

interface LLMModule {
    readonly createUserMessage?: (payload: UserMessageInput) => RouterMessage;
}

const llmModuleName: string = '@deepseek-ai/dsh-llm';
let createUserMessage = (payload: UserMessageInput): RouterMessage => ({ role: 'user', content: payload.content, source: payload.source });
try {
    const llmMod = (await import(llmModuleName)) as LLMModule;
    if (typeof llmMod.createUserMessage === 'function') createUserMessage = llmMod.createUserMessage;
} catch {
    // Outside live DSH host environment
}

import {
    AREA_CONTEXT,
    AREA_CONTEXT_ORDER,
    DEFAULT_PROJECT_SETTINGS,
    PLUGIN_ID,
    RULE_CONTEXT,
    RULE_CONTEXT_ORDER,
    USAGE_SECTION,
    USAGE_SECTION_ORDER
} from '../../shared/constants/constants.js';
import { createRouterHandler } from '../api/httpRoutes.js';
import { recordAudit } from './auditLogger.js';
import { filterRootInstructionMessages } from './instructionRedirection.js';
import { createPathTool as makePathTool } from './pathTool.js';
import { createPreflightHook } from './preflightHook.js';
import {
    deleteAuditLog,
    diagnoseRouterPath,
    readAuditLog,
    refreshRouterProject,
    resetRouterWorkset,
    saveRouterSettings,
    updateRouterWorkset
} from './sessionActions.js';
import { currentDirectory, feedbackKey, readRouterState, refreshState, reportDiagnostics } from './sessionController.js';
import { registerSkillsProvider } from './skillsProvider.js';
import { RouterStore } from './store.js';

interface AbortSignalLike {
    readonly aborted: boolean;
    throwIfAborted(): void;
}

interface PromptContext {
    readonly name: string;
    readonly text?: string;
    readonly interpolate?: boolean;
}

interface PromptAssembly {
    readonly contexts: PromptContext[];
}

interface PreStepDecision {
    readonly kind: string;
    readonly messages: ReturnType<typeof filterRootInstructionMessages>;
}

interface AgentEvents {
    readonly 'system-prompt/assemble': (
        _assembly: object,
        _context: object,
        next: () => Promise<PromptAssembly>
    ) => Promise<PromptAssembly>;
    readonly 'agent/pre-step': (_payload: object, next: () => Promise<PreStepDecision>) => Promise<PreStepDecision>;
}

interface PluginAgentContext {
    readonly inject: ScopedAgent['ctx']['inject'];
    readonly systemPrompt: {
        context(value: {
            readonly name: string;
            readonly order: number;
            readonly text: () => string;
            readonly required: boolean;
            readonly interpolate: boolean;
        }): void;
        section(value: { readonly name: string; readonly order: number; readonly interpolate: boolean; readonly text: string }): void;
    };
    readonly tools: { register(tool: ReturnType<typeof makePathTool>): void };
    on<K extends keyof AgentEvents>(event: K, callback: AgentEvents[K], options: { readonly prepend: boolean }): void;
}

interface PluginAgent extends RouterAgent {
    readonly ctx: PluginAgentContext;
}

interface AgentCreatedEvent {
    readonly agent: PluginAgent;
    readonly source: string;
    readonly signal?: AbortSignalLike;
}

interface ToolExecution {
    readonly agent?: { readonly id: string };
    readonly callId: string;
    readonly parent?: string;
}

interface ToolExecutionResult {
    readonly additionalContexts?: readonly RouterMessage[];
}

interface WorkspacePathController {
    canOpenWorkspacePath(): boolean;
    openWorkspacePath(
        request: { readonly action: 'reveal'; readonly path: string },
        signal: AbortSignal
    ): Promise<{ readonly opened: true }>;
}

interface WebServerScope {
    readonly webServer: {
        register(value: { readonly kind: 'prefix'; readonly path: string; readonly handler: ReturnType<typeof createRouterHandler> }): void;
    };
    effect(action: () => void, name: string): void;
}

interface PluginEvents {
    readonly 'agent/created': (payload: AgentCreatedEvent) => Promise<void>;
    readonly 'agent/disposed': (payload: { readonly agent: RouterAgent }) => void;
    readonly 'tools/pre-execute': ReturnType<typeof createPreflightHook>;
    readonly 'tools/post-execute': (
        exec: ToolExecution,
        result: object,
        next: () => Promise<ToolExecutionResult>
    ) => Promise<ToolExecutionResult>;
    readonly 'tools/result': (exec: ToolExecution) => void;
}

interface PluginContext extends RouterHostContext {
    readonly sessionController: WorkspacePathController;
    readonly agents: { list(): PluginAgent[] };
    on<K extends keyof PluginEvents>(event: K, callback: PluginEvents[K]): void;
    inject(keys: readonly string[], action: (scope: WebServerScope) => void): void;
}

export const name = PLUGIN_ID;
export const inject = ['agents', 'tools', 'skills', 'systemPrompt', 'workingDirectory', 'sessionController'];

export function apply(ctx: PluginContext): void {
    const store = new RouterStore();
    const states = new Map<string, RouterState>();
    const pendingFeedback = new Map<string, string>();

    const initializeAgent = async ({ agent, source, signal }: AgentCreatedEvent): Promise<void> => {
        try {
            signal?.throwIfAborted();
            const headerCwd = agent.session.header.cwd;
            if (typeof headerCwd !== 'string' || headerCwd.length === 0) return;
            let projectRoot: string;
            try {
                projectRoot = await realpath(headerCwd);
                if (!(await stat(projectRoot)).isDirectory()) throw new Error('session project path is not a directory');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                ctx.logger.warn(`agents-router: cannot bind session ${agent.session.id} to its project root: ${message}`);
                return;
            }

            const state: RouterState = {
                agent,
                sessionId: agent.session.id,
                projectRoot,
                settings: DEFAULT_PROJECT_SETTINGS,
                activePaths: [],
                areaText: '',
                snapshot: undefined,
                rules: [],
                text: '',
                source,
                blockedRoots: new Map(),
                runtimeDiagnostics: new Map(),
                forceEmptyWorkset: false,
                auditRules: new Map(),
                lastLoggedDiagKeys: new Set(),
                invalidateSkills: () => {}
            };
            states.set(agent.id, state);

            if (source === 'startup' || source === 'clear') {
                try {
                    const reset = await store.resetSession(state.sessionId, projectRoot);
                    state.activePaths = reset.state.activePaths;
                } catch (error) {
                    state.activePaths = [];
                    state.forceEmptyWorkset = true;
                    const message = error instanceof Error ? error.message : String(error);
                    state.restoreWarning = `new-session workset reset could not be persisted: ${message}`;
                }
            } else {
                const loaded = await store.loadSession(state.sessionId, projectRoot);
                if (loaded.warning) state.restoreWarning = loaded.warning;
                if (source === 'resume' && loaded.missing)
                    state.restoreWarning = 'session workset was missing; restored as an empty project workset';
                state.activePaths = loaded.state.activePaths;
            }

            await refreshState(ctx, store, state);
            await recordAudit(state, store, {
                event: source === 'clear' ? 'reset' : `session_init (source="${source}")`,
                workset: state.activePaths.length ? `[${state.activePaths.join(', ')}]` : '[] (empty)',
                diagnostics: [...state.runtimeDiagnostics.values()].map(item => ({ ...item, path: item.path ?? item.target ?? '' }))
            });
            agent.ctx.systemPrompt.context({
                name: AREA_CONTEXT,
                order: AREA_CONTEXT_ORDER,
                text: () => state.areaText,
                required: true,
                interpolate: false
            });
            agent.ctx.systemPrompt.context({
                name: RULE_CONTEXT,
                order: RULE_CONTEXT_ORDER,
                text: () => state.text,
                required: true,
                interpolate: false
            });
            agent.ctx.systemPrompt.section({
                name: USAGE_SECTION,
                order: USAGE_SECTION_ORDER,
                interpolate: false,
                text: 'Project instructions are selected from the session project root and the current router workset. Use built-in file tools for project files; before a terminal or other opaque tool accesses project files, call agents_router_paths(action="add", paths=[...]) first. If a file operation is denied because instructions were refreshed, read the current runtime context and re-plan; do not repeat the same call unchanged.'
            });

            state.invalidateSkills = await registerSkillsProvider(agent, ctx, projectRoot, store, items =>
                reportDiagnostics(ctx, store, state, items)
            );
            agent.ctx.tools.register(makePathTool(ctx, store, state, { refreshState, currentDirectory }));

            agent.ctx.on(
                'system-prompt/assemble',
                async (_assembly, _context, next) => {
                    state.invalidateSkills();
                    await refreshState(ctx, store, state);
                    await recordAudit(state, store, {
                        event: 'prompt_assemble',
                        workset: `unchanged (${state.activePaths.length} paths)`,
                        diagnostics: [...state.runtimeDiagnostics.values()].map(item => ({ ...item, path: item.path ?? item.target ?? '' }))
                    });
                    const result = await next();
                    const texts = new Map([
                        [AREA_CONTEXT, state.areaText],
                        [RULE_CONTEXT, state.text]
                    ]);
                    const contexts = result.contexts.map(item => {
                        const text = texts.get(item.name);
                        return text === undefined ? item : { ...item, text, interpolate: false };
                    });
                    for (const [contextName, text] of texts) {
                        if (text && !contexts.some(item => item.name === contextName))
                            contexts.push({ name: contextName, text, interpolate: false });
                    }
                    return { ...result, contexts };
                },
                { prepend: true }
            );

            agent.ctx.on(
                'agent/pre-step',
                async (_payload, next) => {
                    state.invalidateSkills();
                    const decision = await next();
                    if (decision.kind !== 'enter' || !state.settings.redirectRootInstructionFiles || !state.snapshot?.areasConfigValid)
                        return decision;
                    const messages = filterRootInstructionMessages(decision.messages, state.settings.rootInstructionFileNames);
                    return messages === decision.messages ? decision : { ...decision, messages };
                },
                { prepend: true }
            );
        } catch (error) {
            if (signal?.aborted) return;
            const detail = error instanceof Error ? error.message : String(error);
            const message = `plugin initialization failed: ${detail}`;
            const state = states.get(agent?.id);
            if (state) {
                const item = {
                    code: 'initialization',
                    path: state.projectRoot,
                    message,
                    key: `initialization:${state.projectRoot}:${message}`
                };
                state.runtimeDiagnostics.set(item.key, item);
                state.text = [state.text, `Router warning: ${message}`].filter(Boolean).join('\n\n');
                try {
                    await reportDiagnostics(ctx, store, state, [item]);
                } catch {}
            }
            ctx.logger.error(`agents-router: ${message}`);
        }
    };
    ctx.on('agent/created', initializeAgent);

    ctx.on('agent/disposed', ({ agent }) => states.delete(agent.id));

    ctx.on('tools/pre-execute', createPreflightHook(ctx, store, states, pendingFeedback));

    ctx.on('tools/post-execute', async (exec, _result, next) => {
        const agentId = exec.agent?.id;
        const state = agentId === undefined ? undefined : states.get(agentId);
        const key = state ? feedbackKey(state.agent.id, exec.callId) : undefined;
        const notice = key === undefined ? undefined : pendingFeedback.get(key);
        if (key === undefined || !notice) return next();
        pendingFeedback.delete(key);
        const decision = await next();
        const message = createUserMessage({
            content: [{ type: 'text', text: notice }],
            source: { kind: name, form: 'notice', summary: 'A project file operation was deferred until current rules were applied.' }
        });
        return { ...decision, additionalContexts: [...(decision.additionalContexts ?? []), message] };
    });

    ctx.on('tools/result', exec => {
        const agentId = exec.agent?.id;
        const state = agentId === undefined ? undefined : states.get(agentId);
        if (state && exec.parent === undefined) state.blockedRoots.delete(exec.callId);
    });

    ctx.inject(['webServer'], scope => {
        const actions = {
            state: (sessionId: string) => readRouterState(ctx, store, states, sessionId),
            reinitialize: async (sessionId: string) => {
                const agent = ctx.agents.list().find(item => item.session.id === sessionId);
                if (!agent) return { ok: false, status: 404, error: 'session is not active in this DSH process' };
                if (!states.has(agent.id)) await initializeAgent({ agent, source: 'resume' });
                return readRouterState(ctx, store, states, sessionId);
            },
            saveSettings: (sessionId: string, settings: Record<string, unknown>) =>
                saveRouterSettings(ctx, store, states, sessionId, settings),
            globalSettings: async () => ({ settings: { ...(await store.loadGlobalSettings()).settings } }),
            saveGlobalSettings: (settings: Record<string, unknown>) =>
                store
                    .saveGlobalSettings(settings)
                    .then(result =>
                        result.saved ? { ok: true, settings: result.settings } : { ok: false, status: 400, error: result.errors.join('; ') }
                    ),
            audit: (sessionId: string) => readAuditLog(ctx, store, states, sessionId),
            deleteAudit: (sessionId: string) => deleteAuditLog(ctx, store, states, sessionId),
            refresh: (sessionId: string) => refreshRouterProject(ctx, store, states, sessionId),
            reset: (sessionId: string) => resetRouterWorkset(ctx, store, states, sessionId),
            diagnose: (sessionId: string, filePath: string) => diagnoseRouterPath(ctx, store, states, sessionId, filePath),
            openFile: async (sessionId: string, filePath: string) => {
                const agent = ctx.agents.list().find(item => item.session.id === sessionId);
                const state = agent === undefined ? undefined : states.get(agent.id);
                if (!state?.snapshot?.rules.some(rule => rule.filePath === filePath))
                    return { ok: false, status: 404, error: 'rule file is not available in this session' };
                if (!ctx.sessionController.canOpenWorkspacePath())
                    return { ok: false, status: 503, error: 'workspace file opening is unavailable' };
                try {
                    await ctx.sessionController.openWorkspacePath({ path: filePath, action: 'reveal' }, new AbortController().signal);
                    return { ok: true };
                } catch (error) {
                    return { ok: false, status: 500, error: error instanceof Error ? error.message : String(error) };
                }
            },
            workset: (sessionId: string, action: string, filePath: string) =>
                updateRouterWorkset(ctx, store, states, sessionId, action, filePath)
        };
        scope.effect(
            () =>
                scope.webServer.register({
                    kind: 'prefix',
                    path: '/agents-router',
                    handler: createRouterHandler(actions)
                }),
            'agents-router: web routes'
        );
    });
}
