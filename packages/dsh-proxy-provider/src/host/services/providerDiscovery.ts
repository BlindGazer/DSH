import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { BUILTIN_PROVIDER_ENDPOINTS } from '../../shared/constants/endpoints.js';
import type { DiscoveredProvider } from '../../shared/models/ProxyModels.js';
import { resolveProviderHosts } from '../../shared/utils/hostUtils.js';
import { parseProvidersFromPatchYaml } from './providerYaml.js';

export interface ProviderInfoCandidate {
    readonly id?: string;
    readonly provider?: string;
    readonly name?: string;
    readonly displayName?: string;
    readonly baseUrl?: string;
    readonly baseURL?: string;
    readonly defaultBaseURL?: string;
    readonly custom?: boolean;
    readonly declared?: boolean;
    readonly settingsNs?: string;
}

export interface HostDiscoveryContext {
    get?(serviceName: string): object | undefined;
    readonly llm?: {
        listConfigurableProviders?(): Promise<readonly ProviderInfoCandidate[]>;
        listProviders?(): Promise<readonly ProviderInfoCandidate[]>;
    };
    readonly settings?: {
        describe?(
            ns: string,
            opts?: { readonly redactSecrets?: boolean }
        ): Promise<{
            readonly value?: {
                readonly baseURL?: string;
                readonly baseUrl?: string;
                readonly providers?: Record<string, ProviderInfoCandidate>;
            };
        }>;
    };
    readonly configEditor?: {
        entries?(): ReadonlyArray<{
            readonly options?: {
                readonly id?: string;
                readonly config?: { readonly providers?: Record<string, ProviderInfoCandidate> };
            };
            readonly config?: { readonly providers?: Record<string, ProviderInfoCandidate> };
        }>;
    };
}

/**
 * Обнаруживает все встроенные и пользовательские провайдеры моделей из контекста DSH и файлов профиля.
 */
export async function discoverProviders(
    ctx?: HostDiscoveryContext | null,
    extraProviders: Record<string, ProviderInfoCandidate> = {}
): Promise<DiscoveredProvider[]> {
    const byId = new Map<string, DiscoveredProvider>();

    const upsert = (rawId: string | undefined, info: ProviderInfoCandidate = {}): void => {
        if (!rawId || typeof rawId !== 'string') return;
        const id = rawId === 'deepseek' ? 'deepseek-official' : rawId;
        const prev = byId.get(id);
        const builtin = BUILTIN_PROVIDER_ENDPOINTS[id];
        const baseUrl = info.baseUrl || info.baseURL || prev?.baseUrl || builtin?.urls?.[0];
        const hosts = resolveProviderHosts(id, info.baseUrl || info.baseURL || prev?.baseUrl);
        byId.set(id, {
            id,
            name: info.name || info.displayName || prev?.name || builtin?.name || id,
            custom: Boolean(info.custom ?? prev?.custom ?? !builtin),
            ...(baseUrl ? { baseUrl } : {}),
            hosts,
            settingsNs: info.settingsNs || prev?.settingsNs || builtin?.settingsNs || 'llm-pi-ai'
        });
    };

    upsert('deepseek-account', { name: 'DeepSeek Account', custom: false, settingsNs: 'llm-deepseek-account' });
    upsert('deepseek-official', { name: 'DeepSeek', custom: false, settingsNs: 'llm-deepseek' });
    upsert('google', { name: 'google', custom: false, settingsNs: 'llm-pi-ai' });

    const llm = (ctx?.get?.('llm') as HostDiscoveryContext['llm']) ?? ctx?.llm;
    if (llm) {
        try {
            const configurable = typeof llm.listConfigurableProviders === 'function' ? await llm.listConfigurableProviders() : [];
            for (const entry of configurable || []) {
                const cfgBaseUrl = entry.baseURL || entry.baseUrl || entry.defaultBaseURL;
                const entryName = entry.displayName || entry.name;
                upsert(entry.provider || entry.id, {
                    ...(entryName ? { name: entryName } : {}),
                    ...(cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {}),
                    custom: Boolean(entry.declared),
                    ...(entry.settingsNs ? { settingsNs: entry.settingsNs } : {})
                });
            }
        } catch {
            // Игнорируем ошибки необязательного сервиса
        }
        try {
            const registered = typeof llm.listProviders === 'function' ? await llm.listProviders() : [];
            for (const entry of registered || []) {
                const entryName = entry.name || entry.displayName;
                upsert(entry.id || entry.provider, entryName ? { name: entryName } : {});
            }
        } catch {
            // Игнорируем ошибки необязательного сервиса
        }
    }

    const settings = (ctx?.get?.('settings') as HostDiscoveryContext['settings']) ?? ctx?.settings;
    if (settings && typeof settings.describe === 'function') {
        for (const ns of ['llm-pi-ai', 'llm-deepseek']) {
            try {
                const desc = await settings.describe(ns, { redactSecrets: true });
                const val = desc?.value;
                if (val && typeof val === 'object') {
                    if (val.providers && typeof val.providers === 'object') {
                        for (const [routeId, routeCfg] of Object.entries(val.providers)) {
                            if (routeCfg && typeof routeCfg === 'object') {
                                const cfgBaseUrl = routeCfg.baseURL || routeCfg.baseUrl;
                                upsert(routeId, {
                                    name: routeCfg.displayName || routeCfg.name || routeId,
                                    ...(cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {}),
                                    custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
                                    settingsNs: ns
                                });
                            }
                        }
                    } else if (ns === 'llm-deepseek' && (val.baseURL || val.baseUrl)) {
                        const dsBaseUrl = val.baseURL || val.baseUrl;
                        upsert('deepseek-official', {
                            ...(dsBaseUrl ? { baseUrl: dsBaseUrl } : {}),
                            settingsNs: ns
                        });
                    }
                }
            } catch {
                // Игнорируем ошибки чтения настроек
            }
        }
    }

    const configEditor = (ctx?.get?.('configEditor') as HostDiscoveryContext['configEditor']) ?? ctx?.configEditor;
    if (configEditor && typeof configEditor.entries === 'function') {
        try {
            for (const entry of configEditor.entries() || []) {
                const cfg = entry?.options?.config ?? entry?.config;
                if (cfg?.providers && typeof cfg.providers === 'object') {
                    for (const [routeId, routeCfg] of Object.entries(cfg.providers)) {
                        if (routeCfg && typeof routeCfg === 'object') {
                            const cfgBaseUrl = routeCfg.baseURL || routeCfg.baseUrl;
                            upsert(routeId, {
                                name: routeCfg.displayName || routeCfg.name || routeId,
                                ...(cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {}),
                                custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
                                settingsNs: entry?.options?.id || 'llm-pi-ai'
                            });
                        }
                    }
                }
            }
        } catch {
            // Игнорируем ошибки чтения редактора конфигурации
        }
    }

    try {
        const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
        const patchPaths = [join(dshHome, 'profiles', 'desktop', 'cordis.patch.yml'), join(dshHome, 'cordis.patch.yml')];
        for (const patchPath of patchPaths) {
            if (existsSync(patchPath)) {
                const parsed = parseProvidersFromPatchYaml(readFileSync(patchPath, 'utf8'));
                for (const [routeId, routeCfg] of Object.entries(parsed)) {
                    const cfgBaseUrl = routeCfg.baseURL;
                    upsert(routeId, {
                        name: routeCfg.displayName || routeId,
                        ...(cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {}),
                        custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
                        settingsNs: 'llm-pi-ai'
                    });
                }
            }
        }
    } catch {
        // Игнорируем ошибки чтения локального профиля
    }

    if (extraProviders && typeof extraProviders === 'object') {
        for (const [routeId, routeCfg] of Object.entries(extraProviders)) {
            if (routeCfg && typeof routeCfg === 'object') {
                upsert(routeId, routeCfg);
            }
        }
    }

    return Array.from(byId.values());
}
