import type { Context } from '@deepseek-ai/cordis';
import { createHostLogger, createOptionalLogger } from '@kalex/dsh-logger-core';
import type { z } from 'zod';
import { Config } from '../shared/accounts.ts';
import { PackageId, ProviderRoute } from '../shared/constants/runtime.ts';
import type { OpenAIHubLogEvent } from '../shared/logging.ts';
import { AccountsRuntime } from './accounts-runtime.ts';
import { HubAdapter } from './hub-adapter.ts';
import { createHubLogger } from './logging.ts';
import { OpenAICodexRemoteService } from './remote-service.ts';

export class OpenAICodexAuthService {
    static inject = ['llm', 'credentials', 'configEditor'];
    static Config = Config;
    static name = PackageId;
    constructor(ctx: Context, config: z.infer<typeof Config> = Config.parse({})) {
        const scopedLogger = createOptionalLogger(ctx, PackageId);
        const logger = createHostLogger(scopedLogger);
        const logging = createHubLogger(scopedLogger);
        const runtime = new AccountsRuntime(ctx, config, logging);
        ctx.llm.registerAdapter([ProviderRoute], new HubAdapter(ctx, runtime, logging));
        const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
            try {
                return await operation();
            } catch {
                const message = 'OpenAI Hub operation failed; retry or check account settings';
                logger.error(message, { event: 'operation', operation: 'guard' });
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
            if (operation !== 'snapshot') void logging({ event, phase: 'started', operation, ...details });
            try {
                const result = await guard(action);
                if (operation !== 'snapshot')
                    void logging({
                        event,
                        phase: 'completed',
                        operation,
                        durationMs: Date.now() - startedAt,
                        ...(stateFor ? { state: stateFor(result) } : {}),
                        ...details
                    });
                return result;
            } catch {
                void logging({
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
            startLogin: input =>
                track('login', 'startLogin', () => runtime.startLogin(input), {
                    accountLabel: input.accountLabel,
                    authMethod: input.authMethod
                }),
            cancelLogin: () => track('login', 'cancelLogin', () => runtime.cancelLogin()),
            retryLogin: () => track('login', 'retryLogin', () => runtime.retryLogin()),
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
                logger.error('Client UI render failed', { event: 'ui_render', operation: 'reportUiError' });
                await logging({ event: 'ui_render', phase: 'failed', errorCode: 'unknown' });
                return true;
            },
            async reportUiReady() {
                await logging({ event: 'plugin', phase: 'ready' });
                return true;
            }
        });
        // Zod-конфигурация проходит обычный remount Loader, поэтому незавершенный первый каталог продолжает новый экземпляр.
        for (const account of runtime.accounts)
            if (!account.config.catalogLoaded)
                void runtime.refreshCatalog({ accountLabel: account.config.accountLabel }).catch(() => undefined);
        void logging({ event: 'plugin', phase: 'started', diagnosticVersion: 3 });
    }
}
export { Config };
export const name = PackageId;
export const inject = OpenAICodexAuthService.inject;
export default OpenAICodexAuthService;
