import { DEFAULT_TEST_URL } from '../../shared/constants/endpoints.js';
import type {
    ExportedProxyConfigPayload,
    KalexProviderProxyConfig,
    ProxyProfile,
    ProxyProtocol,
    ProxyStateSnapshot,
    SanitizedProxyConfig
} from '../../shared/models/ProxyModels.js';
import type { RawConfigCandidate, RawProfileCandidate } from '../models/ProxyServiceContracts.js';

export type { RawConfigCandidate, RawProfileCandidate } from '../models/ProxyServiceContracts.js';

import { sanitizeHostInput } from '../../shared/utils/hostUtils.js';
import { decryptAuthSecret, decryptWithPassphrase, encryptAuthSecret, encryptWithPassphrase, maskUsername } from './cryptoStore.js';

/**
 * Проверяет и нормализует одиночный профиль прокси, при необходимости расшифровывая секреты.
 */
export function normalizeProfile(raw: RawProfileCandidate | undefined | null, masterKey: Uint8Array | null = null): ProxyProfile | null {
    if (!raw || typeof raw !== 'object') return null;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
    const profileName = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '';
    const host = sanitizeHostInput(raw.host ?? '');
    const port = Number(raw.port);
    if (!id || !profileName || !host || !Number.isInteger(port) || port < 1 || port > 65535) return null;

    const protocolRaw = typeof raw.protocol === 'string' ? raw.protocol.toLowerCase() : 'http';
    const protocol: ProxyProtocol = protocolRaw === 'http' || protocolRaw === 'https' || protocolRaw === 'socks5' ? protocolRaw : 'http';
    const authEnabled = Boolean(raw.auth?.enabled);
    let username = typeof raw.auth?.username === 'string' ? raw.auth.username : '';
    let password = typeof raw.auth?.password === 'string' ? raw.auth.password : '';

    if (!username && !password && typeof raw.auth?.cipher === 'string' && masterKey) {
        const decrypted = decryptAuthSecret(raw.auth.cipher, masterKey);
        if (decrypted) {
            username = decrypted.username;
            password = decrypted.password;
        }
    }

    return {
        id,
        name: profileName,
        protocol,
        host,
        port,
        auth: {
            enabled: authEnabled,
            ...(username ? { username } : {}),
            ...(password ? { password } : {})
        },
        ignoreSslErrors: Boolean(raw.ignoreSslErrors)
    };
}

/**
 * Нормализует полную конфигурацию прокси, сбрасывая привязки к несуществующим профилям в null (Direct).
 */
export function normalizeProxyConfig(raw: RawConfigCandidate = {}, masterKey: Uint8Array | null = null): KalexProviderProxyConfig {
    const profiles: ProxyProfile[] = [];
    const validProfileIds = new Set<string>();

    if (Array.isArray(raw?.profiles)) {
        for (const item of raw.profiles) {
            const normalized = normalizeProfile(item, masterKey);
            if (normalized && !validProfileIds.has(normalized.id)) {
                validProfileIds.add(normalized.id);
                profiles.push(normalized);
            }
        }
    }

    const providerBindings: Record<string, string | null> = {};
    if (raw?.providerBindings && typeof raw.providerBindings === 'object') {
        for (const [providerId, profileId] of Object.entries(raw.providerBindings)) {
            if (!providerId) continue;
            providerBindings[providerId] = typeof profileId === 'string' && validProfileIds.has(profileId) ? profileId : null;
        }
    }

    const defaultTestUrl =
        typeof raw?.defaultTestUrl === 'string' && raw.defaultTestUrl.trim() ? raw.defaultTestUrl.trim() : DEFAULT_TEST_URL;

    return { profiles, providerBindings, defaultTestUrl };
}

/**
 * Подготавливает конфигурацию к записи на диск с шифрованием паролей мастер-ключом.
 */
export function serializeConfigForDisk(config: KalexProviderProxyConfig, masterKey: Uint8Array): Record<string, object | string> {
    return {
        profiles: (config.profiles || []).map(profile => {
            const hasSecret = Boolean(profile.auth?.username || profile.auth?.password);
            return {
                id: profile.id,
                name: profile.name,
                protocol: profile.protocol,
                host: profile.host,
                port: profile.port,
                auth: {
                    enabled: Boolean(profile.auth?.enabled),
                    ...(hasSecret
                        ? {
                              cipher: encryptAuthSecret(profile.auth?.username ?? '', profile.auth?.password ?? '', masterKey)
                          }
                        : {})
                },
                ignoreSslErrors: Boolean(profile.ignoreSslErrors)
            };
        }),
        providerBindings: config.providerBindings || {},
        defaultTestUrl: config.defaultTestUrl || DEFAULT_TEST_URL
    };
}

/**
 * Очищает конфигурацию от открытых паролей перед отправкой в веб-интерфейс DSH.
 */
export function sanitizeConfigForClient(config: KalexProviderProxyConfig): SanitizedProxyConfig {
    return {
        profiles: (config.profiles || []).map(profile => {
            const hasCredentials = Boolean(profile.auth?.username || profile.auth?.password);
            return {
                id: profile.id,
                name: profile.name,
                protocol: profile.protocol,
                host: profile.host,
                port: profile.port,
                auth: {
                    enabled: Boolean(profile.auth?.enabled),
                    hasCredentials,
                    usernameMask: hasCredentials ? maskUsername(profile.auth?.username || '') : ''
                },
                ignoreSslErrors: Boolean(profile.ignoreSslErrors)
            };
        }),
        providerBindings: { ...config.providerBindings },
        defaultTestUrl: config.defaultTestUrl || DEFAULT_TEST_URL
    };
}

/**
 * Формирует объект экспорта настроек (с опциональным шифрованием учетных данных паролем).
 */
export function exportConfig(
    currentConfig: KalexProviderProxyConfig,
    options: { readonly includeCredentials?: boolean; readonly password?: string } = {}
): ExportedProxyConfigPayload {
    const includeCredentials = Boolean(options?.includeCredentials);
    const password = typeof options?.password === 'string' ? options.password : '';
    if (includeCredentials && !password) {
        throw new Error('Encryption password is required when exporting credentials');
    }

    const baseSanitized = sanitizeConfigForClient(currentConfig);
    if (!includeCredentials) {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            encryptedCredentials: false,
            ...baseSanitized
        };
    }

    const profiles = (currentConfig.profiles || []).map(profile => {
        const hasCredentials = Boolean(profile.auth?.username || profile.auth?.password);
        return {
            id: profile.id,
            name: profile.name,
            protocol: profile.protocol,
            host: profile.host,
            port: profile.port,
            auth: {
                enabled: Boolean(profile.auth?.enabled),
                hasCredentials,
                usernameMask: hasCredentials ? maskUsername(profile.auth?.username || '') : '',
                ...(hasCredentials
                    ? {
                          exportCipher: encryptWithPassphrase(profile.auth?.username || '', profile.auth?.password || '', password)
                      }
                    : {})
            },
            ignoreSslErrors: Boolean(profile.ignoreSslErrors)
        };
    });

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        encryptedCredentials: true,
        profiles,
        providerBindings: baseSanitized.providerBindings,
        defaultTestUrl: baseSanitized.defaultTestUrl
    };
}

/**
 * Импортирует конфигурацию прокси, при необходимости расшифровывая переносимые учетные данные.
 */
export async function importConfig(
    rawInput: RawConfigCandidate,
    passwordArg = '',
    context: {
        readonly currentConfig: KalexProviderProxyConfig;
        readonly updateConfig: (next: RawConfigCandidate) => Promise<ProxyStateSnapshot>;
    }
): Promise<ProxyStateSnapshot> {
    if (!rawInput || typeof rawInput !== 'object') {
        throw new Error('Invalid import file: expected a JSON object');
    }
    const rawPayload = rawInput.payload && typeof rawInput.payload === 'object' ? rawInput.payload : rawInput;
    const password =
        typeof passwordArg === 'string' && passwordArg ? passwordArg : typeof rawInput.password === 'string' ? rawInput.password : '';
    const skipCredentials = Boolean(rawInput.skipCredentials);
    const candidate = rawPayload.config && typeof rawPayload.config === 'object' ? rawPayload.config : rawPayload;
    if (!Array.isArray(candidate.profiles)) {
        throw new Error('Invalid import file: "profiles" array is required');
    }

    const hasExportCipher = candidate.profiles.some(
        profile => typeof profile?.auth?.exportCipher === 'string' && profile.auth.exportCipher.length > 0
    );
    if (hasExportCipher && !skipCredentials && !password) {
        throw new Error('PASSWORD_REQUIRED: This export file contains encrypted credentials. Please enter the decryption password.');
    }

    const hydratedProfiles: RawProfileCandidate[] = candidate.profiles.map(profile => {
        if (!profile || typeof profile !== 'object') return profile;
        if (typeof profile.auth?.exportCipher !== 'string' || !profile.auth.exportCipher.length) return profile;
        if (skipCredentials) {
            const { exportCipher: _ignored, ...restAuth } = profile.auth;
            return { ...profile, auth: restAuth };
        }
        const decrypted = decryptWithPassphrase(profile.auth.exportCipher, password);
        return {
            ...profile,
            auth: {
                enabled: Boolean(profile.auth?.enabled),
                username: decrypted.username,
                password: decrypted.password
            }
        };
    });

    const nextTestUrl = candidate.defaultTestUrl || context.currentConfig.defaultTestUrl;
    return context.updateConfig({
        profiles: hydratedProfiles,
        providerBindings:
            candidate.providerBindings && typeof candidate.providerBindings === 'object'
                ? candidate.providerBindings
                : context.currentConfig.providerBindings,
        ...(nextTestUrl ? { defaultTestUrl: nextTestUrl } : {})
    });
}
