import { z } from 'zod';
import type { OpenAIHubLogEvent } from '../shared/logging.js';
import type { CodexModel } from './provider.js';
import { createCodexProvider } from './provider.js';
import { readUsageJson } from './usage.js';

export const CATALOG_URL = 'https://chatgpt.com/backend-api/codex/models?client_version=0.116.0';
const IdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,199}$/);
const EntrySchema = z
    .object({
        slug: IdSchema.optional(),
        id: IdSchema.optional(),
        context_window: z.number().positive().optional(),
        max_output_tokens: z.number().positive().optional()
    })
    .refine(entry => Boolean(entry.slug ?? entry.id));
const CatalogSchema = z.union([
    z.object({ models: z.array(EntrySchema).max(100) }),
    z.object({ data: z.array(EntrySchema).max(100) }).transform(value => ({ models: value.data }))
]);
export function localCatalog(): CodexModel[] {
    return [...createCodexProvider().getModels()];
}
export function catalogForIds(ids: readonly string[]): CodexModel[] {
    const local = localCatalog();
    const template = local[0];
    if (ids.length === 0) return [];
    if (!template) throw new Error('OpenAI Hub local model metadata is unavailable');
    return [...new Set(ids)].map(id => ({ ...(local.find(model => model.id === id) ?? template), id, name: id }));
}

export function mergeCatalog(remote: readonly CodexModel[]): CodexModel[] {
    const local = localCatalog();
    const merged = new Map(local.map(model => [model.id, model]));
    for (const model of remote) merged.set(model.id, { ...merged.get(model.id), ...model });
    return [...merged.values()];
}
interface CatalogDiagnostic {
    endpoint: 'codex_models';
    httpStatus: number;
    responseShape: 'models' | 'data' | 'invalid';
    count: number;
    requestJson: NonNullable<OpenAIHubLogEvent['requestJson']>;
    responseJson: NonNullable<OpenAIHubLogEvent['responseJson']>;
}

export async function requestCatalog(
    credential: { access: string; accountId: string },
    fetchImpl = globalThis.fetch,
    report?: (diagnostic: CatalogDiagnostic) => void
): Promise<CodexModel[]> {
    const response = await fetchImpl(CATALOG_URL, {
        headers: { Authorization: `Bearer ${credential.access}`, 'chatgpt-account-id': credential.accountId, Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(10000)
    });
    const requestJson: NonNullable<OpenAIHubLogEvent['requestJson']> = { endpoint: 'codex_models', method: 'GET', body: 'none' };
    const responseFields: NonNullable<OpenAIHubLogEvent['responseJson']>['fields'] = [];
    const reportResponse = (
        shape: NonNullable<OpenAIHubLogEvent['responseJson']>['shape'],
        fields: NonNullable<OpenAIHubLogEvent['responseJson']>['fields'],
        itemCount = 0
    ) =>
        report?.({
            endpoint: 'codex_models',
            httpStatus: response.status,
            responseShape: shape === 'models' || shape === 'data' ? shape : 'invalid',
            count: itemCount,
            requestJson,
            responseJson: {
                status: response.status,
                contentType: response.headers.get('content-type')?.toLowerCase().includes('application/json')
                    ? 'application/json'
                    : response.headers.has('content-type')
                      ? 'other'
                      : 'missing',
                shape,
                fields,
                itemCount
            }
        });
    if (!response.ok) {
        reportResponse('invalid', responseFields);
        await response.body?.cancel().catch(() => undefined);
        throw new Error('OpenAI Hub catalog request failed');
    }
    const raw = await readUsageJson(response).catch(() => {
        reportResponse('invalid', responseFields);
        throw new Error('OpenAI Hub catalog response was invalid');
    });
    const shape =
        raw !== null && typeof raw === 'object' && !Array.isArray(raw)
            ? 'models' in raw
                ? 'models'
                : 'data' in raw
                  ? 'data'
                  : 'invalid'
            : 'invalid';
    const parsed = CatalogSchema.safeParse(raw);
    if (!parsed.success) {
        reportResponse('invalid', responseFields);
        throw new Error('OpenAI Hub catalog response was invalid');
    }
    const remoteModels = catalogForIds(parsed.data.models.flatMap(entry => entry.slug ?? entry.id ?? []));
    const enriched = remoteModels.map(model => {
        const entry = parsed.data.models.find(item => (item.slug ?? item.id) === model.id);
        return {
            ...model,
            ...(entry?.context_window ? { contextWindow: entry.context_window } : {}),
            ...(entry?.max_output_tokens ? { maxTokens: entry.max_output_tokens } : {})
        };
    });
    const models = mergeCatalog(enriched);
    const fields: NonNullable<OpenAIHubLogEvent['responseJson']>['fields'] =
        shape === 'models' ? ['models'] : shape === 'data' ? ['data'] : [];
    reportResponse(shape, fields, parsed.data.models.length);
    return models;
}
