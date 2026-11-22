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
var codec = (symbol, schema) => ({
	mode: "strict",
	typeSymbol: `${PackageId}/remote#${symbol}`,
	create: () => schema
});
var inputs = {
	snapshot: void 0,
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
	result: method === "reportUiError" || method === "reportUiReady" ? codec("RemoteActionAccepted", z.literal(true)) : codec("OpenAICodexSnapshot", SnapshotSchema)
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
