import { createServer } from 'node:http';
import { assert, test } from 'vitest';
import { createRouterHandler } from '../src/host/api/httpRoutes.js';

interface ResponseBody {
    error?: string;
    text?: string;
    sessionId?: string;
    filePath?: string;
    settings?: { locale?: string };
}

interface RequestOptions {
    method?: string;
    body?: string | object;
    headers?: Record<string, string>;
}

function makeHandler() {
    const calls: string[][] = [];
    const handler = createRouterHandler({
        state: async sessionId => ({ sessionId }),
        globalSettings: async () => ({ settings: { locale: 'auto' } }),
        saveGlobalSettings: async settings => ({ ok: true, settings }),
        audit: async sessionId => ({ ok: true, text: `log:${sessionId}` }),
        deleteAudit: async sessionId => ({ ok: true, sessionId }),
        saveSettings: async (sessionId, settings) => ({ ok: true, sessionId, settings }),
        refresh: async sessionId => ({ ok: true, sessionId }),
        reinitialize: async sessionId => ({ ok: true, sessionId }),
        reset: async sessionId => ({ ok: true, sessionId }),
        diagnose: async (sessionId, filePath) => ({ ok: true, sessionId, filePath }),
        openFile: async (sessionId, filePath) => ({ ok: true, sessionId, filePath }),
        workset: async (...args) => {
            calls.push(args);
            return { ok: true };
        }
    });
    return { handler, calls };
}

async function request(handler: ReturnType<typeof createRouterHandler>, url: string, options: RequestOptions = {}) {
    const server = createServer(handler);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind a TCP address');
    try {
        const responseOptions: RequestInit = {
            method: options.method ?? 'GET',
            ...(options.headers ? { headers: options.headers } : {}),
            ...(options.body === undefined ? {} : { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) })
        };
        const response = await fetch(`http://127.0.0.1:${address.port}${url}`, responseOptions);
        const body: ResponseBody = JSON.parse(await response.text());
        return { status: response.status, body };
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
}

test('serves state and validates mutating route bodies', async () => {
    const { handler, calls } = makeHandler();
    const state = await request(handler, '/agents-router/state?sessionId=s-1');
    assert.equal(state.status, 200);
    assert.deepEqual(state.body, { sessionId: 's-1' });
    assert.equal((await request(handler, '/agents-router/global-settings')).body.settings?.locale, 'auto');
    assert.equal((await request(handler, '/agents-router/audit?sessionId=s-1')).body.text, 'log:s-1');
    const savedGlobal = await request(handler, '/agents-router/global-settings', { method: 'POST', body: { settings: { locale: 'ru' } } });
    assert.equal(savedGlobal.body.settings?.locale, 'ru');
    const deleted = await request(handler, '/agents-router/audit/delete', { method: 'POST', body: { sessionId: 's-1' } });
    assert.equal(deleted.status, 200);
    const reinitialized = await request(handler, '/agents-router/reinitialize', { method: 'POST', body: { sessionId: 's-1' } });
    assert.equal(reinitialized.status, 200);
    assert.equal(reinitialized.body.sessionId, 's-1');
    const opened = await request(handler, '/agents-router/open-file', {
        method: 'POST',
        body: { sessionId: 's-1', path: 'D:\\repo\\agents\\rules\\ponytail.md' }
    });
    assert.equal(opened.status, 200);
    assert.equal(opened.body.filePath, 'D:\\repo\\agents\\rules\\ponytail.md');

    const invalid = await request(handler, '/agents-router/workset', {
        method: 'POST',
        body: { sessionId: 's-1', action: 'bogus', path: 'src/a.js' }
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(calls, []);

    const badSettings = await request(handler, '/agents-router/settings', { method: 'POST', body: { sessionId: 's-1', settings: [] } });
    assert.equal(badSettings.status, 400);

    const added = await request(handler, '/agents-router/workset', {
        method: 'POST',
        body: { sessionId: 's-1', action: 'add', path: 'src/a.js' }
    });
    assert.equal(added.status, 200);
    assert.deepEqual(calls, [['s-1', 'add', 'src/a.js']]);
});

test('rejects cross-origin calls and oversized or malformed JSON', async () => {
    const { handler } = makeHandler();
    const cross = await request(handler, '/agents-router/state?sessionId=s-1', { headers: { 'sec-fetch-site': 'cross-site' } });
    assert.equal(cross.status, 403);
    const foreignOrigin = await request(handler, '/agents-router/state?sessionId=s-1', { headers: { origin: 'http://attacker.example' } });
    assert.equal(foreignOrigin.status, 403);
    const oversized = await request(handler, '/agents-router/reset', {
        method: 'POST',
        body: `{"sessionId":"s-1","extra":"${'x'.repeat(65_536)}"}`
    });
    assert.equal(oversized.status, 413);
    const malformed = await request(handler, '/agents-router/reset', { method: 'POST', body: '{' });
    assert.equal(malformed.status, 400);
});
