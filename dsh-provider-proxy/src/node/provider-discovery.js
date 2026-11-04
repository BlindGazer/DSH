import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { BUILTIN_PROVIDER_ENDPOINTS } from './provider-endpoints.js';
import { resolveProviderHosts } from './provider-hosts.js';
import { parseProvidersFromPatchYaml } from './provider-yaml.js';

/**
 * Discover all providers (built-in and custom) from DSH context and profile configuration.
 */
export async function discoverProviders(ctx, extraProviders = {}) {
  const byId = new Map();

  const upsert = (rawId, info = {}) => {
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

  // 1. Default core providers always visible in DSH Models page
  upsert('deepseek-account', { name: 'DeepSeek Account', custom: false, settingsNs: 'llm-deepseek-account' });
  upsert('deepseek-official', { name: 'DeepSeek', custom: false, settingsNs: 'llm-deepseek' });
  upsert('google', { name: 'google', custom: false, settingsNs: 'llm-pi-ai' });

  // 2. Query ctx.llm if available
  const llm = ctx?.get?.('llm') ?? ctx?.llm;
  if (llm) {
    try {
      const configurable = typeof llm.listConfigurableProviders === 'function'
        ? await llm.listConfigurableProviders()
        : [];
      for (const entry of configurable || []) {
        upsert(entry.provider || entry.id, {
          name: entry.displayName || entry.name,
          baseUrl: entry.baseURL || entry.baseUrl || entry.defaultBaseURL,
          custom: Boolean(entry.declared),
          settingsNs: entry.settingsNs
        });
      }
    } catch {
      /* ignore */
    }
    try {
      const registered = typeof llm.listProviders === 'function'
        ? await llm.listProviders()
        : [];
      for (const entry of registered || []) {
        upsert(entry.id || entry.provider, {
          name: entry.name || entry.displayName
        });
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Query ctx.settings ('llm-pi-ai', 'llm-deepseek', 'modelProviders', 'customProviders')
  const settings = ctx?.get?.('settings') ?? ctx?.settings;
  if (settings && typeof settings.describe === 'function') {
    for (const ns of ['llm-pi-ai', 'llm-deepseek']) {
      try {
        const desc = await settings.describe(ns, { redactSecrets: true });
        const val = desc?.value;
        if (val && typeof val === 'object') {
          if (val.providers && typeof val.providers === 'object') {
            for (const [routeId, routeCfg] of Object.entries(val.providers)) {
              if (routeCfg && typeof routeCfg === 'object') {
                upsert(routeId, {
                  name: routeCfg.displayName || routeCfg.name || routeId,
                  baseUrl: routeCfg.baseURL || routeCfg.baseUrl,
                  custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
                  settingsNs: ns
                });
              }
            }
          } else if (ns === 'llm-deepseek' && (val.baseURL || val.baseUrl)) {
            upsert('deepseek-official', {
              baseUrl: val.baseURL || val.baseUrl,
              settingsNs: ns
            });
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 4. Query ctx.configEditor if available
  const configEditor = ctx?.get?.('configEditor') ?? ctx?.configEditor;
  if (configEditor && typeof configEditor.entries === 'function') {
    try {
      for (const entry of configEditor.entries() || []) {
        const cfg = entry?.options?.config ?? entry?.config;
        if (cfg?.providers && typeof cfg.providers === 'object') {
          for (const [routeId, routeCfg] of Object.entries(cfg.providers)) {
            if (routeCfg && typeof routeCfg === 'object') {
              upsert(routeId, {
                name: routeCfg.displayName || routeCfg.name || routeId,
                baseUrl: routeCfg.baseURL || routeCfg.baseUrl,
                custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
                settingsNs: entry?.options?.id || 'llm-pi-ai'
              });
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 5. Fallback: inspect profile cordis.patch.yml on disk
  try {
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
    const patchPaths = [
      join(dshHome, 'profiles', 'desktop', 'cordis.patch.yml'),
      join(dshHome, 'cordis.patch.yml')
    ];
    for (const patchPath of patchPaths) {
      if (existsSync(patchPath)) {
        const parsed = parseProvidersFromPatchYaml(readFileSync(patchPath, 'utf8'));
        for (const [routeId, routeCfg] of Object.entries(parsed)) {
          upsert(routeId, {
            name: routeCfg.displayName || routeId,
            baseUrl: routeCfg.baseURL,
            custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
            settingsNs: 'llm-pi-ai'
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 6. Merge any explicitly passed extraProviders (for tests or runtime overrides)
  if (extraProviders && typeof extraProviders === 'object') {
    for (const [routeId, routeCfg] of Object.entries(extraProviders)) {
      if (routeCfg && typeof routeCfg === 'object') {
        upsert(routeId, routeCfg);
      }
    }
  }

  return Array.from(byId.values());
}
