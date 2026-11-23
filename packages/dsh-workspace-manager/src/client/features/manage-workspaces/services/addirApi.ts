import { createSnapshotStore } from './snapshotStore.ts';

/** Same-origin HTTP requests; reject HTTP and non-JSON failures before reading results. */
export interface ClientLinkedDirectory {
    path: string;
    alias: string;
    description?: string | undefined;
    readOnly: boolean;
    addedAt?: number;
    source?: 'primary' | 'config' | 'dynamic';
}
export interface GlobalConfig {
    enableTools: boolean;
    enableContextInjection: boolean;
    enforceReadOnly: boolean;
}
async function request<T>(action: string, body?: object, signal?: AbortSignal): Promise<T> {
    const method = body === undefined ? 'GET' : 'POST';
    let status: number | undefined;
    let failure = 'request failed';
    try {
        const response = await fetch(new URL(`api/dsh-workspace-manager/${action}`, document.baseURI), {
            method,
            headers: { 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            ...(signal === undefined ? {} : { signal })
        });
        status = response.status;
        failure = 'expected a JSON response';
        if (!response.headers.get('content-type')?.includes('application/json')) {
            throw new Error(`Addir API: HTTP ${status}`);
        }
        failure = 'invalid JSON response';
        const result = (await response.json()) as T & { ok?: boolean; error?: string };
        if (action === 'config' && (typeof result !== 'object' || result === null || typeof result.ok !== 'boolean')) {
            throw new Error('Invalid configuration response');
        }
        failure = 'server rejected the request';
        if (!response.ok || result.ok === false) throw new Error(action === 'config' ? `HTTP ${status}` : result.error || `HTTP ${status}`);
        return result;
    } catch (error) {
        if (action === 'config' && !signal?.aborted) {
            console.error(`[workspace-manager] ${method} config: ${failure}`, { status });
        }
        throw error;
    }
}
export async function fetchWorkspaceDirectories(workspacePath: string, signal?: AbortSignal): Promise<ClientLinkedDirectory[]> {
    return (await request<{ directories: ClientLinkedDirectory[] }>('list', { workspacePath }, signal)).directories;
}
export async function replaceWorkspaceDirectories(workspacePath: string, directories: readonly ClientLinkedDirectory[]): Promise<void> {
    await request('replace', { workspacePath, directories });
}
export const vscodeEnabled = createSnapshotStore(true);
let vscodeRevision = 0;

export async function fetchGlobalConfig(signal?: AbortSignal): Promise<GlobalConfig> {
    const revision = vscodeRevision;
    const { config } = await request<{ config: GlobalConfig & { vscodeEnabled?: boolean } }>('config', undefined, signal);
    if (
        typeof config !== 'object' ||
        config === null ||
        typeof config.enableTools !== 'boolean' ||
        typeof config.enableContextInjection !== 'boolean' ||
        typeof config.enforceReadOnly !== 'boolean' ||
        (config.vscodeEnabled !== undefined && typeof config.vscodeEnabled !== 'boolean')
    ) {
        if (!signal?.aborted) console.error('[workspace-manager] GET config: invalid configuration payload');
        throw new Error('Invalid configuration payload');
    }
    if (!signal?.aborted && revision === vscodeRevision) vscodeEnabled.set(config.vscodeEnabled !== false);
    const { enableTools, enableContextInjection, enforceReadOnly } = config;
    return { enableTools, enableContextInjection, enforceReadOnly };
}
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
    await request('config', config);
}
export async function saveVscodeEnabled(enabled: boolean): Promise<void> {
    await request('config', { vscodeEnabled: enabled });
    vscodeRevision += 1;
    vscodeEnabled.set(enabled);
}
