import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { discoverProject, diagnosePath, loadSkillDefinition, selectRules } from '../src/discover.js'

const demo = path.resolve('examples/demo-project')

test('discovers global, nested area and native skill metadata', async () => {
  const snapshot = await discoverProject(demo)
  assert.equal(snapshot.areasConfigValid, true)
  assert.equal(snapshot.rules.length, 16)
  assert.equal(snapshot.areas.get('front').available, true)
  assert.equal(snapshot.areas.get('front/admin').available, true)
  assert.deepEqual(snapshot.skills.map(({ name }) => name), ['backend-patterns', 'front-review', 'frontend-style', 'review'])
  assert.equal(snapshot.skills.find(({ name }) => name === 'review').invocation.userInvocable, true)
})

test('requires an existing valid area config before instruction redirection is enabled', async () => {
  const project = await mkdtemp(path.join(tmpdir(), `dsh-router-area-config-${randomUUID()}-`))
  const config = path.join(project, 'agents', 'dsh', 'agents-router.json')
  try {
    await mkdir(path.dirname(config), { recursive: true })
    assert.equal((await discoverProject(project)).areasConfigValid, false)

    await writeFile(config, '{invalid', 'utf8')
    assert.equal((await discoverProject(project)).areasConfigValid, false)

    await writeFile(config, JSON.stringify({ areas: { invalid: { path: [] } } }), 'utf8')
    assert.equal((await discoverProject(project)).areasConfigValid, false)

    await writeFile(config, JSON.stringify({ areas: {} }), 'utf8')
    assert.equal((await discoverProject(project)).areasConfigValid, true)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('loads only the rules matching each file and the full area-parent chain', async () => {
  const snapshot = await discoverProject(demo)
  assert.deepEqual(selectRules(snapshot).map(({ sourcePath }) => sourcePath), [
    'agents/agents.md',
    'agents/rules/human-communication.md',
    'agents/rules/no-fancy-symbols.md',
    'agents/rules/ponytail.md',
  ])
  const frontRules = selectRules(snapshot, ['src/front/App.tsx', 'src/front/App.tsx'])
  const front = frontRules.map(({ sourcePath }) => sourcePath)
  assert.equal(new Set(front).size, front.length)
  assert.deepEqual(front, [
    'agents/agents.md',
    'agents/rules/human-communication.md',
    'agents/rules/no-fancy-symbols.md',
    'agents/rules/ponytail.md',
    'agents/rules/typescript.md',
    'agents/front/agents.md',
    'agents/front/rules/components.md',
    'agents/front/rules/front-rules.md',
  ])
  const admin = selectRules(snapshot, ['src/front/admin/Users.tsx']).map(({ sourcePath }) => sourcePath)
  assert.deepEqual(admin, [
    'agents/agents.md',
    'agents/rules/human-communication.md',
    'agents/rules/no-fancy-symbols.md',
    'agents/rules/ponytail.md',
    'agents/rules/typescript.md',
    'agents/front/agents.md',
    'agents/front/rules/components.md',
    'agents/front/rules/front-rules.md',
    'agents/front/admin/agents.md',
  ])
  assert.equal(selectRules(snapshot, ['src/api/Client.ts']).some(({ content }) => content.includes('must never be selected')), false)
  assert.equal(diagnosePath(snapshot, 'src/private/credentials.ts').find(({ rule }) => rule.sourcePath.endsWith('private.md')).applies, true)
})

test('routes paths through positive and negative area filters with precise diagnostics', async () => {
  const project = await mkdtemp(path.join(tmpdir(), `dsh-router-negation-${randomUUID()}-`))
  try {
    const agents = path.join(project, 'agents')
    await mkdir(path.join(agents, 'dsh'), { recursive: true })
    await mkdir(path.join(agents, 'front', 'rules'), { recursive: true })
    await mkdir(path.join(agents, 'back'), { recursive: true })
    await writeFile(path.join(agents, 'dsh', 'agents-router.json'), JSON.stringify({ areas: {
      front: { path: ['src/ClientApp/', 'src/Components/'] },
      back: { path: ['src/', '!src/ClientApp/', '!src/Components/'] },
    } }), 'utf8')
    await writeFile(path.join(agents, 'front', 'agents.md'), 'Frontend rules', 'utf8')
    await writeFile(path.join(agents, 'front', 'rules', 'exclude.md'), `---
path:
  - src/
  - !src/ClientApp/
---
Exclude client application files`, 'utf8')
    await writeFile(path.join(agents, 'back', 'agents.md'), 'Backend rules', 'utf8')
    const snapshot = await discoverProject(project)
    for (const [file, excludedBy] of [['src/ClientApp/index.tsx', '!src/ClientApp/'], ['src/Components/Button.tsx', '!src/Components/']]) {
      const selected = selectRules(snapshot, [file]).map(({ area }) => area)
      assert.ok(selected.includes('front'), file)
      assert.equal(selected.includes('back'), false, file)
      const diagnoses = diagnosePath(snapshot, file)
      assert.equal(diagnoses.find(({ rule }) => rule.area === 'back').reason, `excluded by area pattern ${excludedBy}`)
      if (file.includes('ClientApp')) {
        assert.equal(diagnoses.find(({ rule }) => rule.sourcePath.endsWith('exclude.md')).reason, 'excluded by rule pattern !src/ClientApp/')
      }
    }
    for (const file of ['src/Models/BulkUploadData.cs', 'src/Controllers/AuthController.cs']) {
      const selected = selectRules(snapshot, [file]).map(({ area }) => area)
      assert.ok(selected.includes('back'), file)
      assert.equal(selected.includes('front'), false, file)
    }

    await writeFile(path.join(agents, 'front', 'agents.md'), `---
path:
  - src/
  - !src/ClientApp/
  - src/ClientApp/shared/
---
Frontend shared rules`, 'utf8')
    const revised = await discoverProject(project)
    assert.ok(selectRules(revised, ['src/ClientApp/shared/types.ts']).some(({ area }) => area === 'front'))
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('skips one malformed rule while keeping the remaining project rules available', async () => {
  const project = await mkdtemp(path.join(tmpdir(), `dsh-router-discovery-${randomUUID()}-`))
  try {
    const rules = path.join(project, 'agents', 'rules')
    await mkdir(rules, { recursive: true })
    await writeFile(path.join(rules, 'valid.md'), 'Valid instruction', 'utf8')
    await writeFile(path.join(rules, 'invalid.md'), '---\ndescription: text: not quoted\n---\nInvalid instruction', 'utf8')
    const snapshot = await discoverProject(project)
    assert.deepEqual(snapshot.rules.map(({ sourcePath }) => sourcePath), ['agents/rules/valid.md'])
    assert.equal(snapshot.rulesComplete, true)
    assert.ok(snapshot.diagnostics.some(({ code, path: source }) => code === 'rule-file' && source === 'agents/rules/invalid.md'))
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('loads the full skill body only on native provider request', async () => {
  const snapshot = await discoverProject(demo)
  const skill = snapshot.skills.find(({ name }) => name === 'review')
  assert.equal(Object.hasOwn(skill, 'content'), false)
  const definition = await loadSkillDefinition(demo, {
    instructionsRoot: 'agents', rulesFolder: 'rules', skillsFolder: 'skills', mainFile: 'agents.md', tokenBudget: 16_000,
  }, { name: skill.name, sourcePath: skill.sourcePath })
  assert.match(definition.content, /Review the supplied diff/)
})

test('preserves skill metadata license, compatibility and allowed-tools', async () => {
  const project = await mkdtemp(path.join(tmpdir(), `dsh-router-metadata-${randomUUID()}-`))
  try {
    const skills = path.join(project, 'agents', 'skills', 'test-skill')
    await mkdir(skills, { recursive: true })
    await writeFile(path.join(skills, 'SKILL.md'), `---
name: test-skill
description: Test skill with metadata
license: MIT
compatibility: Requires Node.js 18+
allowed-tools: ["filesystem/write", "filesystem/read"]
---\nBody`, 'utf8')
    const snapshot = await discoverProject(project)
    const skill = snapshot.skills.find(({ name }) => name === 'test-skill')
    assert.ok(skill)
    assert.equal(skill.license, 'MIT')
    assert.equal(skill.compatibility, 'Requires Node.js 18+')
    assert.deepEqual(skill['allowed-tools'], ['filesystem/write', 'filesystem/read'])
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

