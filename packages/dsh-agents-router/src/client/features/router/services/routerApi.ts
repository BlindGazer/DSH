import type { RouterPostBody, RouterStateResponse } from '../../../../shared/models/RouterModels.js';
import { request } from '../../../utils/api.js';

interface AuditResponse {
    text: string;
}

export interface RouterApi {
    loadState(sessionId: string, signal: AbortSignal): Promise<RouterStateResponse>;
    loadAudit(sessionId: string, signal: AbortSignal): Promise<AuditResponse>;
    post<T = void>(sessionId: string, route: string, body?: RouterPostBody, signal?: AbortSignal): Promise<T>;
}

export function createRouterApi(send: typeof request = request): RouterApi {
    return {
        loadState: (sessionId, signal) =>
            send<RouterStateResponse>(`/state?sessionId=${encodeURIComponent(sessionId)}`, {
                headers: { accept: 'application/json' },
                signal
            }),
        loadAudit: (sessionId, signal) =>
            send<AuditResponse>(`/audit?sessionId=${encodeURIComponent(sessionId)}`, {
                headers: { accept: 'application/json' },
                signal
            }),
        post: <T = void>(sessionId: string, route: string, body: RouterPostBody = {}, signal?: AbortSignal): Promise<T> =>
            send<T>(`/${route}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ sessionId, ...body }),
                ...(signal ? { signal } : {})
            })
    };
}

export const routerApi = createRouterApi();
