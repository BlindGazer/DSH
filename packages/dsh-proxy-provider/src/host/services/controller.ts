import type {
    DiscoveredProvider,
    ExportedProxyConfigPayload,
    ProxyProfile,
    ProxyStateSnapshot,
    SanitizedProxyConfig,
    TestConnectionResult
} from '../../shared/models/ProxyModels.js';
import type {
    MasterKeyProvider,
    ProfileDispatcherLifecycle,
    ProxyConfigStorage,
    RawConfigCandidate,
    RawProfileCandidate
} from '../models/ProxyServiceContracts.js';
import {
    exportConfig as exportConfigData,
    importConfig as importConfigData,
    normalizeProfile,
    normalizeProxyConfig,
    sanitizeConfigForClient
} from './configNormalizer.js';
import { dispatchWithUndiciFetch, type RequestLikeInput, testProxyConnection } from './connectionTest.js';
import { fileMasterKeyProvider } from './cryptoStore.js';
import { DispatcherManager } from './profileDispatcher.js';
import { discoverProviders, type HostDiscoveryContext, type ProviderInfoCandidate } from './providerDiscovery.js';
import { compileRoutingTable } from './providerRouting.js';
import { fileProxyConfigStorage, resolveStoragePath } from './storage.js';

function extractTargetUrlString(input: string | URL | { readonly url?: string } | undefined | null): string | null {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input && typeof input === 'object' && typeof input.url === 'string') return input.url;
    return null;
}

/**
 * Контракт контроллера состояния и маршрутизации прокси-серверов.
 */
export interface ProviderProxyController {
    readonly config: SanitizedProxyConfig;
    readonly originalFetch: typeof fetch;
    refreshRouting(): Promise<ProxyStateSnapshot>;
    getStateSnapshot(): ProxyStateSnapshot;
    updateConfig(config: RawConfigCandidate): Promise<ProxyStateSnapshot>;
    bindProvider(providerId: string, profileId: string | null): Promise<ProxyStateSnapshot>;
    exportConfig(options?: { readonly includeCredentials?: boolean; readonly password?: string }): ExportedProxyConfigPayload;
    importConfig(payload: RawConfigCandidate, password?: string): Promise<ProxyStateSnapshot>;
    resolveProfileWithSecrets(profile: RawProfileCandidate): ProxyProfile | null;
    resolveProfileForUrl(input: string | URL | { readonly url?: string } | undefined | null): ProxyProfile | null;
    installFetchInterceptor(): void;
    dispose(): Promise<void>;
    testConnection(profile: ProxyProfile, testUrl?: string): Promise<TestConnectionResult>;
}

export interface ControllerOptions {
    readonly ctx?: HostDiscoveryContext | null;
    readonly initialConfig?: RawConfigCandidate;
    readonly storagePath?: string;
    readonly masterKeyPath?: string;
    readonly extraProviders?: Record<string, ProviderInfoCandidate>;
    readonly fetchTarget?: { fetch: typeof fetch };
    readonly configStorage?: ProxyConfigStorage;
    readonly masterKeyProvider?: MasterKeyProvider;
    readonly dispatcherManager?: ProfileDispatcherLifecycle;
}

/**
 * Создает контроллер проксирования провайдеров и устанавливает селективный перехватчик fetch.
 */
export function createProviderProxyController(options: ControllerOptions = {}): ProviderProxyController {
    const {
        ctx = null,
        initialConfig = {},
        storagePath = resolveStoragePath(options.storagePath),
        masterKeyPath = options.masterKeyPath,
        extraProviders = {},
        fetchTarget = globalThis,
        configStorage = fileProxyConfigStorage,
        masterKeyProvider = fileMasterKeyProvider,
        dispatcherManager = new DispatcherManager()
    } = options;

    const masterKey = masterKeyProvider.getOrCreate(masterKeyPath);
    let currentConfig = configStorage.load(storagePath, initialConfig, masterKey);
    let cachedProviders: DiscoveredProvider[] = [];
    let compiled = compileRoutingTable([], currentConfig);
    const initialFetch = fetchTarget.fetch;
    let underlyingFetch = initialFetch;
    let interceptorInstalled = false;

    async function refreshRouting(): Promise<ProxyStateSnapshot> {
        cachedProviders = await discoverProviders(ctx, extraProviders);
        compiled = compileRoutingTable(cachedProviders, currentConfig);
        await dispatcherManager.syncProfiles(currentConfig.profiles);
        return getStateSnapshot();
    }

    function getStateSnapshot(): ProxyStateSnapshot {
        return {
            config: sanitizeConfigForClient(currentConfig),
            providers: cachedProviders,
            conflicts: compiled.conflicts,
            routes: compiled.routes
        };
    }

    function mergeWithExistingSecrets(nextRawConfig: RawConfigCandidate): RawConfigCandidate {
        if (!nextRawConfig || typeof nextRawConfig !== 'object') return nextRawConfig;
        const existingById = new Map((currentConfig.profiles || []).map(profile => [profile.id, profile]));
        const mergedProfiles: RawProfileCandidate[] = Array.isArray(nextRawConfig.profiles)
            ? nextRawConfig.profiles.map(incoming => {
                  if (!incoming || typeof incoming !== 'object' || !incoming.id) return incoming;
                  const previous = existingById.get(incoming.id);
                  if (!previous) return incoming;
                  const incomingUser = typeof incoming.auth?.username === 'string' ? incoming.auth.username.trim() : '';
                  const incomingPass = typeof incoming.auth?.password === 'string' ? incoming.auth.password : '';
                  const keepExisting =
                      Boolean(incoming.auth?.enabled) && !incomingUser && !incomingPass && incoming.auth?.clearCredentials !== true;
                  if (keepExisting && (previous.auth?.username || previous.auth?.password)) {
                      return {
                          ...incoming,
                          auth: {
                              enabled: Boolean(incoming.auth?.enabled),
                              username: previous.auth.username,
                              password: previous.auth.password
                          }
                      };
                  }
                  return incoming;
              })
            : [];
        return { ...nextRawConfig, profiles: mergedProfiles };
    }

    async function updateConfig(nextRawConfig: RawConfigCandidate): Promise<ProxyStateSnapshot> {
        currentConfig = normalizeProxyConfig(mergeWithExistingSecrets(nextRawConfig), masterKey);
        configStorage.save(storagePath, currentConfig, masterKey);
        return refreshRouting();
    }

    async function bindProvider(providerId: string, profileId: string | null): Promise<ProxyStateSnapshot> {
        const providerBindings = { ...currentConfig.providerBindings };
        if (profileId) {
            providerBindings[providerId] = profileId;
        } else {
            delete providerBindings[providerId];
            if (providerId === 'deepseek-official') delete providerBindings.deepseek;
            if (providerId === 'deepseek') delete providerBindings['deepseek-official'];
        }
        return updateConfig({ ...currentConfig, providerBindings });
    }

    function exportConfig(opts: { readonly includeCredentials?: boolean; readonly password?: string } = {}): ExportedProxyConfigPayload {
        return exportConfigData(currentConfig, opts);
    }

    async function importConfig(rawInput: RawConfigCandidate, passwordArg = ''): Promise<ProxyStateSnapshot> {
        return importConfigData(rawInput, passwordArg, { currentConfig, updateConfig });
    }

    function resolveProfileWithSecrets(rawProfile: RawProfileCandidate): ProxyProfile | null {
        const merged = mergeWithExistingSecrets({ profiles: [rawProfile] });
        return normalizeProfile(merged.profiles?.[0], masterKey);
    }

    function resolveProfileForUrl(rawUrl: string | URL | { readonly url?: string } | undefined | null): ProxyProfile | null {
        const urlString = extractTargetUrlString(rawUrl);
        if (!urlString) return null;
        try {
            const parsed = new URL(urlString);
            const host = parsed.host.toLowerCase();
            const hostname = parsed.hostname.toLowerCase();
            return compiled.hostToProfile.get(host) ?? compiled.hostToProfile.get(hostname) ?? null;
        } catch {
            return null;
        }
    }

    async function wrappedFetch(input: RequestInfo | URL, init?: RequestInit & { readonly dispatcher?: object }): Promise<Response> {
        if (init && typeof init === 'object' && init.dispatcher) {
            return underlyingFetch.call(fetchTarget, input, init);
        }
        const profile = resolveProfileForUrl(input as string | URL | { readonly url?: string });
        if (!profile) {
            return underlyingFetch.call(fetchTarget, input, init);
        }
        const dispatcher = await dispatcherManager.getDispatcher(profile);
        return dispatchWithUndiciFetch(
            input as string | URL | RequestLikeInput,
            init as Record<string, object | string | undefined> | undefined,
            dispatcher
        );
    }

    function installFetchInterceptor(): void {
        if (typeof initialFetch !== 'function' || interceptorInstalled) return;
        interceptorInstalled = true;
        try {
            Object.defineProperty(fetchTarget, 'fetch', {
                configurable: true,
                enumerable: true,
                get() {
                    return wrappedFetch;
                },
                set(nextFn: typeof fetch) {
                    if (typeof nextFn === 'function' && nextFn !== (wrappedFetch as typeof fetch)) {
                        underlyingFetch = nextFn;
                    }
                }
            });
        } catch {
            fetchTarget.fetch = wrappedFetch as typeof fetch;
        }
    }

    async function dispose(): Promise<void> {
        if (interceptorInstalled) {
            interceptorInstalled = false;
            const installedFetch = wrappedFetch as typeof fetch;
            if (fetchTarget.fetch === installedFetch) {
                try {
                    Object.defineProperty(fetchTarget, 'fetch', {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: underlyingFetch
                    });
                } catch {
                    fetchTarget.fetch = underlyingFetch;
                }
            }
        }
        await dispatcherManager.closeAll();
    }

    return {
        get config() {
            return sanitizeConfigForClient(currentConfig);
        },
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
        testConnection: (profile: ProxyProfile, testUrl?: string) => {
            const hydrated = resolveProfileWithSecrets(profile) || profile;
            return testProxyConnection(hydrated, testUrl || currentConfig.defaultTestUrl);
        }
    };
}
