import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createRouterHandler } from '../src/http.js'

function makeHandler() {
  const calls = []
  const handler = createRouterHandler({
    state: async (sessionId) => ({ sessionId }),
    globalSettings: async () => ({ settings: { locale: 'auto' } }),
    saveGlobalSettings: async (settings) => ({ ok: true, settings }),
    audit: async (sessionId) => ({ ok: true, text: `log:${sessionId}` }),
    deleteAudit: async (sessionId) => ({ ok: true, sessionId }),
    saveSettings: async (sessionId, settings) => ({ ok: true, sessionId, settings }),
    refresh: async (sessionId) => ({ ok: true, sessionId }),
    reset: async (sessionId) => ({ ok: true, sessionId }),
    diagnose: async (sessionId, filePath) => ({ ok: true, sessionId, filePath }),
    workset: async (...args) => { calls.push(args); return { ok: true } },
  })
  return { handler, calls }
}

async function request(handler, url, { method = 'GET', body, headers = {} } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]
  const req = Readable.from(chunks)
  req.url = url
  req.method = method
  req.headers = { host: 'localhost', ...headers }
  return new Promise((resolve) => {
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(text) { resolve({ status: this.statusCode, headers: this.headers, body: text ? JSON.parse(text) : undefined }) } }
    handler(req, response)
  })
}

test('serves state and validates mutating route bodies', async () => {
  const { handler, calls } = makeHandler()
  const state = await request(handler, '/agents-router/state?sessionId=s-1')
  assert.equal(state.status, 200)
  assert.deepEqual(state.body, { sessionId: 's-1' })
  assert.equal((await request(handler, '/agents-router/global-settings')).body.settings.locale, 'auto')
  assert.equal((await request(handler, '/agents-router/audit?sessionId=s-1')).body.text, 'log:s-1')
  const savedGlobal = await request(handler, '/agents-router/global-settings', { method: 'POST', body: { settings: { locale: 'ru' } } })
  assert.equal(savedGlobal.body.settings.locale, 'ru')
  const deleted = await request(handler, '/agents-router/audit/delete', { method: 'POST', body: { sessionId: 's-1' } })
  assert.equal(deleted.status, 200)

  const invalid = await request(handler, '/agents-router/workset', { method: 'POST', body: { sessionId: 's-1', action: 'bogus', path: 'src/a.js' } })
  assert.equal(invalid.status, 400)
  assert.deepEqual(calls, [])

  const badSettings = await request(handler, '/agents-router/settings', { method: 'POST', body: { sessionId: 's-1', settings: [] } })
  assert.equal(badSettings.status, 400)

  const added = await request(handler, '/agents-router/workset', { method: 'POST', body: { sessionId: 's-1', action: 'add', path: 'src/a.js' } })
  assert.equal(added.status, 200)
  assert.deepEqual(calls, [['s-1', 'add', 'src/a.js']])
})

test('rejects cross-origin calls and oversized or malformed JSON', async () => {
  const { handler } = makeHandler()
  const cross = await request(handler, '/agents-router/state?sessionId=s-1', { headers: { 'sec-fetch-site': 'cross-site' } })
  assert.equal(cross.status, 403)
  const foreignOrigin = await request(handler, '/agents-router/state?sessionId=s-1', { headers: { origin: 'http://attacker.example' } })
  assert.equal(foreignOrigin.status, 403)
  const oversized = await request(handler, '/agents-router/reset', { method: 'POST', body: `{"sessionId":"s-1","extra":"${'x'.repeat(65_536)}"}` })
  assert.equal(oversized.status, 413)
  const malformed = await request(handler, '/agents-router/reset', { method: 'POST', body: '{' })
  assert.equal(malformed.status, 400)
})
