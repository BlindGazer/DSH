import { r as AnthropicError } from "./anthropic-messages-C5vbfwnd.js";
// ../../node_modules/.pnpm/@anthropic-ai+sdk@0.129.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/internal/node.browser.mjs
/** Substituted for `./node` by the package.json `browser` field; every property access throws. */
function unavailable(module) {
	return new Proxy({}, { get(_target, property) {
		if (typeof property === "symbol") return void 0;
		throw new AnthropicError(`\`${module}.${property}\` is not available in this environment; it needs a Node.js-compatible runtime`);
	} });
}
var fs = /* @__PURE__ */ unavailable("fs");
var path = /* @__PURE__ */ unavailable("path");
export { fs, path };
