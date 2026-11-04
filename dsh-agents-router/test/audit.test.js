import test from 'node:test'
import assert from 'node:assert/strict'
import { recordAudit, shouldSkipBatchAudit } from '../src/node/audit-logger.js'

const state = () => ({
  settings: { logCategories: { events: true, workset: true, rulesDiff: true, preflight: true } },
  projectRoot: 'project', sessionId: 'session', rules: [{
    sourcePath: 'agents/always.md', hash: '123456789', area: 'global', path: [], appliesTo: ['always'], content: 'instruction',
  }],
  text: 'rendered rules', areaText: '', auditRules: new Map(), lastLoggedDiagKeys: new Set(),
})

test('prompt assembly skips unchanged audit snapshots and repeated diagnostics', async () => {
  const entries = []
  const store = { appendAuditLog: async (_root, _session, text) => { entries.push(text); return true } }
  const current = state()
  await recordAudit(current, store, { event: 'session_init', diagnostics: [{ key: 'warning-1', code: 'test' }] })
  assert.equal(await recordAudit(current, store, { event: 'prompt_assemble', diagnostics: [{ key: 'warning-1', code: 'test' }] }), false)
  assert.equal(entries.length, 1)
  assert.equal(await recordAudit(current, store, { event: 'prompt_assemble', diagnostics: [{ key: 'warning-2', code: 'new' }] }), true)
  assert.equal(entries.length, 2)
  assert.match(entries[1], /warnings: 1 \[new\]/)
})

test('batch audit suppression only skips already logged clean batches', () => {
  const current = { lastLoggedBatchKey: 'read-1|read-2' }
  assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], [], undefined), true)
  assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', ['src/new.ts'], [], undefined), false)
  assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], [{ sourcePath: 'rules/new.md' }], undefined), false)
  assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], [], 'invalid batch'), false)
  assert.equal(shouldSkipBatchAudit(current, 'new-batch', [], [], undefined), false)
})

test('audit diffs summarize unchanged rules and successful batches', async () => {
  const entries = []
  const store = { appendAuditLog: async (_root, _session, text) => { entries.push(text); return true } }
  const current = state()
  await recordAudit(current, store, { event: 'session_init' })
  await recordAudit(current, store, { event: 'file_preflight tool="read" (+0 paths)', batchKey: 'call-1' })
  assert.equal(current.lastLoggedBatchKey, 'call-1')
  assert.match(entries[1], /unchanged: 1 \(1 always, 0 matched\) \| evicted: 0 \| rev_changed: 0/)
  assert.doesNotMatch(entries[1], /agents\/always\.md @12345678/)
})
