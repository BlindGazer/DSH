import type { Context } from '@deepseek-ai/cordis';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { RemoteNamespace, ServiceKey } from '../shared/constants/runtime.js';
import type { OpenAIHubClientLogEvent, OpenAIHubLogSettings } from '../shared/logging.js';
import type {
    AccountRequest,
    LoginRequest,
    OpenAICodexSnapshot,
    OpenAIHubRemote,
    ResetRequest,
    SaveModelsRequest,
    SubmitCallbackUrlRequest,
    UiComponentId,
    UiRenderError,
    UpdateAccountRequest
} from '../shared/remote.js';
export interface OpenAICodexRemoteHandlers extends OpenAIHubRemote {}
export class OpenAICodexRemoteService extends TypertRemoteService {
    constructor(
        ctx: Context,
        private readonly handlers: OpenAICodexRemoteHandlers
    ) {
        super(ctx, ServiceKey, { namespace: RemoteNamespace });
    }
    @Remote snapshot(): Promise<OpenAICodexSnapshot> {
        return this.handlers.snapshot();
    }
    @Remote loadLoggingSettings(): Promise<OpenAIHubLogSettings> {
        return this.handlers.loadLoggingSettings();
    }
    @Remote saveLoggingSettings(input: OpenAIHubLogSettings): Promise<OpenAIHubLogSettings> {
        return this.handlers.saveLoggingSettings(input);
    }
    @Remote recordClientLog(input: OpenAIHubClientLogEvent): Promise<true> {
        return this.handlers.recordClientLog(input);
    }
    @Remote startLogin(input: LoginRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.startLogin(input);
    }
    @Remote cancelLogin(): Promise<OpenAICodexSnapshot> {
        return this.handlers.cancelLogin();
    }
    @Remote submitCallbackUrl(input: SubmitCallbackUrlRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.submitCallbackUrl(input);
    }
    @Remote updateAccount(input: UpdateAccountRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.updateAccount(input);
    }
    @Remote deleteAccount(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.deleteAccount(input);
    }
    @Remote refreshCatalog(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.refreshCatalog(input);
    }
    @Remote refreshUsage(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.refreshUsage(input);
    }
    @Remote saveModels(input: SaveModelsRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.saveModels(input);
    }
    @Remote consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot> {
        return this.handlers.consumeReset(input);
    }
    @Remote reportUiError(error: UiRenderError): Promise<true> {
        return this.handlers.reportUiError(error);
    }
    @Remote reportUiReady(componentId: UiComponentId): Promise<true> {
        return this.handlers.reportUiReady(componentId);
    }
}
