import type { InvocationDescriptor, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { z } from 'zod';
import { AccountLabelSchema, AuthMethodSchema, ModelChoiceSchema, ModelSettingsSchema } from './accounts.ts';
import { PackageId, RemoteNamespace, ServiceKey } from './constants/runtime.ts';

export type { ModelChoice, ModelSettings } from './accounts.ts';
export { ModelChoiceSchema, ModelSettingsSchema } from './accounts.ts';

const UiComponentIdSchema = z.string().min(1).max(200);
const UiRenderErrorSchema = z
    .object({
        name: z.string().max(200),
        message: z.string().max(2000),
        stack: z.string().max(10000),
        componentStack: z.string().max(10000)
    })
    .strict();
export const ResetRequestSchema = z
    .object({
        accountLabel: AccountLabelSchema,
        creditId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
        idempotencyKey: z.string().uuid(),
        confirmed: z.literal(true)
    })
    .strict();
const UsageLimitSchema = z
    .object({ name: z.string(), usedPercent: z.number().finite(), windowSeconds: z.number().finite(), resetAt: z.number().finite() })
    .strict();
export const AccountSnapshotSchema = z
    .object({
        accountLabel: AccountLabelSchema,
        authMethod: AuthMethodSchema,
        autoRefreshLimits: z.boolean(),
        models: z.array(ModelChoiceSchema),
        catalogStatus: z.enum(['fallback', 'ready', 'error']),
        catalogError: z.string(),
        loggedIn: z.boolean(),
        expiresAt: z.number().finite(),
        usageStatus: z.enum(['idle', 'loading', 'ready', 'error']),
        usageLimited: z.boolean(),
        usageLimits: z.array(UsageLimitSchema),
        usageCredits: z.string(),
        usageCreditsUnlimited: z.boolean(),
        usageResetCredits: z.number().optional(),
        resetCards: z.array(z.object({ id: z.string(), expiresAt: z.number().optional() })),
        resetCardsStatus: z.enum(['idle', 'loading', 'ready', 'error']),
        resetResult: z
            .enum(['reset', 'already_redeemed', 'no_credit', 'nothing_to_reset', 'unknown', 'unavailable', 'pending', 'account_changed'])
            .optional(),
        usageUpdatedAt: z.number().finite(),
        usageError: z.string()
    })
    .strict();
export const SnapshotSchema = z
    .object({
        accounts: z.array(AccountSnapshotSchema),
        status: z.enum(['idle', 'starting', 'waiting', 'done', 'error']),
        deviceCode: z.string(),
        verificationUri: z.string(),
        callbackUrlRequested: z.boolean().optional(),
        retryAvailable: z.boolean().optional(),
        error: z.string()
    })
    .strict();
export const LoginRequestSchema = z
    .object({ accountLabel: AccountLabelSchema, authMethod: AuthMethodSchema, reauthenticate: z.boolean().optional() })
    .strict();
export const SubmitCallbackUrlRequestSchema = z.object({ url: z.string().min(1).max(4096) }).strict();
export const AccountRequestSchema = z.object({ accountLabel: AccountLabelSchema }).strict();
export const UpdateAccountRequestSchema = z
    .object({ accountLabel: AccountLabelSchema, newLabel: AccountLabelSchema, autoRefreshLimits: z.boolean() })
    .strict();
export const SaveModelsRequestSchema = z.object({ accountLabel: AccountLabelSchema, models: ModelSettingsSchema }).strict();
export type UiComponentId = z.infer<typeof UiComponentIdSchema>;
export type UiRenderError = z.infer<typeof UiRenderErrorSchema>;
export type ResetRequest = z.infer<typeof ResetRequestSchema>;
export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;
export type OpenAICodexSnapshot = z.infer<typeof SnapshotSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SubmitCallbackUrlRequest = z.infer<typeof SubmitCallbackUrlRequestSchema>;
export type AccountRequest = z.infer<typeof AccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type SaveModelsRequest = z.infer<typeof SaveModelsRequestSchema>;
export interface OpenAIHubRemote {
    snapshot(): Promise<OpenAICodexSnapshot>;
    startLogin(input: LoginRequest): Promise<OpenAICodexSnapshot>;
    cancelLogin(): Promise<OpenAICodexSnapshot>;
    retryLogin(): Promise<OpenAICodexSnapshot>;
    submitCallbackUrl(input: SubmitCallbackUrlRequest): Promise<OpenAICodexSnapshot>;
    updateAccount(input: UpdateAccountRequest): Promise<OpenAICodexSnapshot>;
    deleteAccount(input: AccountRequest): Promise<OpenAICodexSnapshot>;
    refreshCatalog(input: AccountRequest): Promise<OpenAICodexSnapshot>;
    refreshUsage(input: AccountRequest): Promise<OpenAICodexSnapshot>;
    saveModels(input: SaveModelsRequest): Promise<OpenAICodexSnapshot>;
    consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot>;
    reportUiError(error: UiRenderError): Promise<true>;
    reportUiReady(componentId: UiComponentId): Promise<true>;
}
export type RemoteMethod = keyof OpenAIHubRemote;
export function sanitizeUiRenderError(_error: UiRenderError): UiRenderError {
    // Текст стороннего исключения может содержать произвольные секреты, поэтому не переносим его через границу.
    return { name: 'UIError', message: 'OpenAI Hub UI render failed', stack: '', componentStack: '' };
}
const codec = <T extends z.ZodType>(symbol: string, schema: T) => ({
    mode: 'strict' as const,
    typeSymbol: `${PackageId}/remote#${symbol}`,
    create: () => schema
});
const inputs = {
    snapshot: undefined,
    startLogin: codec('LoginRequest', LoginRequestSchema),
    cancelLogin: undefined,
    retryLogin: undefined,
    submitCallbackUrl: codec('SubmitCallbackUrlRequest', SubmitCallbackUrlRequestSchema),
    updateAccount: codec('UpdateAccountRequest', UpdateAccountRequestSchema),
    deleteAccount: codec('AccountRequest', AccountRequestSchema),
    refreshCatalog: codec('AccountRequest', AccountRequestSchema),
    refreshUsage: codec('AccountRequest', AccountRequestSchema),
    saveModels: codec('SaveModelsRequest', SaveModelsRequestSchema),
    consumeReset: codec('ResetRequest', ResetRequestSchema),
    reportUiError: codec('UiRenderError', UiRenderErrorSchema),
    reportUiReady: codec('UiComponentId', UiComponentIdSchema)
};
const methods = [
    'snapshot',
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
] as const;
const descriptors = Object.freeze(
    methods.map<InvocationDescriptor>(method => ({
        id: `${PackageId}#OpenAICodexRemote/${method}`,
        service: ServiceKey,
        namespace: RemoteNamespace,
        method,
        invocation: { kind: 'direct' },
        parameters: inputs[method]
            ? [
                  {
                      name: method === 'reportUiError' ? 'error' : method === 'reportUiReady' ? 'componentId' : 'input',
                      wire: 'input',
                      source: 'json',
                      codec: inputs[method]
                  }
              ]
            : [],
        result:
            method === 'reportUiError' || method === 'reportUiReady'
                ? codec('RemoteActionAccepted', z.literal(true))
                : codec('OpenAICodexSnapshot', SnapshotSchema)
    }))
);
export const TYPERT_REMOTE = Object.freeze({ package: PackageId, descriptors }) satisfies TypertRemoteContribution;
export const TYPERT = Object.freeze({
    package: PackageId,
    face: 'host',
    schemas: Object.freeze([]),
    invocations: descriptors,
    model: Object.freeze({ services: Object.freeze([]), events: Object.freeze([]), objects: Object.freeze([]) })
});
export const parseSnapshot = (value: z.input<typeof SnapshotSchema>): OpenAICodexSnapshot => SnapshotSchema.parse(value);
