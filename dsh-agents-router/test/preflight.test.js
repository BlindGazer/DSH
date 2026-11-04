import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { extractFileOperation, fileBatch, projectPaths } from '../src/preflight.js'
import { matchInstructionRedirect, resolveInstructionDestination } from '../src/node/instruction-redirection.js'

const root = path.resolve('examples/demo-project')

test('preflights every supported file call in the assistant batch', () => {
  const agent = { session: { deriveMessages: () => [{
    role: 'assistant', content: [
      { type: 'tool-call', id: 'read-1', name: 'read', arguments: JSON.stringify({ file_path: 'src/a.ts' }) },
      { type: 'tool-call', id: 'write-1', name: 'write', arguments: JSON.stringify({ file_path: 'src/b.ts', content: 'x' }) },
      { type: 'tool-call', id: 'grep-1', name: 'grep', arguments: JSON.stringify({ pattern: 'x' }) },
    ],
  }] } }
  const batch = fileBatch(agent, { callId: 'read-1', name: 'read', arguments: { file_path: 'src/a.ts' } })
  assert.equal(batch.error, undefined)
  assert.deepEqual(batch.calls.map(({ callId }) => callId), ['read-1', 'write-1'])
  assert.deepEqual(batch.calls.map(({ paths }) => paths[0]), ['src/a.ts', 'src/b.ts'])
})

test('rejects malformed known file tools and missing batches', () => {
  assert.match(extractFileOperation('write', {}).error, /file_path/)
  assert.match(fileBatch({ session: { deriveMessages: () => [] } }, { callId: 'missing', name: 'read' }).error, /batch is unavailable/)
})

test('resolves relative and absolute paths within the bound project only', async () => {
  assert.deepEqual(await projectPaths(root, root, 'src/app.ts'), ['src/app.ts'])
  assert.deepEqual(await projectPaths(root, root, path.join(root, 'src', 'app.ts')), ['src/app.ts'])
  assert.deepEqual(await projectPaths(root, root, path.resolve(root, '..', 'other-project', 'app.ts')), [])
})

test('matches only enabled root names and selected root directories', () => {
  const settings = {
    redirectRootInstructionFiles: true,
    rootInstructionFileNames: ['AGENTS.md'],
    redirectInstructionDirectories: true,
    instructionDirectoryNames: ['.cursor', '.claude'],
  }
  assert.equal(matchInstructionRedirect(['AGENTS.md'], settings), 'AGENTS.md')
  assert.equal(matchInstructionRedirect(['src/AGENTS.md'], settings), undefined)
  assert.equal(matchInstructionRedirect(['.cursor/rules/example.mdc'], settings), 'rules/example.mdc')
  assert.equal(matchInstructionRedirect(['.unused/rules/example.mdc'], settings), undefined)
  assert.equal(matchInstructionRedirect(['agents/AGENTS.md'], settings), undefined)
  assert.equal(matchInstructionRedirect(['.cursor/rules/example.mdc', 'agents/rules/example.mdc'], settings), undefined)
  assert.equal(matchInstructionRedirect(['AGENTS.md'], { ...settings, redirectRootInstructionFiles: false }), undefined)
  assert.equal(matchInstructionRedirect(['.cursor/rules/example.mdc'], { ...settings, redirectInstructionDirectories: false }), undefined)
})

test('resolves only files inside the project agents directory', async () => {
  const project = await mkdtemp(path.join(tmpdir(), `dsh-router-redirect-${randomUUID()}-`))
  const agents = path.join(project, 'agents')
  try {
    await mkdir(path.join(agents, 'rules'), { recursive: true })
    const destination = path.join(agents, 'rules', 'example.mdc')
    await writeFile(destination, 'target content', 'utf8')
    assert.equal(await resolveInstructionDestination(project, 'rules/example.mdc'), await realpath(destination))
    await assert.rejects(resolveInstructionDestination(project, '../outside.md'), /safe project-relative path/)
    await assert.rejects(resolveInstructionDestination(project, path.join(path.parse(project).root, 'outside.md')), /safe project-relative path/)
    await assert.rejects(resolveInstructionDestination(project, 'missing.md'), { code: 'ENOENT' })
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('rejects a destination symlink that escapes agents', async (context) => {
  const temporary = await mkdtemp(path.join(tmpdir(), `dsh-router-redirect-link-${randomUUID()}-`))
  const project = path.join(temporary, 'project')
  const agents = path.join(project, 'agents')
  const outside = path.join(temporary, 'outside')
  const link = path.join(agents, 'linked')
  try {
    await mkdir(agents, { recursive: true })
    await mkdir(outside)
    await writeFile(path.join(outside, 'secret.md'), 'outside content', 'utf8')
    try { await symlink(outside, link, 'junction') }
    catch (error) {
      if (process.platform === 'win32' && ['EACCES', 'EPERM'].includes(error.code)) return context.skip('directory junctions are unavailable')
      throw error
    }
    await assert.rejects(resolveInstructionDestination(project, 'linked/secret.md'), /outside agents/)
  } finally {
    await rm(link, { recursive: true, force: true })
    await rm(temporary, { recursive: true, force: true })
  }
})
