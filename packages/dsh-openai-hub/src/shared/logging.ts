import { z } from 'zod';
import { AccountLabelSchema, AuthMethodSchema } from './accounts.js';

export const OpenAIHubLogSettingsSchema = z
    .object({ enabled: z.boolean().default(false) })
    .strict()
    .prefault({});
export const OpenAIHubLogEventSchema = z.enum([
    'plugin',
    'settings',
    'snapshot',
    'login',
    'account_update',
    'account_delete',
    'catalog_refresh',
    'usage_refresh',
    'models_save',
    'reset',
    'provider_request',
    'ui_render'
]);
export const OpenAIHubLogPhaseSchema = z.enum([
    'started',
    'completed',
    'failed',
    'waiting',
    'device_code_received',
    'authorization_url_received',
    'callback_received',
    'opened',
    'saved',
    'enabled',
    'disabled',
    'stopped',
    'ready'
]);
export const OpenAIHubLogOperationSchema = z.enum([
    'snapshot',
    'startLogin',
    'cancelLogin',
    'submitCallbackUrl',
    'updateAccount',
    'deleteAccount',
    'refreshCatalog',
    'refreshUsage',
    'saveModels',
    'consumeReset',
    'providerRequest',
    'loadLoggingSettings',
    'setLoggingEnabled'
]);
export const OpenAIHubLogErrorCodeSchema = z.enum([
    'request_failed',
    'oauth_failed',
    'catalog_failed',
    'usage_failed',
    'storage_failed',
    'validation_failed',
    'unknown'
]);
const OpenAIHubLogRequestJsonSchema = z
    .object({
        endpoint: z.enum(['codex_models', 'codex_usage']),
        method: z.enum(['GET', 'POST']),
        body: z.enum(['none', 'redacted'])
    })
    .strict();
const OpenAIHubLogResponseJsonSchema = z
    .object({
        status: z.number().int().min(100).max(599),
        contentType: z.enum(['application/json', 'other', 'missing']),
        shape: z.enum(['models', 'data', 'usage', 'invalid', 'empty']),
        fields: z.array(z.enum(['models', 'data', 'rate_limit', 'additional_rate_limits', 'credits', 'rate_limit_reset_credits'])).max(8),
        itemCount: z.number().int().nonnegative().max(100_000).optional()
    })
    .strict();
const OpenAIHubLogFieldsSchema = z
    .object({
        event: OpenAIHubLogEventSchema,
        phase: OpenAIHubLogPhaseSchema,
        operation: OpenAIHubLogOperationSchema.optional(),
        accountLabel: AccountLabelSchema.optional(),
        authMethod: AuthMethodSchema.optional(),
        state: z.enum(['idle', 'starting', 'waiting', 'done', 'error']).optional(),
        durationMs: z.number().int().nonnegative().max(86_400_000).optional(),
        count: z.number().int().nonnegative().max(100_000).optional(),
        endpoint: z.enum(['codex_models']).optional(),
        httpStatus: z.number().int().min(100).max(599).optional(),
        responseShape: z.enum(['models', 'data', 'invalid']).optional(),
        requestJson: OpenAIHubLogRequestJsonSchema.optional(),
        responseJson: OpenAIHubLogResponseJsonSchema.optional(),
        errorCode: OpenAIHubLogErrorCodeSchema.optional()
    })
    .strict();
export const OpenAIHubClientLogEventSchema = OpenAIHubLogFieldsSchema;
export const OpenAIHubLogRecordSchema = OpenAIHubLogFieldsSchema.extend({
    timestamp: z.string().datetime(),
    source: z.enum(['client', 'host'])
}).strict();
export const OpenAIHubLoggingSettingsFileSchema = z.object({
    version: z.literal(1),
    settings: OpenAIHubLogSettingsSchema
});
export type OpenAIHubLogEvent = z.infer<typeof OpenAIHubLogFieldsSchema>;
export type OpenAIHubClientLogEvent = z.infer<typeof OpenAIHubClientLogEventSchema>;
export type OpenAIHubLogRecord = z.infer<typeof OpenAIHubLogRecordSchema>;
export type OpenAIHubLogSettings = z.infer<typeof OpenAIHubLogSettingsSchema>;
