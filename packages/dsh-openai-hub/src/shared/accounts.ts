import { z } from 'zod';

export const AccountLabelSchema = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);
export const AuthMethodSchema = z.enum(['device-code', 'browser-oauth']);
export const ModelChoiceSchema = z
    .object({ id: z.string().min(1).max(200), name: z.string().min(1).max(200), enabled: z.boolean() })
    .strict();
export const ModelSettingsSchema = z.array(ModelChoiceSchema).max(100);
export const AccountConfigSchema = z
    .object({
        accountLabel: AccountLabelSchema,
        authMethod: AuthMethodSchema,
        credentialKey: z.string().regex(/^openai_hub_(device_code|browser_oauth)_[0-9a-f]{8}$/),
        autoRefreshLimits: z.boolean().default(false),
        models: ModelSettingsSchema.default([]),
        catalogLoaded: z.boolean().default(false),
        catalogMetadata: z
            .array(
                z
                    .object({ id: z.string().min(1).max(200), contextWindow: z.number().positive(), maxTokens: z.number().positive() })
                    .strict()
            )
            .max(100)
            .default([])
    })
    .strict()
    .refine(account => account.credentialKey.startsWith(`openai_hub_${account.authMethod.replace('-', '_')}_`), {
        message: 'Credential key does not match authentication method'
    });
export const Config = z
    .object({ accounts: z.array(AccountConfigSchema).max(100).default([]) })
    .strict()
    .superRefine((value, ctx) => {
        const labels = new Set<string>();
        const keys = new Set<string>();
        for (const account of value.accounts) {
            if (labels.has(account.accountLabel) || keys.has(account.credentialKey))
                ctx.addIssue({ code: 'custom', message: 'Duplicate account', path: ['accounts'] });
            labels.add(account.accountLabel);
            keys.add(account.credentialKey);
        }
    })
    .prefault({});
export type AccountConfig = z.infer<typeof AccountConfigSchema>;
export type ModelChoice = z.infer<typeof ModelChoiceSchema>;
export type ModelSettings = readonly ModelChoice[];
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export function reconcileModels(saved: readonly ModelChoice[], ids: readonly string[]): ModelChoice[] {
    const available = new Set(ids);
    const seen = new Set<string>();
    const models: ModelChoice[] = [];
    for (const model of saved) {
        if (!available.has(model.id) || seen.has(model.id)) continue;
        seen.add(model.id);
        models.push({ ...model });
    }
    for (const id of available) if (!seen.has(id)) models.push({ id, name: id, enabled: true });
    return models;
}

export function splitModelId(id: string): { accountLabel: string; upstreamModelId: string } {
    const slash = id.indexOf('/');
    if (slash < 1 || slash === id.length - 1) throw new Error('Stale OpenAI Hub model; select a current model');
    return { accountLabel: AccountLabelSchema.parse(id.slice(0, slash)), upstreamModelId: id.slice(slash + 1) };
}
