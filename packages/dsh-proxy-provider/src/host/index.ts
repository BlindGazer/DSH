import { createHostLogger, createOptionalLogger } from '@kalex/dsh-logger-core';
import { BUILTIN_PROVIDER_ENDPOINTS } from '../shared/constants/endpoints.ts';
import type { KalexProviderProxyConfig } from '../shared/models/ProxyModels.ts';
import { extractHost, resolveProviderHosts, sanitizeHostInput } from '../shared/utils/hostUtils.ts';
import { registerHttpRoutes, type WebServerHostContext } from './api/httpRoutes.ts';
import { normalizeProfile, normalizeProxyConfig, sanitizeConfigForClient } from './services/configNormalizer.ts';
import { checkTcpReachability, dispatchWithUndiciFetch, testProxyConnection } from './services/connectionTest.ts';
import { type ControllerOptions, createProviderProxyController, type ProviderProxyController } from './services/controller.ts';
import {
    decryptAuthSecret,
    decryptWithPassphrase,
    encryptAuthSecret,
    encryptWithPassphrase,
    maskUsername
} from './services/cryptoStore.ts';
import { createProfileDispatcher, DispatcherManager } from './services/profileDispatcher.ts';
import { discoverProviders, type HostDiscoveryContext } from './services/providerDiscovery.ts';
import { compileRoutingTable } from './services/providerRouting.ts';
import { establishSocks5Tunnel } from './services/socks5.ts';

export const name = 'dsh-proxy-provider';

export interface CordisHostPluginContext extends HostDiscoveryContext, WebServerHostContext {
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
    const logger = createHostLogger(createOptionalLogger(ctx, '@kalex/dsh-proxy-provider'));
    controller.refreshRouting().catch((error: Error) => {
        logger.warn(`[${name}] Initial routing refresh failed`, {
            event: 'routing_refresh_failed',
            operation: 'initial_refresh',
            errorCode: error.message
        });
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
