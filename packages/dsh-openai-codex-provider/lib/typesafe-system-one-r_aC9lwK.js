import { t as isRecord } from "./classifier-shared-CA2JsEA1.js";
import { t as classifySystemOne } from "./system-one-shared-Buz7_Kpy.js";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/api/typesafe-system-one.js
/**
* TypeSafe's native System One protocol. OpenRouter serves the same protocol,
* so both providers use this API with different base URLs.
*
* TypeSafe takes images as `assets`. They are experimental and need the
* `TypeSafe-Danger-Zone-Images` opt-in header; without it the API answers 400.
* OpenRouter drops `assets` silently and takes images as `image_url` parts in the state instead.
* Models behind a proxy that hides both the provider ID and the OpenRouter host must set
* `compat.imageInput`.
*/
var transport = {
	api: "typesafe-system-one",
	label: "System One API",
	detectCompat: (model) => model.provider === "openrouter" || model.baseUrl.includes("openrouter.ai") ? {
		imageInput: "state-image-urls",
		sendImageOptInHeader: false
	} : {
		imageInput: "assets",
		sendImageOptInHeader: true
	},
	url: (model) => new URL("systemone", `${model.baseUrl.replace(/\/+$/u, "")}/`),
	payload: (model, request) => ({
		model: model.id,
		...request
	}),
	output: (body) => {
		if (!isRecord(body)) throw new Error("System One API returned an unexpected response");
		return body;
	}
};
/** TypeSafe System One classification with public `bool` values mapped to wire-level `noul`. */
var classify = (model, context, options) => classifySystemOne(transport, model, context, options);
export { classify };
