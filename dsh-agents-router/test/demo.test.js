import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { DEFAULT_PROJECT_SETTINGS } from '../src/config.js'
import { discoverProject, selectRules } from '../src/discover.js'

const demoRoot = fileURLToPath(new URL('../examples/demo-project/', import.meta.url))

test('demo routes inherited, filtered, private and enabled-area rules', async () => {
  const snapshot = await discoverProject(demoRoot, DEFAULT_PROJECT_SETTINGS)
  assert.equal(snapshot.rulesComplete, true)
  assert.deepEqual(snapshot.skills.map((skill) => skill.name), ['backend-patterns', 'front-review', 'frontend-style', 'review'])

  const frontend = selectRules(snapshot, ['src/front/components/AccessibleButton.tsx']).map((rule) => rule.sourcePath)
  assert.ok(frontend.includes('agents/agents.md'))
  assert.ok(frontend.includes('agents/rules/typescript.md'))
  assert.ok(frontend.includes('agents/front/agents.md'))
  assert.ok(frontend.includes('agents/front/rules/components.md'))

  const admin = selectRules(snapshot, ['src/front/admin/permissions.ts']).map((rule) => rule.sourcePath)
  assert.ok(admin.includes('agents/front/admin/agents.md'))
  const privateFile = selectRules(snapshot, ['src/private/config.ts']).map((rule) => rule.sourcePath)
  assert.ok(privateFile.includes('agents/rules/private.md'))
  const backend = selectRules(snapshot, ['src/api/health.ts']).map((rule) => rule.area)
  assert.ok(backend.includes('back'))
})
