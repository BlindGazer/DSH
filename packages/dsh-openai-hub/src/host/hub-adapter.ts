import type { Context } from '@deepseek-ai/cordis';
import type { GenerateOptions, LlmModelInfo, LlmResolvedModelInfo, PreparedAdapterCall, StreamChunk } from '@deepseek-ai/dsh-llm';
import { LlmAdapter, LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm';
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import { splitModelId } from '../shared/accounts.ts';
import { ProviderRoute } from '../shared/constants/runtime.ts';
import type { AccountsRuntime } from './accounts-runtime.ts';
import type { HubLogger } from './logging.ts';
import { createCodexProvider } from './provider.ts';

export class HubAdapter extends LlmAdapter {
    constructor(
        private readonly ctx: Context,
        private readonly runtime: AccountsRuntime,
        private readonly logging: HubLogger
    ) {
        super();
    }
    override providerInfo() {
        return { id: ProviderRoute, name: 'OpenAI Hub' };
    }
    override providerRetryPolicy() {
        return resolveRetryPolicy(undefined, 'openai-hub.retryPolicy');
    }
    override async listModels(): Promise<readonly LlmModelInfo[]> {
        const snapshot = await this.runtime.snapshot();
        return snapshot.accounts
            .filter(account => account.loggedIn)
            .flatMap(account =>
                account.models
                    .filter(model => model.enabled)
                    .map(model => ({
                        provider: ProviderRoute,
                        id: `${account.accountLabel}/${model.id}`,
                        name: `${account.accountLabel}/${model.id}`
                    }))
            );
    }
    private resolve(id: string) {
        const { accountLabel, upstreamModelId } = splitModelId(id);
        const account = this.runtime.find(accountLabel);
        if (!account.config.models.some(model => model.id === upstreamModelId && model.enabled))
            throw new LlmError('Stale OpenAI Hub model; select a current model', 'MODEL_UNSUPPORTED');
        // Внутренний снимок вызова не регистрирует аккаунт как отдельный маршрут и не разделяет состояние параллельных запросов.
        const profile: ResolvedPiAiProviderProfile = {
            provider: ProviderRoute,
            displayName: 'OpenAI Hub',
            reasoning: 'medium',
            streamIdleTimeoutMs: 300000,
            maxRequestImageBytes: 20971520,
            maxRequestImages: 50,
            imageOffloadCountQuantum: 10,
            requestImagePixelBudget: 4194304,
            requestImageMaxBytes: 1048576,
            retryPolicy: this.providerRetryPolicy(),
            piProvider: createCodexProvider(account.catalog, account.config.models),
            modelErrors: new Map(),
            configuredMaxTokens: new Map()
        };
        const profiles = new Map([[ProviderRoute, profile]]);
        const adapter = new PiAiAdapter({
            profiles: () => profiles,
            auth: {
                credentials: {
                    async read() {
                        return undefined;
                    },
                    async list() {
                        return [];
                    },
                    async modify() {
                        return undefined;
                    },
                    async delete() {}
                },
                authContext: {
                    async env() {
                        return undefined;
                    },
                    async fileExists() {
                        return false;
                    }
                }
            },
            resolveApiKey: async () => {
                try {
                    return (await this.runtime.credentials.valid(account.config, () => this.runtime.current(account, accountLabel))).access;
                } catch {
                    throw new LlmError('OpenAI Hub account requires sign-in', 'MISSING_CREDENTIAL');
                }
            },
            resolveAttachments: () => this.ctx.get('attachments')
        });
        return { account, accountLabel, upstreamModelId, adapter };
    }
    override imageRequestTarget(
        _provider: string,
        model: string,
        image: Parameters<LlmAdapter['imageRequestTarget']>[2]
    ): ReturnType<LlmAdapter['imageRequestTarget']> {
        const resolved = this.resolve(model);
        return resolved.adapter.imageRequestTarget(ProviderRoute, resolved.upstreamModelId, image);
    }
    override async resolveModel(_provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo> {
        const resolved = this.resolve(model);
        const metadata = await resolved.adapter.resolveModel(ProviderRoute, resolved.upstreamModelId, signal);
        return { ...metadata, provider: ProviderRoute, id: model, name: model };
    }
    override async prepareCall(_provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall> {
        const resolved = this.resolve(model);
        const prepared = await resolved.adapter.prepareCall(ProviderRoute, resolved.upstreamModelId, signal);
        return {
            model: { ...prepared.model, provider: ProviderRoute, id: model, name: model },
            stream: options => {
                if (!this.runtime.current(resolved.account, resolved.accountLabel))
                    throw new LlmError('Stale OpenAI Hub account', 'MODEL_UNSUPPORTED');
                return this.safeStream(
                    prepared.stream({ ...options, provider: ProviderRoute, model: resolved.upstreamModelId }),
                    resolved.accountLabel
                );
            }
        };
    }
    private async *safeStream(stream: AsyncIterable<StreamChunk>, accountLabel: string): AsyncIterable<StreamChunk> {
        const startedAt = Date.now();
        let failed = false;
        await this.logging({ event: 'provider_request', phase: 'started', accountLabel });
        try {
            for await (const chunk of stream) {
                if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
                    failed = true;
                    const failure = chunk.reason.failure;
                    await this.logging({
                        event: 'provider_request',
                        phase: 'failed',
                        errorCode: 'request_failed',
                        durationMs: Date.now() - startedAt,
                        accountLabel
                    });
                    yield {
                        ...chunk,
                        reason: {
                            ...chunk.reason,
                            failure: {
                                code: failure.code,
                                message: 'OpenAI Hub request failed',
                                ...(failure.status === undefined ? {} : { status: failure.status }),
                                ...(failure.providerRetryAfterMs === undefined
                                    ? {}
                                    : { providerRetryAfterMs: failure.providerRetryAfterMs }),
                                ...(failure.offloadImages === undefined ? {} : { offloadImages: failure.offloadImages })
                            }
                        }
                    };
                } else yield chunk;
            }
            if (!failed)
                await this.logging({
                    event: 'provider_request',
                    phase: 'completed',
                    durationMs: Date.now() - startedAt,
                    accountLabel
                });
        } catch {
            await this.logging({
                event: 'provider_request',
                phase: 'failed',
                errorCode: 'request_failed',
                durationMs: Date.now() - startedAt,
                accountLabel
            });
            void this.logging({
                event: 'provider_request',
                phase: 'failed',
                errorCode: 'request_failed',
                accountLabel
            });
            throw new LlmError('OpenAI Hub request failed', 'PI_AI_ERROR');
        }
    }
    override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
        const prepared = await this.prepareCall(options.provider, options.model, options.signal);
        yield* prepared.stream(options);
    }
}
