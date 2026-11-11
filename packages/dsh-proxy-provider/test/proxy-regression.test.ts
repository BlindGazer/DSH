import { randomBytes } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { describe, expect, it } from 'vitest';
import type { MasterKeyProvider, ProfileDispatcherLifecycle, ProxyConfigStorage } from '../src/host/models/ProxyServiceContracts.js';
import { normalizeProxyConfig, sanitizeConfigForClient, serializeConfigForDisk } from '../src/host/services/configNormalizer.js';
import { testProxyConnection } from '../src/host/services/connectionTest.js';
import { createProviderProxyController } from '../src/host/services/controller.js';
import { decryptAuthSecret, encryptAuthSecret } from '../src/host/services/cryptoStore.js';
import { establishSocks5Tunnel } from '../src/host/services/socks5.js';
import type { ProxyProfile } from '../src/shared/models/ProxyModels.js';

function listen(server: http.Server | net.Server): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Test server did not expose a TCP port'));
                return;
            }
            resolve(address.port);
        });
    });
}

function closeServer(server: http.Server | net.Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
    });
}

function createMemoryController(
    masterKey: Uint8Array,
    extraProviders: Record<string, { readonly name: string; readonly baseUrl: string }> = {}
) {
    let storedConfig = normalizeProxyConfig({}, masterKey);
    const configStorage: ProxyConfigStorage = {
        load: (_path, fallback, key) => normalizeProxyConfig(fallback, key),
        save: (_path, config) => {
            storedConfig = config;
        }
    };
    const masterKeyProvider: MasterKeyProvider = {
        getOrCreate: () => masterKey
    };
    const dispatcherManager: ProfileDispatcherLifecycle = {
        getDispatcher: async () => ({}),
        syncProfiles: async () => {},
        closeAll: async () => {}
    };
    const controller = createProviderProxyController({
        storagePath: 'memory-only',
        initialConfig: storedConfig,
        configStorage,
        masterKeyProvider,
        dispatcherManager,
        extraProviders,
        fetchTarget: { fetch: globalThis.fetch }
    });
    return { controller, getStoredConfig: () => storedConfig };
}

describe('proxy regression coverage', () => {
    it('validates HTTP Basic authentication and reports 407 for rejected credentials', async () => {
        const expectedAuthorization = `Basic ${Buffer.from('fixture-user:fixture-pass').toString('base64')}`;
        const receivedAuthorization: string[] = [];
        const proxyServer = http.createServer((request, response) => {
            const authorization = request.headers['proxy-authorization'];
            if (typeof authorization === 'string') receivedAuthorization.push(authorization);
            if (authorization !== expectedAuthorization) {
                response.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="test"' });
                response.end();
                return;
            }
            response.writeHead(404);
            response.end();
        });
        const proxyPort = await listen(proxyServer);
        const wrongProfile: ProxyProfile = {
            id: 'http-proxy',
            name: 'HTTP proxy',
            protocol: 'http',
            host: '127.0.0.1',
            port: proxyPort,
            auth: { enabled: true, username: 'fixture-user', password: 'wrong-pass' },
            ignoreSslErrors: false
        };
        const correctProfile: ProxyProfile = {
            ...wrongProfile,
            auth: { enabled: true, username: 'fixture-user', password: 'fixture-pass' }
        };

        try {
            const rejected = await testProxyConnection(wrongProfile, 'http://target.test/probe', async () => ({ status: 407 }));
            const accepted = await testProxyConnection(correctProfile, 'http://target.test/probe');

            expect(receivedAuthorization).toContain(expectedAuthorization);
            expect(accepted.ok).toBe(true);
            expect(accepted.status).toBe(404);
            expect(rejected.status).toBe(407);
            expect(rejected.error).toContain('407');
        } finally {
            await closeServer(proxyServer);
        }
    });

    it('performs SOCKS5 username/password authentication and selects only bound provider routes', async () => {
        let receivedUsername = '';
        let receivedPassword = '';
        let receivedTarget = '';
        let receivedTargetPort = 0;
        const socksServer = net.createServer(socket => {
            let buffer = Buffer.alloc(0);
            let stage: 'greeting' | 'authentication' | 'connect' = 'greeting';

            socket.on('data', chunk => {
                buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
                while (true) {
                    if (stage === 'greeting') {
                        if (buffer.length < 2) return;
                        const methodsLength = buffer[1] ?? 0;
                        if (buffer.length < 2 + methodsLength) return;
                        buffer = buffer.subarray(2 + methodsLength);
                        stage = 'authentication';
                        socket.write(Buffer.from([0x05, 0x02]));
                        continue;
                    }
                    if (stage === 'authentication') {
                        if (buffer.length < 2) return;
                        const usernameLength = buffer[1] ?? 0;
                        if (buffer.length < 3 + usernameLength) return;
                        const passwordLength = buffer[2 + usernameLength] ?? 0;
                        const packetLength = 3 + usernameLength + passwordLength;
                        if (buffer.length < packetLength) return;
                        receivedUsername = buffer.subarray(2, 2 + usernameLength).toString('utf8');
                        receivedPassword = buffer.subarray(3 + usernameLength, packetLength).toString('utf8');
                        buffer = buffer.subarray(packetLength);
                        stage = 'connect';
                        socket.write(Buffer.from([0x01, 0x00]));
                        continue;
                    }

                    if (buffer.length < 5) return;
                    const addressType = buffer[3];
                    let addressLength = 0;
                    let addressStart = 4;
                    if (addressType === 0x01) addressLength = 4;
                    else if (addressType === 0x03) {
                        addressLength = buffer[4] ?? 0;
                        addressStart = 5;
                    } else if (addressType === 0x04) addressLength = 16;
                    else {
                        socket.destroy(new Error('Unsupported test address type'));
                        return;
                    }
                    const packetLength = addressStart + addressLength + 2;
                    if (buffer.length < packetLength) return;
                    receivedTarget =
                        addressType === 0x03
                            ? buffer.subarray(addressStart, addressStart + addressLength).toString('utf8')
                            : Array.from(buffer.subarray(addressStart, addressStart + addressLength)).join('.');
                    receivedTargetPort = buffer.readUInt16BE(packetLength - 2);
                    buffer = buffer.subarray(packetLength);
                    socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
                    return;
                }
            });
        });
        const socksPort = await listen(socksServer);
        const profile: ProxyProfile = {
            id: 'socks-profile',
            name: 'SOCKS5 proxy',
            protocol: 'socks5',
            host: '127.0.0.1',
            port: socksPort,
            auth: { enabled: true, username: 'fixture-user', password: 'fixture-pass' },
            ignoreSslErrors: false
        };

        try {
            const tunnel = await establishSocks5Tunnel(profile, 'target.test', 8443);
            tunnel.destroy();
            expect(receivedUsername).toBe('fixture-user');
            expect(receivedPassword).toBe('fixture-pass');
            expect(receivedTarget).toBe('target.test');
            expect(receivedTargetPort).toBe(8443);

            const { controller } = createMemoryController(randomBytes(32), {
                proxied: { name: 'Proxied provider', baseUrl: 'https://proxied.test/v1' },
                direct: { name: 'Direct provider', baseUrl: 'https://direct.test/v1' }
            });
            try {
                await controller.updateConfig({
                    profiles: [profile],
                    providerBindings: { proxied: 'socks-profile' }
                });
                const routes = controller.getStateSnapshot().routes;
                expect(routes['proxied.test']).toBe('socks-profile');
                expect(routes['direct.test']).toBeUndefined();

                await controller.bindProvider('proxied', null);
                expect(controller.getStateSnapshot().routes['proxied.test']).toBeUndefined();
                expect(controller.getStateSnapshot().config.providerBindings.proxied).toBeUndefined();

                await controller.updateConfig({
                    profiles: [profile],
                    providerBindings: { deepseek: 'socks-profile' }
                });
                await controller.bindProvider('deepseek-official', null);
                expect(controller.getStateSnapshot().routes['api.deepseek.com']).toBeUndefined();
                expect(controller.getStateSnapshot().config.providerBindings.deepseek).toBeUndefined();
            } finally {
                await controller.dispose();
            }
        } finally {
            await closeServer(socksServer);
        }
    });

    it('encrypts stored credentials and omits plaintext secrets from client snapshots', () => {
        const masterKey = randomBytes(32);
        const username = 'fixture-user';
        const password = 'fixture-pass';
        const encrypted = encryptAuthSecret(username, password, masterKey);
        const decrypted = decryptAuthSecret(encrypted, masterKey);
        const config = normalizeProxyConfig(
            {
                profiles: [
                    {
                        id: 'encrypted-profile',
                        name: 'Encrypted profile',
                        protocol: 'http',
                        host: 'proxy.test',
                        port: 8080,
                        auth: { enabled: true, username, password }
                    }
                ]
            },
            masterKey
        );
        const serialized = JSON.stringify(serializeConfigForDisk(config, masterKey));
        const snapshot = JSON.stringify(sanitizeConfigForClient(config));

        expect(decrypted).toEqual({ username, password });
        expect(serialized).not.toContain(username);
        expect(serialized).not.toContain(password);
        expect(serialized).toContain('cipher');
        expect(snapshot).not.toContain(username);
        expect(snapshot).not.toContain(password);
        expect(snapshot).toContain('hasCredentials');
    });

    it('exports portable encrypted credentials and imports them with the passphrase on another key', async () => {
        const passphrase = 'test-only-passphrase';
        const source = createMemoryController(randomBytes(32));
        const destination = createMemoryController(randomBytes(32));
        const profile = {
            id: 'portable-profile',
            name: 'Portable profile',
            protocol: 'socks5',
            host: 'proxy.test',
            port: 1080,
            auth: { enabled: true, username: 'fixture-user', password: 'fixture-pass' },
            ignoreSslErrors: false
        } as const;
        await source.controller.updateConfig({ profiles: [profile] });

        const sanitizedExport = source.controller.exportConfig();
        expect(sanitizedExport.encryptedCredentials).toBe(false);
        expect(JSON.stringify(sanitizedExport)).not.toContain('fixture-user');
        expect(JSON.stringify(sanitizedExport)).not.toContain('fixture-pass');

        const portableExport = source.controller.exportConfig({ includeCredentials: true, password: passphrase });
        expect(portableExport.encryptedCredentials).toBe(true);
        expect(JSON.stringify(portableExport)).not.toContain('fixture-user');
        expect(JSON.stringify(portableExport)).not.toContain('fixture-pass');
        await expect(destination.controller.importConfig(portableExport, 'incorrect-passphrase')).rejects.toThrow(
            'Invalid password for encrypted credentials'
        );
        await destination.controller.importConfig(portableExport, passphrase);

        const importedProfile = destination.controller.resolveProfileWithSecrets({
            id: 'portable-profile',
            name: 'Portable profile',
            protocol: 'socks5',
            host: 'proxy.test',
            port: 1080,
            auth: { enabled: true },
            ignoreSslErrors: false
        });
        expect(importedProfile?.auth?.username).toBe('fixture-user');
        expect(importedProfile?.auth?.password).toBe('fixture-pass');
        expect(destination.getStoredConfig().profiles[0]?.auth?.username).toBe('fixture-user');

        await source.controller.dispose();
        await destination.controller.dispose();
    });
});
