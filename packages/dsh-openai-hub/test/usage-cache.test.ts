import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { UsageCache } from '../src/host/usage-cache.ts';
import type { AccountSnapshot } from '../src/shared/remote.ts';

const { homedir } = vi.hoisted(() => ({ homedir: vi.fn<() => string>() }));
vi.mock(import('node:os'), async importOriginal => ({ ...(await importOriginal()), homedir }));

it('stores quota files under ~/dsh/openai-hub without sharing them between profiles', () => {
    const home = mkdtempSync(join(tmpdir(), 'openai-hub-quota-'));
    homedir.mockReturnValue(home);
    try {
        const desktop = join(home, 'desktop');
        const other = join(home, 'other');
        mkdirSync(desktop);
        mkdirSync(other);
        const cache = new UsageCache(desktop);
        const otherCache = new UsageCache(other);
        const summary = {
            usageLimited: false,
            usageLimits: [],
            usageCredits: '10',
            usageCreditsUnlimited: false,
            usageUpdatedAt: 1
        };
        const snapshot: AccountSnapshot = {
            ...summary,
            accountLabel: 'test',
            authMethod: 'browser-oauth',
            autoRefreshLimits: false,
            models: [],
            catalogStatus: 'fallback',
            catalogError: '',
            loggedIn: true,
            expiresAt: 0,
            usageStatus: 'ready',
            resetCards: [],
            resetCardsStatus: 'idle',
            usageError: ''
        };

        cache.write('test-key', snapshot);

        expect(readdirSync(join(home, 'dsh', 'openai-hub'))).toHaveLength(1);
        expect(readdirSync(desktop)).toStrictEqual([]);
        expect(cache.read('test-key')).toStrictEqual(summary);
        expect(otherCache.read('test-key')).toBeUndefined();
        otherCache.delete('test-key');
        expect(cache.read('test-key')).toStrictEqual(summary);
        cache.delete('test-key');
        expect(readdirSync(join(home, 'dsh', 'openai-hub'))).toStrictEqual([]);
    } finally {
        homedir.mockReset();
        rmSync(home, { recursive: true, force: true });
    }
});
