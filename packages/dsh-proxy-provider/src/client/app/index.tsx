import type { DshClientContext } from '@kalex/dsh-core';
import { KNOWN_SETTINGS_NS } from '../../shared/constants/endpoints.js';
import { ProxyLocaleSettings } from '../features/locale-settings/components/ProxyLocaleSettings.js';
import { ProxyPluginSettingsAction } from '../features/locale-settings/components/ProxyPluginSettingsAction.js';
import { ProviderCardProxyEntry } from '../features/provider-card/components/ProviderCardProxyEntry.js';
import { ModelsFooterProxyEntry } from '../features/settings-modal/components/ModelsFooterProxyEntry.js';
import { ProxySettingsModal } from '../features/settings-modal/components/ProxySettingsModal.js';
import { loadProxyLocale, proxyStore, tProxy } from './proxyStore.js';
import { ensureProxyStyles } from './proxyStyles.js';

export const name = 'dsh-proxy-provider-client';
export const inject: readonly string[] = ['slots', 'locale'];

/**
 * Точка входа клиентского плагина @kalex/dsh-proxy-provider.
 * Регистрирует элементы управления прокси и выбора языка в слотах оболочки DSH.
 */
export function apply(ctx: DshClientContext): void {
    proxyStore.publish({ locale: loadProxyLocale(ctx.locale?.preference) });
    ensureProxyStyles();
    proxyStore.refresh().catch(() => {});

    ctx.slots.inject('plugins.detail.actions', () =>
        ctx.slots.register(
            {
                name: 'plugins.detail.actions',
                id: 'dsh-proxy-provider-settings-action',
                order: 50
            },
            ProxyPluginSettingsAction
        )
    );

    ctx.slots.inject('settings.models.footer', () =>
        ctx.slots.register(
            {
                name: 'settings.models.footer',
                id: 'dsh-proxy-provider-footer',
                order: 50,
                label: tProxy('Proxy settings')
            },
            ModelsFooterProxyEntry
        )
    );

    ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
            {
                name: 'plugins.bundle.config',
                key: '@kalex/dsh-proxy-provider',
                id: 'dsh-proxy-provider-language',
                order: 50
            },
            ProxyLocaleSettings
        )
    );

    ctx.slots.inject('settings.models.provider-card', () => {
        const disposers: Array<() => void> = [];
        const registeredKeys = new Set<string>();

        const registerKey = (key: string): void => {
            if (registeredKeys.has(key)) return;
            registeredKeys.add(key);
            try {
                disposers.push(
                    ctx.slots.register(
                        {
                            name: 'settings.models.provider-card',
                            key
                        },
                        ProviderCardProxyEntry
                    )
                );
            } catch {
                // Игнорируем ошибку, если слот для ключа уже занят
            }
        };

        for (const ns of KNOWN_SETTINGS_NS) {
            registerKey(ns);
        }

        const unsub = proxyStore.subscribe(snap => {
            for (const p of snap.providers || []) {
                if (typeof p.settingsNs === 'string') {
                    registerKey(p.settingsNs);
                }
                if (typeof p.id === 'string') {
                    registerKey(p.id);
                }
            }
        });

        return () => {
            unsub();
            for (const dispose of disposers) {
                try {
                    dispose?.();
                } catch {
                    // Игнорируем ошибку при освобождении слота
                }
            }
        };
    });
}

export { ModelsFooterProxyEntry, ProviderCardProxyEntry, ProxyLocaleSettings, ProxySettingsModal };
