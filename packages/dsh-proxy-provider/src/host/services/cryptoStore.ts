import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { MasterKeyProvider } from '../models/ProxyServiceContracts.js';

/**
 * Определяет путь к файлу мастер-ключа шифрования учетных данных прокси.
 */
export function resolveMasterKeyPath(customKeyPath?: string): string {
    if (customKeyPath) return customKeyPath;
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    return join(localAppData, 'kalex-dsh-proxy-provider', 'master.key');
}

/**
 * Загружает или генерирует 256-битный мастер-ключ шифрования учетных данных на диске.
 */
export function getOrCreateMasterKey(customKeyPath?: string): Uint8Array {
    const keyPath = resolveMasterKeyPath(customKeyPath);
    try {
        if (existsSync(keyPath)) {
            const hex = readFileSync(keyPath, 'utf8').trim();
            if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
        }
        const key = randomBytes(32);
        mkdirSync(dirname(keyPath), { recursive: true });
        writeFileSync(keyPath, key.toString('hex'), {
            encoding: 'utf8',
            mode: 0o600
        });
        return key;
    } catch {
        return randomBytes(32);
    }
}

export const fileMasterKeyProvider: MasterKeyProvider = {
    getOrCreate: getOrCreateMasterKey
};

/**
 * Шифрует логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
 */
export function encryptAuthSecret(username: string, password: string, masterKey: Uint8Array): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
    const payload = JSON.stringify({
        username: username || '',
        password: password || ''
    });
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Расшифровывает логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
 */
export function decryptAuthSecret(
    cipherText: string,
    masterKey: Uint8Array
): { readonly username: string; readonly password: string } | null {
    if (typeof cipherText !== 'string' || !cipherText.includes(':')) return null;
    try {
        const [ivHex, tagHex, dataHex] = cipherText.split(':');
        if (!ivHex || !tagHex || !dataHex) return null;
        const decipher = createDecipheriv('aes-256-gcm', masterKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
        const parsed = JSON.parse(decrypted) as {
            username?: string;
            password?: string;
        };
        return {
            username: typeof parsed?.username === 'string' ? parsed.username : '',
            password: typeof parsed?.password === 'string' ? parsed.password : ''
        };
    } catch {
        return null;
    }
}

/**
 * Формирует безопасную маску имени пользователя для отображения в интерфейсе.
 */
export function maskUsername(username: string): string {
    if (typeof username !== 'string' || !username) return '';
    if (username.length <= 2) return `${username[0]}*`;
    return `${username[0]}${'*'.repeat(Math.min(5, username.length - 2))}${username[username.length - 1]}`;
}

/**
 * Шифрует учетные данные прокси паролем пользователя (scrypt + AES-256-GCM) для переноса между устройствами.
 */
export function encryptWithPassphrase(username: string, password: string, passphrase: string): string {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const derivedKey = scryptSync(String(passphrase), salt, 32);
    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
    const payload = JSON.stringify({
        username: username || '',
        password: password || ''
    });
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Расшифровывает экспортированные учетные данные прокси паролем пользователя.
 */
export function decryptWithPassphrase(exportCipher: string, passphrase: string): { readonly username: string; readonly password: string } {
    if (typeof exportCipher !== 'string' || !exportCipher.includes(':')) {
        throw new Error('Invalid encrypted credential format in import file');
    }
    const parts = exportCipher.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted credential format in import file');
    }
    const [saltHex, ivHex, tagHex, dataHex] = parts;
    if (!saltHex || !ivHex || !tagHex || !dataHex) {
        throw new Error('Invalid encrypted credential format in import file');
    }
    const derivedKey = scryptSync(String(passphrase), Buffer.from(saltHex, 'hex'), 32);
    try {
        const decipher = createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
        const parsed = JSON.parse(decrypted) as {
            username?: string;
            password?: string;
        };
        return {
            username: typeof parsed?.username === 'string' ? parsed.username : '',
            password: typeof parsed?.password === 'string' ? parsed.password : ''
        };
    } catch {
        throw new Error('Invalid password for encrypted credentials');
    }
}
