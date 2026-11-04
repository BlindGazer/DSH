import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const libDir = resolve(rootDir, 'lib');

mkdirSync(libDir, { recursive: true });

const filesToCopy = [
  ['src/node/index.js', 'lib/index.js'],
  ['src/node/crypto-store.js', 'lib/crypto-store.js'],
  ['src/node/config-normalizer.js', 'lib/config-normalizer.js'],
  ['src/node/controller.js', 'lib/controller.js'],
  ['src/node/storage.js', 'lib/storage.js'],
  ['src/node/http-routes.js', 'lib/http-routes.js'],
  ['src/node/providers.js', 'lib/providers.js'],
  ['src/node/provider-endpoints.js', 'lib/provider-endpoints.js'],
  ['src/node/provider-hosts.js', 'lib/provider-hosts.js'],
  ['src/node/provider-yaml.js', 'lib/provider-yaml.js'],
  ['src/node/provider-discovery.js', 'lib/provider-discovery.js'],
  ['src/node/provider-routing.js', 'lib/provider-routing.js'],
  ['src/node/dispatcher.js', 'lib/dispatcher.js'],
  ['src/node/undici-loader.js', 'lib/undici-loader.js'],
  ['src/node/socks5.js', 'lib/socks5.js'],
  ['src/node/profile-dispatcher.js', 'lib/profile-dispatcher.js'],
  ['src/node/connection-test.js', 'lib/connection-test.js'],
  ['src/client/index.js', 'lib/client.js']
];

const themeSource = readFileSync(resolve(rootDir, 'src/client/theme/styles.js'), 'utf8');
const themeStyles = /^export const themeStyles = `([\s\S]*?)`\s*;?\s*$/.exec(themeSource)?.[1];
if (themeStyles === undefined) throw new Error('Could not read client theme styles');
const themeHook = readFileSync(resolve(rootDir, 'src/client/theme/useEffectiveTheme.js'), 'utf8')
  .replace(/^import \{ useEffect, useState \} from 'react';?\s*$/m, '')
  .replace(/\bexport function /g, 'function ');

const clientSources = [
  'src/client/styles-base.js',
  'src/client/styles-components.js',
  'src/client/styles-theme.js',
  'src/client/api-store.js',
  'src/client/locale.js',
  'src/client/components/ThemedSelect.js',
  'src/client/components/ProviderCardBar.js',
  'src/client/hooks/useImportExportHandlers.js',
  'src/client/hooks/useProfileActions.js',
  'src/client/components/ProfileCredentialsFields.js',
  'src/client/components/ProfileEditor.js',
  'src/client/components/ProxySettingsModal.js',
  'src/client/components/ProfilesSection.js',
  'src/client/components/RoutingSection.js',
  'src/client/components/ImportExportSection.js',
  'src/client/components/ModelsFooterBar.js'
];
const assembledClientSources = clientSources.map((path) => readFileSync(resolve(rootDir, path), 'utf8').replace(/^export function /gm, 'function ')).join('');
for (const [srcRel, destRel] of filesToCopy) {
  const srcPath = resolve(rootDir, srcRel);
  const destPath = resolve(rootDir, destRel);
  if (srcRel === 'src/client/index.js') {
    const client = readFileSync(srcPath, 'utf8');
    if (!client.includes('/* __KPP_CLIENT_SOURCES__ */') || !assembledClientSources.includes('/* __KPP_THEME_HOOK__ */') || !assembledClientSources.includes('/*__KPP_THEME_STYLES__*/')) {
      throw new Error('Client source or theme insertion points are missing');
    }
    writeFileSync(destPath, client.replace('/* __KPP_CLIENT_SOURCES__ */', assembledClientSources)
      .replace('/* __KPP_THEME_HOOK__ */', themeHook)
      .replace('/*__KPP_THEME_STYLES__*/', themeStyles), 'utf8');
  } else {
    copyFileSync(srcPath, destPath);
  }
}

// Validate client script syntax via node:vm
const clientCode = readFileSync(resolve(rootDir, 'lib/client.js'), 'utf8');
new vm.Script(clientCode, { filename: 'lib/client.js' });

// Emit TypeScript declarations
const typesContent = readFileSync(resolve(rootDir, 'src/types.ts'), 'utf8');
const indexDts = `${typesContent}

export declare const name: string;
export declare const BUILTIN_PROVIDER_ENDPOINTS: Record<string, { name: string; settingsNs: string; urls: string[] }>;
export declare function normalizeProfile(raw: unknown, masterKey?: Uint8Array | null): ProxyProfile | null;
export declare function normalizeProxyConfig(raw?: unknown, masterKey?: Uint8Array | null): KalexProviderProxyConfig;
export declare function sanitizeConfigForClient(config: KalexProviderProxyConfig): SanitizedProxyConfig;
export declare function extractHost(rawUrl: string): string | null;
export declare function sanitizeHostInput(input: string): string;
export declare function resolveProviderHosts(providerId: string, customBaseUrl?: string): string[];
export declare function discoverProviders(ctx: unknown, extraProviders?: Record<string, unknown>): Promise<DiscoveredProvider[]>;
export declare function compileRoutingTable(
  providers: DiscoveredProvider[],
  config: KalexProviderProxyConfig
): {
  hostToProfile: Map<string, ProxyProfile>;
  routes: Record<string, string>;
  conflicts: HostConflict[];
};
export declare function createProfileDispatcher(profile: ProxyProfile): Promise<unknown>;
export declare function establishSocks5Tunnel(profile: ProxyProfile, host: string, port: number, timeoutMs?: number): Promise<unknown>;
export declare function dispatchWithUndiciFetch(input: unknown, init: unknown, dispatcher: unknown): Promise<unknown>;
export declare function checkTcpReachability(host: string, port: number, timeoutMs?: number): Promise<{ ok: boolean; latencyMs: number }>;
export declare class DispatcherManager {
  signatureOf(profile: ProxyProfile): string;
  getDispatcher(profile: ProxyProfile): Promise<unknown>;
  syncProfiles(profiles?: ProxyProfile[]): Promise<void>;
  closeAll(): Promise<void>;
}
export declare function testProxyConnection(
  profile: ProxyProfile,
  testUrl?: string,
  fetchImpl?: typeof fetch
): Promise<TestConnectionResult>;
export declare function encryptAuthSecret(username: string, password: string, masterKey: Uint8Array): string;
export declare function decryptAuthSecret(cipherText: string, masterKey: Uint8Array): { username: string; password: string } | null;
export declare function encryptWithPassphrase(username: string, password: string, passphrase: string): string;
export declare function decryptWithPassphrase(cipherText: string, passphrase: string): { username: string; password: string };
export declare function maskUsername(username: string): string;
export interface ProviderProxyController {
  readonly config: SanitizedProxyConfig;
  originalFetch: typeof fetch;
  refreshRouting(): Promise<ProxyStateSnapshot>;
  getStateSnapshot(): ProxyStateSnapshot;
  updateConfig(config: unknown): Promise<ProxyStateSnapshot>;
  bindProvider(providerId: string, profileId: string | null): Promise<ProxyStateSnapshot>;
  exportConfig(options?: { includeCredentials?: boolean; password?: string }): unknown;
  importConfig(payload: unknown, password?: string): Promise<ProxyStateSnapshot>;
  resolveProfileWithSecrets(profile: unknown): ProxyProfile | null;
  resolveProfileForUrl(input: unknown): ProxyProfile | null;
  installFetchInterceptor(): void;
  dispose(): Promise<void>;
  testConnection(profile: ProxyProfile, testUrl?: string): Promise<TestConnectionResult>;
}
export declare function createProviderProxyController(options?: Record<string, unknown>): ProviderProxyController;
export declare function apply(ctx: unknown, config?: Partial<KalexProviderProxyConfig>): void;
`;

const clientDts = `export declare const inject: string[];
export declare function apply(ctx: unknown): void;
`;

writeFileSync(resolve(libDir, 'index.d.ts'), indexDts, 'utf8');
writeFileSync(resolve(libDir, 'client.d.ts'), clientDts, 'utf8');

console.log('Build completed successfully: lib/index.js, lib/client.js, lib/index.d.ts, lib/client.d.ts');
