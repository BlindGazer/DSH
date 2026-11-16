import { z } from 'zod';
import { PackageId, RemoteNamespace, ServiceKey } from './constants/runtime.js';

const UiComponentIdSchema = z.string().min(1).max(200);

const UiRenderErrorSchema = z
    .object({
        name: z.string().min(1).max(200),
        message: z.string().max(2000),
        stack: z.string().max(10000),
        componentStack: z.string().max(10000)
    })
    .strict()
    .readonly();

const ResetRequestSchema = z
    .object({
        creditId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
        idempotencyKey: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
        confirmed: z.literal(true)
    })
    .strict();

const UsageLimitSchema = z
    .object({
        name: z.string(),
        usedPercent: z.number().finite(),
        windowSeconds: z.number().finite(),
        resetAt: z.number().finite()
    })
    .strict()
    .readonly();

const ModelChoiceSchema = z
    .object({
        id: z.string().min(1).max(200),
        name: z.string().min(1).max(200),
        enabled: z.boolean()
    })
    .strict()
    .readonly();

const ModelSettingsSchema = z.array(ModelChoiceSchema).max(100).readonly();

const SnapshotSchema = z
    .object({
        proxyMode: z.enum(['host', 'system']).optional(),
        models: z.array(ModelChoiceSchema).max(100).readonly(),
        proxyRestartRequired: z.boolean().optional(),
        proxyError: z.string().optional(),
        status: z.enum(['idle', 'starting', 'waiting', 'done', 'error']),
        loggedIn: z.boolean(),
        deviceCode: z.string(),
        verificationUri: z.string(),
        expiresAt: z.number().finite(),
        error: z.string(),
        usageStatus: z.enum(['idle', 'loading', 'ready', 'error']),
        usageLimited: z.boolean(),
        usageLimits: z.array(UsageLimitSchema).readonly(),
        usageCredits: z.string(),
        usageCreditsUnlimited: z.boolean(),
        usageResetCredits: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
        resetCards: z
            .array(
                z
                    .object({
                        id: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
                        expiresAt: z.number().finite().positive().optional()
                    })
                    .strict()
            )
            .max(1000)
            .optional(),
        resetCardsStatus: z.enum(['idle', 'loading', 'ready', 'error']).optional(),
        resetResult: z
            .enum(['reset', 'already_redeemed', 'no_credit', 'nothing_to_reset', 'unknown', 'unavailable', 'pending', 'account_changed'])
            .optional(),
        usageUpdatedAt: z.number().finite(),
        usageError: z.string()
    })
    .strict()
    .readonly();

export type UiComponentId = z.infer<typeof UiComponentIdSchema>;
export type UiRenderError = z.infer<typeof UiRenderErrorSchema>;
export type ResetRequest = z.infer<typeof ResetRequestSchema>;

const sanitizeDiagnosticText = (value: string, maxLength: number) =>
    value
        .replace(
            /(authorization|token|secret|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token)(\s*[=:]\s*)[^\s,;]+/gi,
            '$1$2[redacted]'
        )
        .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
        .slice(0, maxLength);

export function sanitizeUiRenderError(error: UiRenderError): UiRenderError {
    return {
        name: sanitizeDiagnosticText(error.name, 200) || 'Error',
        message: sanitizeDiagnosticText(error.message, 2000),
        stack: sanitizeDiagnosticText(error.stack, 10000),
        componentStack: sanitizeDiagnosticText(error.componentStack, 10000)
    };
}
export type ModelChoice = z.infer<typeof ModelChoiceSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type OpenAICodexSnapshot = z.infer<typeof SnapshotSchema>;
export type RemoteMethod =
    | 'snapshot'
    | 'startLogin'
    | 'logout'
    | 'followHostProxy'
    | 'useSystemProxy'
    | 'consumeReset'
    | 'saveModels'
    | 'reportUiError'
    | 'reportUiReady';

const uiComponentIdCodec = () => ({
    mode: 'strict',
    typeSymbol: `${PackageId}/remote#UiComponentId`,
    create: () => UiComponentIdSchema
});

const uiRenderErrorCodec = () => ({
    mode: 'strict',
    typeSymbol: `${PackageId}/remote#UiRenderError`,
    create: () => UiRenderErrorSchema
});

const acceptedCodec = () => ({
    mode: 'strict',
    typeSymbol: `${PackageId}/remote#UiRenderErrorAccepted`,
    create: () => z.literal(true)
});

const snapshotCodec = () => ({
    mode: 'strict',
    typeSymbol: `${PackageId}/remote#OpenAICodexSnapshot`,
    create: () => SnapshotSchema
});

const descriptor = (method: RemoteMethod) => ({
    id: `${PackageId}#OpenAICodexRemote/${method}`,
    service: ServiceKey,
    namespace: RemoteNamespace,
    method,
    invocation: { kind: 'direct' },
    parameters:
        method === 'reportUiReady'
            ? [
                  {
                      name: 'componentId',
                      wire: 'input',
                      source: 'json',
                      codec: uiComponentIdCodec()
                  }
              ]
            : method === 'reportUiError'
              ? [
                    {
                        name: 'error',
                        wire: 'input',
                        source: 'json',
                        codec: uiRenderErrorCodec()
                    }
                ]
              : method === 'consumeReset'
                ? [
                      {
                          name: 'input',
                          wire: 'input',
                          source: 'json',
                          codec: { mode: 'strict', typeSymbol: `${PackageId}/remote#ResetRequest`, create: () => ResetRequestSchema }
                      }
                  ]
                : method === 'saveModels'
                  ? [
                        {
                            name: 'models',
                            wire: 'input',
                            source: 'json',
                            codec: { mode: 'strict', typeSymbol: `${PackageId}/remote#ModelSettings`, create: () => ModelSettingsSchema }
                        }
                    ]
                  : [],
    result: method === 'reportUiError' || method === 'reportUiReady' ? acceptedCodec() : snapshotCodec()
});

const methods = [
    'snapshot',
    'startLogin',
    'logout',
    'followHostProxy',
    'useSystemProxy',
    'consumeReset',
    'saveModels',
    'reportUiError',
    'reportUiReady'
] as const satisfies readonly RemoteMethod[];
const descriptors = Object.freeze(methods.map(descriptor));

export const TYPERT_REMOTE = Object.freeze({
    package: PackageId,
    descriptors
});

export const TYPERT = Object.freeze({
    package: PackageId,
    face: 'host',
    schemas: Object.freeze([]),
    invocations: descriptors,
    model: Object.freeze({
        services: Object.freeze([]),
        events: Object.freeze([]),
        objects: Object.freeze([])
    })
});

export const parseSnapshot = (value: z.input<typeof SnapshotSchema>): OpenAICodexSnapshot => SnapshotSchema.parse(value);
export { ModelChoiceSchema, ModelSettingsSchema, ResetRequestSchema, SnapshotSchema };
