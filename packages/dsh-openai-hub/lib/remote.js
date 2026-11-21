import { z } from "zod";
// src/shared/accounts.ts
var AccountLabelSchema = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);
var AuthMethodSchema = z.enum(["device-code", "browser-oauth"]);
var ModelChoiceSchema = z.object({
	id: z.string().min(1).max(200),
	name: z.string().min(1).max(200),
	enabled: z.boolean()
}).strict();
var ModelSettingsSchema = z.array(ModelChoiceSchema).max(100);
var AccountConfigSchema = z.object({
	accountLabel: AccountLabelSchema,
	authMethod: AuthMethodSchema,
	credentialKey: z.string().regex(/^openai_hub_(device_code|browser_oauth)_[0-9a-f]{8}$/),
	autoRefreshLimits: z.boolean().default(false),
	models: ModelSettingsSchema.default([]),
	catalogLoaded: z.boolean().default(false),
	catalogMetadata: z.array(z.object({
		id: z.string().min(1).max(200),
		contextWindow: z.number().positive(),
		maxTokens: z.number().positive()
	}).strict()).max(100).default([])
}).strict().refine((account) => account.credentialKey.startsWith(`openai_hub_${account.authMethod.replace("-", "_")}_`), { message: "Credential key does not match authentication method" });
z.object({ accounts: z.array(AccountConfigSchema).max(100).default([]) }).strict().superRefine((value, ctx) => {
	const labels = /* @__PURE__ */ new Set();
	const keys = /* @__PURE__ */ new Set();
	for (const account of value.accounts) {
		if (labels.has(account.accountLabel) || keys.has(account.credentialKey)) ctx.addIssue({
			code: "custom",
			message: "Duplicate account",
			path: ["accounts"]
		});
		labels.add(account.accountLabel);
		keys.add(account.credentialKey);
	}
}).prefault({});
// src/shared/constants/runtime.ts
var PackageId = "@kalex/dsh-openai-hub";
var ServiceKey = "openai-hub";
var RemoteNamespace = "openaiHub";
// src/shared/constants/oauth-errors.ts
var OAuthFailureMessages = {
	oauth_connect_timeout: "Establishing a connection for the OAuth request timed out; that connection returned no HTTP response.",
	oauth_dns_failed: "DNS resolution failed for the OAuth connection to auth.openai.com.",
	oauth_connection_refused: "The OAuth connection was refused.",
	oauth_connection_reset: "The OAuth connection was reset.",
	oauth_tls_failed: "TLS certificate verification failed for the OAuth connection.",
	oauth_headers_timeout: "The OAuth connection did not return HTTP response headers in time.",
	oauth_body_timeout: "Reading the OAuth response body timed out.",
	oauth_network_failed: "The OAuth request to auth.openai.com failed; inspect the recorded exception types and codes.",
	oauth_http_failed: "The OAuth endpoint returned an unsuccessful HTTP status.",
	oauth_response_invalid: "The OAuth endpoint returned an invalid token response.",
	oauth_claim_invalid: "The OAuth token contains no valid ChatGPT account claim.",
	oauth_callback_invalid: "The callback does not match the current OAuth sign-in attempt.",
	oauth_internal_failed: "OAuth sign-in failed outside the observed token exchange; no network cause was established."
};
// src/shared/logging.ts
var OAuthFailureCodeSchema = z.enum([
	"oauth_connect_timeout",
	"oauth_dns_failed",
	"oauth_connection_refused",
	"oauth_connection_reset",
	"oauth_tls_failed",
	"oauth_headers_timeout",
	"oauth_body_timeout",
	"oauth_network_failed",
	"oauth_http_failed",
	"oauth_response_invalid",
	"oauth_claim_invalid",
	"oauth_callback_invalid",
	"oauth_internal_failed"
]);
var OpenAIHubOAuthServerErrorSchema = z.enum([
	"invalid_grant",
	"invalid_request",
	"invalid_client",
	"unauthorized_client",
	"unsupported_grant_type",
	"access_denied",
	"temporarily_unavailable",
	"server_error",
	"invalid_scope",
	"expired_token",
	"other"
]);
var OAuthExceptionNameSchema = z.enum([
	"Error",
	"TypeError",
	"AbortError",
	"TimeoutError",
	"AggregateError",
	"ConnectTimeoutError",
	"HeadersTimeoutError",
	"BodyTimeoutError",
	"SocketError",
	"RequestAbortedError",
	"other"
]);
var OpenAIHubLogSettingsSchema = z.object({ enabled: z.boolean().default(false) }).strict().prefault({});
var OpenAIHubLogEventSchema = z.enum([
	"plugin",
	"settings",
	"snapshot",
	"login",
	"account_update",
	"account_delete",
	"catalog_refresh",
	"usage_refresh",
	"models_save",
	"reset",
	"provider_request",
	"ui_render"
]);
var OpenAIHubLogPhaseSchema = z.enum([
	"started",
	"completed",
	"failed",
	"waiting",
	"device_code_received",
	"authorization_url_received",
	"callback_received",
	"opened",
	"saved",
	"enabled",
	"disabled",
	"stopped",
	"ready"
]);
var OpenAIHubLogOperationSchema = z.enum([
	"snapshot",
	"startLogin",
	"cancelLogin",
	"retryLogin",
	"submitCallbackUrl",
	"updateAccount",
	"deleteAccount",
	"refreshCatalog",
	"refreshUsage",
	"saveModels",
	"consumeReset",
	"providerRequest",
	"loadLoggingSettings",
	"setLoggingEnabled"
]);
var OpenAIHubLogErrorCodeSchema = z.enum([
	"request_failed",
	"oauth_failed",
	"catalog_failed",
	"usage_failed",
	"storage_failed",
	"validation_failed",
	"unknown"
]);
var OpenAIHubLogRequestJsonSchema = z.object({
	endpoint: z.enum([
		"codex_models",
		"codex_usage",
		"oauth_token",
		"oauth_device_code",
		"oauth_device_poll"
	]),
	method: z.enum(["GET", "POST"]),
	body: z.enum(["none", "redacted"])
}).strict();
var OpenAIHubLogResponseJsonSchema = z.object({
	status: z.number().int().min(100).max(599),
	contentType: z.enum([
		"application/json",
		"other",
		"missing"
	]),
	shape: z.enum([
		"models",
		"data",
		"usage",
		"invalid",
		"empty"
	]),
	fields: z.array(z.enum([
		"models",
		"data",
		"rate_limit",
		"additional_rate_limits",
		"credits",
		"rate_limit_reset_credits"
	])).max(8),
	itemCount: z.number().int().nonnegative().max(1e5).optional()
}).strict();
var OpenAIHubNetworkErrorSchema = z.enum([
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"ENOTFOUND",
	"EAI_AGAIN",
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
	"CERT_HAS_EXPIRED",
	"UNABLE_TO_VERIFY_LEAF_SIGNATURE",
	"DEPTH_ZERO_SELF_SIGNED_CERT",
	"other"
]);
var OpenAIHubLogFieldsSchema = z.object({
	event: OpenAIHubLogEventSchema,
	phase: OpenAIHubLogPhaseSchema,
	operation: OpenAIHubLogOperationSchema.optional(),
	accountLabel: AccountLabelSchema.optional(),
	authMethod: AuthMethodSchema.optional(),
	state: z.enum([
		"idle",
		"starting",
		"waiting",
		"done",
		"error"
	]).optional(),
	durationMs: z.number().int().nonnegative().max(864e5).optional(),
	count: z.number().int().nonnegative().max(1e5).optional(),
	endpoint: z.enum([
		"codex_models",
		"oauth_token",
		"oauth_device_code",
		"oauth_device_poll"
	]).optional(),
	httpStatus: z.number().int().min(100).max(599).optional(),
	responseShape: z.enum([
		"models",
		"data",
		"invalid"
	]).optional(),
	requestJson: OpenAIHubLogRequestJsonSchema.optional(),
	responseJson: OpenAIHubLogResponseJsonSchema.optional(),
	errorCode: OpenAIHubLogErrorCodeSchema.or(OAuthFailureCodeSchema).optional(),
	errorMessage: z.enum(Object.values(OAuthFailureMessages)).optional(),
	errorCauses: z.array(z.object({
		name: OAuthExceptionNameSchema,
		code: OpenAIHubNetworkErrorSchema
	}).strict()).max(8).optional(),
	networkTimeoutMs: z.number().int().positive().max(6e5).optional(),
	loginAttemptId: z.string().uuid().optional(),
	transport: z.literal("undici").optional(),
	transportEvent: z.enum([
		"request_created",
		"response_headers",
		"before_connect",
		"connected",
		"connect_error",
		"request_error"
	]).optional(),
	connectionHost: z.enum(["auth.openai.com", "other"]).optional(),
	connectionPort: z.number().int().min(1).max(65535).optional(),
	diagnosticVersion: z.union([z.literal(2), z.literal(3)]).optional(),
	loginStage: z.enum([
		"callback_validation",
		"token_exchange",
		"token_response",
		"account_claim",
		"http_request",
		"network_connect"
	]).optional(),
	networkError: OpenAIHubNetworkErrorSchema.optional(),
	oauthServerError: OpenAIHubOAuthServerErrorSchema.optional(),
	callbackError: z.enum([
		"invalid_url",
		"invalid_endpoint",
		"missing_code",
		"missing_state",
		"duplicate_code",
		"duplicate_state",
		"inactive_prompt"
	]).optional()
}).strict();
var OpenAIHubClientLogEventSchema = OpenAIHubLogFieldsSchema;
OpenAIHubLogFieldsSchema.extend({
	timestamp: z.string().datetime(),
	source: z.enum(["client", "host"])
}).strict();
z.object({
	version: z.literal(1),
	settings: OpenAIHubLogSettingsSchema
});
// src/shared/remote.ts
var UiComponentIdSchema = z.string().min(1).max(200);
var UiRenderErrorSchema = z.object({
	name: z.string().max(200),
	message: z.string().max(2e3),
	stack: z.string().max(1e4),
	componentStack: z.string().max(1e4)
}).strict();
var ResetRequestSchema = z.object({
	accountLabel: AccountLabelSchema,
	creditId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
	idempotencyKey: z.string().uuid(),
	confirmed: z.literal(true)
}).strict();
var UsageLimitSchema = z.object({
	name: z.string(),
	usedPercent: z.number().finite(),
	windowSeconds: z.number().finite(),
	resetAt: z.number().finite()
}).strict();
var AccountSnapshotSchema = z.object({
	accountLabel: AccountLabelSchema,
	authMethod: AuthMethodSchema,
	autoRefreshLimits: z.boolean(),
	models: z.array(ModelChoiceSchema),
	catalogStatus: z.enum([
		"fallback",
		"ready",
		"error"
	]),
	catalogError: z.string(),
	loggedIn: z.boolean(),
	expiresAt: z.number().finite(),
	usageStatus: z.enum([
		"idle",
		"loading",
		"ready",
		"error"
	]),
	usageLimited: z.boolean(),
	usageLimits: z.array(UsageLimitSchema),
	usageCredits: z.string(),
	usageCreditsUnlimited: z.boolean(),
	usageResetCredits: z.number().optional(),
	resetCards: z.array(z.object({
		id: z.string(),
		expiresAt: z.number().optional()
	})),
	resetCardsStatus: z.enum([
		"idle",
		"loading",
		"ready",
		"error"
	]),
	resetResult: z.enum([
		"reset",
		"already_redeemed",
		"no_credit",
		"nothing_to_reset",
		"unknown",
		"unavailable",
		"pending",
		"account_changed"
	]).optional(),
	usageUpdatedAt: z.number().finite(),
	usageError: z.string()
}).strict();
var SnapshotSchema = z.object({
	accounts: z.array(AccountSnapshotSchema),
	status: z.enum([
		"idle",
		"starting",
		"waiting",
		"done",
		"error"
	]),
	deviceCode: z.string(),
	verificationUri: z.string(),
	callbackUrlRequested: z.boolean().optional(),
	retryAvailable: z.boolean().optional(),
	error: z.string()
}).strict();
var LoginRequestSchema = z.object({
	accountLabel: AccountLabelSchema,
	authMethod: AuthMethodSchema,
	reauthenticate: z.boolean().optional()
}).strict();
var SubmitCallbackUrlRequestSchema = z.object({ url: z.string().min(1).max(4096) }).strict();
var AccountRequestSchema = z.object({ accountLabel: AccountLabelSchema }).strict();
var UpdateAccountRequestSchema = z.object({
	accountLabel: AccountLabelSchema,
	newLabel: AccountLabelSchema,
	autoRefreshLimits: z.boolean()
}).strict();
var SaveModelsRequestSchema = z.object({
	accountLabel: AccountLabelSchema,
	models: ModelSettingsSchema
}).strict();
var SaveLoggingSettingsRequestSchema = OpenAIHubLogSettingsSchema;
var codec = (symbol, schema) => ({
	mode: "strict",
	typeSymbol: `${PackageId}/remote#${symbol}`,
	create: () => schema
});
var inputs = {
	snapshot: void 0,
	loadLoggingSettings: void 0,
	saveLoggingSettings: codec("OpenAIHubLogSettings", SaveLoggingSettingsRequestSchema),
	recordClientLog: codec("OpenAIHubClientLogEvent", OpenAIHubClientLogEventSchema),
	startLogin: codec("LoginRequest", LoginRequestSchema),
	cancelLogin: void 0,
	retryLogin: void 0,
	submitCallbackUrl: codec("SubmitCallbackUrlRequest", SubmitCallbackUrlRequestSchema),
	updateAccount: codec("UpdateAccountRequest", UpdateAccountRequestSchema),
	deleteAccount: codec("AccountRequest", AccountRequestSchema),
	refreshCatalog: codec("AccountRequest", AccountRequestSchema),
	refreshUsage: codec("AccountRequest", AccountRequestSchema),
	saveModels: codec("SaveModelsRequest", SaveModelsRequestSchema),
	consumeReset: codec("ResetRequest", ResetRequestSchema),
	reportUiError: codec("UiRenderError", UiRenderErrorSchema),
	reportUiReady: codec("UiComponentId", UiComponentIdSchema)
};
var descriptors = Object.freeze([
	"snapshot",
	"loadLoggingSettings",
	"saveLoggingSettings",
	"recordClientLog",
	"startLogin",
	"cancelLogin",
	"retryLogin",
	"submitCallbackUrl",
	"updateAccount",
	"deleteAccount",
	"refreshCatalog",
	"refreshUsage",
	"saveModels",
	"consumeReset",
	"reportUiError",
	"reportUiReady"
].map((method) => ({
	id: `${PackageId}#OpenAICodexRemote/${method}`,
	service: ServiceKey,
	namespace: RemoteNamespace,
	method,
	invocation: { kind: "direct" },
	parameters: inputs[method] ? [{
		name: method === "reportUiError" ? "error" : method === "reportUiReady" ? "componentId" : "input",
		wire: "input",
		source: "json",
		codec: inputs[method]
	}] : [],
	result: method === "reportUiError" || method === "reportUiReady" || method === "recordClientLog" ? codec("RemoteActionAccepted", z.literal(true)) : method === "loadLoggingSettings" || method === "saveLoggingSettings" ? codec("OpenAIHubLogSettings", OpenAIHubLogSettingsSchema) : codec("OpenAICodexSnapshot", SnapshotSchema)
})));
var TYPERT_REMOTE = Object.freeze({
	package: PackageId,
	descriptors
});
var TYPERT = Object.freeze({
	package: PackageId,
	face: "host",
	schemas: Object.freeze([]),
	invocations: descriptors,
	model: Object.freeze({
		services: Object.freeze([]),
		events: Object.freeze([]),
		objects: Object.freeze([])
	})
});
export { TYPERT, TYPERT_REMOTE };
