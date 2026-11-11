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
export declare function createRouterApi(send?: typeof request): RouterApi;
export declare const routerApi: RouterApi;
export {};
