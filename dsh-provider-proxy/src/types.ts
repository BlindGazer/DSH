export type ProxyProtocol = 'http' | 'https' | 'socks5';

export interface ProxyAuth {
  enabled: boolean;
  username?: string;
  password?: string;
}

export interface ProxyProfile {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  auth?: ProxyAuth;
  ignoreSslErrors: boolean;
}

export interface KalexProviderProxyConfig {
  profiles: ProxyProfile[];
  providerBindings: Record<string, string | null>;
  defaultTestUrl?: string;
}

export interface SanitizedProxyAuth {
  enabled: boolean;
  hasCredentials: boolean;
  usernameMask: string;
}

export interface SanitizedProxyProfile extends Omit<ProxyProfile, 'auth'> {
  auth: SanitizedProxyAuth;
}

export interface SanitizedProxyConfig {
  profiles: SanitizedProxyProfile[];
  providerBindings: Record<string, string | null>;
  defaultTestUrl: string;
}

export interface DiscoveredProvider {
  id: string;
  name: string;
  custom?: boolean;
  baseUrl?: string;
  hosts: string[];
  settingsNs?: string;
}

export interface HostConflict {
  host: string;
  providers: Array<{
    providerId: string;
    providerName: string;
    profileId: string | null;
    profileName: string;
  }>;
  appliedProfileId: string;
  appliedProfileName: string;
}

export interface TestConnectionResult {
  ok: boolean;
  tcpOk: boolean;
  httpOk: boolean;
  status?: number;
  latencyMs?: number;
  tcpLatencyMs?: number;
  error?: string;
}

export interface ProxyStateSnapshot {
  config: SanitizedProxyConfig;
  providers: DiscoveredProvider[];
  conflicts: HostConflict[];
  routes: Record<string, string>;
}
