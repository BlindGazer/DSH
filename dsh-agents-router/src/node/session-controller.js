import path from 'node:path'
import { discoverProject } from './discovery.js'
import { renderAreas, renderRules, selectRules } from './rule-selector.js'
import { computeContextMetrics } from './metrics.js'
import { AREA_CONTEXT, RULE_CONTEXT } from '../shared/constants.js'

export async function reportDiagnostics(ctx, store, state, items) {
  for (const item of items) state.runtimeDiagnostics.set(item.key, item)
  if (!items.length) return []
  try {
    const fresh = await store.markDiagnostics(state.sessionId, state.projectRoot, items)
    for (const item of fresh) ctx.logger.warn(`agents-router: ${item.path}: ${item.message}`)
    return fresh
  } catch (error) {
    ctx.logger.error(`agents-router: could not persist diagnostics for ${state.sessionId}: ${error.message}`)
    return items
  }
}

export async function refreshState(ctx, store, state) {
  const project = await store.loadProjectSettings(state.projectRoot)
  const session = await store.loadSession(state.sessionId, state.projectRoot)
  state.settings = project.settings
  state.activePaths = state.forceEmptyWorkset ? [] : session.state.activePaths
  state.snapshot = await discoverProject(state.projectRoot, project.settings)
  state.runtimeDiagnostics = new Map(state.snapshot.diagnostics.map((item) => [item.key, item]))
  state.areaText = renderAreas(state.snapshot)
  state.rules = selectRules(state.snapshot, state.activePaths)
  state.text = renderRules(state.rules)
  if (!state.snapshot.rulesComplete) state.text = [state.text, 'Router warning: project rule discovery is incomplete; do not perform project file operations until access is restored.'].filter(Boolean).join('\n\n')
  const warnings = [project.warning, session.warning, state.restoreWarning].filter(Boolean).map((message) => ({
    code: 'restore-warning', path: state.projectRoot, message, key: `restore-warning:${state.projectRoot}:${message}`,
  }))
  if ((project.settings.redirectRootInstructionFiles || project.settings.redirectInstructionDirectories) && !state.snapshot.areasConfigValid) {
    const configPath = `${project.settings.instructionsRoot}/dsh/agents-router.json`
    warnings.push({
      code: 'instruction-redirection-config',
      path: configPath,
      message: 'Instruction redirection is disabled until agents-router.json exists and is valid; original reads are unchanged.',
      key: `instruction-redirection-config:${state.projectRoot}:${configPath}`,
    })
  }
  await reportDiagnostics(ctx, store, state, [...state.snapshot.diagnostics, ...warnings])
  return state
}

export function findLiveState(ctx, states, sessionId) {
  const agent = ctx.agents.list().find((item) => item.session.id === sessionId)
  const state = agent ? states.get(agent.id) : undefined
  return agent && state ? { agent, state } : undefined
}

export function currentDirectory(ctx, state, agent) {
  try {
    const value = ctx.workingDirectory.get(agent.session)
    if (typeof value === 'string' && path.isAbsolute(value)) return value
  } catch { /* The immutable Session header remains the fallback. */ }
  return state.projectRoot
}

export function isTrulyIdle(agent) {
  return agent.status === 'idle' && agent.inbox.nextTurn.length === 0 && agent.inbox.nextStep.length === 0
}

export function historyHasRule(session, rule) {
  const messages = session.deriveMessages()
  let latestSections = []
  for (const message of messages) {
    const source = message.source
    if (source?.kind !== 'runtime-context') continue
    latestSections = source.form === 'snapshot' && Array.isArray(source.sections) ? source.sections : []
  }
  const contribution = latestSections.find((section) => section.name === RULE_CONTEXT)
  return Boolean(contribution?.text.includes(`Revision: ${rule.hash}`))
}

export function denyCalls(calls, exec, pendingFeedback, state, reason) {
  for (const call of calls) pendingFeedback.set(feedbackKey(state.agent.id, call.callId), reason)
  if (exec.parent !== undefined) state.blockedRoots.set(exec.rootCallId ?? exec.callId, reason)
  return { kind: 'deny', reason, info: { name: 'AgentsRouterPreflightError', code: 'AGENTS_ROUTER_REPLAN_REQUIRED', reason } }
}

export function feedbackKey(agentId, callId) {
  return `${agentId}:${callId}`
}

export function preflightEvent(kind, tool, resolvedPaths, calls) {
  if (kind === 'file_preflight') {
    const count = resolvedPaths.length
    return `${kind} tool=\"${tool}\" (${count ? `+${count} paths` : 'cached workset'})`
  }
  const paths = resolvedPaths.size ? [...resolvedPaths] : calls.flatMap((call) => call.paths ?? [])
  return `${kind} tool=\"${tool}\" (${paths.join(', ')})`
}

export async function readRouterState(ctx, store, states, sessionId) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  const { agent, state } = found
  await refreshState(ctx, store, state)
  state.invalidateSkills()
  const availableSkills = (await ctx.skills.list({ cwd: state.projectRoot, scope: agent }))
    .filter((skill) => skill.provider === 'agents-router-project')
  const modelSkills = availableSkills.filter((skill) => skill.invocation?.modelInvocable !== false)
  const selected = new Map(state.rules.map((rule) => [rule.id, rule]))
  const rules = state.snapshot.rules.map((rule) => {
    const current = selected.get(rule.id)
    return {
      source: rule.sourcePath,
      area: rule.area,
      description: rule.description || path.posix.basename(rule.sourcePath),
      enabled: rule.enabled,
      selected: Boolean(current),
      appliesTo: current?.appliesTo ?? [],
      characters: rule.content.length,
      reason: current ? (current.appliesTo.includes('always') ? 'always' : 'matches active workset')
        : !rule.enabled ? 'disabled' : !state.activePaths.length ? 'requires a matching project path' : 'path or area filters did not match',
    }
  })
  const messages = agent.session.deriveMessages()
  const metrics = computeContextMetrics(state, availableSkills, modelSkills, messages)
  return {
    ok: true,
    sessionId,
    status: agent.status,
    canReset: isTrulyIdle(agent),
    projectRoot: state.projectRoot,
    instructionsRoot: state.settings.instructionsRoot,
    areasConfigPath: path.posix.join(state.settings.instructionsRoot, 'dsh', 'agents-router.json'),
    settings: state.settings,
    activePaths: state.activePaths,
    rules,
    areas: [...state.snapshot.areas].map(([name, area]) => ({
      name, path: area.path, keywords: area.keywords, enabled: area.enabled, available: area.available, parent: area.parent,
      reason: !area.enabled ? 'disabled' : !area.available ? (area.parent ? 'parent or area folder unavailable' : 'area folder unavailable') : 'available',
    })),
    skills: availableSkills.map(({ name, description, path: sourcePath, invocation }) => ({ name, description, sourcePath, invocation })),
    diagnostics: [...state.runtimeDiagnostics.values()],
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
      { tool: 'terminal / scripts / other tools', pathField: 'agents_router_paths(paths)', coverage: 'opaque accesses are not guaranteed; declared paths are advisory inputs' },
    ],
  }
}
