import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DEFAULT_PROJECT_SETTINGS } from '../src/config.js'
import { createPreflightHook } from '../src/node/preflight-hook.js'
import { filterRootInstructionMessages } from '../src/node/instruction-redirection.js'

async function createHarness({ settings = {}, configText = '{"areas":{}}' } = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), `dsh-router-hook-${randomUUID()}-`))
  await mkdir(path.join(projectRoot, 'agents', 'dsh'), { recursive: true })
  await mkdir(path.join(projectRoot, 'agents', 'rules'), { recursive: true })
  await mkdir(path.join(projectRoot, '.cursor', 'rules'), { recursive: true })
  await mkdir(path.join(projectRoot, '.claude', 'rules'), { recursive: true })
  await mkdir(path.join(projectRoot, '.other', 'rules'), { recursive: true })
  if (configText !== null) await writeFile(path.join(projectRoot, 'agents', 'dsh', 'agents-router.json'), configText, 'utf8')
  await writeFile(path.join(projectRoot, 'AGENTS.md'), 'private root content', 'utf8')
  await writeFile(path.join(projectRoot, 'agents', 'AGENTS.md'), 'isolated root content', 'utf8')
  await writeFile(path.join(projectRoot, '.cursor', 'rules', 'example.mdc'), 'private cursor content', 'utf8')
  await writeFile(path.join(projectRoot, '.claude', 'rules', 'example.mdc'), 'private claude content', 'utf8')
  await writeFile(path.join(projectRoot, '.other', 'rules', 'unmapped.mdc'), 'private unmapped content', 'utf8')
  await writeFile(path.join(projectRoot, 'agents', 'rules', 'example.mdc'), 'isolated directory content', 'utf8')

  const projectSettings = {
    ...DEFAULT_PROJECT_SETTINGS,
    mainFile: 'router.md',
    ...settings,
  }
  let savedSession = { activePaths: [] }
  let currentExec
  const agent = {
    id: 'agent-test',
    session: {
      id: 'session-test',
      deriveMessages: () => [{
        role: 'assistant',
        content: [{ type: 'tool-call', id: currentExec.callId, name: currentExec.name, arguments: JSON.stringify(currentExec.arguments) }],
      }],
    },
  }
  const store = {
    loadProjectSettings: async () => ({ settings: projectSettings }),
    loadSession: async () => ({ state: savedSession, warning: undefined }),
    updateSession: async (_id, _root, update) => {
      savedSession = update(savedSession)
      return { state: savedSession, warning: undefined }
    },
    markDiagnostics: async () => [],
    appendAuditLog: async () => true,
  }
  const ctx = {
    workingDirectory: { get: () => projectRoot },
    logger: { warn() {}, error() {} },
  }
  const state = {
    agent,
    sessionId: agent.session.id,
    projectRoot,
    settings: projectSettings,
    activePaths: [],
    blockedRoots: new Map(),
    runtimeDiagnostics: new Map(),
    forceEmptyWorkset: false,
  }
  const states = new Map([[agent.id, state]])
  const pendingFeedback = new Map()
  const hook = createPreflightHook(ctx, store, states, pendingFeedback)
  const run = async (name, filePath, activeHook = hook, next, freezeArguments = false) => {
    const arguments_ = { file_path: filePath }
    currentExec = { callId: randomUUID(), name, arguments: freezeArguments ? Object.freeze(arguments_) : arguments_, agent }
    return activeHook(currentExec, next ?? (() => readFile(currentExec.arguments.file_path, 'utf8')))
  }
  return { projectRoot, state, ctx, store, hook, run, pendingFeedback, dispose: () => rm(projectRoot, { recursive: true, force: true }) }
}

test('redirects matching root and nested directory reads before invoking the tool', async () => {
  const harness = await createHarness({ settings: {
    redirectRootInstructionFiles: true,
    rootInstructionFileNames: ['AGENTS.md'],
    redirectInstructionDirectories: true,
    instructionDirectoryNames: ['.cursor', '.claude'],
  } })
  try {
    assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md')), 'isolated root content')
    assert.equal(await harness.run('read', path.join(harness.projectRoot, '.cursor', 'rules', 'example.mdc')), 'isolated directory content')
    assert.equal(await harness.run('read', path.join(harness.projectRoot, '.claude', 'rules', 'example.mdc')), 'isolated directory content')
    assert.ok(harness.state.activePaths.includes('agents/AGENTS.md'))
    assert.ok(harness.state.activePaths.includes('agents/rules/example.mdc'))
  } finally {
    await harness.dispose()
  }
})

test('replaces frozen tool arguments when applying a redirect', async () => {
  const harness = await createHarness({ settings: {
    redirectRootInstructionFiles: true,
    rootInstructionFileNames: ['AGENTS.md'],
  } })
  try {
    assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'), harness.hook, undefined, true), 'isolated root content')
    assert.equal(await harness.run('read', 'AGENTS.md', harness.hook, undefined, true), 'isolated root content')
  } finally {
    await harness.dispose()
  }
})

test('filters only redirected root instruction sections and preserves message metadata', () => {
  const globalChange = { action: 'set', scope: 'user-global', path: '$DSH_HOME/AGENTS.md' }
  const rootChange = { action: 'set', scope: '.', path: 'AGENTS.md' }
  const nestedChange = { action: 'set', scope: 'src', path: 'src/AGENTS.md' }
  const autoMessage = {
    id: 'auto-instructions',
    role: 'user',
    content: [{ type: 'text', text: [
      '<system-reminder>',
      '',
      'Instructions from: $DSH_HOME/AGENTS.md',
      '',
      'global guidance',
      '',
      'Instructions from: AGENTS.md',
      '',
      'root guidance',
      '',
      'Instructions from: src/AGENTS.md',
      '',
      'nested guidance',
      '</system-reminder>',
    ].join('\n') }],
    source: { kind: 'agent-instructions', form: 'instructions', custom: 'kept', changes: [globalChange, rootChange, nestedChange] },
  }
  const unrelatedMessage = { id: 'unrelated', role: 'user', content: [{ type: 'text', text: 'other context' }], source: { kind: 'other' } }
  const filtered = filterRootInstructionMessages([autoMessage, unrelatedMessage], ['AGENTS.md'])

  assert.equal(filtered.length, 2)
  assert.equal(filtered[0].content[0].text.includes('root guidance'), false)
  assert.match(filtered[0].content[0].text, /nested guidance/)
  assert.match(filtered[0].content[0].text, /global guidance/)
  assert.deepEqual(filtered[0].source.changes, [globalChange, nestedChange])
  assert.equal(filtered[0].source.kind, 'agent-instructions')
  assert.equal(filtered[0].source.form, 'instructions')
  assert.equal(filtered[0].source.custom, 'kept')
  assert.equal(filtered[1], unrelatedMessage)
  assert.deepEqual(filterRootInstructionMessages([{ ...autoMessage, content: [{ type: 'text', text: 'unrecognized format with root guidance' }] }], ['AGENTS.md']), [])
})

test('redirects selected instruction directories with frozen arguments only once', async () => {
  const harness = await createHarness({ settings: {
    redirectInstructionDirectories: true,
    instructionDirectoryNames: ['.cursor', '.claude'],
  } })
  try {
    const cursor = path.join(harness.projectRoot, '.cursor', 'rules', 'example.mdc')
    const claude = path.join(harness.projectRoot, '.claude', 'rules', 'example.mdc')
    assert.equal(await harness.run('read', cursor, harness.hook, undefined, true), 'isolated directory content')
    assert.equal(await harness.run('read', claude, harness.hook, undefined, true), 'isolated directory content')
    assert.equal(harness.state.activePaths.filter((item) => item === 'agents/rules/example.mdc').length, 1)
    assert.equal(await harness.run('read', path.join(harness.projectRoot, '.other', 'rules', 'unmapped.mdc'), harness.hook, undefined, true), 'private unmapped content')
    assert.equal(await harness.run('read', path.join(harness.projectRoot, 'agents', 'rules', 'example.mdc'), harness.hook, undefined, true), 'isolated directory content')
  } finally {
    await harness.dispose()
  }
})

test('does not redirect disabled, unmatched, or already isolated reads', async () => {
  const settingsOff = await createHarness()
  try {
    assert.equal(await settingsOff.run('read', path.join(settingsOff.projectRoot, 'AGENTS.md')), 'private root content')
  } finally {
    await settingsOff.dispose()
  }

  const harness = await createHarness({ settings: {
    redirectRootInstructionFiles: true,
    rootInstructionFileNames: ['AGENTS.md'],
    redirectInstructionDirectories: true,
    instructionDirectoryNames: ['.cursor', '.claude'],
  } })
  try {
    assert.equal(await harness.run('read', path.join(harness.projectRoot, '.other', 'rules', 'unmapped.mdc')), 'private unmapped content')
    assert.equal(await harness.run('read', path.join(harness.projectRoot, 'agents', 'AGENTS.md')), 'isolated root content')
    assert.equal(await harness.run('read_image', path.join(harness.projectRoot, 'AGENTS.md')), 'private root content')
    const inactiveHook = createPreflightHook(harness.ctx, harness.store, new Map(), harness.pendingFeedback)
    assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'), inactiveHook), 'private root content')
  } finally {
    await harness.dispose()
  }
})

test('denies a matching read when its destination is missing without reading the source', async () => {
  const harness = await createHarness({ settings: {
    redirectRootInstructionFiles: true,
    rootInstructionFileNames: ['AGENTS.md'],
  } })
  try {
    await rm(path.join(harness.projectRoot, 'agents', 'AGENTS.md'))
    const result = await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'))
    assert.equal(result.kind, 'deny')
    assert.match(result.reason, /could not safely redirect/)
    assert.equal(result.reason.includes('private root content'), false)
  } finally {
    await harness.dispose()
  }
})

test('denies a matching read when its destination symlink escapes agents', async (context) => {
  const harness = await createHarness({ settings: {
    redirectInstructionDirectories: true,
    instructionDirectoryNames: ['.cursor'],
  } })
  const link = path.join(harness.projectRoot, 'agents', 'rules', 'linked')
  try {
    const sourceDirectory = path.join(harness.projectRoot, '.cursor', 'rules', 'linked')
    const outsideDirectory = path.join(harness.projectRoot, 'outside-rules')
    await mkdir(sourceDirectory, { recursive: true })
    await mkdir(outsideDirectory)
    await writeFile(path.join(sourceDirectory, 'secret.mdc'), 'private source content', 'utf8')
    await writeFile(path.join(outsideDirectory, 'secret.mdc'), 'outside destination content', 'utf8')
    try { await symlink(outsideDirectory, link, 'junction') }
    catch (error) {
      if (process.platform === 'win32' && ['EACCES', 'EPERM'].includes(error.code)) return context.skip('directory junctions are unavailable')
      throw error
    }
    let nextCalls = 0
    const result = await harness.run('read', path.join(sourceDirectory, 'secret.mdc'), harness.hook, () => { nextCalls++; return 'private source content' })
    assert.equal(result.kind, 'deny')
    assert.equal(nextCalls, 0)
    assert.equal(result.reason.includes('private source content'), false)
  } finally {
    await rm(link, { recursive: true, force: true })
    await harness.dispose()
  }
})

test('keeps the original read when the area configuration is missing or invalid and reports a warning', async () => {
  for (const configText of [null, '{invalid']) {
    const harness = await createHarness({
      settings: { redirectRootInstructionFiles: true, rootInstructionFileNames: ['AGENTS.md'] },
      configText,
    })
    try {
      assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md')), 'private root content')
      assert.ok([...harness.state.runtimeDiagnostics.values()].some(({ code }) => code === 'instruction-redirection-config'))
    } finally {
      await harness.dispose()
    }
  }
})
