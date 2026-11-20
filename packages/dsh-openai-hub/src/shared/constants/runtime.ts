export const PackageId = '@kalex/dsh-openai-hub';
export const ServiceKey = 'openai-hub';
export const ProviderRoute = 'openai-hub';
export const RemoteNamespace = 'openaiHub';
export const CredentialRefPrefix = 'openai_hub';

export function credentialRefForAccount(authMethod: 'device-code' | 'browser-oauth', accountId: string): string {
    let hash = 2166136261;
    for (const char of accountId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `${CredentialRefPrefix}_${authMethod.replace('-', '_')}_${hex}`;
}
export const ResetStorageKey = '@kalex/dsh-openai-hub.pending-reset';
