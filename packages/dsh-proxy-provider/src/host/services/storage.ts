import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { KalexProviderProxyConfig } from '../../shared/models/ProxyModels.js';
import type { ProxyConfigStorage, RawConfigCandidate } from '../models/ProxyServiceContracts.js';
import { normalizeProxyConfig, serializeConfigForDisk } from './configNormalizer.js';

/**
 * Определяет путь к файлу хранения конфигурации прокси на диске.
 */
export function resolveStoragePath(customStoragePath?: string): string {
    if (customStoragePath) return customStoragePath;
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
    return join(dshHome, 'kalex-provider-proxy.json');
}

/**
 * Загружает конфигурацию прокси с диска и автоматически перешифровывает открытые пароли при наличии.
 */
export function loadConfigFromDisk(
    storagePath: string,
    fallbackConfig: RawConfigCandidate = {},
    masterKey: Uint8Array | null = null
): KalexProviderProxyConfig {
    try {
        if (existsSync(storagePath)) {
            const rawText = readFileSync(storagePath, 'utf8');
            const parsed = JSON.parse(rawText) as RawConfigCandidate;
            const normalized = normalizeProxyConfig(parsed, masterKey);
            const hadPlaintext =
                Array.isArray(parsed?.profiles) && parsed.profiles.some(profile => profile?.auth?.username || profile?.auth?.password);
            if (hadPlaintext && masterKey) {
                saveConfigToDisk(storagePath, normalized, masterKey);
            }
            return normalized;
        }
    } catch {
        // Игнорируем поврежденный файл и возвращаем конфигурацию по умолчанию
    }
    return normalizeProxyConfig(fallbackConfig, masterKey);
}

/**
 * Сохраняет конфигурацию прокси на диск с шифрованием секретов мастер-ключом.
 */
export function saveConfigToDisk(storagePath: string, config: KalexProviderProxyConfig, masterKey: Uint8Array | null): void {
    try {
        mkdirSync(dirname(storagePath), { recursive: true });
        const diskPayload = masterKey ? serializeConfigForDisk(config, masterKey) : config;
        writeFileSync(storagePath, JSON.stringify(diskPayload, null, 2), 'utf8');
    } catch {
        // Игнорируем ошибки записи в окружениях только для чтения
    }
}

export const fileProxyConfigStorage: ProxyConfigStorage = {
    load: loadConfigFromDisk,
    save: saveConfigToDisk
};
