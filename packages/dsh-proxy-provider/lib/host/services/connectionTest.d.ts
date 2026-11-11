import type { ProxyProfile, TestConnectionResult } from '../../shared/models/ProxyModels.js';
import { type UndiciDispatcherLike } from './undiciLoader.js';
export interface RequestLikeInput {
    readonly url?: string;
    readonly method?: string;
    readonly headers?: {
        forEach?(cb: (value: string, key: string) => void): void;
    };
    readonly body?: BodyInit | null;
    readonly signal?: AbortSignal;
    arrayBuffer?(): Promise<ArrayBuffer>;
}
/**
 * Этап 1 проверки соединения: проверка TCP-доступности узла и порта прокси с тайм-аутом 5000 мс.
 */
export declare function checkTcpReachability(host: string, port: number, timeoutMs?: number): Promise<{
    readonly ok: boolean;
    readonly latencyMs: number;
}>;
/**
 * Выполняет HTTP-запрос через загруженный экземпляр undici.fetch с поддержкой распаковки объектов Request.
 */
export declare function dispatchWithUndiciFetch(input: string | URL | RequestLikeInput, init: Record<string, object | string | undefined> | undefined, dispatcher: UndiciDispatcherLike): Promise<Response>;
/**
 * Выполняет двухэтапную проверку прокси-соединения (TCP + сквозной HTTP-запрос).
 */
export declare function testProxyConnection(profile: ProxyProfile, testUrl?: string, fetchImpl?: ((url: string, init: Record<string, object | string | undefined>) => Promise<{
    status: number;
}>) | null): Promise<TestConnectionResult>;
