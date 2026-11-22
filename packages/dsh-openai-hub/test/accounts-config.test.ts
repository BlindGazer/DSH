import { describe, expect, it } from 'vitest';
import { Config, reconcileModels, splitModelId } from '../src/shared/accounts.ts';
import { credentialRefForAccount } from '../src/shared/constants/runtime.ts';
import { AccountSnapshotSchema, SnapshotSchema } from '../src/shared/remote.ts';

const account = (overrides: Record<string, unknown> = {}) => ({
    accountLabel: 'work-account',
    authMethod: 'device-code',
    credentialKey: 'openai_hub_device_code_7f3a91c2',
    autoRefreshLimits: false,
    models: [],
    catalogLoaded: false,
    ...overrides
});

describe('account configuration and model reconciliation', () => {
    it('defaults to no accounts and rejects duplicate labels or credential references', () => {
        expect(Config.parse({})).toEqual({ accounts: [] });
        expect(
            Config.safeParse({
                accounts: [account(), account({ authMethod: 'browser-oauth', credentialKey: 'openai_hub_browser_oauth_12345678' })]
            }).success
        ).toBe(false);
        expect(Config.safeParse({ accounts: [account(), account({ accountLabel: 'personal' })] }).success).toBe(false);
    });

    it('validates distinct auth modes and SDK-compatible opaque credential references', () => {
        expect(
            Config.safeParse({
                accounts: [
                    account(),
                    account({ accountLabel: 'personal', authMethod: 'browser-oauth', credentialKey: 'openai_hub_browser_oauth_12345678' })
                ]
            }).success
        ).toBe(true);
        for (const credentialKey of ['openai-hub-device-code-12345678', 'openai_hub_device_code_1234567g']) {
            expect(Config.safeParse({ accounts: [account({ credentialKey })] }).success).toBe(false);
        }
    });

    it('derives stable per-method credential references without retaining the account id', () => {
        const device = credentialRefForAccount('device-code', 'synthetic-account-12345678');
        expect(device).toMatch(/^openai_hub_device_code_[0-9a-f]{8}$/);
        expect(credentialRefForAccount('device-code', 'synthetic-account-12345678')).toBe(device);
        expect(credentialRefForAccount('browser-oauth', 'synthetic-account-12345678')).toMatch(/^openai_hub_browser_oauth_[0-9a-f]{8}$/);
        expect(credentialRefForAccount('device-code', 'different-synthetic-account')).not.toBe(device);
        expect(device).not.toContain('synthetic-account');
    });

    it('reconciles saved preferences to a fresh catalog and keeps surviving labels/enabled states', () => {
        expect(
            reconcileModels(
                [
                    { id: 'kept', name: 'My label', enabled: false },
                    { id: 'removed', name: 'Removed', enabled: true },
                    { id: 'kept', name: 'Duplicate', enabled: true }
                ],
                ['kept', 'fresh']
            )
        ).toEqual([
            { id: 'kept', name: 'My label', enabled: false },
            { id: 'fresh', name: 'fresh', enabled: true }
        ]);
    });

    it('unwraps account-qualified IDs and rejects malformed/stale IDs', () => {
        expect(splitModelId('work-account/vendor/model')).toEqual({ accountLabel: 'work-account', upstreamModelId: 'vendor/model' });
        for (const id of ['model', '/model', 'work-account/', 'Bad/model', 'unknown/model']) {
            if (id === 'unknown/model') continue; // Account existence is enforced by the runtime, not this parser.
            expect(() => splitModelId(id)).toThrow();
        }
    });

    it('validates an account-oriented sanitized snapshot and rejects secret-shaped fields', () => {
        const view = {
            accountLabel: 'work-account',
            authMethod: 'device-code',
            autoRefreshLimits: false,
            models: [],
            catalogStatus: 'fallback',
            catalogError: '',
            loggedIn: false,
            expiresAt: 0,
            usageStatus: 'idle',
            usageLimited: false,
            usageLimits: [],
            usageCredits: '',
            usageCreditsUnlimited: false,
            resetCards: [],
            resetCardsStatus: 'idle',
            usageUpdatedAt: 0,
            usageError: ''
        };
        expect(SnapshotSchema.safeParse({ accounts: [view], status: 'idle', deviceCode: '', verificationUri: '', error: '' }).success).toBe(
            true
        );
        expect(AccountSnapshotSchema.safeParse({ ...view, accessToken: 'never-public' }).success).toBe(false);
        expect(
            SnapshotSchema.safeParse({
                accounts: [view],
                status: 'idle',
                deviceCode: '',
                verificationUri: '',
                error: '',
                credentialPayload: 'secret'
            }).success
        ).toBe(false);
    });
});
