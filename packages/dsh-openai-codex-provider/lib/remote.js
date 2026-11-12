import { z } from "zod";
// src/shared/constants/runtime.ts
var PackageId = "dsh-openai-codex-auth";
var ServiceKey = "openai-codex-auth";
var RemoteNamespace = "openaiCodex";
// src/shared/remote.ts
var ResetRequestSchema = z.object({
	creditId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
	idempotencyKey: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
	confirmed: z.literal(true)
}).strict();
var UsageLimitSchema = z.object({
	name: z.string(),
	usedPercent: z.number().finite(),
	windowSeconds: z.number().finite(),
	resetAt: z.number().finite()
}).strict().readonly();
var ModelChoiceSchema = z.object({
	id: z.string().min(1).max(200),
	name: z.string().min(1).max(200),
	enabled: z.boolean()
}).strict().readonly();
var ModelSettingsSchema = z.array(ModelChoiceSchema).max(100).readonly();
var SnapshotSchema = z.object({
	proxyMode: z.enum(["host", "system"]).optional(),
	models: z.array(ModelChoiceSchema).max(100).readonly(),
	proxyRestartRequired: z.boolean().optional(),
	proxyError: z.string().optional(),
	status: z.enum([
		"idle",
		"starting",
		"waiting",
		"done",
		"error"
	]),
	loggedIn: z.boolean(),
	deviceCode: z.string(),
	verificationUri: z.string(),
	expiresAt: z.number().finite(),
	error: z.string(),
	usageStatus: z.enum([
		"idle",
		"loading",
		"ready",
		"error"
	]),
	usageLimited: z.boolean(),
	usageLimits: z.array(UsageLimitSchema).readonly(),
	usageCredits: z.string(),
	usageCreditsUnlimited: z.boolean(),
	usageResetCredits: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
	resetCards: z.array(z.object({
		id: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
		expiresAt: z.number().finite().positive().optional()
	}).strict()).max(1e3).optional(),
	resetCardsStatus: z.enum([
		"idle",
		"loading",
		"ready",
		"error"
	]).optional(),
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
}).strict().readonly();
var snapshotCodec = () => ({
	mode: "strict",
	typeSymbol: `${PackageId}/remote#OpenAICodexSnapshot`,
	create: () => SnapshotSchema
});
var descriptor = (method) => ({
	id: `${PackageId}#OpenAICodexRemote/${method}`,
	service: ServiceKey,
	namespace: RemoteNamespace,
	method,
	invocation: { kind: "direct" },
	parameters: method === "consumeReset" ? [{
		name: "input",
		wire: "input",
		source: "json",
		codec: {
			mode: "strict",
			typeSymbol: `${PackageId}/remote#ResetRequest`,
			create: () => ResetRequestSchema
		}
	}] : method === "saveModels" ? [{
		name: "models",
		wire: "input",
		source: "json",
		codec: {
			mode: "strict",
			typeSymbol: `${PackageId}/remote#ModelSettings`,
			create: () => ModelSettingsSchema
		}
	}] : [],
	result: snapshotCodec()
});
var descriptors = Object.freeze([
	"snapshot",
	"startLogin",
	"logout",
	"followHostProxy",
	"useSystemProxy",
	"consumeReset",
	"saveModels"
].map(descriptor));
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
