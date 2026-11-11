import type { DshLocaleCode, KeyValueStorage } from '@kalex/dsh-core';
import { useEffect, useState } from 'react';
import { API_BASE, DEFAULT_TEST_URL } from '../../shared/constants/endpoints.js';
import {
    persistProxyLocale,
    readSavedProxyLocale,
    resolveProxyLocale,
    translateProxyText
} from '../../shared/constants/localizations/ProxyLocalization.js';
import type {
    DiscoveredProvider,
    ExportedProxyConfigPayload,
    HostConflict,
    ProxyProfile,
    SanitizedProxyConfig,
    TestConnectionResult
} from '../../shared/models/ProxyModels.js';

export interface ProxyClientSnapshot {
    readonly loading: boolean;
    readonly modalOpen: boolean;
    readonly locale: DshLocaleCode;
    readonly config: SanitizedProxyConfig;
    readonly providers: readonly DiscoveredProvider[];
    readonly conflicts: readonly HostConflict[];
    readonly routes: Record<string, string>;
    readonly error: string | null;
}

let guiSessionToken: string | null = null;
let tokenClaimPromise: Promise<string | null> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activeProxyLocale: DshLocaleCode = 'en';

function startHeartbeat(): void {
    if (heartbeatTimer || typeof window === 'undefined' || typeof setInterval !== 'function') return;
    heartbeatTimer = setInterval(() => {
        if (!guiSessionToken) return;
        fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-kpp-client': 'dsh-web-ui',
                'x-kpp-token': guiSessionToken
            },
            body: JSON.stringify({ action: 'heartbeat' })
        }).catch(() => {});
    }, 4000);

    if (typeof window.addEventListener === 'function') {
        window.addEventListener('beforeunload', () => {
            if (!guiSessionToken) return;
            fetch(`${API_BASE}/session`, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'x-kpp-client': 'dsh-web-ui',
                    'x-kpp-token': guiSessionToken
                },
                body: JSON.stringify({ action: 'release', token: guiSessionToken })
            }).catch(() => {});
        });
    }
}

async function ensureGuiSessionToken(): Promise<string | null> {
    if (guiSessionToken) return guiSessionToken;
    if (tokenClaimPromise) return tokenClaimPromise;
    tokenClaimPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kpp-client': 'dsh-web-ui'
                },
                body: JSON.stringify({ action: 'claim' })
            });
            const data = (await res.json()) as { ok?: boolean; token?: string };
            if (data && data.ok && typeof data.token === 'string') {
                guiSessionToken = data.token;
                startHeartbeat();
            }
        } catch {
            // Игнорируем ошибку в изолированной тестовой среде
        } finally {
            tokenClaimPromise = null;
        }
        return guiSessionToken;
    })();
    return tokenClaimPromise;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await ensureGuiSessionToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
        'x-kpp-client': 'dsh-web-ui',
        ...(token ? { 'x-kpp-token': token } : {})
    };
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });
}

/**
 * Реактивное клиентское хранилище состояния плагина @kalex/dsh-proxy-provider.
 */
export const proxyStore = {
    snapshot: {
        loading: true,
        modalOpen: false,
        locale: 'en' as DshLocaleCode,
        config: {
            profiles: [],
            providerBindings: {},
            defaultTestUrl: DEFAULT_TEST_URL
        },
        providers: [],
        conflicts: [],
        routes: {},
        error: null
    } as ProxyClientSnapshot,
    listeners: new Set<(snap: ProxyClientSnapshot) => void>(),

    subscribe(fn: (snap: ProxyClientSnapshot) => void): () => void {
        proxyStore.listeners.add(fn);
        return () => {
            proxyStore.listeners.delete(fn);
        };
    },

    publish(patch: Partial<ProxyClientSnapshot>): void {
        proxyStore.snapshot = { ...proxyStore.snapshot, ...patch };
        for (const fn of proxyStore.listeners) {
            try {
                fn(proxyStore.snapshot);
            } catch {
                // Игнорируем ошибки слушателей
            }
        }
    },

    async refresh(): Promise<void> {
        try {
            const res = await apiFetch('/state');
            const data = (await res.json()) as Partial<ProxyClientSnapshot> & {
                ok?: boolean;
            };
            if (data && data.ok) {
                proxyStore.publish({
                    loading: false,
                    config: data.config || proxyStore.snapshot.config,
                    providers: data.providers || [],
                    conflicts: data.conflicts || [],
                    routes: data.routes || {},
                    error: null
                });
            }
        } catch (err) {
            const errorObj = err as { message?: string };
            proxyStore.publish({
                loading: false,
                error: errorObj?.message || 'Failed to load proxy settings'
            });
        }
    },

    async saveConfig(nextConfig: object): Promise<void> {
        const res = await apiFetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextConfig)
        });
        const data = (await res.json()) as Partial<ProxyClientSnapshot> & {
            ok?: boolean;
            error?: string;
        };
        if (!res.ok || !data.ok) {
            throw new Error(data?.error || 'Failed to save proxy configuration');
        }
        proxyStore.publish({
            config: data.config || proxyStore.snapshot.config,
            providers: data.providers || proxyStore.snapshot.providers,
            conflicts: data.conflicts || [],
            routes: data.routes || {},
            error: null
        });
    },

    async bindProvider(providerId: string, profileId: string | null): Promise<void> {
        const res = await apiFetch('/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId, profileId: profileId || null })
        });
        const data = (await res.json()) as Partial<ProxyClientSnapshot> & {
            ok?: boolean;
            error?: string;
        };
        if (!res.ok || !data.ok) {
            throw new Error(data?.error || 'Failed to bind provider proxy');
        }
        proxyStore.publish({
            config: data.config || proxyStore.snapshot.config,
            providers: data.providers || proxyStore.snapshot.providers,
            conflicts: data.conflicts || [],
            routes: data.routes || {},
            error: null
        });
    },

    async testConnection(profile: ProxyProfile, testUrl?: string): Promise<TestConnectionResult> {
        const res = await apiFetch('/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, testUrl })
        });
        return (await res.json()) as TestConnectionResult;
    },

    async exportConfig(
        options: { readonly includeCredentials?: boolean; readonly password?: string } = {}
    ): Promise<ExportedProxyConfigPayload> {
        const res = await apiFetch('/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });
        const data = (await res.json()) as {
            ok?: boolean;
            error?: string;
            exportData?: ExportedProxyConfigPayload;
        };
        if (!res.ok || !data.ok || !data.exportData) {
            throw new Error(data?.error || 'Failed to export proxy configuration');
        }
        return data.exportData;
    },

    async importConfig(
        payload: object,
        options: {
            readonly password?: string;
            readonly skipCredentials?: boolean;
        } = {}
    ): Promise<void> {
        const res = await apiFetch('/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payload,
                password: options?.password || '',
                skipCredentials: Boolean(options?.skipCredentials)
            })
        });
        const data = (await res.json()) as Partial<ProxyClientSnapshot> & {
            ok?: boolean;
            error?: string;
        };
        if (!res.ok || !data.ok) {
            throw new Error(data?.error || 'Failed to import proxy configuration');
        }
        proxyStore.publish({
            config: data.config || proxyStore.snapshot.config,
            providers: data.providers || proxyStore.snapshot.providers,
            conflicts: data.conflicts || [],
            routes: data.routes || {},
            error: null
        });
    }
};

/**
 * Загружает язык интерфейса прокси с учетом сохраненного выбора и языка DSH.
 */
export function loadProxyLocale(hostLocale?: string): DshLocaleCode {
    const storage = typeof localStorage === 'undefined' ? undefined : (localStorage as KeyValueStorage);
    activeProxyLocale = resolveProxyLocale(readSavedProxyLocale(storage), hostLocale);
    return activeProxyLocale;
}

/**
 * Сохраняет выбранный пользователем язык интерфейса прокси и обновляет хранилище.
 */
export function saveProxyLocale(locale: DshLocaleCode): void {
    if (locale !== 'ru' && locale !== 'en') return;
    const storage = typeof localStorage === 'undefined' ? undefined : (localStorage as KeyValueStorage);
    persistProxyLocale(storage, locale);
    activeProxyLocale = locale;
    proxyStore.publish({ locale });
}

/**
 * Переводит строку с использованием текущего активного языка прокси.
 */
export function tProxy(text: string): string {
    return translateProxyText(text, proxyStore.snapshot.locale || activeProxyLocale);
}

/**
 * Реактивный хук подписки на состояние клиентского хранилища прокси.
 */
export function useProxyStore(): ProxyClientSnapshot {
    const [snap, setSnap] = useState<ProxyClientSnapshot>(proxyStore.snapshot);
    useEffect(() => proxyStore.subscribe(setSnap), []);
    return snap;
}
