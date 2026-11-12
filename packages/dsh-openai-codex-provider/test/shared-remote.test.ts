import { describe, expect, it } from 'vitest';
import { CredentialRef, PackageId, ProviderRoute, RemoteNamespace, ResetStorageKey, ServiceKey } from '../src/shared/constants/runtime.js';
import { ModelSettingsSchema, ResetRequestSchema, SnapshotSchema, TYPERT_REMOTE } from '../src/shared/remote.js';

const snapshot = {
    models: [],
    status: 'idle',
    loggedIn: false,
    deviceCode: '',
    verificationUri: '',
    expiresAt: 0,
    error: '',
    usageStatus: 'idle',
    usageLimited: false,
    usageLimits: [],
    usageCredits: '',
    usageCreditsUnlimited: false,
    usageUpdatedAt: 0,
    usageError: ''
} as const;

describe('shared remote contract', () => {
    it('accepts a sanitized snapshot and rejects credential fields', () => {
        expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
        expect(SnapshotSchema.safeParse({ ...snapshot, credentialPayload: 'not a credential' }).success).toBe(false);
    });

    it('accepts valid model settings and rejects an empty model id', () => {
        expect(ModelSettingsSchema.safeParse([{ id: 'codex-model', name: 'Codex', enabled: true }]).success).toBe(true);
        expect(ModelSettingsSchema.safeParse([{ id: '', name: 'Codex', enabled: true }]).success).toBe(false);
    });

    it('requires explicit confirmation and a UUID for reset redemption', () => {
        expect(
            ResetRequestSchema.safeParse({
                creditId: 'card-1',
                idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
                confirmed: true
            }).success
        ).toBe(true);
        expect(ResetRequestSchema.safeParse({ creditId: 'card-1', confirmed: false }).success).toBe(false);
    });

    it('keeps the legacy Typed Remote exchange package and methods', () => {
        expect(TYPERT_REMOTE.package).toBe('dsh-openai-codex-auth');
        expect(TYPERT_REMOTE.descriptors.map(({ method }) => method)).toEqual([
            'snapshot',
            'startLogin',
            'logout',
            'followHostProxy',
            'useSystemProxy',
            'consumeReset',
            'saveModels'
        ]);
    });

    it('preserves legacy runtime identifiers used by installed profiles', () => {
        expect({ PackageId, ServiceKey, RemoteNamespace, ProviderRoute, CredentialRef, ResetStorageKey }).toEqual({
            PackageId: 'dsh-openai-codex-auth',
            ServiceKey: 'openai-codex-auth',
            RemoteNamespace: 'openaiCodex',
            ProviderRoute: 'openai-codex',
            CredentialRef: 'PI_OAUTH_OPENAI_CODEX',
            ResetStorageKey: 'dsh-openai-codex-auth.pending-reset'
        });
    });
});
