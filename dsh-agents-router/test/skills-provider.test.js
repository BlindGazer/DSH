import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { registerSkillsProvider } from '../src/skills-provider.js'

const projectRoot = path.resolve('examples/demo-project')
const settings = { instructionsRoot: 'agents', rulesFolder: 'rules', skillsFolder: 'skills', mainFile: 'agents.md', tokenBudget: 16_000 }

function scopedAgent(setProvider) {
  return {
    ctx: {
      get skills() { throw new Error('agent.ctx.skills accessed without inject') },
      async inject(services, apply) {
        assert.deepEqual(services, ['skills'])
        await Promise.resolve()
        return apply({ skills: { registerProvider: (create) => setProvider(create({ signal: new AbortController().signal })) } })
      },
    },
  }
}

test('uses the native provider contract and defers bodies until get()', async () => {
  let provider
  const agent = scopedAgent((value) => { provider = value; return () => {} })
  const rootContext = { skills: { list: async () => [] } }
  const store = { loadProjectSettings: async () => ({ settings }) }
  await registerSkillsProvider(agent, rootContext, projectRoot, store)
  const result = await provider.list({ cwd: projectRoot, signal: new AbortController().signal })
  assert.equal(result.complete, true)
  const skill = result.candidates.find(({ name }) => name === 'review')
  assert.ok(skill)
  assert.equal(Object.hasOwn(skill, 'content'), false)
  const definition = await provider.get(skill, { cwd: projectRoot, signal: new AbortController().signal })
  assert.match(definition.content, /Review the supplied diff/)
})

test('does not shadow a name already visible in the global skill registry', async () => {
  let provider
  const agent = scopedAgent((value) => { provider = value; return () => {} })
  const rootContext = { skills: { list: async () => [{ name: 'review' }] } }
  const store = { loadProjectSettings: async () => ({ settings }) }
  await registerSkillsProvider(agent, rootContext, projectRoot, store)
  const result = await provider.list({ cwd: projectRoot, signal: new AbortController().signal })
  assert.equal(result.candidates.some(({ name }) => name === 'review'), false)
  assert.equal(result.candidates.some(({ name }) => name === 'front-review'), true)
})
