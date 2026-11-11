import type { ExportedProxyConfigPayload, KalexProviderProxyConfig, ProxyProfile, ProxyStateSnapshot, SanitizedProxyConfig } from '../../shared/models/ProxyModels.js';
import type { RawConfigCandidate, RawProfileCandidate } from '../models/ProxyServiceContracts.js';
export type { RawConfigCandidate, RawProfileCandidate } from '../models/ProxyServiceContracts.js';
/**
 * Проверяет и нормализует одиночный профиль прокси, при необходимости расшифровывая секреты.
 */
export declare function normalizeProfile(raw: RawProfileCandidate | undefined | null, masterKey?: Uint8Array | null): ProxyProfile | null;
/**
 * Нормализует полную конфигурацию прокси, сбрасывая привязки к несуществующим профилям в null (Direct).
 */
export declare function normalizeProxyConfig(raw?: RawConfigCandidate, masterKey?: Uint8Array | null): KalexProviderProxyConfig;
/**
 * Подготавливает конфигурацию к записи на диск с шифрованием паролей мастер-ключом.
 */
export declare function serializeConfigForDisk(config: KalexProviderProxyConfig, masterKey: Uint8Array): Record<string, object | string>;
/**
 * Очищает конфигурацию от открытых паролей перед отправкой в веб-интерфейс DSH.
 */
export declare function sanitizeConfigForClient(config: KalexProviderProxyConfig): SanitizedProxyConfig;
/**
 * Формирует объект экспорта настроек (с опциональным шифрованием учетных данных паролем).
 */
export declare function exportConfig(currentConfig: KalexProviderProxyConfig, options?: {
    readonly includeCredentials?: boolean;
    readonly password?: string;
}): ExportedProxyConfigPayload;
/**
 * Импортирует конфигурацию прокси, при необходимости расшифровывая переносимые учетные данные.
 */
export declare function importConfig(rawInput: RawConfigCandidate, passwordArg: string | undefined, context: {
    readonly currentConfig: KalexProviderProxyConfig;
    readonly updateConfig: (next: RawConfigCandidate) => Promise<ProxyStateSnapshot>;
}): Promise<ProxyStateSnapshot>;
