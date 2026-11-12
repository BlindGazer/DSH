import type { ApiStreamOptions, Model, Provider, SimpleStreamOptions } from '@earendil-works/pi-ai';
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex';

const SELECTABLE_REASONING_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
const DEFAULT_CODEX_REASONING_LEVEL = 'medium';
type CodexModel = Model<'openai-codex-responses'>;
type CodexStreamOptions = ApiStreamOptions<'openai-codex-responses'>;
type NetworkOptions = Partial<CodexStreamOptions> & Partial<SimpleStreamOptions>;

interface NetworkLease {
    options?: NetworkOptions;
    release(): void;
}

interface ModelPreference {
    id: string;
    enabled?: boolean;
    name?: string;
}

type NetworkOptionsSource = NetworkOptions | (() => NetworkLease | undefined);
type CodexStream = ReturnType<Provider<'openai-codex-responses'>['stream']>;

function releaseWhenFinished(stream: CodexStream, lease: NetworkLease | undefined): CodexStream {
    if (lease) void stream.result().then(lease.release.bind(lease), lease.release.bind(lease));
    return stream;
}

const dshAccessTokenAuth: NonNullable<Provider['auth']['apiKey']> = {
    name: 'DSH OpenAI Codex OAuth token',
    async resolve({ credential }) {
        if (credential?.type !== 'api_key' || typeof credential.key !== 'string' || credential.key.length === 0) {
            return undefined;
        }
        return {
            auth: { apiKey: credential.key },
            source: 'DSH OpenAI Codex OAuth'
        };
    }
};

function codexModel(model: CodexModel): CodexModel {
    if (!model.reasoning) return model;
    const thinkingLevelMap: NonNullable<CodexModel['thinkingLevelMap']> = {};
    for (const level of SELECTABLE_REASONING_LEVELS) {
        const mapped = model.thinkingLevelMap?.[level];
        if (typeof mapped === 'string') {
            thinkingLevelMap[level] = mapped;
        } else if (mapped === undefined && level !== 'xhigh' && level !== 'max') {
            thinkingLevelMap[level] = level;
        }
    }
    return { ...model, thinkingLevelMap };
}

function createCodexProvider(
    networkOptions?: NetworkOptionsSource,
    modelSettings: readonly ModelPreference[] = []
): Provider<'openai-codex-responses'> {
    const provider = openaiCodexProvider();
    const preferences = new Map(modelSettings.map(model => [model.id, model]));
    const order = new Map(modelSettings.map((model, index) => [model.id, index]));

    function leaseForRequest(): NetworkLease | undefined {
        return typeof networkOptions === 'function' ? networkOptions() : undefined;
    }

    return {
        ...provider,
        auth: { ...provider.auth, apiKey: dshAccessTokenAuth },
        stream(model, context, options) {
            const lease = leaseForRequest();
            try {
                const streamOptions: CodexStreamOptions = { ...options, ...(lease?.options ?? networkOptions) };
                delete streamOptions.temperature;
                return releaseWhenFinished(provider.stream<'openai-codex-responses'>(model, context, streamOptions), lease);
            } catch (error) {
                lease?.release();
                throw error;
            }
        },
        streamSimple(model, context, options) {
            const lease = leaseForRequest();
            try {
                const streamOptions: SimpleStreamOptions = { ...options, ...(lease?.options ?? networkOptions) };
                delete streamOptions.temperature;
                return releaseWhenFinished(provider.streamSimple(model, context, streamOptions), lease);
            } catch (error) {
                lease?.release();
                throw error;
            }
        },
        getModels() {
            const models = provider.getModels().map(codexModel);
            if (preferences.size === 0) return models;
            return models
                .filter(model => preferences.get(model.id)?.enabled !== false)
                .map(model => {
                    const preference = preferences.get(model.id);
                    return preference?.name ? { ...model, name: preference.name } : model;
                })
                .toSorted(
                    (left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
                );
        }
    };
}

export { createCodexProvider, DEFAULT_CODEX_REASONING_LEVEL };
