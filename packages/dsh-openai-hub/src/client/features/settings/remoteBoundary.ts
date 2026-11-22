import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { OpenAICodexSnapshot, OpenAIHubRemote } from '../../../shared/remote.ts';
import { SnapshotSchema } from '../../../shared/remote.ts';

export type OpenAIHubWireRemote = {
    [Method in keyof OpenAIHubRemote]: (
        ...args: Parameters<OpenAIHubRemote[Method]>
    ) => Promise<RemoteResult<Awaited<ReturnType<OpenAIHubRemote[Method]>>>>;
};
async function snapshot(operation: Promise<RemoteResult<OpenAICodexSnapshot>>): Promise<OpenAICodexSnapshot> {
    const result = await operation;
    if (!result.ok) throw new Error('OpenAI Hub request failed');
    return SnapshotSchema.parse(result.value);
}
async function accepted(operation: Promise<RemoteResult<true>>): Promise<true> {
    const result = await operation;
    if (!result.ok || result.value !== true) throw new Error('OpenAI Hub diagnostic request failed');
    return true;
}
export function createOpenAIHubRemote(wire: OpenAIHubWireRemote): OpenAIHubRemote {
    // Carrier возвращает RemoteResult; модель состояния получает только проверенный DTO, без transport envelope.
    return {
        snapshot: () => snapshot(wire.snapshot()),
        startLogin: input => snapshot(wire.startLogin(input)),
        cancelLogin: () => snapshot(wire.cancelLogin()),
        retryLogin: () => snapshot(wire.retryLogin()),
        submitCallbackUrl: input => snapshot(wire.submitCallbackUrl(input)),
        updateAccount: input => snapshot(wire.updateAccount(input)),
        deleteAccount: input => snapshot(wire.deleteAccount(input)),
        refreshCatalog: input => snapshot(wire.refreshCatalog(input)),
        refreshUsage: input => snapshot(wire.refreshUsage(input)),
        saveModels: input => snapshot(wire.saveModels(input)),
        consumeReset: input => snapshot(wire.consumeReset(input)),
        reportUiError: input => accepted(wire.reportUiError(input)),
        reportUiReady: input => accepted(wire.reportUiReady(input))
    };
}
