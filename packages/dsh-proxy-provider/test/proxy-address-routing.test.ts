import { describe, expect, it } from 'vitest';
import { normalizeProxyConfig } from '../src/host/services/configNormalizer.js';
import { compileRoutingTable } from '../src/host/services/providerRouting.js';
import type { DiscoveredProvider } from '../src/shared/models/ProxyModels.js';
import { extractHost, resolveProviderHosts, sanitizeHostInput } from '../src/shared/utils/hostUtils.js';

describe('proxy address routing', () => {
    it('preserves nonstandard ports and IPv6 host notation during normalization', () => {
        expect(resolveProviderHosts('custom-a', 'https://shared.test:8443/v1')).toEqual(['shared.test:8443']);
        expect(resolveProviderHosts('custom-b', 'https://shared.test:9443/v1')).toEqual(['shared.test:9443']);
        expect(resolveProviderHosts('ipv6', 'https://[2001:db8::1]:9443/v1')).toEqual(['[2001:db8::1]:9443']);
        expect(extractHost('https://[2001:db8::1]:9443/v1')).toBe('[2001:db8::1]:9443');
        expect(sanitizeHostInput('2001:db8::1')).toBe('[2001:db8::1]');
        expect(sanitizeHostInput('[2001:db8::1]:3128')).toBe('[2001:db8::1]');
    });

    it('keeps provider routes for distinct ports and leaves an unbound provider direct', () => {
        const config = normalizeProxyConfig({
            profiles: [
                {
                    id: 'proxy-a',
                    name: 'Proxy A',
                    protocol: 'http',
                    host: 'proxy-a.test',
                    port: 3128,
                    auth: { enabled: false },
                    ignoreSslErrors: false
                },
                {
                    id: 'proxy-b',
                    name: 'Proxy B',
                    protocol: 'http',
                    host: 'proxy-b.test',
                    port: 1081,
                    auth: { enabled: false },
                    ignoreSslErrors: false
                }
            ],
            providerBindings: { 'custom-a': 'proxy-a', 'custom-b': 'proxy-b', ipv6: 'proxy-b' }
        });
        const providers: DiscoveredProvider[] = [
            {
                id: 'custom-a',
                name: 'Custom A',
                hosts: resolveProviderHosts('custom-a', 'https://shared.test:8443/v1')
            },
            {
                id: 'custom-b',
                name: 'Custom B',
                hosts: resolveProviderHosts('custom-b', 'https://shared.test:9443/v1')
            },
            {
                id: 'ipv6',
                name: 'IPv6 provider',
                hosts: resolveProviderHosts('ipv6', 'https://[2001:db8::1]:9443/v1')
            },
            {
                id: 'direct',
                name: 'Direct provider',
                hosts: resolveProviderHosts('direct', 'https://direct.test/v1')
            }
        ];

        const compiled = compileRoutingTable(providers, config);

        expect(compiled.routes).toEqual({
            'shared.test:8443': 'proxy-a',
            'shared.test:9443': 'proxy-b',
            '[2001:db8::1]:9443': 'proxy-b'
        });
        expect(compiled.hostToProfile.get('shared.test:8443')?.port).toBe(3128);
        expect(compiled.hostToProfile.get('shared.test:9443')?.port).toBe(1081);
        expect(compiled.routes['direct.test']).toBeUndefined();
    });
});
