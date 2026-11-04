import { PREFIX } from '../shared/constants.js'

const MAX_BODY = 64 * 1024

export function createRouterHandler(actions) {
  return (req, res) => {
    if (!sameOrigin(req)) return send(res, 403, { error: 'cross-origin request denied' })
    void dispatch(req, res, actions).catch((error) => {
      if (!res.headersSent) send(res, 500, { error: error.message })
    })
  }
}

async function dispatch(req, res, actions) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(`${PREFIX}/`)) return send(res, 404, { error: 'not found' })
  const route = url.pathname.slice(PREFIX.length)
  if (route === '/global-settings' && req.method === 'GET') return send(res, 200, await actions.globalSettings())
  if (route === '/state' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return send(res, 400, { error: 'sessionId is required' })
    const result = await actions.state(sessionId)
    return result?.ok === false ? sendResult(res, result) : send(res, 200, result)
  }
  if (route === '/audit' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return send(res, 400, { error: 'sessionId is required' })
    return sendResult(res, await actions.audit(sessionId))
  }
  if (!['/settings', '/refresh', '/reset', '/diagnose', '/workset', '/global-settings', '/audit/delete'].includes(route)) return send(res, 404, { error: 'not found' })
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  const parsed = await readJson(req)
  if (!parsed.ok) return send(res, parsed.status, { error: parsed.error })
  const body = parsed.value
  if (route === '/global-settings') {
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) return send(res, 400, { error: 'settings must be a JSON object' })
    return sendResult(res, await actions.saveGlobalSettings(body.settings))
  }
  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0) return send(res, 400, { error: 'sessionId is required' })
  if (route === '/audit/delete') return sendResult(res, await actions.deleteAudit(body.sessionId))
  if (route === '/settings') {
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) return send(res, 400, { error: 'settings must be a JSON object' })
    return sendResult(res, await actions.saveSettings(body.sessionId, body.settings))
  }
  if (route === '/refresh') return sendResult(res, await actions.refresh(body.sessionId))
  if (route === '/reset') return sendResult(res, await actions.reset(body.sessionId))
  if (route === '/diagnose') {
    if (typeof body.path !== 'string' || body.path.trim() === '') return send(res, 400, { error: 'path is required' })
    return sendResult(res, await actions.diagnose(body.sessionId, body.path))
  }
  if (!['add', 'release'].includes(body.action) || typeof body.path !== 'string' || body.path.trim() === '') {
    return send(res, 400, { error: 'workset action and path are required' })
  }
  return sendResult(res, await actions.workset(body.sessionId, body.action, body.path))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  try {
    for await (const chunk of req) {
      size += chunk.length
      if (size > MAX_BODY) return { ok: false, status: 413, error: 'request body too large' }
      chunks.push(chunk)
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, status: 400, error: 'request body must be a JSON object' }
    return { ok: true, value }
  } catch {
    return { ok: false, status: 400, error: 'invalid JSON request body' }
  }
}

function sameOrigin(req) {
  const site = req.headers?.['sec-fetch-site']
  if (site === 'cross-site') return false
  const origin = req.headers?.origin
  if (typeof origin !== 'string') return true
  try { return new URL(origin).host === req.headers.host }
  catch { return false }
}

function sendResult(res, result) {
  return send(res, result?.ok === false ? result.status ?? 400 : 200, result?.ok === false ? { error: result.error } : result)
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}
