// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

async function setup(body: object, status = 200) {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body, { status })));
    const api = await import('../src/client/features/manage-workspaces/services/addirApi.ts');
    return { api, error };
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
});

it('rejects a malformed configuration without updating the switch', async () => {
    const { api, error } = await setup({ ok: true, config: { vscodeEnabled: false } });
    const previous = api.vscodeEnabled.getSnapshot();

    await expect(api.fetchGlobalConfig()).rejects.toThrow('Invalid configuration payload');

    expect(api.vscodeEnabled.getSnapshot()).toBe(previous);
    expect(error).toHaveBeenCalledExactlyOnceWith('[workspace-manager] GET config: invalid configuration payload');
});

it('diagnoses a rejected switch save without logging server reply text', async () => {
    const { api, error } = await setup({ ok: false, error: 'Internal server details' }, 409);
    const previous = api.vscodeEnabled.getSnapshot();

    await expect(api.saveVscodeEnabled(!previous)).rejects.toThrow('HTTP 409');

    expect(api.vscodeEnabled.getSnapshot()).toBe(previous);
    expect(error).toHaveBeenCalledExactlyOnceWith('[workspace-manager] POST config: server rejected the request', { status: 409 });
});
