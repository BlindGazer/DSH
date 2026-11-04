import { BUILTIN_PROVIDER_ENDPOINTS } from './provider-endpoints.js';

/**
 * Extract normalized `host` (`hostname:port` or `hostname`) from a URL or host string.
 */
export function extractHost(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    return parsed.host ? parsed.host.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Sanitize proxy host input: strips `http://`, `https://`, `socks5://`, path, and trailing port if pasted.
 */
export function sanitizeHostInput(input) {
  if (typeof input !== 'string') return '';
  let value = input.trim();
  if (!value) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    try {
      const u = new URL(value);
      return u.hostname;
    } catch {
      value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
    }
  }
  value = value.split('/')[0] ?? value;
  const colonIdx = value.indexOf(':');
  if (colonIdx > 0 && !value.startsWith('[')) {
    return value.slice(0, colonIdx);
  }
  return value;
}

/**
 * Resolve hosts for a provider ID and optional custom baseUrl.
 */
export function resolveProviderHosts(providerId, customBaseUrl) {
  const hosts = new Set();
  if (typeof customBaseUrl === 'string' && customBaseUrl.trim()) {
    const customHost = extractHost(customBaseUrl);
    if (customHost) hosts.add(customHost);
  }
  const builtin = BUILTIN_PROVIDER_ENDPOINTS[providerId];
  if (hosts.size === 0 && builtin) {
    for (const url of builtin.urls) {
      const h = extractHost(url);
      if (h) hosts.add(h);
    }
  }
  return Array.from(hosts);
}
