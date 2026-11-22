import type { Context } from '@deepseek-ai/cordis';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { z } from 'zod';
import type { AccountConfig } from '../shared/accounts.ts';
import { credentialRefForAccount } from '../shared/constants/runtime.ts';
import { createCodexProvider } from './provider.ts';

export const OAuthCredentialSchema = z.object({
    type: z.literal('oauth'),
    access: z.string().min(1),
    refresh: z.string().min(1),
    expires: z.number().finite(),
    accountId: z.string().min(1)
});
export type OAuthCredential = z.infer<typeof OAuthCredentialSchema>;
const oauth = createCodexProvider().auth.oauth;
const writes = new WeakMap<object, Promise<void>>();
export class AccountCredentials {
    constructor(private readonly ctx: Context) {}
    private serialize<T>(operation: () => Promise<T>): Promise<T> {
        const result = (writes.get(this.ctx.credentials) ?? Promise.resolve()).then(operation);
        writes.set(
            this.ctx.credentials,
            result.then(
                () => undefined,
                () => undefined
            )
        );
        return result;
    }
    async read(account: AccountConfig): Promise<OAuthCredential | undefined> {
        let resolved: Awaited<ReturnType<Context['credentials']['resolve']>>;
        try {
            resolved = await this.ctx.credentials.resolve(credentialRef(account.credentialKey));
        } catch {
            throw new Error('OpenAI Hub credential store unavailable');
        }
        if (!resolved) return undefined;
        try {
            const parsed = OAuthCredentialSchema.safeParse(JSON.parse(resolved.value));
            return parsed.success && credentialRefForAccount(account.authMethod, parsed.data.accountId) === account.credentialKey
                ? parsed.data
                : undefined;
        } catch {
            return undefined;
        }
    }
    valid(account: AccountConfig, current: () => boolean): Promise<OAuthCredential> {
        return this.serialize(async () => {
            if (!current()) throw new Error('Stale OpenAI Hub account');
            let credential = await this.read(account);
            if (!credential) throw new Error('OpenAI Hub account requires sign-in');
            if (credential.expires < Date.now() + 60000) {
                if (!oauth) throw new Error('OpenAI Hub OAuth is unavailable');
                const refreshed = OAuthCredentialSchema.parse(await oauth.refresh(credential, new AbortController().signal));
                if (!current() || refreshed.accountId !== credential.accountId) throw new Error('Stale OpenAI Hub account');
                await this.ctx.credentials.set(credentialRef(account.credentialKey), JSON.stringify(refreshed));
                credential = refreshed;
            }
            if (!current()) throw new Error('Stale OpenAI Hub account');
            return credential;
        });
    }
    store(account: AccountConfig, credential: OAuthCredential, current: () => boolean, replaceExisting = false): Promise<void> {
        return this.serialize(async () => {
            if (!current()) throw new Error('OpenAI Hub login cancelled');
            const existing = await this.ctx.credentials.resolve(credentialRef(account.credentialKey));
            if (existing && !replaceExisting) {
                const stored = OAuthCredentialSchema.safeParse(JSON.parse(existing.value));
                if (!stored.success || stored.data.accountId !== credential.accountId)
                    throw new Error('OpenAI Hub credential key collision');
            }
            await this.ctx.credentials.set(credentialRef(account.credentialKey), JSON.stringify(OAuthCredentialSchema.parse(credential)));
            if (!current()) {
                if (existing) await this.ctx.credentials.set(credentialRef(account.credentialKey), existing.value);
                else await this.ctx.credentials.unset(credentialRef(account.credentialKey));
                throw new Error('OpenAI Hub login cancelled');
            }
        });
    }
    take(account: AccountConfig, deactivate: () => void): Promise<OAuthCredential | undefined> {
        // Ждем начатый refresh прежде, чем зафиксировать точный токен для возможного отката удаления.
        return this.serialize(async () => {
            const credential = await this.read(account);
            deactivate();
            await this.ctx.credentials.unset(credentialRef(account.credentialKey));
            return credential;
        });
    }
    restoreIfMissing(account: AccountConfig, credential: OAuthCredential): Promise<void> {
        // Откат ConfigEditor может remount-нуть Host; восстанавливаем только отсутствующую запись, не затирая новый refresh.
        return this.serialize(async () => {
            const ref = credentialRef(account.credentialKey);
            if (!(await this.ctx.credentials.resolve(ref))) await this.ctx.credentials.set(ref, JSON.stringify(credential));
        });
    }
    delete(account: AccountConfig): Promise<void> {
        return this.serialize(() => this.ctx.credentials.unset(credentialRef(account.credentialKey)));
    }
}
