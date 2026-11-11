import { extractHost, sanitizeHostInput } from '@kalex/dsh-core/utils/hostSanitizer.js';
import { BUILTIN_PROVIDER_ENDPOINTS } from '../constants/endpoints.js';
import type { ProfileDraft, ProxyProfile, SanitizedProxyProfile } from '../models/ProxyModels.js';

export { extractHost, sanitizeHostInput };

/**
 * Возвращает список хостов для идентификатора провайдера и необязательного пользовательского baseUrl.
 */
export function resolveProviderHosts(providerId: string, customBaseUrl?: string): string[] {
    const hosts = new Set<string>();
    if (typeof customBaseUrl === 'string' && customBaseUrl.trim()) {
        const customHost = extractHost(customBaseUrl);
        if (customHost) hosts.add(customHost);
    }
    const builtin = BUILTIN_PROVIDER_ENDPOINTS[providerId];
    if (hosts.size === 0 && builtin) {
        for (const url of builtin.urls) {
            const host = extractHost(url);
            if (host) hosts.add(host);
        }
    }
    return Array.from(hosts);
}

/**
 * Создает пустой черновик профиля прокси для формы добавления.
 */
export function createEmptyDraft(): ProfileDraft {
    return {
        id: `proxy-${Date.now().toString(36)}`,
        name: '',
        protocol: 'http',
        host: '',
        port: '8080',
        authEnabled: false,
        hasCredentials: false,
        usernameMask: '',
        username: '',
        password: '',
        ignoreSslErrors: false
    };
}

/**
 * Преобразует сохраненный профиль прокси в черновик для редактирования.
 */
export function draftFromProfile(profile: SanitizedProxyProfile): ProfileDraft {
    return {
        id: profile.id,
        name: profile.name || '',
        protocol: profile.protocol || 'http',
        host: profile.host || '',
        port: String(profile.port || 8080),
        authEnabled: Boolean(profile.auth?.enabled),
        hasCredentials: Boolean(profile.auth?.hasCredentials),
        usernameMask: profile.auth?.usernameMask || '',
        username: '',
        password: '',
        ignoreSslErrors: Boolean(profile.ignoreSslErrors)
    };
}

/**
 * Преобразует черновик формы в структуру профиля прокси для сохранения или проверки.
 */
export function profileFromDraft(draft: ProfileDraft): ProxyProfile {
    return {
        id: draft.id,
        name: draft.name.trim(),
        protocol: draft.protocol,
        host: sanitizeHostInput(draft.host),
        port: Number(draft.port),
        auth: {
            enabled: Boolean(draft.authEnabled),
            username: draft.username || '',
            password: draft.password || ''
        },
        ignoreSslErrors: Boolean(draft.ignoreSslErrors)
    };
}
