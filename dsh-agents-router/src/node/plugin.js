import { realpath, stat } from 'node:fs/promises'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import {
  AREA_CONTEXT,
  AREA_CONTEXT_ORDER,
  DEFAULT_PROJECT_SETTINGS,
  PLUGIN_ID,
  RULE_CONTEXT,
  RULE_CONTEXT_ORDER,
  USAGE_SECTION,
  USAGE_SECTION_ORDER,
} from '../shared/constants.js'
import { currentDirectory, feedbackKey, readRouterState, refreshState, reportDiagnostics } from './session-controller.js'
import {
  deleteAuditLog,
  diagnoseRouterPath,
  readAuditLog,
  refreshRouterProject,
  resetRouterWorkset,
  saveRouterSettings,
  updateRouterWorkset,
} from './session-actions.js'
import { createRouterHandler } from './http-routes.js'
import { recordAudit } from './audit-logger.js'
import { createPreflightHook } from './preflight-hook.js'
import { filterRootInstructionMessages } from './instruction-redirection.js'
import { RouterStore } from './store.js'
import { registerSkillsProvider } from './skills-provider.js'
import { createPathTool as makePathTool } from './path-tool.js'

export const name = PLUGIN_ID
export const inject = ['agents', 'tools', 'skills', 'systemPrompt', 'workingDirectory']

export function apply(ctx) {
  const store = new RouterStore()
  const states = new Map()
  const pendingFeedback = new Map()

  ctx.on('agent/created', async ({ agent, source, signal }) => {
    try {
      signal?.throwIfAborted()
    const headerCwd = agent.session.header.cwd
    if (typeof headerCwd !== 'string' || headerCwd.length === 0) return
    let projectRoot
    try {
      projectRoot = await realpath(headerCwd)
      if (!(await stat(projectRoot)).isDirectory()) throw new Error('session project path is not a directory')
    } catch (error) {
      ctx.logger.warn(`agents-router: cannot bind session ${agent.session.id} to its project root: ${error.message}`)
      return
    }

    const state = {
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
      lastLoggedBatchKey: undefined,
      lastLoggedDiagKeys: new Set(),
      invalidateSkills: () => {},
    }
    states.set(agent.id, state)

    if (source === 'startup' || source === 'clear') {
      try {
        const reset = await store.resetSession(state.sessionId, projectRoot)
        state.activePaths = reset.state.activePaths
      } catch (error) {
        state.activePaths = []
        state.forceEmptyWorkset = true
        state.restoreWarning = `new-session workset reset could not be persisted: ${error.message}`
      }
    } else {
      const loaded = await store.loadSession(state.sessionId, projectRoot)
      if (loaded.warning) state.restoreWarning = loaded.warning
      if (source === 'resume' && loaded.missing) state.restoreWarning = 'session workset was missing; restored as an empty project workset'
      state.activePaths = loaded.state.activePaths
    }

    await refreshState(ctx, store, state)
    await recordAudit(state, store, { event: source === 'clear' ? 'reset' : `session_init (source=\"${source}\")`, workset: state.activePaths.length ? `[${state.activePaths.join(', ')}]` : '[] (empty)', diagnostics: [...state.runtimeDiagnostics.values()] })
    agent.ctx.systemPrompt.context({
      name: AREA_CONTEXT,
      order: AREA_CONTEXT_ORDER,
      text: () => state.areaText,
      required: true,
      interpolate: false,
    })
    agent.ctx.systemPrompt.context({
      name: RULE_CONTEXT,
      order: RULE_CONTEXT_ORDER,
      text: () => state.text,
      required: true,
      interpolate: false,
    })
    agent.ctx.systemPrompt.section({
      name: USAGE_SECTION,
      order: USAGE_SECTION_ORDER,
      interpolate: false,
      text: 'Project instructions are selected from the session project root and the current router workset. Use built-in file tools for project files; before a terminal or other opaque tool accesses project files, call agents_router_paths(action="add", paths=[...]) first. If a file operation is denied because instructions were refreshed, read the current runtime context and re-plan; do not repeat the same call unchanged.',
    })

    state.invalidateSkills = await registerSkillsProvider(agent, ctx, projectRoot, store, (items) => reportDiagnostics(ctx, store, state, items))
    agent.ctx.tools.register(makePathTool(ctx, store, state, { refreshState, currentDirectory }))

    agent.ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
      state.invalidateSkills()
      await refreshState(ctx, store, state)
      await recordAudit(state, store, { event: 'prompt_assemble', workset: `unchanged (${state.activePaths.length} paths)`, diagnostics: [...state.runtimeDiagnostics.values()] })
      const result = await next()
      const texts = new Map([[AREA_CONTEXT, state.areaText], [RULE_CONTEXT, state.text]])
      const contexts = result.contexts.map((item) => texts.has(item.name)
        ? { ...item, text: texts.get(item.name), interpolate: false }
        : item)
      for (const [contextName, text] of texts) {
        if (text && !contexts.some((item) => item.name === contextName)) contexts.push({ name: contextName, text, interpolate: false })
      }
      return { ...result, contexts }
    }, { prepend: true })

    agent.ctx.on('agent/pre-step', async (_payload, next) => {
      state.invalidateSkills()
      const decision = await next()
      if (decision.kind !== 'enter' || !state.settings.redirectRootInstructionFiles || !state.snapshot?.areasConfigValid) return decision
      const messages = filterRootInstructionMessages(decision.messages, state.settings.rootInstructionFileNames)
      return messages === decision.messages ? decision : { ...decision, messages }
    }, { prepend: true })
    } catch (error) {
      if (signal?.aborted) return
      const message = `plugin initialization failed: ${error?.message ?? String(error)}`
      const state = states.get(agent?.id)
      if (state) {
        const item = { code: 'initialization', path: state.projectRoot, message, key: `initialization:${state.projectRoot}:${message}` }
        state.runtimeDiagnostics.set(item.key, item)
        state.text = [state.text, `Router warning: ${message}`].filter(Boolean).join('\n\n')
        try { await reportDiagnostics(ctx, store, state, [item]) } catch {}
      }
      ctx.logger.error(`agents-router: ${message}`)
    }
  })

  ctx.on('agent/disposed', ({ agent }) => states.delete(agent.id))

  ctx.on('tools/pre-execute', createPreflightHook(ctx, store, states, pendingFeedback))

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const state = states.get(exec.agent?.id)
    const key = state ? feedbackKey(state.agent.id, exec.callId) : undefined
    const notice = key === undefined ? undefined : pendingFeedback.get(key)
    if (!notice) return next()
    pendingFeedback.delete(key)
    const decision = await next()
    const message = createUserMessage({
      content: [{ type: 'text', text: notice }],
      source: { kind: name, form: 'notice', summary: 'A project file operation was deferred until current rules were applied.' },
    })
    return { ...decision, additionalContexts: [...(decision.additionalContexts ?? []), message] }
  })

  ctx.on('tools/result', (exec) => {
    const state = states.get(exec.agent?.id)
    if (state && exec.parent === undefined) state.blockedRoots.delete(exec.callId)
  })

  ctx.inject(['webServer'], (scope) => {
    const actions = {
      state: (sessionId) => readRouterState(ctx, store, states, sessionId),
      saveSettings: (sessionId, settings) => saveRouterSettings(ctx, store, states, sessionId, settings),
      globalSettings: async () => ({ settings: (await store.loadGlobalSettings()).settings }),
      saveGlobalSettings: (settings) => store.saveGlobalSettings(settings).then((result) => result.saved
        ? { ok: true, settings: result.settings } : { ok: false, status: 400, error: result.errors.join('; ') }),
      audit: (sessionId) => readAuditLog(ctx, store, states, sessionId),
      deleteAudit: (sessionId) => deleteAuditLog(ctx, store, states, sessionId),
      refresh: (sessionId) => refreshRouterProject(ctx, store, states, sessionId),
      reset: (sessionId) => resetRouterWorkset(ctx, store, states, sessionId),
      diagnose: (sessionId, filePath) => diagnoseRouterPath(ctx, store, states, sessionId, filePath),
      workset: (sessionId, action, filePath) => updateRouterWorkset(ctx, store, states, sessionId, action, filePath),
    }
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: '/agents-router',
      handler: createRouterHandler(actions),
    }), 'agents-router: web routes')
  })
}

