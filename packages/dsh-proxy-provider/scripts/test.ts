import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const {
    compileRoutingTable,
    createProviderProxyController,
    extractHost,
    normalizeProxyConfig,
    resolveProviderHosts,
    sanitizeHostInput,
    testProxyConnection
} = await import(new URL('../lib/index.js', import.meta.url).href);

test('1. Host sanitization and provider domain resolution', () => {
    assert.equal(sanitizeHostInput('http://proxy.corp.local:8080/path'), 'proxy.corp.local');
    assert.equal(sanitizeHostInput('socks5://10.20.30.40:1080'), '10.20.30.40');
    assert.equal(sanitizeHostInput('  127.0.0.1  '), '127.0.0.1');

    assert.deepEqual(resolveProviderHosts('google'), ['generativelanguage.googleapis.com']);
    assert.deepEqual(resolveProviderHosts('deepseek-official'), ['api.deepseek.com']);
    assert.deepEqual(resolveProviderHosts('devx-copilot', 'https://devx-copilot.tech:8443/v1'), ['devx-copilot.tech:8443']);
    assert.equal(extractHost('https://generativelanguage.googleapis.com/v1beta'), 'generativelanguage.googleapis.com');
});

test('2. Profile reuse, deletion fallback to Direct, and host conflict detection', () => {
    const config = normalizeProxyConfig({
        profiles: [
            {
                id: 'corp-http',
                name: 'Corporate HTTP',
                protocol: 'http',
                host: 'http://10.0.0.1:3128',
                port: 3128,
                auth: { enabled: true, username: 'alice', password: 'secret' },
                ignoreSslErrors: true
            },
            {
                id: 'corp-http-clone',
                name: 'Corporate HTTP Copy',
                protocol: 'http',
                host: '10.0.0.1',
                port: 3128,
                auth: { enabled: true, username: 'alice', password: 'secret' },
                ignoreSslErrors: true
            }
        ],
        providerBindings: {
            google: 'corp-http',
            openai: 'corp-http',
            'deepseek-account': 'corp-http',
            'deepseek-official': null, // shares api.deepseek.com with deepseek-account -> conflict!
            'orphan-provider': 'deleted-profile-id' // should auto-reset to null (Direct)
        }
    });

    assert.equal(config.profiles[0].host, '10.0.0.1');
    assert.equal(config.providerBindings['orphan-provider'], null);

    const providers = [
        { id: 'google', name: 'google', hosts: ['generativelanguage.googleapis.com'] },
        { id: 'openai', name: 'OpenAI', hosts: ['api.openai.com'] },
        { id: 'deepseek-account', name: 'DeepSeek Account', hosts: ['api.deepseek.com'] },
        { id: 'deepseek-official', name: 'DeepSeek', hosts: ['api.deepseek.com'] },
        { id: 'local-corp', name: 'Local Corp', hosts: ['llm.internal.local'] }
    ];

    const compiled = compileRoutingTable(providers, config);

    // Both google and openai reuse 'corp-http'
    assert.equal(compiled.routes['generativelanguage.googleapis.com'], 'corp-http');
    assert.equal(compiled.routes['api.openai.com'], 'corp-http');
    // Local corp is Direct (not in routes)
    assert.equal(compiled.routes['llm.internal.local'], undefined);

    // Conflict detected on api.deepseek.com when one is proxied and the other is Direct
    assert.equal(compiled.routes['api.deepseek.com'], 'corp-http');
    assert.equal(compiled.conflicts.length, 1);
    assert.equal(compiled.conflicts[0].appliedProfileId, 'corp-http');

    // When both providers sharing api.deepseek.com have identical proxy settings (even via different profile IDs), NO conflict!
    const noConflictCompiled = compileRoutingTable(providers, {
        ...config,
        providerBindings: {
            ...config.providerBindings,
            'deepseek-account': 'corp-http',
            'deepseek-official': 'corp-http-clone'
        }
    });
    assert.equal(noConflictCompiled.conflicts.length, 0);
});

test('3. End-to-end HTTP Proxy (Basic Auth + 407) and Test Connection', async () => {
    // Target HTTP server returning 404 (like generativelanguage.googleapis.com root)
    const targetServer = http.createServer((_req, res) => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('target reached');
    });
    await new Promise(r => targetServer.listen(0, '127.0.0.1', r));
    const targetPort = targetServer.address().port;
    const targetUrl = `http://127.0.0.1:${targetPort}/v1beta`;

    let proxySeenAuth = null;
    const proxyServer = http.createServer((req, res) => {
        proxySeenAuth = req.headers['proxy-authorization'] || null;
        const expected = `Basic ${Buffer.from('kalex:pass123').toString('base64')}`;
        if (proxySeenAuth !== expected) {
            res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Proxy"' });
            res.end('Proxy auth required');
            return;
        }
        const forwardReq = http.request(
            {
                host: '127.0.0.1',
                port: targetPort,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            forwardRes => {
                res.writeHead(forwardRes.statusCode || 200, forwardRes.headers);
                forwardRes.pipe(res);
            }
        );
        req.pipe(forwardReq);
    });
    await new Promise(r => proxyServer.listen(0, '127.0.0.1', r));
    const proxyPort = proxyServer.address().port;

    try {
        // 3a. Wrong password -> 407 error
        const badResult = await testProxyConnection(
            {
                id: 'p1',
                name: 'HTTP Proxy',
                protocol: 'http',
                host: '127.0.0.1',
                port: proxyPort,
                auth: { enabled: true, username: 'kalex', password: 'wrong' },
                ignoreSslErrors: false
            },
            targetUrl
        );
        assert.equal(badResult.tcpOk, true);
        assert.equal(badResult.httpOk, false);
        assert.equal(badResult.status, 407);
        assert.match(badResult.error, /407/);

        // 3b. Correct password -> 404 from target is treated as success!
        const okResult = await testProxyConnection(
            {
                id: 'p1',
                name: 'HTTP Proxy',
                protocol: 'http',
                host: '127.0.0.1',
                port: proxyPort,
                auth: { enabled: true, username: 'kalex', password: 'pass123' },
                ignoreSslErrors: false
            },
            targetUrl
        );
        assert.equal(okResult.ok, true);
        assert.equal(okResult.tcpOk, true);
        assert.equal(okResult.httpOk, true);
        assert.equal(okResult.status, 404);
    } finally {
        proxyServer.close();
        targetServer.close();
    }
});

test('4. End-to-end SOCKS5 Proxy (RFC 1928 + RFC 1929 Auth) and globalThis.fetch selective routing', async () => {
    const targetServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: req.url }));
    });
    await new Promise(r => targetServer.listen(0, '127.0.0.1', r));
    const targetPort = targetServer.address().port;

    let socksConnections = 0;
    // Minimal RFC 1928 + RFC 1929 SOCKS5 test server
    const socksServer = net.createServer(clientSocket => {
        socksConnections += 1;
        let stage = 'greeting';
        clientSocket.on('data', chunk => {
            if (stage === 'greeting') {
                // Require username/password auth (0x02)
                stage = 'auth';
                clientSocket.write(Buffer.from([0x05, 0x02]));
                return;
            }
            if (stage === 'auth') {
                const uLen = chunk[1];
                const user = chunk.subarray(2, 2 + uLen).toString('utf8');
                const pLen = chunk[2 + uLen];
                const pass = chunk.subarray(3 + uLen, 3 + uLen + pLen).toString('utf8');
                if (user !== 'socksuser' || pass !== 'sockspass') {
                    clientSocket.write(Buffer.from([0x01, 0x01]));
                    clientSocket.destroy();
                    return;
                }
                stage = 'connect';
                clientSocket.write(Buffer.from([0x01, 0x00]));
                return;
            }
            if (stage === 'connect') {
                stage = 'piping';
                const atyp = chunk[3];
                let host = '127.0.0.1';
                let portOffset = 4;
                if (atyp === 0x01) {
                    host = `${chunk[4]}.${chunk[5]}.${chunk[6]}.${chunk[7]}`;
                    portOffset = 8;
                } else if (atyp === 0x03) {
                    const len = chunk[4];
                    host = chunk.subarray(5, 5 + len).toString('utf8');
                    portOffset = 5 + len;
                }
                const port = chunk.readUInt16BE(portOffset);
                const upstream = net.createConnection({ host: host === 'localhost' ? '127.0.0.1' : host, port }, () => {
                    clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
                    clientSocket.pipe(upstream);
                    upstream.pipe(clientSocket);
                });
                upstream.on('error', () => clientSocket.destroy());
            }
        });
    });
    await new Promise(r => socksServer.listen(0, '127.0.0.1', r));
    const socksPort = socksServer.address().port;

    const tmpDir = mkdtempSync(join(tmpdir(), 'kpp-test-'));
    const storagePath = join(tmpDir, 'proxy.json');
    const masterKeyPath = join(tmpDir, 'master.key');

    const controller = createProviderProxyController({
        storagePath,
        masterKeyPath,
        extraProviders: {
            'proxied-provider': {
                name: 'Proxied Provider',
                baseUrl: `http://127.0.0.1:${targetPort}/v1`
            },
            'direct-provider': {
                name: 'Direct Provider',
                baseUrl: `http://localhost:${targetPort}/v1`
            }
        },
        initialConfig: {
            profiles: [
                {
                    id: 'socks-prof',
                    name: 'Local SOCKS5',
                    protocol: 'socks5',
                    host: '127.0.0.1',
                    port: socksPort,
                    auth: { enabled: true, username: 'socksuser', password: 'sockspass' },
                    ignoreSslErrors: false
                }
            ],
            providerBindings: {
                'proxied-provider': 'socks-prof',
                'direct-provider': null
            }
        }
    });

    await controller.refreshRouting();
    controller.installFetchInterceptor();

    try {
        // Request to 127.0.0.1:targetPort (bound to socks-prof) goes through SOCKS5
        const proxiedRes = await globalThis.fetch(`http://127.0.0.1:${targetPort}/v1/models`);
        assert.equal(proxiedRes.status, 200);
        assert.equal(socksConnections, 1);

        // Native Request object also routes cleanly through SOCKS5
        const reqObj = new Request(`http://127.0.0.1:${targetPort}/v1/chat`, {
            method: 'POST',
            headers: { 'x-test': 'request-obj' },
            body: JSON.stringify({ hello: 'world' })
        });
        const reqObjRes = await globalThis.fetch(reqObj);
        assert.equal(reqObjRes.status, 200);
        assert.equal(socksConnections, 2);

        // Request to localhost:targetPort (Direct) bypasses SOCKS5
        const directRes = await globalThis.fetch(`http://localhost:${targetPort}/v1/models`);
        assert.equal(directRes.status, 200);
        assert.equal(socksConnections, 2); // unchanged!

        // Verify encrypted credentials on disk and masked credentials in client snapshot
        await controller.updateConfig({
            profiles: [
                {
                    id: 'socks-prof',
                    name: 'Local SOCKS5',
                    protocol: 'socks5',
                    host: '127.0.0.1',
                    port: socksPort,
                    auth: { enabled: true, username: 'socksuser', password: 'sockspass' },
                    ignoreSslErrors: false
                }
            ],
            providerBindings: {
                'proxied-provider': 'socks-prof',
                'direct-provider': null
            }
        });
        const rawDiskJson = readFileSync(storagePath, 'utf8');
        assert.ok(!rawDiskJson.includes('socksuser'), 'Plaintext username must not be stored on disk');
        assert.ok(!rawDiskJson.includes('sockspass'), 'Plaintext password must not be stored on disk');
        assert.ok(rawDiskJson.includes('"cipher"'), 'Encrypted cipher must be stored on disk');

        const clientSnap = controller.getStateSnapshot();
        assert.equal(clientSnap.config.profiles[0].auth.hasCredentials, true);
        assert.equal(clientSnap.config.profiles[0].auth.username, undefined);
        assert.equal(clientSnap.config.profiles[0].auth.password, undefined);

        // Updating profile with empty username/password preserves existing encrypted credentials
        await controller.updateConfig({
            profiles: [
                {
                    id: 'socks-prof',
                    name: 'Local SOCKS5 Renamed',
                    protocol: 'socks5',
                    host: '127.0.0.1',
                    port: socksPort,
                    auth: { enabled: true, username: '', password: '' },
                    ignoreSslErrors: false
                }
            ],
            providerBindings: {
                'proxied-provider': 'socks-prof'
            }
        });
        const afterRenameRes = await globalThis.fetch(`http://127.0.0.1:${targetPort}/v1/models`);
        assert.equal(afterRenameRes.status, 200);
        const hydratedProfile = controller.resolveProfileForUrl(`http://127.0.0.1:${targetPort}/v1/models`);
        assert.equal(hydratedProfile.auth.username, 'socksuser');
        assert.equal(hydratedProfile.auth.password, 'sockspass');

        // Verify Export and Import of proxy settings (without credentials)
        const exported = controller.exportConfig({ includeCredentials: false });
        assert.equal(exported.version, 1);
        assert.equal(exported.encryptedCredentials, false);
        assert.equal(exported.profiles.length, 1);
        assert.equal(exported.profiles[0].auth.username, undefined);
        assert.equal(exported.profiles[0].auth.password, undefined);
        assert.equal(exported.profiles[0].auth.exportCipher, undefined);
        assert.equal(exported.profiles[0].auth.hasCredentials, true);

        await controller.importConfig({
            ...exported,
            profiles: [
                {
                    ...exported.profiles[0],
                    name: 'Imported SOCKS5'
                }
            ]
        });
        assert.equal(controller.getStateSnapshot().config.profiles[0].name, 'Imported SOCKS5');
        // Existing encrypted credentials must still be preserved after re-importing exported JSON on the same machine
        const hydratedAfterImport = controller.resolveProfileForUrl(`http://127.0.0.1:${targetPort}/v1/models`);
        assert.equal(hydratedAfterImport.auth.username, 'socksuser');
        assert.equal(hydratedAfterImport.auth.password, 'sockspass');

        // Verify portable Export with encrypted credentials -> Import on a different machine (different master.key)
        const portableExport = controller.exportConfig({
            includeCredentials: true,
            password: 'PortableSecret!2026'
        });
        assert.equal(portableExport.encryptedCredentials, true);
        assert.ok(typeof portableExport.profiles[0].auth.exportCipher === 'string');
        assert.ok(!JSON.stringify(portableExport).includes('socksuser'));
        assert.ok(!JSON.stringify(portableExport).includes('sockspass'));

        const machine2Controller = createProviderProxyController({
            storagePath: join(tmpDir, 'machine2-proxy.json'),
            masterKeyPath: join(tmpDir, 'machine2-master.key'),
            extraProviders: {
                'proxied-provider': {
                    name: 'Proxied Provider',
                    baseUrl: `http://127.0.0.1:${targetPort}/v1`
                }
            }
        });
        try {
            // Wrong password must fail
            await assert.rejects(
                () => machine2Controller.importConfig(portableExport, 'WrongPassword'),
                /Invalid password for encrypted credentials/
            );

            // Correct password decrypts portableExport and re-encrypts with machine2's master.key
            await machine2Controller.importConfig(portableExport, 'PortableSecret!2026');
            const machine2Profile = machine2Controller.resolveProfileForUrl(`http://127.0.0.1:${targetPort}/v1/models`);
            assert.equal(machine2Profile.auth.username, 'socksuser');
            assert.equal(machine2Profile.auth.password, 'sockspass');
        } finally {
            await machine2Controller.dispose();
        }

        // TCP Stage 1 failure when port is closed
        const closedPortRes = await testProxyConnection(
            {
                id: 'dead',
                name: 'Dead Proxy',
                protocol: 'http',
                host: '127.0.0.1',
                port: 1,
                ignoreSslErrors: false
            },
            `http://127.0.0.1:${targetPort}/v1`
        );
        assert.equal(closedPortRes.ok, false);
        assert.equal(closedPortRes.tcpOk, false);
        assert.match(closedPortRes.error, /TCP connection to proxy/);
    } finally {
        await controller.dispose();
        socksServer.close();
        targetServer.close();
        rmSync(tmpDir, { recursive: true, force: true });
    }
});
