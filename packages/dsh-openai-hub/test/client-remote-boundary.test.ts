import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { describe, expect, it, vi } from 'vitest';
import { OpenAICodexController } from '../src/client/features/settings/openAICodexRuntime.js';
import { createOpenAIHubRemote, type OpenAIHubWireRemote } from '../src/client/features/settings/remoteBoundary.js';
import { type OpenAICodexSnapshot, SnapshotSchema } from '../src/shared/remote.js';

const accepted = async () => ({ ok: true as const, value: true as const });
function wire(): OpenAIHubWireRemote {
    const value = SnapshotSchema.parse({ accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' });
    const snapshot = async () => ({ ok: true as const, value });
    return {
        snapshot,
        loadLoggingSettings: async () => ({ ok: true as const, value: { enabled: false } }),
        saveLoggingSettings: async input => ({ ok: true as const, value: input }),
        recordClientLog: accepted,
        startLogin: snapshot,
        cancelLogin: snapshot,
        submitCallbackUrl: snapshot,
        updateAccount: snapshot,
        deleteAccount: snapshot,
        refreshCatalog: snapshot,
        refreshUsage: snapshot,
        saveModels: snapshot,
        consumeReset: snapshot,
        reportUiError: accepted,
        reportUiReady: accepted
    };
}
describe('Typert Client boundary', () => {
    it('unwraps the SDK RemoteResult exactly once and validates the business DTO', async () => {
        const remote = createOpenAIHubRemote(wire());
        expect(await remote.snapshot()).toEqual({ accounts: [], status: 'idle', deviceCode: '', verificationUri: '', error: '' });
        expect(await remote.reportUiReady('settings')).toBe(true);
    });
    it('reconciles the final state when account operations complete out of order', async () => {
        const source = wire();
        const deferred = Promise.withResolvers<OpenAICodexSnapshot>();
        const canonical = SnapshotSchema.parse({ accounts: [], status: 'done', deviceCode: '', verificationUri: '', error: 'canonical' });
        source.snapshot = vi.fn(async () => ({ ok: true as const, value: canonical }));
        source.refreshUsage = async () => ({ ok: true as const, value: await deferred.promise });
        const controller = new OpenAICodexController(createOpenAIHubRemote(source));
        const older = controller.refreshUsage('work');
        await controller.refreshCatalog('personal');
        deferred.resolve({ ...canonical, error: 'obsolete' });
        await older;
        await vi.waitFor(() => expect(controller.getSnapshot().snapshot?.error).toBe('canonical'));
        expect(source.snapshot).toHaveBeenCalledOnce();
    });
    it('does not expose private transport errors to UI actions', async () => {
        const source = wire();
        source.snapshot = vi.fn(async () => ({
            ok: false as const,
            error: new RemoteError('gateway/internal', 'private-refresh-response', {})
        }));
        await expect(createOpenAIHubRemote(source).snapshot()).rejects.toThrow('OpenAI Hub request failed');
    });
});
