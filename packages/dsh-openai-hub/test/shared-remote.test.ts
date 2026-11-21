import { describe, expect, it } from 'vitest';
import {
    CredentialRefPrefix,
    PackageId,
    ProviderRoute,
    RemoteNamespace,
    ResetStorageKey,
    ServiceKey
} from '../src/shared/constants/runtime.js';
import {
    AccountRequestSchema,
    LoginRequestSchema,
    ResetRequestSchema,
    SaveModelsRequestSchema,
    SnapshotSchema,
    sanitizeUiRenderError,
    TYPERT_REMOTE,
    UpdateAccountRequestSchema
} from '../src/shared/remote.js';

const account = {
    accountLabel: 'work-account',
    authMethod: 'device-code',
    autoRefreshLimits: false,
    models: [{ id: 'gpt-test', name: 'Test', enabled: true }],
    catalogStatus: 'ready',
    catalogError: '',
    loggedIn: true,
    expiresAt: 123,
    usageStatus: 'ready',
    usageLimited: false,
    usageLimits: [{ name: 'hourly', usedPercent: 20, windowSeconds: 3600, resetAt: 456 }],
    usageCredits: '10',
    usageCreditsUnlimited: false,
    resetCards: [],
    resetCardsStatus: 'ready',
    usageUpdatedAt: 456,
    usageError: ''
};
const snapshot = { accounts: [account], status: 'done', deviceCode: '', verificationUri: '', error: '' };

describe('OpenAI Hub shared remote contract', () => {
    it('accepts multi-account snapshots and rejects unknown/secret fields at both levels', () => {
        expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
        expect(SnapshotSchema.safeParse({ ...snapshot, credential: 'secret' }).success).toBe(false);
        expect(SnapshotSchema.safeParse({ ...snapshot, accounts: [{ ...account, refreshToken: 'secret' }] }).success).toBe(false);
    });

    it('strictly validates account-addressed mutations', () => {
        expect(LoginRequestSchema.safeParse({ accountLabel: 'new-account', authMethod: 'browser-oauth' }).success).toBe(true);
        expect(
            LoginRequestSchema.safeParse({ accountLabel: 'work-account', authMethod: 'device-code', reauthenticate: true }).success
        ).toBe(true);
        expect(LoginRequestSchema.safeParse({ accountLabel: 'Bad Label', authMethod: 'device-code' }).success).toBe(false);
        expect(AccountRequestSchema.safeParse({ accountLabel: 'work-account' }).success).toBe(true);
        expect(AccountRequestSchema.safeParse({ accountLabel: 'work-account', accountId: 'private-id' }).success).toBe(false);
        expect(
            UpdateAccountRequestSchema.safeParse({ accountLabel: 'work-account', newLabel: 'renamed', autoRefreshLimits: true }).success
        ).toBe(true);
        expect(
            SaveModelsRequestSchema.safeParse({ accountLabel: 'work-account', models: [{ id: 'gpt-test', name: 'Test', enabled: true }] })
                .success
        ).toBe(true);
        expect(
            SaveModelsRequestSchema.safeParse({ accountLabel: 'work-account', models: [{ id: '', name: '', enabled: true }] }).success
        ).toBe(false);
    });

    it('requires explicit confirmed reset, an account label and UUID idempotency key', () => {
        const valid = {
            accountLabel: 'work-account',
            creditId: 'card-1',
            idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
            confirmed: true
        };
        expect(ResetRequestSchema.safeParse(valid).success).toBe(true);
        expect(ResetRequestSchema.safeParse({ ...valid, confirmed: false }).success).toBe(false);
        expect(ResetRequestSchema.safeParse({ ...valid, idempotencyKey: 'not-a-uuid' }).success).toBe(false);
    });

    it('publishes one stable OpenAI Hub service and account CRUD/catalog methods, without legacy proxy operations', () => {
        expect({ PackageId, ServiceKey, RemoteNamespace, ProviderRoute, CredentialRefPrefix, ResetStorageKey }).toEqual({
            PackageId: '@kalex/dsh-openai-hub',
            ServiceKey: 'openai-hub',
            RemoteNamespace: 'openaiHub',
            ProviderRoute: 'openai-hub',
            CredentialRefPrefix: 'openai_hub',
            ResetStorageKey: '@kalex/dsh-openai-hub.pending-reset'
        });
        expect(TYPERT_REMOTE.package).toBe(PackageId);
        expect(TYPERT_REMOTE.descriptors.map(({ method }) => method)).toEqual([
            'snapshot',
            'loadLoggingSettings',
            'saveLoggingSettings',
            'recordClientLog',
            'startLogin',
            'cancelLogin',
            'retryLogin',
            'submitCallbackUrl',
            'updateAccount',
            'deleteAccount',
            'refreshCatalog',
            'refreshUsage',
            'saveModels',
            'consumeReset',
            'reportUiError',
            'reportUiReady'
        ]);
        expect(TYPERT_REMOTE.descriptors.map(({ method }) => method)).not.toContain('followHostProxy');
        expect(TYPERT_REMOTE.descriptors.map(({ method }) => method)).not.toContain('useSystemProxy');
    });

    it('replaces arbitrary UI exception text with a fixed safe diagnostic', () => {
        const safe = sanitizeUiRenderError({
            name: 'Error',
            message: 'Bearer secret-value',
            stack: 'token=secret-value',
            componentStack: 'secret-value'
        });
        expect(JSON.stringify(safe)).not.toContain('secret-value');
        expect(safe).toEqual({ name: 'UIError', message: 'OpenAI Hub UI render failed', stack: '', componentStack: '' });
    });
});
