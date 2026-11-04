import { getOrCreateMasterKey } from './crypto-store.js'
import { exportConfig as exportConfigData, importConfig as importConfigData, normalizeProfile, normalizeProxyConfig, sanitizeConfigForClient } from './config-normalizer.js'
import { loadConfigFromDisk, resolveStoragePath, saveConfigToDisk } from './storage.js'
import { extractTargetUrlString } from './http-routes.js'
import { compileRoutingTable, discoverProviders } from './providers.js'
import { DispatcherManager, dispatchWithUndiciFetch, testProxyConnection } from './dispatcher.js'

/** Creates the proxy state controller and safely installs selective fetch routing. */
export function createProviderProxyController(options = {}) {
  const {
    ctx = null,
    initialConfig = {},
    storagePath = resolveStoragePath(options.storagePath),
    masterKeyPath = options.masterKeyPath,
    extraProviders = {},
    fetchTarget = globalThis,
  } = options

  const masterKey = getOrCreateMasterKey(masterKeyPath)
  let currentConfig = loadConfigFromDisk(storagePath, initialConfig, masterKey)
  let cachedProviders = []
  let compiled = compileRoutingTable([], currentConfig)
  const dispatcherManager = new DispatcherManager()
  const initialFetch = fetchTarget.fetch
  let underlyingFetch = initialFetch
  let interceptorInstalled = false

  async function refreshRouting() {
    cachedProviders = await discoverProviders(ctx, extraProviders)
    compiled = compileRoutingTable(cachedProviders, currentConfig)
    await dispatcherManager.syncProfiles(currentConfig.profiles)
    return getStateSnapshot()
  }

  function getStateSnapshot() {
    return { config: sanitizeConfigForClient(currentConfig), providers: cachedProviders, conflicts: compiled.conflicts, routes: compiled.routes }
  }

  function mergeWithExistingSecrets(nextRawConfig) {
    if (!nextRawConfig || typeof nextRawConfig !== 'object') return nextRawConfig
    const existingById = new Map((currentConfig.profiles || []).map((profile) => [profile.id, profile]))
    const mergedProfiles = Array.isArray(nextRawConfig.profiles)
      ? nextRawConfig.profiles.map((incoming) => {
          if (!incoming || typeof incoming !== 'object') return incoming
          const previous = existingById.get(incoming.id)
          if (!previous) return incoming
          const incomingUser = typeof incoming.auth?.username === 'string' ? incoming.auth.username.trim() : ''
          const incomingPass = typeof incoming.auth?.password === 'string' ? incoming.auth.password : ''
          const keepExisting = Boolean(incoming.auth?.enabled) && !incomingUser && !incomingPass && incoming.auth?.clearCredentials !== true
          if (keepExisting && (previous.auth?.username || previous.auth?.password)) {
            return { ...incoming, auth: { enabled: Boolean(incoming.auth?.enabled), username: previous.auth.username, password: previous.auth.password } }
          }
          return incoming
        })
      : []
    return { ...nextRawConfig, profiles: mergedProfiles }
  }

  async function updateConfig(nextRawConfig) {
    currentConfig = normalizeProxyConfig(mergeWithExistingSecrets(nextRawConfig), masterKey)
    saveConfigToDisk(storagePath, currentConfig, masterKey)
    return refreshRouting()
  }

  async function bindProvider(providerId, profileId) {
    return updateConfig({
      ...currentConfig,
      providerBindings: { ...currentConfig.providerBindings, [providerId]: profileId || null },
    })
  }

  function exportConfig(options = {}) {
    return exportConfigData(currentConfig, options)
  }

  async function importConfig(rawInput, passwordArg = '') {
    return importConfigData(rawInput, passwordArg, { currentConfig, updateConfig })
  }

  function resolveProfileWithSecrets(rawProfile) {
    const merged = mergeWithExistingSecrets({ profiles: [rawProfile] })
    return normalizeProfile(merged.profiles?.[0], masterKey)
  }

  function resolveProfileForUrl(rawUrl) {
    const urlString = extractTargetUrlString(rawUrl)
    if (!urlString) return null
    try {
      const parsed = new URL(urlString)
      const host = parsed.host.toLowerCase()
      const hostname = parsed.hostname.toLowerCase()
      return compiled.hostToProfile.get(host) ?? compiled.hostToProfile.get(hostname) ?? null
    } catch {
      return null
    }
  }

  async function wrappedFetch(input, init) {
    if (init && typeof init === 'object' && init.dispatcher) return underlyingFetch.call(fetchTarget, input, init)
    const profile = resolveProfileForUrl(input)
    if (!profile) return underlyingFetch.call(fetchTarget, input, init)
    const dispatcher = await dispatcherManager.getDispatcher(profile)
    return dispatchWithUndiciFetch(input, init, dispatcher)
  }

  function installFetchInterceptor() {
    if (typeof initialFetch !== 'function' || interceptorInstalled) return
    interceptorInstalled = true
    try {
      // Keep the router as the outer wrapper while allowing later fetch plugins to chain beneath it.
      Object.defineProperty(fetchTarget, 'fetch', {
        configurable: true,
        enumerable: true,
        get() { return wrappedFetch },
        set(nextFn) { if (typeof nextFn === 'function' && nextFn !== wrappedFetch) underlyingFetch = nextFn },
      })
    } catch {
      fetchTarget.fetch = wrappedFetch
    }
  }

  async function dispose() {
    if (interceptorInstalled) {
      interceptorInstalled = false
      try {
        Object.defineProperty(fetchTarget, 'fetch', { configurable: true, enumerable: true, writable: true, value: initialFetch })
      } catch {
        fetchTarget.fetch = initialFetch
      }
    }
    await dispatcherManager.closeAll()
  }

  return {
    get config() { return sanitizeConfigForClient(currentConfig) },
    originalFetch: initialFetch,
    refreshRouting,
    getStateSnapshot,
    updateConfig,
    bindProvider,
    exportConfig,
    importConfig,
    resolveProfileWithSecrets,
    resolveProfileForUrl,
    installFetchInterceptor,
    dispose,
    testConnection: (profile, testUrl) => {
      const hydrated = resolveProfileWithSecrets(profile) || profile
      return testProxyConnection(hydrated, testUrl || currentConfig.defaultTestUrl)
    },
  }
}
