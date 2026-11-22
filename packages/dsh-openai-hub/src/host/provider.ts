import type { Model, Provider } from '@earendil-works/pi-ai';
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex';
import type { ModelChoice } from '../shared/accounts.ts';
import { ProviderRoute } from '../shared/constants/runtime.ts';

export type CodexModel = Model<'openai-codex-responses'>;
export const DEFAULT_CODEX_REASONING_LEVEL = 'medium';
export function createCodexProvider(models?: readonly CodexModel[], settings?: readonly ModelChoice[]): Provider<'openai-codex-responses'> {
    const provider = openaiCodexProvider();
    const catalog = models ?? provider.getModels();
    return {
        ...provider,
        id: ProviderRoute,
        name: 'OpenAI Hub',
        auth: {
            ...provider.auth,
            apiKey: {
                name: 'OpenAI Hub',
                async resolve({ credential }) {
                    return credential?.type === 'api_key' && credential.key
                        ? { auth: { apiKey: credential.key }, source: 'OpenAI Hub' }
                        : undefined;
                }
            }
        },
        stream(model, context, options) {
            const clean = { ...options };
            delete clean.temperature;
            return provider.stream<'openai-codex-responses'>(model, context, clean);
        },
        streamSimple(model, context, options) {
            const clean = { ...options };
            delete clean.temperature;
            return provider.streamSimple(model, context, clean);
        },
        getModels() {
            if (!settings) return catalog.map(model => ({ ...model, provider: ProviderRoute }));
            return settings.flatMap(preference => {
                const model = catalog.find(item => item.id === preference.id);
                return model && preference.enabled ? [{ ...model, provider: ProviderRoute, name: preference.name }] : [];
            });
        }
    };
}
