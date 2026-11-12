import { parentPort, workerData as rawWorkerData } from 'node:worker_threads';
import type { SystemProxyPolicy } from './system-proxy.js';
import { systemProxyTransport } from './system-proxy.js';

interface WorkerData {
    policy: SystemProxyPolicy;
    operation: 'login' | 'refresh';
    credential: object | undefined;
    providerUrl: string;
}

const workerData = rawWorkerData as WorkerData;
const port = parentPort;
if (!port) throw new Error('System proxy worker requires a parent port.');
const transport = systemProxyTransport(workerData.policy);
// Глобальный fetch заменяется только в изолированном Worker, не в процессе DSH.
Object.defineProperty(globalThis, 'fetch', { value: transport.fetch, configurable: true, writable: true });
try {
    const { openaiCodexProvider } = await import(workerData.providerUrl);
    const oauth = openaiCodexProvider().auth.oauth;
    const value =
        workerData.operation === 'refresh'
            ? await oauth.refresh(workerData.credential, new AbortController().signal)
            : await oauth.login({
                  signal: new AbortController().signal,
                  notify: (notification: string) => port.postMessage({ type: 'notify', value: notification }),
                  prompt: async (request: { type: string }) => {
                      if (request.type === 'select') return 'device_code';
                      throw new Error('Unsupported login interaction');
                  }
              });
    port.postMessage({ type: 'result', value });
} catch {
    port.postMessage({ type: 'error' });
} finally {
    await transport.close();
}
