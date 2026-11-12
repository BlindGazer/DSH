import { r as AnthropicError } from "./anthropic-messages-DKEZ1HvS.js";
// ../../node_modules/.pnpm/@anthropic-ai+sdk@0.129.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/node.browser.mjs
/**
* Browser stub for `tools/agent-toolset/node`.
*
* The real module implements the `agent_toolset_20260401` tools on top of Node
* built-ins (`node:child_process`, `node:fs`, …), which browser bundlers cannot
* resolve. The `browser` field in `package.json` substitutes this stub in
* browser builds so the SDK bundles cleanly for web targets; Node runtimes and
* node-target bundles ignore the mapping and load the real implementation.
*
* Every value export here throws an {@link AnthropicError} when used — the
* agent toolset only works in Node.js or a Node-compatible runtime. Type
* exports are re-exported from the real module (erased at build time), so
* type-level usage is unaffected.
*/
function nodeOnly(name) {
	throw new AnthropicError(`${name} requires Node.js or a Node-compatible runtime`);
}
/**
* Duplicated literal, not a re-export: importing the value from `./memories`
* would pull that module's Node built-ins into browser bundles. The stub test
* pins it to the real module's value.
*/
var MEMORY_FLUSH_TIMEOUT_MS = 3e4;
/**
* Duplicated declaration, for the same reason as the literal above. Nothing in
* a browser build can throw it — the store download is Node-only — so this
* exists to keep the stub's export surface identical to the real module's.
*/
var SessionMemoryError = class extends AnthropicError {
	constructor(message, cause) {
		super(message);
		this.name = "SessionMemoryError";
		if (cause !== void 0) this.cause = cause;
	}
};
var SessionMemoryStores = class {
	constructor(_client, _opts) {
		nodeOnly("SessionMemoryStores");
	}
	get roots() {
		return nodeOnly("SessionMemoryStores");
	}
	get readOnlyRoots() {
		return nodeOnly("SessionMemoryStores");
	}
	download(_session) {
		return nodeOnly("SessionMemoryStores");
	}
	finish() {
		return nodeOnly("SessionMemoryStores");
	}
	/** @internal */
	syncAll(_final) {
		return nodeOnly("SessionMemoryStores");
	}
	syncIfDue() {
		return nodeOnly("SessionMemoryStores");
	}
	flushWrites(_signal) {
		return nodeOnly("SessionMemoryStores");
	}
	dispose() {
		return nodeOnly("SessionMemoryStores");
	}
};
function setupSkills(_ctx) {
	return nodeOnly("setupSkills");
}
function betaAgentToolset20260401(_ctx) {
	return nodeOnly("betaAgentToolset20260401");
}
export { MEMORY_FLUSH_TIMEOUT_MS, SessionMemoryError, SessionMemoryStores, betaAgentToolset20260401, setupSkills };
