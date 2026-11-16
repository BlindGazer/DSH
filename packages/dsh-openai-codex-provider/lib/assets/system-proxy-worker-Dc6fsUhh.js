import { r as createProvider, s as lazyApi } from "./models-sDLtPI5i.js";
import { parentPort, workerData } from "node:worker_threads";
import "node:child_process";
import "node:util";
import { Agent, ProxyAgent, fetch } from "undici";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/api/openai-codex-responses.lazy.js
const openAICodexResponsesApi = () => lazyApi(() => import("./openai-codex-responses-CZZ3SQUo.js"));
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/auth/helpers.js
/**
* Wraps a dynamically imported `OAuthAuth` so provider definitions can
* advertise OAuth without importing the implementation. The flow loads on
* first `login`/`refresh`/`toAuth` call; callers keep Node-only flow code out
* of bundles by loading through a bundler-opaque dynamic import (variable
* specifier, see the bedrock lazy wrapper).
*/
function lazyOAuth(input) {
	let promise;
	const loaded = () => {
		promise ??= input.load();
		return promise;
	};
	return {
		name: input.name,
		isSubscription: input.isSubscription,
		loginLabel: input.loginLabel,
		login: async (interaction, options) => (await loaded()).login(interaction, options),
		refresh: async (credential, signal) => (await loaded()).refresh(credential, signal),
		toAuth: async (credential) => (await loaded()).toAuth(credential)
	};
}
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/auth/oauth/load.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
/**
* Loads an OAuth flow module through a variable specifier so bundlers cannot
* follow the import into Node-only flow code (`node:http` callback servers,
* `node:crypto` PKCE). The `.ts`/`.js` rewrite keeps the trick working from
* both source and built output.
*/
const importOAuthModule = (specifier) => {
	return import(__rewriteRelativeImportExtension(import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier));
};
const loadOpenAICodexOAuth = async () => {
	return (await importOAuthModule("./openai-codex.ts")).openaiCodexOAuth;
};
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/providers/data/openai-codex.json
var openai_codex_default = { "openai-codex-responses": {
	"chat:gpt-5.6-luna": {
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": .2,
			"output": 1.2,
			"cacheRead": .02,
			"cacheWrite": .25,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": .4,
				"output": 1.8,
				"cacheRead": .04,
				"cacheWrite": .5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-5.6-sol": {
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 4,
			"output": 20,
			"cacheRead": .4,
			"cacheWrite": 5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 8,
				"output": 30,
				"cacheRead": .8,
				"cacheWrite": 10
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-5.6-terra": {
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 2,
			"output": 12,
			"cacheRead": .2,
			"cacheWrite": 2.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 4,
				"output": 18,
				"cacheRead": .4,
				"cacheWrite": 5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-6-astra": {
		"id": "gpt-6-astra",
		"name": "GPT-6 Astra",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 10,
			"output": 50,
			"cacheRead": 1,
			"cacheWrite": 12.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 20,
				"output": 75,
				"cacheRead": 2,
				"cacheWrite": 25
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"off": null,
			"minimal": "low",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-6-luna": {
		"id": "gpt-6-luna",
		"name": "GPT-6 Luna",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": .1,
			"output": .5,
			"cacheRead": .01,
			"cacheWrite": .125,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": .2,
				"output": .75,
				"cacheRead": .02,
				"cacheWrite": .25
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"off": "none",
			"minimal": "low",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-6-sol": {
		"id": "gpt-6-sol",
		"name": "GPT-6 Sol",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 2,
			"output": 10,
			"cacheRead": .2,
			"cacheWrite": 2.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 4,
				"output": 15,
				"cacheRead": .4,
				"cacheWrite": 5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"off": "none",
			"minimal": "low",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	},
	"chat:gpt-6.1-sol": {
		"id": "gpt-6.1-sol",
		"name": "GPT-6.1 Sol",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 2,
			"output": 10,
			"cacheRead": .1,
			"cacheWrite": 2.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 4,
				"output": 15,
				"cacheRead": .2,
				"cacheWrite": 5
			}]
		},
		"contextWindow": 5e5,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"off": null,
			"minimal": "low",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true,
			"supportsMidConvoSystemMessages": true
		},
		"inputLimits": { "images": { "resize": {
			"maxWidth": 2e3,
			"maxHeight": 2e3,
			"maxBytes": 4718592,
			"jpegQuality": 80
		} } },
		"type": "chat"
	}
} };
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/model-catalog.js
function flattenModelCatalog(groups, type) {
	return Object.fromEntries(Object.values(groups).flatMap((models) => Object.values(models)).filter((model) => model.type === type).map((model) => [model.id, model]));
}
function flattenChatModelCatalog(_provider, groups) {
	return flattenModelCatalog(groups, "chat");
}
function flattenImageModelCatalog(_provider, groups) {
	return flattenModelCatalog(groups, "image");
}
function flattenClassifierModelCatalog(_provider, groups) {
	return flattenModelCatalog(groups, "classifier");
}
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/providers/openai-codex.models.js
const OPENAI_CODEX_MODELS = flattenChatModelCatalog("openai-codex", openai_codex_default);
flattenImageModelCatalog("openai-codex", openai_codex_default);
flattenClassifierModelCatalog("openai-codex", openai_codex_default);
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/providers/openai-codex.js
function openaiCodexProvider() {
	return createProvider({
		id: "openai-codex",
		name: "OpenAI Codex (legacy)",
		baseUrl: "https://chatgpt.com/backend-api",
		auth: { oauth: lazyOAuth({
			name: "OpenAI (ChatGPT Plus/Pro)",
			isSubscription: true,
			load: loadOpenAICodexOAuth
		}) },
		models: Object.values(OPENAI_CODEX_MODELS),
		api: openAICodexResponsesApi()
	});
}
// node_modules/.cache/host-build/host/system-proxy.js
const SYSTEM_PROXY_ERROR = "Windows manual HTTP/HTTPS system proxy is unavailable. PAC is not supported; configure a manual proxy or follow DSH.";
function bypassSystemProxy(url, bypass) {
	const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	if (["localhost", "::1"].includes(host) || host.startsWith("127.")) return true;
	return bypass.split(";").some((raw) => {
		const pattern = raw.trim().toLowerCase();
		if (!pattern) return false;
		if (pattern === "<local>") return !host.includes(".") && !host.includes(":");
		const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
		return new RegExp(`^${escaped}$`).test(pattern.includes(":") ? url.host.toLowerCase() : host);
	});
}
/** Независимый диспетчер не меняет переменные окружения или глобальный диспетчер хоста. */
function systemProxyTransport(policy) {
	const agents = /* @__PURE__ */ new Map();
	return {
		async fetch(input, init) {
			const target = typeof input === "string" ? input : "url" in input ? input.url : input.href;
			const url = new URL(target);
			if (bypassSystemProxy(url, policy.bypass)) {
				let dispatcher = agents.get("direct");
				if (!dispatcher) {
					dispatcher = new Agent();
					agents.set("direct", dispatcher);
				}
				return fetch(input, {
					...init,
					dispatcher
				});
			}
			const protocol = url.protocol === "https:" ? "https" : url.protocol === "http:" ? "http" : void 0;
			if (!protocol) throw new Error(SYSTEM_PROXY_ERROR);
			const address = policy[protocol];
			if (!address) throw new Error(SYSTEM_PROXY_ERROR);
			let dispatcher = agents.get(address);
			if (!dispatcher) {
				dispatcher = new ProxyAgent(address);
				agents.set(address, dispatcher);
			}
			return fetch(input, {
				...init,
				dispatcher
			});
		},
		async close() {
			await Promise.all([...agents.values()].map((agent) => agent.destroy()));
		}
	};
}
// node_modules/.cache/host-build/host/system-proxy-worker.js
const workerData$1 = workerData;
const port = parentPort;
if (!port) throw new Error("System proxy worker requires a parent port.");
const transport = systemProxyTransport(workerData$1.policy);
Object.defineProperty(globalThis, "fetch", {
	value: transport.fetch,
	configurable: true,
	writable: true
});
try {
	const oauth = openaiCodexProvider().auth.oauth;
	if (!oauth) throw new Error("OpenAI Codex OAuth is unavailable.");
	const value = workerData$1.operation === "refresh" ? await oauth.refresh(workerData$1.credential ?? {
		type: "oauth",
		access: "",
		refresh: "",
		expires: 0
	}, new AbortController().signal) : await oauth.login({
		signal: new AbortController().signal,
		notify: (event) => port.postMessage({
			type: "notify",
			value: "message" in event ? event.message : "OAuth event received."
		}),
		prompt: async (request) => {
			if (request.type === "select") return "device_code";
			throw new Error("Unsupported login interaction");
		}
	});
	port.postMessage({
		type: "result",
		value
	});
} catch (error) {
	const message = error instanceof Error ? error.message : "Codex system-proxy OAuth request failed.";
	port.postMessage({
		type: "error",
		message: message.slice(0, 500)
	});
} finally {
	await transport.close();
}
