// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/utils/identity.js
var NVIDIA_NIM_HOST = "integrate.api.nvidia.com";
var OPENCODE_HOST = "opencode.ai";
/** Merge identities field by field; later sources win and undefined fields are skipped. */
function mergeClientIdentity(...sources) {
	let merged;
	for (const source of sources) {
		if (!source) continue;
		merged = { ...merged };
		if (source.userAgent !== void 0) merged.userAgent = source.userAgent;
		if (source.attribution !== void 0) merged.attribution = source.attribution;
		if (source.version !== void 0) merged.version = source.version;
	}
	return merged;
}
/** The version in the detailed `User-Agent`. */
function getClientVersion(identity) {
	return identity?.version ?? "1.4.0";
}
function runtimeDescription() {
	if (typeof process === "undefined") return void 0;
	const versions = process.versions;
	if (versions?.bun) return `bun/${versions.bun}`;
	if (versions?.node) return `node/${process.version}`;
}
/** The `User-Agent` value of an identity. */
function formatUserAgent(identity) {
	const mode = identity?.userAgent ?? "detailed";
	if (typeof mode === "object") return mode.custom;
	if (mode === "short") return "pi";
	const product = `pi/${getClientVersion(identity)}`;
	const runtime = runtimeDescription();
	return runtime ? `${product} (${process.platform}; ${runtime}; ${process.arch})` : `${product} (browser)`;
}
function matchesHost(baseUrl, expectedHost) {
	try {
		return new URL(baseUrl).hostname === expectedHost;
	} catch {
		return false;
	}
}
function isOpenRouter(target) {
	return target.provider === "openrouter" || target.baseUrl.includes("openrouter.ai");
}
function isNvidiaNim(target) {
	return target.provider === "nvidia" || matchesHost(target.baseUrl, NVIDIA_NIM_HOST);
}
function isOpenCode(target) {
	return target.provider === "opencode" || target.provider === "opencode-go" || matchesHost(target.baseUrl, OPENCODE_HOST);
}
/** Provider attribution headers of an identity for a request target. Empty when attribution is off. */
function getAttributionHeaders(target, identity) {
	const attribution = identity?.attribution;
	if (!attribution) return {};
	const { name, url, categories } = attribution;
	if (isOpenRouter(target)) return {
		"HTTP-Referer": url,
		"X-OpenRouter-Title": name,
		...categories === void 0 || categories.length === 0 ? {} : { "X-OpenRouter-Categories": categories.join(",") }
	};
	if (isNvidiaNim(target)) return { "X-BILLING-INVOKE-ORIGIN": name.charAt(0).toUpperCase() + name.slice(1) };
	if (isOpenCode(target)) return { "x-opencode-client": name };
	return {};
}
/**
* OpenCode's per-conversation routing header for requests to OpenCode, including custom providers pointing at it.
* Undefined without a session or for other targets.
*/
function getOpenCodeSessionHeaders(target, sessionId) {
	return sessionId && isOpenCode(target) ? { "x-opencode-session": sessionId } : void 0;
}
/**
* Default headers an identity adds to a request: `User-Agent` and provider attribution. APIs apply them below model,
* provider, and request headers, so configured headers override them and `null` request headers remove them.
*/
function getIdentityHeaders(target, identity) {
	return {
		"User-Agent": formatUserAgent(identity),
		...getAttributionHeaders(target, identity)
	};
}
export { getOpenCodeSessionHeaders as n, mergeClientIdentity as r, getIdentityHeaders as t };
