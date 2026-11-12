import { parentPort, workerData } from "node:worker_threads";
import "node:child_process";
import "node:util";
import { Agent, ProxyAgent, fetch } from "undici";
// src/host/system-proxy.ts
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
// src/host/system-proxy-worker.ts
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
	const { openaiCodexProvider } = await import(workerData$1.providerUrl);
	const oauth = openaiCodexProvider().auth.oauth;
	const value = workerData$1.operation === "refresh" ? await oauth.refresh(workerData$1.credential, new AbortController().signal) : await oauth.login({
		signal: new AbortController().signal,
		notify: (notification) => port.postMessage({
			type: "notify",
			value: notification
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
} catch {
	port.postMessage({ type: "error" });
} finally {
	await transport.close();
}
