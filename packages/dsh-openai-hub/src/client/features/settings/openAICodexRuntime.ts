import type { DshActiveLocale, DshLocalizedClientContext, DshSlotRegistrationOptions, DshTranslate } from '@kalex/dsh-core';
import { createClientLogger } from '@kalex/dsh-logger-core';
import type { ReactElement } from 'react';
import { createElement, useSyncExternalStore } from 'react';
import type { AuthMethod, ModelChoice } from '../../../shared/accounts.ts';
import type {
    AccountSnapshot,
    OpenAICodexSnapshot,
    OpenAIHubRemote,
    TYPERT_REMOTE,
    UiComponentId,
    UiRenderError
} from '../../../shared/remote.ts';
import { CodexRenderErrorBoundary } from './CodexRenderErrorBoundary.tsx';
import type { ModelDirectories } from './modelSelectionSource.ts';
import type { OpenAIHubWireRemote } from './remoteBoundary.ts';

export type OpenAICodexRemote = OpenAIHubRemote;
interface RemoteMountService {
    $mount(contribution: typeof TYPERT_REMOTE): Promise<() => Promise<void> | void>;
}
export interface OpenAICodexClientContext extends DshLocalizedClientContext {
    readonly remote: RemoteMountService;
    readonly modelDirectories: ModelDirectories;
    get(name: string): OpenAIHubWireRemote | undefined;
    effect(callback: () => undefined | (() => void), label?: string): void;
}
export interface CodexClientState {
    readonly status: 'loading' | 'ready' | 'error';
    readonly snapshot?: OpenAICodexSnapshot;
    readonly error?: string;
}

export class OpenAICodexController {
    private state: CodexClientState = { status: 'loading' };
    private readonly listeners = new Set<() => void>();
    private generation = 0;
    private inFlight: Promise<void> | undefined;
    private reconcileAfterFlight = false;
    constructor(private readonly remote: OpenAIHubRemote) {}
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    getSnapshot = (): CodexClientState => this.state;
    private publish(state: CodexClientState): void {
        this.state = state;
        for (const listener of this.listeners) listener();
    }
    private readonly logger = createClientLogger();
    private log(input: { event: string; operation?: string; phase?: string; durationMs?: number; errorCode?: string }): void {
        this.logger.info(input.event, {
            event: input.event,
            ...(input.operation ? { operation: input.operation } : {}),
            ...(input.phase ? { phase: input.phase } : {}),
            ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
            ...(input.errorCode ? { errorCode: input.errorCode } : {})
        });
    }
    async load(background = false): Promise<void> {
        if (this.inFlight) return this.inFlight;
        const generation = ++this.generation;
        if (!background && !this.state.snapshot) this.publish({ status: 'loading' });
        this.inFlight = (async () => {
            try {
                const snapshot = await this.remote.snapshot();
                if (generation === this.generation) this.publish({ status: 'ready', snapshot });
            } catch {
                this.log({ event: 'snapshot', phase: 'failed', operation: 'snapshot', errorCode: 'request_failed' });
                if (generation === this.generation)
                    this.publish({
                        status: 'error',
                        error: 'OpenAI Hub request failed',
                        ...(this.state.snapshot ? { snapshot: this.state.snapshot } : {})
                    });
            } finally {
                this.inFlight = undefined;
                if (this.reconcileAfterFlight) {
                    this.reconcileAfterFlight = false;
                    this.reconcile();
                }
            }
        })();
        return this.inFlight;
    }
    private reconcile(): void {
        if (this.inFlight) this.reconcileAfterFlight = true;
        else void this.load(true);
    }
    private async act(
        details: { event: string; operation?: string; accountLabel?: string; authMethod?: AuthMethod },
        action: () => Promise<OpenAICodexSnapshot>,
        beforePublish?: (snapshot: OpenAICodexSnapshot) => void
    ): Promise<OpenAICodexSnapshot> {
        const generation = ++this.generation;
        const startedAt = Date.now();
        this.log({ ...details, phase: 'started' });
        try {
            const snapshot = await action();
            beforePublish?.(snapshot);
            if (generation === this.generation) this.publish({ status: 'ready', snapshot });
            else this.reconcile();
            this.log({ ...details, phase: 'completed', durationMs: Date.now() - startedAt });
            return snapshot;
        } catch {
            this.log({
                ...details,
                phase: 'failed',
                durationMs: Date.now() - startedAt,
                errorCode: details.event === 'login' ? 'oauth_failed' : 'request_failed'
            });
            this.reconcile();
            throw new Error('OpenAI Hub request failed');
        }
    }
    async startLogin(accountLabel: string, authMethod: AuthMethod, reauthenticate = false): Promise<OpenAICodexSnapshot> {
        const snapshot = await this.act({ event: 'login', operation: 'startLogin', accountLabel, authMethod }, () =>
            this.remote.startLogin({ accountLabel, authMethod, ...(reauthenticate ? { reauthenticate: true } : {}) })
        );
        const account = snapshot.accounts.find(candidate => candidate.accountLabel === accountLabel);
        return snapshot.status === 'done' && account && account.catalogStatus !== 'ready' ? this.refreshCatalog(accountLabel) : snapshot;
    }
    cancelLogin(): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'login', operation: 'cancelLogin' }, () => this.remote.cancelLogin());
    }
    retryLogin(): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'login', operation: 'retryLogin' }, () => this.remote.retryLogin());
    }
    submitCallbackUrl(url: string): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'login', operation: 'submitCallbackUrl' }, () => this.remote.submitCallbackUrl({ url }));
    }
    updateAccount(
        accountLabel: string,
        newLabel: string,
        autoRefreshLimits: boolean,
        beforePublish?: (snapshot: OpenAICodexSnapshot) => void
    ): Promise<OpenAICodexSnapshot> {
        const previous = this.state.snapshot?.accounts.find(account => account.accountLabel === accountLabel);
        return this.act(
            { event: 'account_update', operation: 'updateAccount', accountLabel },
            async () => {
                const snapshot = await this.remote.updateAccount({ accountLabel, newLabel, autoRefreshLimits });
                if (!previous || previous.autoRefreshLimits === autoRefreshLimits) return snapshot;
                return {
                    ...snapshot,
                    accounts: snapshot.accounts.map(account =>
                        account.accountLabel === newLabel && account.usageUpdatedAt <= previous.usageUpdatedAt
                            ? {
                                  ...account,
                                  usageStatus: previous.usageStatus,
                                  usageLimited: previous.usageLimited,
                                  usageLimits: previous.usageLimits,
                                  usageCredits: previous.usageCredits,
                                  usageCreditsUnlimited: previous.usageCreditsUnlimited,
                                  usageResetCredits: previous.usageResetCredits,
                                  resetCards: previous.resetCards,
                                  resetCardsStatus: previous.resetCardsStatus,
                                  usageUpdatedAt: previous.usageUpdatedAt,
                                  usageError: previous.usageError
                              }
                            : account
                    )
                };
            },
            beforePublish
        );
    }
    deleteAccount(accountLabel: string): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'account_delete', operation: 'deleteAccount', accountLabel }, () =>
            this.remote.deleteAccount({ accountLabel })
        );
    }
    refreshCatalog(accountLabel: string): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'catalog_refresh', operation: 'refreshCatalog', accountLabel }, () =>
            this.remote.refreshCatalog({ accountLabel })
        );
    }
    refreshUsage(accountLabel: string): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'usage_refresh', operation: 'refreshUsage', accountLabel }, () =>
            this.remote.refreshUsage({ accountLabel })
        );
    }
    saveModels(accountLabel: string, models: readonly ModelChoice[]): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'models_save', operation: 'saveModels', accountLabel }, () =>
            this.remote.saveModels({ accountLabel, models: models.map(model => ({ ...model })) })
        );
    }
    consumeReset(input: Parameters<OpenAIHubRemote['consumeReset']>[0]): Promise<OpenAICodexSnapshot> {
        return this.act({ event: 'reset', operation: 'consumeReset', accountLabel: input.accountLabel }, () =>
            this.remote.consumeReset(input)
        );
    }
}
export function useCodexState(controller: OpenAICodexController): CodexClientState {
    return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}

export function registerCodexSlot<TProps extends object>(
    context: OpenAICodexClientContext,
    options: DshSlotRegistrationOptions & { readonly locale: string },
    component: (props: TProps & { locale: DshActiveLocale; text: DshTranslate }) => ReactElement | undefined,
    props: TProps,
    onError: (error: UiRenderError) => Promise<true>,
    onReady: (componentId: UiComponentId) => Promise<true>
): void {
    const componentId = options.id ?? options.name;
    context.slots.inject(options.name, () =>
        context.slots.register<{ sessionId?: string }>(options, ({ t, ...slotProps }) =>
            createElement(
                CodexRenderErrorBoundary,
                { fallbackText: t('renderFailure'), componentId, onError, onReady },
                createElement(component, { ...slotProps, ...props, locale: context.locale.getSnapshot().active, text: t })
            )
        )
    );
}
export { RemoteNamespace, ServiceKey } from '../../../shared/constants/runtime.ts';
export type { AccountSnapshot };
