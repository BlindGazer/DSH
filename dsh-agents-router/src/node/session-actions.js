import { projectPaths } from './preflight.js'
import { diagnosePath } from './rule-selector.js'
import { recordAudit } from './audit-logger.js'
import { currentDirectory, findLiveState, isTrulyIdle, refreshState } from './session-controller.js'

export async function readAuditLog(ctx, store, states, sessionId) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  return { ok: true, text: await store.readAuditLog(found.state.projectRoot, sessionId) }
}

export async function deleteAuditLog(ctx, store, states, sessionId) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  await store.deleteSessionAuditLog(found.state.projectRoot, sessionId)
  return { ok: true }
}

export async function saveRouterSettings(ctx, store, states, sessionId, settings) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  const saved = await store.saveProjectSettings(found.state.projectRoot, settings)
  if (!saved.saved) return { ok: false, status: 400, error: saved.errors.join('; ') }
  await refreshProjectStates(ctx, store, states, found.state.projectRoot)
  for (const agent of ctx.agents.list()) {
    const state = states.get(agent.id)
    if (state?.projectRoot === found.state.projectRoot) await recordAudit(state, store, { event: 'settings_change' })
  }
  return { ok: true, settings: saved.settings }
}

export async function refreshRouterProject(ctx, store, states, sessionId) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  await refreshProjectStates(ctx, store, states, found.state.projectRoot)
  return { ok: true, projectRoot: found.state.projectRoot }
}

export async function refreshProjectStates(ctx, store, states, projectRoot) {
  for (const agent of ctx.agents.list()) {
    const state = states.get(agent.id)
    if (!state || state.projectRoot !== projectRoot) continue
    await refreshState(ctx, store, state)
    state.invalidateSkills()
    await ctx.skills.list({ cwd: state.projectRoot, scope: agent })
  }
}

export async function resetRouterWorkset(ctx, store, states, sessionId) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  try {
    return await found.agent.runMaintenance(async (signal) => {
      signal.throwIfAborted()
      const result = await store.resetSession(sessionId, found.state.projectRoot)
      found.state.activePaths = result.state.activePaths
      found.state.forceEmptyWorkset = false
      await refreshState(ctx, store, found.state)
      await recordAudit(found.state, store, { event: 'reset', workset: '-released all paths | total: 0' })
      return { ok: true, activePaths: found.state.activePaths, note: 'history is unchanged; old instruction messages may remain visible to DSH' }
    })
  } catch (error) {
    if (!isTrulyIdle(found.agent)) return { ok: false, status: 409, error: 'workset can only be reset while the session is truly idle' }
    throw error
  }
}

export async function diagnoseRouterPath(ctx, store, states, sessionId, filePath) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  const { state, agent } = found
  await refreshState(ctx, store, state)
  const candidates = await projectPaths(state.projectRoot, currentDirectory(ctx, state, agent), filePath)
  if (!candidates.length) return { ok: true, filePath, projectPaths: [], rules: [], note: 'outside the bound project; router file rules do not apply' }
  const rows = candidates.map((candidate) => ({ path: candidate, rules: diagnosePath(state.snapshot, candidate).map(({ rule, applies, reason }) => ({ source: rule.sourcePath, area: rule.area, applies, reason })) }))
  return { ok: true, filePath, projectPaths: candidates, results: rows, note: 'diagnosis does not add the path to the workset' }
}

export async function updateRouterWorkset(ctx, store, states, sessionId, action, filePath) {
  const found = findLiveState(ctx, states, sessionId)
  if (!found) return { ok: false, status: 404, error: 'session is not active in this DSH process' }
  try {
    return await found.agent.runMaintenance(async (signal) => {
      signal.throwIfAborted()
      const { state } = found
      const previousPaths = state.activePaths
      const paths = await projectPaths(state.projectRoot, currentDirectory(ctx, state, found.agent), filePath)
      const result = await store.updateSession(sessionId, state.projectRoot, (session) => {
        const entries = new Map(state.activePaths.map((value) => [value.toLowerCase(), value]))
        if (action === 'add') for (const value of paths) entries.set(value.toLowerCase(), value)
        else if (paths.includes('.')) entries.clear()
        else for (const value of paths) {
          const key = value.toLowerCase().replace(/\/$/, '')
          for (const existing of entries.keys()) if (existing === key || existing.startsWith(`${key}/`)) entries.delete(existing)
        }
        return { ...session, activePaths: [...entries.values()] }
      })
      state.activePaths = result.state.activePaths
      state.forceEmptyWorkset = false
      await refreshState(ctx, store, state)
      const added = state.activePaths.filter((item) => !previousPaths.includes(item))
      const released = previousPaths.filter((item) => !state.activePaths.includes(item))
      await recordAudit(state, store, { event: 'tool_call agents_router_paths', workset: `+added: [${added.join(', ')}] | -released: [${released.join(', ')}] | total: ${state.activePaths.length}` })
      state.invalidateSkills()
      return { ok: true, activePaths: state.activePaths, ignored: paths.length ? 0 : 1 }
    })
  } catch (error) {
    if (!isTrulyIdle(found.agent)) return { ok: false, status: 409, error: 'workset can only be changed from the UI while the session is truly idle' }
    throw error
  }
}
