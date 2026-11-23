import type { DshLocalizedClientContext } from '@kalex/dsh-core';
import { KNOWN_SETTINGS_NS } from '../../shared/constants/endpoints.ts';
import { proxyDictionaries } from '../../shared/constants/localizations/ProxyLocalization.ts';
import { ProxyPluginSettingsAction } from '../features/locale-settings/components/ProxyPluginSettingsAction.tsx';
import { ProviderCardProxyEntry } from '../features/provider-card/components/ProviderCardProxyEntry.tsx';
import { ModelsFooterProxyEntry } from '../features/settings-modal/components/ModelsFooterProxyEntry.tsx';
import { ProxySettingsModal } from '../features/settings-modal/components/ProxySettingsModal.tsx';
import { proxyStore } from './proxyStore.ts';
import { ensureProxyStyles } from './proxyStyles.ts';

const namespace = 'dsh-proxy-provider';

interface ProxyClientContext extends DshLocalizedClientContext {
    effect(setup: () => () => void, label: string): void;
}

export const name = 'dsh-proxy-provider-client';
export const inject: readonly string[] = ['slots', 'locale'];

/**
 * Точка входа клиентского плагина @kalex/dsh-proxy-provider.
 * Регистрирует элементы управления прокси в слотах оболочки DSH.
 */
export function apply(ctx: ProxyClientContext): void {
    ctx.effect(() => ctx.locale.register(namespace, 'en', proxyDictionaries.en), 'proxy: en');
    ctx.effect(() => ctx.locale.register(namespace, 'ru', proxyDictionaries.ru), 'proxy: ru');
    const tLabel = ctx.locale.bind(namespace);
    ensureProxyStyles();
    proxyStore.refresh().catch(() => {});

    ctx.slots.inject('plugins.detail.actions', () =>
        ctx.slots.register(
            {
                name: 'plugins.detail.actions',
                id: 'dsh-proxy-provider-settings-action',
                locale: namespace,
                order: 50
            },
            props => <ProxyPluginSettingsAction {...props} active={ctx.locale.getSnapshot().active} />
        )
    );

    ctx.slots.inject('settings.models.footer', () =>
        ctx.slots.register(
            {
                name: 'settings.models.footer',
                id: 'dsh-proxy-provider-footer',
                locale: namespace,
                order: 50,
                label: () => tLabel('Proxy settings')
            },
            ({ t }) => <ModelsFooterProxyEntry t={t} active={ctx.locale.getSnapshot().active} />
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
                            locale: namespace,
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

export { ModelsFooterProxyEntry, ProviderCardProxyEntry, ProxySettingsModal };
