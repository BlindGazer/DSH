import { createProviderProxyController } from './controller.js'
import { registerHttpRoutes } from './http-routes.js'

export const name = 'kalex-provider-proxy'

export function apply(ctx, config = {}) {
  const controller = createProviderProxyController({ ctx, initialConfig: config })
  controller.installFetchInterceptor()
  controller.refreshRouting().catch((error) => {
    ctx.logger?.warn?.(`[${name}] Initial routing refresh failed: ${error?.message || error}`)
  })

  if (typeof ctx.on === 'function') {
    ctx.on('loader/volatile-update', () => { controller.refreshRouting().catch(() => {}) })
    ctx.on('llm/adapters-updated', () => { controller.refreshRouting().catch(() => {}) })
  }
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => { controller.dispose().catch(() => {}) })
  }
  registerHttpRoutes(ctx, controller)
}

export { createProviderProxyController } from './controller.js'
export {
  BUILTIN_PROVIDER_ENDPOINTS,
  compileRoutingTable,
  discoverProviders,
  extractHost,
  resolveProviderHosts,
  sanitizeHostInput,
} from './providers.js'
export { encryptAuthSecret, decryptAuthSecret, maskUsername, encryptWithPassphrase, decryptWithPassphrase } from './crypto-store.js'
export {
  normalizeProfile,
  normalizeProxyConfig,
  sanitizeConfigForClient,
} from './config-normalizer.js'
export {
  checkTcpReachability,
  createProfileDispatcher,
  DispatcherManager,
  establishSocks5Tunnel,
  testProxyConnection,
} from './dispatcher.js'
