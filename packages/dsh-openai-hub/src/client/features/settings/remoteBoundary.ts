import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { OpenAIHubClientLogEvent, OpenAIHubLogSettings } from '../../../shared/logging.js';
import { OpenAIHubLogSettingsSchema } from '../../../shared/logging.js';
import type { OpenAICodexSnapshot, OpenAIHubRemote } from '../../../shared/remote.js';
import { SnapshotSchema } from '../../../shared/remote.js';

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
async function loggingSettings(operation: Promise<RemoteResult<OpenAIHubLogSettings>>): Promise<OpenAIHubLogSettings> {
    const result = await operation;
    if (!result.ok) throw new Error('OpenAI Hub logging settings request failed');
    return OpenAIHubLogSettingsSchema.parse(result.value);
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
        loadLoggingSettings: () => loggingSettings(wire.loadLoggingSettings()),
        saveLoggingSettings: input => loggingSettings(wire.saveLoggingSettings(input)),
        recordClientLog: (input: OpenAIHubClientLogEvent) => accepted(wire.recordClientLog(input)),
        startLogin: input => snapshot(wire.startLogin(input)),
        cancelLogin: () => snapshot(wire.cancelLogin()),
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
