import { t as AzureOpenAI } from "./openai-CBUuIUws.js";
import { d as resolveTranscriptTools, n as clampThinkingLevel, s as getDeclaredTools, u as resolveTranscript } from "./models-Bvrtl03z.js";
import { n as normalizeProviderError, t as formatProviderError } from "./error-body-DYuYRsHK.js";
import { i as AssistantMessageEventStream } from "./diagnostics-CryXw9qy.js";
import { t as headersToRecord } from "./headers-B7YbFVZo.js";
import { t as getIdentityHeaders } from "./identity-BkH-RfTp.js";
import { t as retryProviderRequest } from "./provider-retry-CYyXJtrP.js";
import { n as resolveAzureConfig, r as resolveDeploymentName } from "./azure-openai-config-53YKzU6q.js";
import { i as buildBaseOptions, s as resolveSamplingParams, u as createGrammarToolInputProperties } from "./transform-messages-6PvFLnQR.js";
import { t as clampOpenAIPromptCacheKey } from "./openai-prompt-cache-BRuqk_lt.js";
import { i as processResponsesStream, n as convertResponsesTools, r as getResponsesToolSupport, t as convertResponsesMessages } from "./openai-responses-shared-Dce29Hr7.js";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/api/azure-openai-responses.js
var AZURE_TOOL_CALL_PROVIDERS = /* @__PURE__ */ new Set([
	"openai",
	"openai-codex",
	"opencode",
	"azure"
]);
var OPENAI_RESPONSES_MIN_OUTPUT_TOKENS = 16;
function formatAzureOpenAIError(error) {
	return formatProviderError(normalizeProviderError(error), "Azure OpenAI API error");
}
/**
* Generate function for Azure OpenAI Responses API
*/
var stream = (model, context, options) => {
	const stream = new AssistantMessageEventStream();
	const normalizedContext = resolveTranscript(context, model.compat?.supportsMidConvoSystemMessages);
	(async () => {
		const deploymentName = resolveDeploymentName(model, options);
		const output = {
			role: "assistant",
			content: [],
			api: "azure-openai-responses",
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					total: 0
				}
			},
			stopReason: "pending",
			timestamp: Date.now()
		};
		try {
			const apiKey = options?.apiKey;
			if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
			const client = createClient(model, apiKey, options);
			const grammarToolInputProperties = createGrammarToolInputProperties(getDeclaredTools(normalizedContext.messages), model.compat?.supportsOpenAIGrammarTools ?? false);
			let params = buildParams(model, normalizedContext, options, deploymentName, grammarToolInputProperties);
			const nextParams = await options?.onPayload?.(params, model);
			if (nextParams !== void 0) params = nextParams;
			const requestOptions = {
				...options?.signal ? { signal: options.signal } : {},
				...options?.timeoutMs !== void 0 ? { timeout: options.timeoutMs } : {},
				maxRetries: 0
			};
			const { data: openaiStream, response } = await retryProviderRequest(() => client.responses.create(params, requestOptions).withResponse(), {
				maxRetries: options?.maxRetries,
				maxRetryDelayMs: options?.maxRetryDelayMs,
				signal: options?.signal
			});
			await options?.onResponse?.({
				status: response.status,
				headers: headersToRecord(response.headers)
			}, model);
			stream.push({
				type: "start",
				partial: output
			});
			await processResponsesStream(openaiStream, output, stream, model, {
				onProviderStreamEvent: options?.onProviderStreamEvent,
				grammarToolInputProperties
			});
			if (options?.signal?.aborted) throw new Error("Request was aborted");
			if (output.stopReason === "pending") throw new Error("Azure OpenAI Responses stream ended without a stop reason");
			if (output.stopReason === "aborted" || output.stopReason === "error") throw new Error(output.errorMessage || "An unknown error occurred");
			stream.push({
				type: "done",
				reason: output.stopReason,
				message: output
			});
			stream.end();
		} catch (error) {
			for (const block of output.content) {
				delete block.index;
				delete block.partialJson;
				delete block.customInput;
			}
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = formatAzureOpenAIError(error);
			stream.push({
				type: "error",
				reason: output.stopReason,
				error: output
			});
			stream.end();
		}
	})();
	return stream;
};
var streamSimple = (model, context, options) => {
	const apiKey = options?.apiKey;
	if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
	const base = {
		...buildBaseOptions(model, context, options, apiKey),
		toolChoice: options?.toolChoice
	};
	const clampedReasoning = options?.reasoning ? clampThinkingLevel(model, options.reasoning) : void 0;
	const reasoningEffort = clampedReasoning === "off" ? void 0 : clampedReasoning;
	return stream(model, context, {
		...base,
		reasoningEffort
	});
};
function createClient(model, apiKey, options) {
	const headers = {
		...getIdentityHeaders(model, options?.identity),
		...model.headers
	};
	if (options?.headers) Object.assign(headers, options.headers);
	const { baseUrl, apiVersion } = resolveAzureConfig(model, options);
	return new AzureOpenAI({
		apiKey,
		apiVersion,
		dangerouslyAllowBrowser: true,
		fetch: options?.fetch,
		defaultHeaders: headers,
		baseURL: baseUrl
	});
}
function buildParams(model, context, options, deploymentName, grammarToolInputProperties = createGrammarToolInputProperties(getDeclaredTools(context.messages), model.compat?.supportsOpenAIGrammarTools ?? false)) {
	const supportsAdditionalTools = model.compat?.supportsAdditionalTools ?? false;
	const supportsToolSearch = model.compat?.supportsToolSearch ?? false;
	const transcriptTools = resolveTranscriptTools(context.messages, getResponsesToolSupport({
		supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
		supportsAdditionalTools,
		supportsToolSearch
	}));
	const params = {
		model: deploymentName,
		input: convertResponsesMessages(model, context, AZURE_TOOL_CALL_PROVIDERS, {
			grammarToolInputProperties,
			supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
			supportsAdditionalTools,
			supportsToolSearch,
			toolOptions: {
				supportsStrictMode: model.compat?.supportsStrictMode ?? true,
				supportsOpenAIGrammarTools: model.compat?.supportsOpenAIGrammarTools ?? false
			}
		}),
		stream: true,
		prompt_cache_key: clampOpenAIPromptCacheKey(options?.sessionId),
		store: false
	};
	if (options?.maxTokens) params.max_output_tokens = Math.max(options.maxTokens, OPENAI_RESPONSES_MIN_OUTPUT_TOKENS);
	if (options?.temperature !== void 0) params.temperature = options?.temperature;
	if (transcriptTools.requestTools.length > 0) params.tools = convertResponsesTools(transcriptTools.requestTools, {
		supportsStrictMode: model.compat?.supportsStrictMode ?? true,
		supportsOpenAIGrammarTools: model.compat?.supportsOpenAIGrammarTools ?? false
	});
	if (options?.toolChoice !== void 0) params.tool_choice = options.toolChoice;
	const reasoningEffort = options?.reasoningEffort ?? (options?.reasoningSummary ? "medium" : void 0);
	if (model.reasoning) {
		if (reasoningEffort) {
			params.reasoning = {
				effort: options?.reasoningEffort ? model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort : reasoningEffort,
				summary: options?.reasoningSummary || "auto"
			};
			params.include = ["reasoning.encrypted_content"];
		} else if (model.thinkingLevelMap?.off !== null) params.reasoning = { effort: model.thinkingLevelMap?.off ?? "none" };
	}
	const samplingParams = resolveSamplingParams(model, reasoningEffort ?? "off", options?.samplingParams);
	if (samplingParams) Object.assign(params, samplingParams);
	return params;
}
export { stream, streamSimple };
