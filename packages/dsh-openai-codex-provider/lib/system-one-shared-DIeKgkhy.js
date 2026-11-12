import { n as normalizeProviderError, t as formatProviderError } from "./error-body-BvZgrH1i.js";
import { i as requiredNumber, n as parseClassifierUsage, r as postClassifierRequest, t as isRecord } from "./classifier-shared-BlKyM350.js";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/api/system-one-shared.js
/** TypeSafe's opt-in header for its experimental image input. */
var IMAGE_OPT_IN_HEADERS = { "TypeSafe-Danger-Zone-Images": "true" };
function probabilities(label, value, id) {
	if (!isRecord(value)) throw new Error(`${label} returned invalid probabilities for ${id}`);
	return Object.fromEntries(Object.entries(value).map(([key, probability]) => [key, requiredNumber(label, probability, `probability for ${id}.${key}`)]));
}
function parseAnswers(label, value, context) {
	if (!isRecord(value)) throw new Error(`${label} returned an unexpected response`);
	const answers = [];
	for (const [id, question] of Object.entries(context.questions)) {
		const answer = value[id];
		if (!isRecord(answer)) throw new Error(`${label} did not return an answer for ${id}`);
		if (question.type === "choice") {
			if (answer.type !== "choice" || typeof answer.choice !== "string") throw new Error(`${label} did not return a choice answer for ${id}`);
			answers.push([id, {
				type: "choice",
				choice: answer.choice,
				probabilities: probabilities(label, answer.probabilities, id),
				confidence: requiredNumber(label, answer.confidence, `confidence for ${id}`)
			}]);
		} else if (question.type === "score") {
			if (answer.type !== "score") throw new Error(`${label} did not return a score answer for ${id}`);
			answers.push([id, {
				type: "score",
				score: requiredNumber(label, answer.score, `score for ${id}`),
				confidence: requiredNumber(label, answer.confidence, `confidence for ${id}`)
			}]);
		} else {
			if (answer.type !== "noul") throw new Error(`${label} did not return a bool answer for ${id}`);
			answers.push([id, {
				type: "bool",
				probability: requiredNumber(label, answer.noul, `probability for ${id}`)
			}]);
		}
	}
	return Object.fromEntries(answers);
}
var ASSET_FORMATS = {
	"image/png": "png",
	"image/jpeg": "jpeg"
};
var DATA_URL_TYPES = /* @__PURE__ */ new Set([
	"image/png",
	"image/jpeg",
	"image/webp"
]);
/** Clef accepts at most this many images per request. */
var MAX_DATA_URL_IMAGES = 4;
/** Adds the context images to `request` in the service's form. */
function addImages(label, model, input, images, request) {
	if (input === "images") {
		if (images.length > MAX_DATA_URL_IMAGES) throw new Error(`${label} accepts at most ${MAX_DATA_URL_IMAGES} images for ${model.id}, got ${images.length}`);
		request.images = images.map((image) => {
			if (!DATA_URL_TYPES.has(image.mimeType)) throw new Error(`${label} accepts PNG, JPEG, and WebP images for ${model.id}, got ${image.mimeType}`);
			return `data:${image.mimeType};base64,${image.data}`;
		});
		return;
	}
	if (input === "state-image-urls") {
		request.state = [...images.map((image) => ({
			type: "image_url",
			image_url: { url: `data:${image.mimeType};base64,${image.data}` }
		})), request.state];
		return;
	}
	const assets = {};
	images.forEach((image, index) => {
		const format = ASSET_FORMATS[image.mimeType];
		if (!format) throw new Error(`${label} accepts PNG and JPEG images for ${model.id}, got ${image.mimeType}`);
		assets[`<image-${index + 1}>`] = {
			type: "image",
			format,
			data_base64: image.data
		};
	});
	request.assets = assets;
	request.state = [...Object.keys(assets), request.state];
}
/** Maps public `bool` questions to TypeSafe's wire-level `noul` type. */
function wireRequest(context) {
	return {
		state: context.state,
		questions: Object.fromEntries(Object.entries(context.questions).map(([id, question]) => [id, question.type === "bool" ? {
			...question,
			type: "noul"
		} : question]))
	};
}
/** Runs one System One classification over the given transport. */
async function classifySystemOne(transport, model, context, options) {
	const output = {
		api: model.api,
		provider: model.provider,
		model: model.id,
		answers: {},
		stopReason: "stop",
		timestamp: Date.now()
	};
	try {
		if (model.api !== transport.api) throw new Error(`Unsupported classifier API: ${model.api}`);
		const request = wireRequest(context);
		let requestOptions = options;
		if (context.images?.length) {
			if (!model.input.includes("image")) throw new Error(`${transport.label} does not support image input for ${model.id}`);
			const detected = transport.detectCompat(model);
			const imageInput = model.compat?.imageInput ?? detected.imageInput;
			addImages(transport.label, model, imageInput, context.images, request);
			if (model.compat?.sendImageOptInHeader ?? detected.sendImageOptInHeader) requestOptions = {
				...options,
				headers: {
					...IMAGE_OPT_IN_HEADERS,
					...options?.headers
				}
			};
		}
		const body = await postClassifierRequest(transport.label, transport.url(model), model, transport.payload(model, request), requestOptions);
		const result = transport.output(body);
		const usage = parseClassifierUsage(result.usage, model);
		if (usage) output.usage = usage;
		output.answers = parseAnswers(transport.label, result.answers, context);
		return output;
	} catch (error) {
		output.stopReason = options?.signal?.aborted ? "aborted" : "error";
		output.errorMessage = formatProviderError(normalizeProviderError(error), `${transport.label} error`);
		return output;
	}
}
export { classifySystemOne as t };
