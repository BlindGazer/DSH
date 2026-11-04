import { randomBytes } from 'node:crypto'

export function extractTargetUrlString(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input && typeof input === 'object' && typeof input.url === 'string') return input.url
  return null
}

export function writeJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      const buffer = Buffer.from(chunk)
      total += buffer.length
      if (total > 128 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(buffer)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim()
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export function isSameOriginBrowserRequest(req) {
  const site = req.headers?.['sec-fetch-site']
  if (site && site !== 'same-origin' && site !== 'none') return false
  const userAgent = req.headers?.['user-agent'] || ''
  if (/PowerShell|curl\/|Wget\/|python-requests|node-fetch|undici/i.test(userAgent)) return false
  if (!site && !userAgent.includes('Mozilla/') && req.headers?.['x-kpp-client'] !== 'dsh-web-ui') return false
  const origin = req.headers?.origin
  if (typeof origin === 'string') {
    try {
      if (new URL(origin).host !== req.headers.host) return false
    } catch {
      return false
    }
  }
  return true
}

export function registerHttpRoutes(ctx, controller) {
  let activeGuiToken = null
  let lastHeartbeatAt = 0
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'prefix',
      path: '/api/kalex-provider-proxy',
      handler: async (req, res) => {
        if (!isSameOriginBrowserRequest(req)) {
          writeJson(res, 403, { ok: false, error: 'Forbidden: access restricted to DSH Web GUI' })
          return
        }

        const url = new URL(req.url ?? '/', 'http://dsh.internal')
        const action = url.pathname.replace(/^\/api\/kalex-provider-proxy\/?/, '')
        const now = Date.now()
        try {
          if (action === 'session' && req.method === 'POST') {
            const body = await readJsonBody(req)
            if (body?.action === 'release') {
              activeGuiToken = null
              lastHeartbeatAt = 0
              writeJson(res, 200, { ok: true })
              return
            }
            if (!activeGuiToken) activeGuiToken = randomBytes(24).toString('hex')
            lastHeartbeatAt = now
            writeJson(res, 200, { ok: true, token: activeGuiToken })
            return
          }

          // Accept a same-origin Electron GUI request after a hot reload without a browser refresh.
          const reqToken = req.headers?.['x-kpp-token']
          if (reqToken && !activeGuiToken) activeGuiToken = String(reqToken)
          lastHeartbeatAt = now

          if (action === 'state' && req.method === 'GET') {
            writeJson(res, 200, { ok: true, ...await controller.refreshRouting() })
            return
          }
          if (action === 'config' && req.method === 'POST') {
            writeJson(res, 200, { ok: true, ...await controller.updateConfig(await readJsonBody(req)) })
            return
          }
          if (action === 'export' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await readJsonBody(req) : {}
            writeJson(res, 200, { ok: true, exportData: controller.exportConfig(body) })
            return
          }
          if (action === 'import' && req.method === 'POST') {
            writeJson(res, 200, { ok: true, ...await controller.importConfig(await readJsonBody(req)) })
            return
          }
          if (action === 'bind' && req.method === 'POST') {
            const body = await readJsonBody(req)
            if (!body || typeof body.providerId !== 'string') {
              writeJson(res, 400, { ok: false, error: 'providerId is required' })
              return
            }
            writeJson(res, 200, { ok: true, ...await controller.bindProvider(body.providerId, body.profileId ?? null) })
            return
          }
          if (action === 'test' && req.method === 'POST') {
            const body = await readJsonBody(req)
            const rawCandidate = { id: body?.profile?.id || 'test-profile', name: body?.profile?.name || 'Test Profile', ...body?.profile }
            const profile = controller.resolveProfileWithSecrets(rawCandidate)
            if (!profile) {
              writeJson(res, 400, { ok: false, tcpOk: false, httpOk: false, error: 'Valid proxy host and port (1-65535) are required' })
              return
            }
            writeJson(res, 200, await controller.testConnection(profile, body?.testUrl))
            return
          }
          writeJson(res, 404, { ok: false, error: `Unknown endpoint "${action}"` })
        } catch (error) {
          writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    }))
  })
}
