import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Readable } from 'node:stream';
import type { ProviderProxyController } from '../services/controller.js';
/**
 * Записывает JSON-ответ с заголовками запрета кэширования.
 */
export declare function writeJson(res: ServerResponse, status: number, payload: object): void;
type JsonBodyValue = object | string | number | boolean | null;
/**
 * Читает JSON-объект входящего HTTP-запроса с ограничением размера 128 КБ.
 */
export declare function readJsonBody(req: Readable): Promise<Record<string, JsonBodyValue>>;
/**
 * Проверяет, что HTTP-запрос поступил из веб-интерфейса оболочки DSH того же источника.
 */
export declare function isSameOriginBrowserRequest(req: IncomingMessage): boolean;
export interface WebServerHostContext {
    inject?(deps: readonly string[], callback: (webCtx: {
        effect(fn: () => void): void;
        readonly webServer: {
            register(route: {
                readonly kind: string;
                readonly path: string;
                readonly handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
            }): void;
        };
    }) => void): void;
}
/**
 * Регистрирует HTTP-маршруты управления прокси (/api/kalex-provider-proxy/*) в веб-сервере DSH.
 */
export declare function registerHttpRoutes(ctx: WebServerHostContext, controller: ProviderProxyController): void;
export {};
