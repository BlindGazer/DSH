import net from 'node:net';
import type { ProxyProfile } from '../../shared/models/ProxyModels.js';
/**
 * Устанавливает туннель SOCKS5 (RFC 1928 + аутентификация RFC 1929) поверх TCP-сокета.
 */
export declare function establishSocks5Tunnel(proxyProfile: ProxyProfile, targetHost: string, targetPort: number, timeoutMs?: number): Promise<net.Socket>;
