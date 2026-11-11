import type { ProxyProfile } from '../../shared/models/ProxyModels.js';
import type { ProfileDispatcherLifecycle } from '../models/ProxyServiceContracts.js';
import { type UndiciDispatcherLike, type UndiciLoader } from './undiciLoader.js';
/**
 * Создает экземпляр диспетчера undici (ProxyAgent для HTTP/HTTPS или Agent с туннелем SOCKS5).
 */
export declare function createProfileDispatcher(profile: ProxyProfile, undiciLoader?: UndiciLoader): Promise<UndiciDispatcherLike>;
/**
 * Кэш активных диспетчеров undici по идентификатору профиля с автоматическим пересозданием при изменении настроек.
 */
export declare class DispatcherManager implements ProfileDispatcherLifecycle {
    private readonly createDispatcher;
    private readonly entries;
    private readonly operations;
    private readonly inflight;
    constructor(createDispatcher?: typeof createProfileDispatcher);
    signatureOf(profile: ProxyProfile): string;
    getDispatcher(profile: ProxyProfile): Promise<UndiciDispatcherLike>;
    syncProfiles(profiles?: readonly ProxyProfile[]): Promise<void>;
    closeAll(): Promise<void>;
}
