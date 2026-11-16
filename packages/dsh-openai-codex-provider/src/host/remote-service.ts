import type { Context } from '@deepseek-ai/cordis';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { RemoteNamespace, ServiceKey } from '../shared/constants/runtime.js';
import type { ModelSettings, OpenAICodexSnapshot, ResetRequest, UiComponentId, UiRenderError } from '../shared/remote.js';

export interface OpenAICodexRemoteHandlers {
    snapshot(): Promise<OpenAICodexSnapshot>;
    startLogin(): Promise<OpenAICodexSnapshot>;
    logout(): Promise<OpenAICodexSnapshot>;
    followHostProxy(): Promise<OpenAICodexSnapshot>;
    useSystemProxy(): Promise<OpenAICodexSnapshot>;
    consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot>;
    saveModels(models: ModelSettings): Promise<OpenAICodexSnapshot>;
    reportUiError(error: UiRenderError): Promise<true>;
    reportUiReady(componentId: UiComponentId): Promise<true>;
}

/** Экспортирует только проверяемые снимки и команды управления, без OAuth-секретов. */
export class OpenAICodexRemoteService extends TypertRemoteService {
    private readonly handlers: OpenAICodexRemoteHandlers;

    constructor(ctx: Context, handlers: OpenAICodexRemoteHandlers) {
        super(ctx, ServiceKey, { namespace: RemoteNamespace });
        this.handlers = handlers;
    }

    @Remote
    snapshot(): Promise<OpenAICodexSnapshot> {
        return this.handlers.snapshot();
    }
    @Remote
    startLogin(): Promise<OpenAICodexSnapshot> {
        return this.handlers.startLogin();
    }
    @Remote
    logout(): Promise<OpenAICodexSnapshot> {
        return this.handlers.logout();
    }
    @Remote
    followHostProxy(): Promise<OpenAICodexSnapshot> {
        return this.handlers.followHostProxy();
    }
    @Remote
    useSystemProxy(): Promise<OpenAICodexSnapshot> {
        return this.handlers.useSystemProxy();
    }
    @Remote
    consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.consumeReset(input);
    }
    @Remote
    saveModels(models: ModelSettings): Promise<OpenAICodexSnapshot> {
        return this.handlers.saveModels(models);
    }
    @Remote
    reportUiError(error: UiRenderError): Promise<true> {
        return this.handlers.reportUiError(error);
    }
    @Remote
    reportUiReady(componentId: UiComponentId): Promise<true> {
        return this.handlers.reportUiReady(componentId);
    }
}
