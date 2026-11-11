import type { KalexProviderProxyConfig } from '../../shared/models/ProxyModels.js';
import type { ProxyConfigStorage, RawConfigCandidate } from '../models/ProxyServiceContracts.js';
/**
 * Определяет путь к файлу хранения конфигурации прокси на диске.
 */
export declare function resolveStoragePath(customStoragePath?: string): string;
/**
 * Загружает конфигурацию прокси с диска и автоматически перешифровывает открытые пароли при наличии.
 */
export declare function loadConfigFromDisk(storagePath: string, fallbackConfig?: RawConfigCandidate, masterKey?: Uint8Array | null): KalexProviderProxyConfig;
/**
 * Сохраняет конфигурацию прокси на диск с шифрованием секретов мастер-ключом.
 */
export declare function saveConfigToDisk(storagePath: string, config: KalexProviderProxyConfig, masterKey: Uint8Array | null): void;
export declare const fileProxyConfigStorage: ProxyConfigStorage;
