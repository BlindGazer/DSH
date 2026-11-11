import { BUILTIN_PROVIDER_ENDPOINTS } from '../shared/constants/endpoints.js';
import type { KalexProviderProxyConfig } from '../shared/models/ProxyModels.js';
import { extractHost, resolveProviderHosts, sanitizeHostInput } from '../shared/utils/hostUtils.js';
import { registerHttpRoutes, type WebServerHostContext } from './api/httpRoutes.js';
import { normalizeProfile, normalizeProxyConfig, sanitizeConfigForClient } from './services/configNormalizer.js';
import { checkTcpReachability, dispatchWithUndiciFetch, testProxyConnection } from './services/connectionTest.js';
import { type ControllerOptions, createProviderProxyController, type ProviderProxyController } from './services/controller.js';
import {
    decryptAuthSecret,
    decryptWithPassphrase,
    encryptAuthSecret,
    encryptWithPassphrase,
    maskUsername
} from './services/cryptoStore.js';
import { createProfileDispatcher, DispatcherManager } from './services/profileDispatcher.js';
import { discoverProviders, type HostDiscoveryContext } from './services/providerDiscovery.js';
import { compileRoutingTable } from './services/providerRouting.js';
import { establishSocks5Tunnel } from './services/socks5.js';

export const name = 'kalex-provider-proxy';

export interface CordisHostPluginContext extends HostDiscoveryContext, WebServerHostContext {
    readonly logger?: { warn?(msg: string): void };
    on?(eventName: string, listener: () => void): void;
    effect?(fn: () => () => void): void;
}

/**
 * Точка входа серверного плагина Cordis для @kalex/dsh-proxy-provider.
 */
export function apply(ctx: CordisHostPluginContext, config: Partial<KalexProviderProxyConfig> = {}): void {
    const controller = createProviderProxyController({
        ctx,
        initialConfig: config
    });
    controller.installFetchInterceptor();
    controller.refreshRouting().catch((error: Error) => {
        ctx.logger?.warn?.(`[${name}] Initial routing refresh failed: ${error?.message || error}`);
    });

    if (typeof ctx.on === 'function') {
        ctx.on('loader/volatile-update', () => {
            controller.refreshRouting().catch(() => {});
        });
        ctx.on('llm/adapters-updated', () => {
            controller.refreshRouting().catch(() => {});
        });
    }
    if (typeof ctx.effect === 'function') {
        ctx.effect(() => () => {
            controller.dispose().catch(() => {});
        });
    }
    registerHttpRoutes(ctx, controller);
}

export {
    BUILTIN_PROVIDER_ENDPOINTS,
    type ControllerOptions,
    checkTcpReachability,
    compileRoutingTable,
    createProfileDispatcher,
    createProviderProxyController,
    DispatcherManager,
    decryptAuthSecret,
    decryptWithPassphrase,
    discoverProviders,
    dispatchWithUndiciFetch,
    encryptAuthSecret,
    encryptWithPassphrase,
    establishSocks5Tunnel,
    extractHost,
    maskUsername,
    normalizeProfile,
    normalizeProxyConfig,
    type ProviderProxyController,
    resolveProviderHosts,
    sanitizeConfigForClient,
    sanitizeHostInput,
    testProxyConnection
};
