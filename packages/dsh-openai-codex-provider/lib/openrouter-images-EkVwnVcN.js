import { n as OpenAI } from "./openai-1f0suNML.js";
import { n as normalizeProviderError, t as formatProviderError } from "./error-body-BvZgrH1i.js";
import { n as providerHeadersToRecord, t as headersToRecord } from "./headers-Bp6gHcd4.js";
import { t as getIdentityHeaders } from "./identity-DZAKiv44.js";
import { t as retryProviderRequest } from "./provider-retry-DMhmdCWV.js";
import { t as sanitizeSurrogates } from "./sanitize-unicode-C9T5zIfZ.js";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/api/openrouter-images.js
/** Image generation over OpenRouter's chat completions endpoint. */
var generateImages = async (model, context, options) => {
	const output = {
		api: model.api,
		provider: model.provider,
		model: model.id,
		output: [],
		stopReason: "stop",
		timestamp: Date.now()
	};
	try {
		const apiKey = options?.apiKey;
		if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
		const client = createClient(model, apiKey, options?.headers, options?.fetch, options?.identity);
		let params = buildParams(model, context);
		const nextParams = await options?.onPayload?.(params, model);
		if (nextParams !== void 0) params = nextParams;
		const requestOptions = {
			...options?.signal ? { signal: options.signal } : {},
			...options?.timeoutMs !== void 0 ? { timeout: options.timeoutMs } : {},
			maxRetries: 0
		};
		const { data: response, response: rawResponse } = await retryProviderRequest(() => client.chat.completions.create(params, requestOptions).withResponse(), {
			maxRetries: options?.maxRetries,
			maxRetryDelayMs: options?.maxRetryDelayMs,
			signal: options?.signal
		});
		await options?.onResponse?.({
			status: rawResponse.status,
			headers: headersToRecord(rawResponse.headers)
		}, model);
		const imageResponse = response;
		output.responseId = imageResponse.id;
		if (imageResponse.usage) output.usage = parseUsage(imageResponse.usage, model);
		const choice = imageResponse.choices[0];
		if (choice) {
			const content = choice.message.content;
			if (typeof content === "string" && content.length > 0) output.output.push({
				type: "text",
				text: content
			});
			for (const image of choice.message.images ?? []) {
				const imageUrl = typeof image.image_url === "string" ? image.image_url : image.image_url?.url;
				if (!imageUrl?.startsWith("data:")) continue;
				const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
				if (!matches) continue;
				output.output.push({
					type: "image",
					mimeType: matches[1],
					data: matches[2]
				});
			}
		}
		return output;
	} catch (error) {
		output.stopReason = options?.signal?.aborted ? "aborted" : "error";
		output.errorMessage = formatProviderError(normalizeProviderError(error));
		return output;
	}
};
function createClient(model, apiKey, optionsHeaders, fetch, identity) {
	return new OpenAI({
		apiKey,
		baseURL: model.baseUrl,
		dangerouslyAllowBrowser: true,
		fetch,
		defaultHeaders: providerHeadersToRecord(getIdentityHeaders(model, identity), model.headers, optionsHeaders)
	});
}
function buildParams(model, context) {
	const content = context.input.map((item) => {
		if (item.type === "text") return {
			type: "text",
			text: sanitizeSurrogates(item.text)
		};
		return {
			type: "image_url",
			image_url: { url: `data:${item.mimeType};base64,${item.data}` }
		};
	});
	return {
		model: model.id,
		messages: [{
			role: "user",
			content
		}],
		stream: false,
		modalities: model.output.includes("text") ? ["image", "text"] : ["image"]
	};
}
function parseUsage(rawUsage, model) {
	const promptTokens = rawUsage.prompt_tokens || 0;
	const reportedCachedTokens = rawUsage.prompt_tokens_details?.cached_tokens || 0;
	const cacheWriteTokens = rawUsage.prompt_tokens_details?.cache_write_tokens || 0;
	const cacheReadTokens = cacheWriteTokens > 0 ? Math.max(0, reportedCachedTokens - cacheWriteTokens) : reportedCachedTokens;
	const input = Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens);
	const output = rawUsage.completion_tokens || 0;
	const usage = {
		input,
		output,
		cacheRead: cacheReadTokens,
		cacheWrite: cacheWriteTokens,
		totalTokens: input + output + cacheReadTokens + cacheWriteTokens,
		cost: {
			input: model.cost.input / 1e6 * input,
			output: model.cost.output / 1e6 * output,
			cacheRead: model.cost.cacheRead / 1e6 * cacheReadTokens,
			cacheWrite: model.cost.cacheWrite / 1e6 * cacheWriteTokens,
			total: 0
		}
	};
	usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
	return usage;
}
export { generateImages };
