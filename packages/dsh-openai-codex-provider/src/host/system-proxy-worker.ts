import { parentPort, workerData as rawWorkerData } from 'node:worker_threads';
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex';
import type { SystemProxyPolicy } from './system-proxy.js';
import { systemProxyTransport } from './system-proxy.js';

interface OAuthCredential {
    readonly type: 'oauth';
    readonly access: string;
    readonly refresh: string;
    readonly expires: number;
    readonly [key: string]: string | number;
}

interface WorkerData {
    policy: SystemProxyPolicy;
    operation: 'login' | 'refresh';
    credential: OAuthCredential | undefined;
}

const workerData = rawWorkerData as WorkerData;
const port = parentPort;
if (!port) throw new Error('System proxy worker requires a parent port.');
const transport = systemProxyTransport(workerData.policy);
// Глобальный fetch заменяется только в изолированном Worker, не в процессе DSH.
Object.defineProperty(globalThis, 'fetch', { value: transport.fetch, configurable: true, writable: true });
try {
    const oauth = openaiCodexProvider().auth.oauth;
    if (!oauth) throw new Error('OpenAI Codex OAuth is unavailable.');
    const value =
        workerData.operation === 'refresh'
            ? await oauth.refresh(
                  workerData.credential ?? { type: 'oauth', access: '', refresh: '', expires: 0 },
                  new AbortController().signal
              )
            : await oauth.login({
                  signal: new AbortController().signal,
                  notify: event =>
                      port.postMessage({ type: 'notify', value: 'message' in event ? event.message : 'OAuth event received.' }),
                  prompt: async (request: { type: string }) => {
                      if (request.type === 'select') return 'device_code';
                      throw new Error('Unsupported login interaction');
                  }
              });
    port.postMessage({ type: 'result', value });
} catch (error) {
    const message = error instanceof Error ? error.message : 'Codex system-proxy OAuth request failed.';
    port.postMessage({ type: 'error', message: message.slice(0, 500) });
} finally {
    await transport.close();
}
