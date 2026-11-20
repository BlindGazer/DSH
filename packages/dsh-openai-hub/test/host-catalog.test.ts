import { describe, expect, it, vi } from 'vitest';
import { CATALOG_URL, localCatalog, requestCatalog } from '../src/host/catalog.js';

describe('authenticated Codex catalog', () => {
    it('loads synthetic Sol/Astra 6.2 entries and uses protected headers only on the upstream request', async () => {
        const fetchImpl = vi.fn<typeof fetch>(
            async () =>
                new Response(
                    JSON.stringify({
                        models: [
                            { slug: 'gpt-6.2-sol', context_window: 200000, max_output_tokens: 32000 },
                            { slug: 'gpt-6.2-astra', context_window: 400000, max_output_tokens: 64000 },
                            { slug: 'gpt-6.2-sol' }
                        ]
                    }),
                    { status: 200 }
                )
        );
        const diagnostics: Array<{ endpoint: string; httpStatus: number; responseShape: string; count: number }> = [];
        const models = await requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl, value =>
            diagnostics.push(value)
        );
        expect(models.map(model => [model.id, model.contextWindow, model.maxTokens])).toEqual(
            expect.arrayContaining([
                ['gpt-6.2-sol', 200000, 32000],
                ['gpt-6.2-astra', 400000, 64000]
            ])
        );
        expect(models.map(model => model.id)).toEqual(expect.arrayContaining(localCatalog().map(model => model.id)));
        expect(diagnostics).toEqual([
            {
                endpoint: 'codex_models',
                httpStatus: 200,
                responseShape: 'models',
                count: 3,
                requestJson: { endpoint: 'codex_models', method: 'GET', body: 'none' },
                responseJson: { status: 200, contentType: 'other', shape: 'models', fields: ['models'], itemCount: 3 }
            }
        ]);
        expect(fetchImpl).toHaveBeenCalledWith(
            CATALOG_URL,
            expect.objectContaining({
                redirect: 'error',
                headers: {
                    Authorization: 'Bearer synthetic-access',
                    'chatgpt-account-id': 'synthetic-account-id',
                    Accept: 'application/json'
                }
            })
        );
        expect(JSON.stringify(models)).not.toContain('synthetic-access');
        expect(JSON.stringify(models)).not.toContain('synthetic-account-id');
    });
    it('accepts the API data/id envelope and retains the local baseline for empty remote data', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ data: [{ id: 'gpt-6.2-sol' }] })));
        const remote = await requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl);
        expect(remote.map(model => model.id)).toContain('gpt-6.2-sol');
        fetchImpl.mockResolvedValueOnce(new Response('{"models":[]}'));
        const empty = await requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl);
        expect(empty.map(model => model.id)).toEqual(localCatalog().map(model => model.id));
    });
    it('does not copy failed response bodies into diagnostics', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response('private-upstream-response', { status: 503 }));
        await expect(requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl)).rejects.toThrow(
            'OpenAI Hub catalog request failed'
        );
    });
    it('records safe metadata when the response body is not valid JSON', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response('not-json'));
        const diagnostics: Array<{ endpoint: string; httpStatus: number; responseShape: string; count: number }> = [];
        await expect(
            requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl, value => diagnostics.push(value))
        ).rejects.toThrow('OpenAI Hub catalog response was invalid');
        expect(diagnostics).toEqual([
            {
                endpoint: 'codex_models',
                httpStatus: 200,
                responseShape: 'invalid',
                count: 0,
                requestJson: { endpoint: 'codex_models', method: 'GET', body: 'none' },
                responseJson: { status: 200, contentType: 'other', shape: 'invalid', fields: [], itemCount: 0 }
            }
        ]);
    });
    it('records invalid response shape for a primitive payload without inspecting its contents', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response('null'));
        const diagnostics: Array<{ endpoint: string; httpStatus: number; responseShape: string; count: number }> = [];
        await expect(
            requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl, value => diagnostics.push(value))
        ).rejects.toThrow('OpenAI Hub catalog response was invalid');
        expect(diagnostics).toEqual([
            {
                endpoint: 'codex_models',
                httpStatus: 200,
                responseShape: 'invalid',
                count: 0,
                requestJson: { endpoint: 'codex_models', method: 'GET', body: 'none' },
                responseJson: { status: 200, contentType: 'other', shape: 'invalid', fields: [], itemCount: 0 }
            }
        ]);
    });
    it('rejects malformed or oversized catalogs rather than replacing the last successful set', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ models: [{ slug: 'invalid model id' }] })));
        await expect(requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl)).rejects.toThrow();
        fetchImpl.mockResolvedValueOnce(
            new Response(JSON.stringify({ models: Array.from({ length: 101 }, (_, i) => ({ slug: `model-${i}` })) }))
        );
        await expect(requestCatalog({ access: 'synthetic-access', accountId: 'synthetic-account-id' }, fetchImpl)).rejects.toThrow();
    });
});
