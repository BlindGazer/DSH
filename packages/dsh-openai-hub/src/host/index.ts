import type { Context } from '@deepseek-ai/cordis';
import type { z } from 'zod';
import { Config } from '../shared/accounts.js';
import { PackageId, ProviderRoute } from '../shared/constants/runtime.js';
import type { OpenAIHubLogEvent } from '../shared/logging.js';
import { AccountsRuntime } from './accounts-runtime.js';
import { HubAdapter } from './hub-adapter.js';
import { OpenAIHubLogging } from './logging.js';
import { OpenAICodexRemoteService } from './remote-service.js';

export class OpenAICodexAuthService {
    static inject = ['llm', 'credentials', 'configEditor'];
    static Config = Config;
    static name = PackageId;
    constructor(ctx: Context, config: z.infer<typeof Config> = Config.parse({})) {
        const logging = new OpenAIHubLogging(message => {
            console.error(`[${PackageId}] ${message}`);
            ctx.logger.error(`[${PackageId}] ${message}`);
        });
        const runtime = new AccountsRuntime(ctx, config, logging);
        ctx.llm.registerAdapter([ProviderRoute], new HubAdapter(ctx, runtime, logging));
        const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
            try {
                return await operation();
            } catch {
                const message = 'OpenAI Hub operation failed; retry or check account settings';
                console.error(`[${PackageId}] ${message}`);
                ctx.logger.error(`[${PackageId}] ${message}`);
                throw new Error(message);
            }
        };
        const track = async <T>(
            event: OpenAIHubLogEvent['event'],
            operation: NonNullable<OpenAIHubLogEvent['operation']>,
            action: () => Promise<T>,
            details: Pick<OpenAIHubLogEvent, 'accountLabel' | 'authMethod'> = {},
            stateFor?: (value: T) => OpenAIHubLogEvent['state']
        ): Promise<T> => {
            const startedAt = Date.now();
            void logging.recordHost({ event, phase: 'started', operation, ...details });
            try {
                const result = await guard(action);
                void logging.recordHost({
                    event,
                    phase: 'completed',
                    operation,
                    durationMs: Date.now() - startedAt,
                    ...(stateFor ? { state: stateFor(result) } : {}),
                    ...details
                });
                return result;
            } catch {
                void logging.recordHost({
                    event,
                    phase: 'failed',
                    operation,
                    durationMs: Date.now() - startedAt,
                    errorCode: 'request_failed',
                    ...details
                });
                throw new Error('OpenAI Hub operation failed; retry or check account settings');
            }
        };
        void new OpenAICodexRemoteService(ctx, {
            snapshot: () =>
                track(
                    'snapshot',
                    'snapshot',
                    () => runtime.snapshot(),
                    {},
                    snapshot => snapshot.status
                ),
            loadLoggingSettings: () => track('settings', 'loadLoggingSettings', () => logging.loadSettings()),
            saveLoggingSettings: input =>
                track(
                    'settings',
                    'setLoggingEnabled',
                    async () => {
                        const settings = await logging.saveSettings(input);
                        void logging.recordHost({
                            event: 'settings',
                            phase: settings.enabled ? 'enabled' : 'disabled',
                            operation: 'setLoggingEnabled'
                        });
                        return settings;
                    },
                    {},
                    settings => (settings.enabled ? 'done' : 'idle')
                ),
            async recordClientLog(input) {
                await guard(async () => {
                    await logging.recordClient(input);
                    return true;
                });
                return true;
            },
            startLogin: input =>
                track('login', 'startLogin', () => runtime.startLogin(input), {
                    accountLabel: input.accountLabel,
                    authMethod: input.authMethod
                }),
            cancelLogin: () => track('login', 'cancelLogin', () => runtime.cancelLogin()),
            submitCallbackUrl: input => track('login', 'submitCallbackUrl', () => runtime.submitCallbackUrl(input)),
            updateAccount: input =>
                track('account_update', 'updateAccount', () => runtime.updateAccount(input), { accountLabel: input.accountLabel }),
            deleteAccount: input =>
                track('account_delete', 'deleteAccount', () => runtime.deleteAccount(input), { accountLabel: input.accountLabel }),
            refreshCatalog: input =>
                track('catalog_refresh', 'refreshCatalog', () => runtime.refreshCatalog(input), { accountLabel: input.accountLabel }),
            refreshUsage: input =>
                track('usage_refresh', 'refreshUsage', () => runtime.refreshUsage(input), { accountLabel: input.accountLabel }),
            saveModels: input => track('models_save', 'saveModels', () => runtime.saveModels(input), { accountLabel: input.accountLabel }),
            consumeReset: input => track('reset', 'consumeReset', () => runtime.consumeReset(input), { accountLabel: input.accountLabel }),
            async reportUiError() {
                console.error(`[${PackageId}] Client UI render failed`);
                ctx.logger.error(`[${PackageId}] Client UI render failed`);
                await logging.recordHost({ event: 'ui_render', phase: 'failed', errorCode: 'unknown' });
                return true;
            },
            async reportUiReady() {
                await logging.recordHost({ event: 'plugin', phase: 'ready' });
                return true;
            }
        });
        // Zod-конфигурация проходит обычный remount Loader, поэтому незавершенный первый каталог продолжает новый экземпляр.
        for (const account of runtime.accounts)
            if (!account.config.catalogLoaded)
                void runtime.refreshCatalog({ accountLabel: account.config.accountLabel }).catch(() => undefined);
        ctx.logger.info(`[${PackageId}] Host initialized`);
        void logging.recordHost({ event: 'plugin', phase: 'started' });
    }
}
export { Config };
export const name = PackageId;
export const inject = OpenAICodexAuthService.inject;
export default OpenAICodexAuthService;
