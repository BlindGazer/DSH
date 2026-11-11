import type { MasterKeyProvider } from '../models/ProxyServiceContracts.js';
/**
 * Определяет путь к файлу мастер-ключа шифрования учетных данных прокси.
 */
export declare function resolveMasterKeyPath(customKeyPath?: string): string;
/**
 * Загружает или генерирует 256-битный мастер-ключ шифрования учетных данных на диске.
 */
export declare function getOrCreateMasterKey(customKeyPath?: string): Uint8Array;
export declare const fileMasterKeyProvider: MasterKeyProvider;
/**
 * Шифрует логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
 */
export declare function encryptAuthSecret(username: string, password: string, masterKey: Uint8Array): string;
/**
 * Расшифровывает логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
 */
export declare function decryptAuthSecret(cipherText: string, masterKey: Uint8Array): {
    readonly username: string;
    readonly password: string;
} | null;
/**
 * Формирует безопасную маску имени пользователя для отображения в интерфейсе.
 */
export declare function maskUsername(username: string): string;
/**
 * Шифрует учетные данные прокси паролем пользователя (scrypt + AES-256-GCM) для переноса между устройствами.
 */
export declare function encryptWithPassphrase(username: string, password: string, passphrase: string): string;
/**
 * Расшифровывает экспортированные учетные данные прокси паролем пользователя.
 */
export declare function decryptWithPassphrase(exportCipher: string, passphrase: string): {
    readonly username: string;
    readonly password: string;
};
