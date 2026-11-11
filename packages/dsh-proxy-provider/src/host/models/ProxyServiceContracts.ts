import type { KalexProviderProxyConfig, ProxyProfile } from '../../shared/models/ProxyModels.js';

export interface RawProfileCandidate {
    readonly id?: string;
    readonly name?: string;
    readonly protocol?: string;
    readonly host?: string;
    readonly port?: number | string;
    readonly auth?: {
        readonly enabled?: boolean;
        readonly username?: string;
        readonly password?: string;
        readonly cipher?: string;
        readonly exportCipher?: string;
        readonly clearCredentials?: boolean;
    };
    readonly ignoreSslErrors?: boolean;
}

export interface RawConfigCandidate {
    readonly profiles?: readonly RawProfileCandidate[];
    readonly providerBindings?: Record<string, string | null | undefined>;
    readonly defaultTestUrl?: string;
    readonly config?: RawConfigCandidate;
    readonly payload?: RawConfigCandidate;
    readonly password?: string;
    readonly skipCredentials?: boolean;
}

export interface ProxyConfigStorage {
    load(path: string, fallback: RawConfigCandidate, masterKey: Uint8Array): KalexProviderProxyConfig;
    save(path: string, config: KalexProviderProxyConfig, masterKey: Uint8Array): void;
}

export interface MasterKeyProvider {
    getOrCreate(path?: string): Uint8Array;
}

export interface DispatcherResource {
    close?(): Promise<void>;
    destroy?(): Promise<void>;
}

export interface ProfileDispatcherLifecycle {
    getDispatcher(profile: ProxyProfile): Promise<DispatcherResource>;
    syncProfiles(profiles?: readonly ProxyProfile[]): Promise<void>;
    closeAll(): Promise<void>;
}
