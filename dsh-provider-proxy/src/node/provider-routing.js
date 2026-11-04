import { BUILTIN_PROVIDER_ENDPOINTS } from './provider-endpoints.js';
import { resolveProviderHosts } from './provider-hosts.js';

/**
 * Compile host -> proxyProfile routing table and detect host conflicts across providers.
 *
 * Conflict rule (Section 5.2, 6.1.3, 8.6):
 * If two different providers share the same target `host` (`hostname:port`),
 * but have different proxy settings (e.g. one is `Direct` and another has `Proxy 1`,
 * or two different proxy profiles), a conflict warning is emitted and the active
 * proxy profile is applied to the entire host.
 */
function profileSettingsSignature(profile) {
  if (!profile) return 'direct';
  return JSON.stringify({
    protocol: (profile.protocol || 'http').toLowerCase(),
    host: (profile.host || '').toLowerCase(),
    port: Number(profile.port),
    authEnabled: Boolean(profile.auth?.enabled),
    username: profile.auth?.username ?? '',
    password: profile.auth?.password ?? '',
    cipher: profile.auth?.cipher ?? '',
    ignoreSslErrors: Boolean(profile.ignoreSslErrors)
  });
}

export function compileRoutingTable(providers, config) {
  const profilesById = new Map();
  for (const profile of config?.profiles || []) {
    if (profile && typeof profile.id === 'string') {
      profilesById.set(profile.id, profile);
    }
  }

  const rawBindings = config?.providerBindings || {};
  const bindings = { ...rawBindings };
  if (bindings.deepseek && !bindings['deepseek-official']) {
    bindings['deepseek-official'] = bindings.deepseek;
  }

  const hostEntries = new Map(); // host -> Array<{ providerId, providerName, profileId, profileName, settingsSignature }>

  // Also ensure any providerId with an active binding in providerBindings is represented
  const allProviders = [...(providers || [])];
  const seenIds = new Set(allProviders.map((p) => p.id));
  for (const rawBoundId of Object.keys(bindings)) {
    const boundProviderId = rawBoundId === 'deepseek' ? 'deepseek-official' : rawBoundId;
    if (!seenIds.has(boundProviderId) && bindings[rawBoundId]) {
      const hosts = resolveProviderHosts(boundProviderId);
      if (hosts.length > 0) {
        allProviders.push({
          id: boundProviderId,
          name: BUILTIN_PROVIDER_ENDPOINTS[boundProviderId]?.name || boundProviderId,
          hosts
        });
        seenIds.add(boundProviderId);
      }
    }
  }

  for (const provider of allProviders) {
    const rawProfileId = bindings[provider.id] ?? null;
    const validProfile = rawProfileId && profilesById.has(rawProfileId)
      ? profilesById.get(rawProfileId)
      : null;
    const effectiveProfileId = validProfile ? validProfile.id : null;
    const effectiveProfileName = validProfile ? validProfile.name : 'Direct';
    const settingsSignature = profileSettingsSignature(validProfile);

    for (const rawHost of provider.hosts || []) {
      const host = rawHost.toLowerCase();
      if (!hostEntries.has(host)) hostEntries.set(host, []);
      hostEntries.get(host).push({
        providerId: provider.id,
        providerName: provider.name || provider.id,
        profileId: effectiveProfileId,
        profileName: effectiveProfileName,
        settingsSignature
      });
    }
  }

  const hostToProfile = new Map();
  const routes = {};
  const conflicts = [];

  for (const [host, entries] of hostEntries.entries()) {
    const distinctSettings = new Set(entries.map((e) => e.settingsSignature));
    const firstActive = entries.find((e) => e.profileId !== null);

    if (firstActive) {
      const profile = profilesById.get(firstActive.profileId);
      if (profile) {
        hostToProfile.set(host, profile);
        routes[host] = profile.id;
      }
    }

    if (entries.length > 1 && distinctSettings.size > 1 && firstActive) {
      conflicts.push({
        host,
        providers: entries.map(({ providerId, providerName, profileId, profileName }) => ({
          providerId,
          providerName,
          profileId,
          profileName
        })),
        appliedProfileId: firstActive.profileId,
        appliedProfileName: firstActive.profileName
      });
    }
  }

  return {
    hostToProfile,
    routes,
    conflicts
  };
}
