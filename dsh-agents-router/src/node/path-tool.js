import { defineTool } from '@deepseek-ai/dsh-tools'
import { projectPaths } from './preflight.js'
import { recordAudit } from './audit-logger.js'

export function createPathTool(ctx, store, state, { refreshState, currentDirectory }) {
  return defineTool({
    name: 'agents_router_paths',
    description: 'Declare or release project files in the router workset. Use before opaque terminal or script access; native file tools are tracked automatically.',
    parameters: {
      action: { type: 'string', required: true, enum: ['add', 'release'] },
      paths: { type: 'array', required: true, items: { type: 'string' }, description: 'File or directory paths relative to the current Session directory, or absolute paths.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          message: { type: 'string', required: true },
          paths: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (!agent || agent.id !== state.agent.id) throw new Error('agents_router_paths is only available in its owning DSH session')
      const cwd = currentDirectory(ctx, state, agent)
      const previousPaths = state.activePaths
      const paths = new Set()
      let ignored = 0
      for (const raw of args.paths) {
        const resolved = await projectPaths(state.projectRoot, cwd, raw)
        if (!resolved.length) ignored++
        for (const value of resolved) paths.add(value)
      }
      const update = await store.updateSession(state.sessionId, state.projectRoot, (session) => {
        const entries = new Map(state.activePaths.map((value) => [value.toLowerCase(), value]))
        if (args.action === 'add') {
          for (const value of paths) entries.set(value.toLowerCase(), value)
        } else if (paths.has('.')) {
          entries.clear()
        } else {
          for (const value of paths) {
            const key = value.toLowerCase().replace(/\/$/, '')
            for (const existing of entries.keys()) if (existing === key || existing.startsWith(`${key}/`)) entries.delete(existing)
          }
        }
        return { ...session, activePaths: [...entries.values()] }
      })
      state.activePaths = update.state.activePaths
      state.forceEmptyWorkset = false
      await refreshState(ctx, store, state)
      const added = state.activePaths.filter((item) => !previousPaths.includes(item))
      const released = previousPaths.filter((item) => !state.activePaths.includes(item))
      await recordAudit(state, store, { event: 'tool_call agents_router_paths', workset: `+added: [${added.join(', ')}] | -released: [${released.join(', ')}] | total: ${state.activePaths.length}` })
      state.invalidateSkills()
      const action = args.action === 'add' ? 'added' : 'released'
      const message = `${action} ${paths.size} project path(s)${ignored ? `; ignored ${ignored} path(s) outside this project` : ''}`
      return { action: args.action, message, paths: [...paths] }
    },
  })
}
