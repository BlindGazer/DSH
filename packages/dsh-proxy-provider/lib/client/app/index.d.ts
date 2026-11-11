import type { DshClientContext } from '@kalex/dsh-core';
import { ProxyLocaleSettings } from '../features/locale-settings/components/ProxyLocaleSettings.js';
import { ProviderCardProxyEntry } from '../features/provider-card/components/ProviderCardProxyEntry.js';
import { ModelsFooterProxyEntry } from '../features/settings-modal/components/ModelsFooterProxyEntry.js';
import { ProxySettingsModal } from '../features/settings-modal/components/ProxySettingsModal.js';
export declare const name = "kalex-provider-proxy-client";
export declare const inject: readonly string[];
/**
 * Точка входа клиентского плагина @kalex/dsh-proxy-provider.
 * Регистрирует элементы управления прокси и выбора языка в слотах оболочки DSH.
 */
export declare function apply(ctx: DshClientContext): void;
export { ModelsFooterProxyEntry, ProviderCardProxyEntry, ProxyLocaleSettings, ProxySettingsModal };
