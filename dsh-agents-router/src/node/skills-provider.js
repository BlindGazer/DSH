import path from 'node:path'
import { discoverProject, loadSkillDefinition } from './discovery.js'

const PROVIDER_NAME = 'agents-router-project'
const PROJECT_AGENTS_RANK = 200

/** Register this provider inside one Agent scope so its skills stay project-bound. */
export async function registerSkillsProvider(agent, rootContext, projectRoot, store, reportDiagnostics = async () => {}) {
  let invalidate = () => {}
  await agent.ctx.inject(['skills'], (scope) => {
    scope.skills.registerProvider((control) => {
    invalidate = control.invalidate
    let lastGood = []
    return {
      name: PROVIDER_NAME,
      async list(options) {
        options.signal?.throwIfAborted()
        control.signal.throwIfAborted()
        const { settings } = await store.loadProjectSettings(projectRoot)
        const snapshot = await discoverProject(projectRoot, settings)
        await reportDiagnostics(snapshot.diagnostics)
        if (!snapshot.complete) return { candidates: lastGood, complete: false }

        // The unscoped view is global-only; the provider itself is Agent-scoped.
        const globalSkills = await rootContext.skills.list({ cwd: projectRoot, signal: options.signal })
        options.signal?.throwIfAborted()
        const globalByName = new Map()
        for (const skill of globalSkills) {
          const list = globalByName.get(skill.name) ?? []
          list.push(skill)
          globalByName.set(skill.name, list)
        }
        const ownByName = new Map()
        for (const skill of snapshot.skills) if (skill.enabled) {
          const list = ownByName.get(skill.name) ?? []
          list.push(skill)
          ownByName.set(skill.name, list)
        }
        const conflicts = snapshot.skills.filter((skill) => skill.enabled && (globalByName.has(skill.name) || ownByName.get(skill.name).length > 1))
        if (conflicts.length) {
          await reportDiagnostics(conflicts.map((skill) => {
            const own = ownByName.get(skill.name)
            const global = globalByName.get(skill.name) ?? []
            const sources = [
              ...(own.length > 1 ? own.map((entry) => entry.sourcePath) : []),
              ...global.map((entry) => `${entry.provider ?? 'another provider'}${entry.path ? ` (${entry.path})` : ''}`),
            ]
            return {
              code: 'skill-name-conflict', path: skill.sourcePath,
              message: `skill /${skill.name} conflicts with ${sources.join(', ')}; every project copy of this name is unavailable`,
              key: `skill-name-conflict:${skill.sourcePath}:${skill.name}:${sources.join('|')}`,
            }
          }))
        }

        const blocked = new Set(conflicts.map((skill) => skill.sourcePath))
        lastGood = snapshot.skills.filter((skill) => skill.enabled && !blocked.has(skill.sourcePath)).map((skill) => ({
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
          ...(skill.metadata ? { metadata: skill.metadata } : {}),
        }))
        return { candidates: lastGood, complete: true }
      },
      async get(candidate, options) {
        options.signal?.throwIfAborted()
        control.signal.throwIfAborted()
        const globalSkills = await rootContext.skills.list({ cwd: projectRoot, signal: options.signal })
        if (globalSkills.some((skill) => skill.name === candidate.name)) return undefined
        const { settings } = await store.loadProjectSettings(projectRoot)
        const definition = await loadSkillDefinition(projectRoot, settings, candidate.locator)
        options.signal?.throwIfAborted()
        if (!definition) return undefined
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
          ...(definition.metadata ? { metadata: definition.metadata } : {}),
        }
      },
    }
    })
  })
  return () => invalidate()
}
