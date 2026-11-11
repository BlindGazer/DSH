import { afterEach, expect, test, vi } from 'vitest';
import { globalSettingsApi } from '../src/client/features/global-settings/globalSettingsApi.js';
import { routerApi } from '../src/client/features/router/services/routerApi.js';
import type { GlobalSettings, RouterStateResponse } from '../src/shared/models/RouterModels.js';

const globalSettings: GlobalSettings = {
    locale: 'ru',
    theme: 'dark',
    pollingIntervalMs: 3000,
    globalLogging: false
};

const routerState: RouterStateResponse = {
    sessionId: 'session-1',
    rules: [],
    skills: [],
    settings: {
        instructionsRoot: 'instructions',
        rulesFolder: 'rules',
        skillsFolder: 'skills',
        mainFile: 'AGENTS.md',
        tokenBudget: 12000,
        projectLogging: false,
        redirectRootInstructionFiles: true,
        rootInstructionFileNames: ['AGENTS.md'],
        redirectInstructionDirectories: true,
        instructionDirectoryNames: ['agents'],
        logCategories: { events: true, preflight: true, rulesDiff: true, workset: true }
    },
    globalSettings,
    metrics: { estimatedTokens: 1000, tokenBudget: 12000, lastUpdated: 0 },
    diagnostics: [],
    areas: [],
    coverage: []
};

function jsonResponse(body: object, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

test('retries state loading after a request error', async () => {
    const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ error: 'temporary failure' }, 503))
        .mockResolvedValueOnce(jsonResponse(routerState));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(routerApi.loadState('session-1', signal)).rejects.toThrow('temporary failure');
    await expect(routerApi.loadState('session-1', signal)).resolves.toEqual(routerState);

    expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('passes cancellation through to the state request', async () => {
    const fetchMock = vi.fn<typeof fetch>(
        (_input, init) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Request aborted', 'AbortError')), { once: true });
            })
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const pending = routerApi.loadState('session-1', controller.signal);

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('saves and returns the global settings response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ settings: globalSettings }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(globalSettingsApi.save(globalSettings, signal)).resolves.toEqual({ settings: globalSettings });

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.body).toBe(JSON.stringify({ settings: globalSettings }));
    expect(requestInit?.signal).toBe(signal);
});
