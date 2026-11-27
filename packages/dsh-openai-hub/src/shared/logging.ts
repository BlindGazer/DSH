import { z } from 'zod';
import { AccountLabelSchema, AuthMethodSchema } from './accounts.ts';
import { OAuthFailureMessages } from './constants/oauth-errors.ts';

export const OAuthFailureCodeSchema = z.enum([
    'oauth_connect_timeout',
    'oauth_dns_failed',
    'oauth_connection_refused',
    'oauth_connection_reset',
    'oauth_tls_failed',
    'oauth_headers_timeout',
    'oauth_body_timeout',
    'oauth_network_failed',
    'oauth_http_failed',
    'oauth_response_invalid',
    'oauth_claim_invalid',
    'oauth_callback_invalid',
    'oauth_internal_failed'
]);
export const OpenAIHubOAuthServerErrorSchema = z.enum([
    'invalid_grant',
    'invalid_request',
    'invalid_client',
    'unauthorized_client',
    'unsupported_grant_type',
    'access_denied',
    'temporarily_unavailable',
    'server_error',
    'invalid_scope',
    'expired_token',
    'other'
]);
export const OAuthExceptionNameSchema = z.enum([
    'Error',
    'TypeError',
    'AbortError',
    'TimeoutError',
    'AggregateError',
    'ConnectTimeoutError',
    'HeadersTimeoutError',
    'BodyTimeoutError',
    'SocketError',
    'RequestAbortedError',
    'other'
]);

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
    'retryLogin',
    'submitCallbackUrl',
    'updateAccount',
    'deleteAccount',
    'refreshCatalog',
    'refreshUsage',
    'saveModels',
    'consumeReset',
    'providerRequest',
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
        endpoint: z.enum(['codex_models', 'codex_usage', 'oauth_token', 'oauth_device_code', 'oauth_device_poll']),
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
export const OpenAIHubNetworkErrorSchema = z.enum([
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'other'
]);
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
        endpoint: z.enum(['codex_models', 'oauth_token', 'oauth_device_code', 'oauth_device_poll']).optional(),
        httpStatus: z.number().int().min(100).max(599).optional(),
        responseShape: z.enum(['models', 'data', 'invalid']).optional(),
        requestJson: OpenAIHubLogRequestJsonSchema.optional(),
        responseJson: OpenAIHubLogResponseJsonSchema.optional(),
        errorCode: OpenAIHubLogErrorCodeSchema.or(OAuthFailureCodeSchema).optional(),
        errorMessage: z.enum(Object.values(OAuthFailureMessages)).optional(),
        errorCauses: z
            .array(z.object({ name: OAuthExceptionNameSchema, code: OpenAIHubNetworkErrorSchema }).strict())
            .max(8)
            .optional(),
        networkTimeoutMs: z.number().int().positive().max(600_000).optional(),
        loginAttemptId: z.string().uuid().optional(),
        transport: z.literal('undici').optional(),
        transportEvent: z
            .enum(['request_created', 'response_headers', 'before_connect', 'connected', 'connect_error', 'request_error'])
            .optional(),
        connectionHost: z.enum(['auth.openai.com', 'other']).optional(),
        connectionPort: z.number().int().min(1).max(65535).optional(),
        diagnosticVersion: z.union([z.literal(2), z.literal(3)]).optional(),
        loginStage: z
            .enum([
                'callback_validation',
                'token_exchange',
                'token_response',
                'account_claim',
                'http_request',
                'network_connect',
                'account_conflict',
                'credential_store',
                'account_config'
            ])
            .optional(),
        networkError: OpenAIHubNetworkErrorSchema.optional(),
        oauthServerError: OpenAIHubOAuthServerErrorSchema.optional(),
        callbackError: z
            .enum([
                'invalid_url',
                'invalid_endpoint',
                'missing_code',
                'missing_state',
                'duplicate_code',
                'duplicate_state',
                'inactive_prompt'
            ])
            .optional()
    })
    .strict();
export const OpenAIHubClientLogEventSchema = OpenAIHubLogFieldsSchema;
export const OpenAIHubLogRecordSchema = OpenAIHubLogFieldsSchema.extend({
    timestamp: z.string().datetime(),
    source: z.enum(['client', 'host'])
}).strict();
export type OpenAIHubLogEvent = z.infer<typeof OpenAIHubLogFieldsSchema>;
export type OpenAIHubClientLogEvent = z.infer<typeof OpenAIHubClientLogEventSchema>;
export type OpenAIHubLogRecord = z.infer<typeof OpenAIHubLogRecordSchema>;
export type OpenAIHubLogSettings = z.infer<typeof OpenAIHubLogSettingsSchema>;
