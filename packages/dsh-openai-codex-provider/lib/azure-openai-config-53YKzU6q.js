import { t as getProviderEnvValue } from "./provider-env-C0XXhiuO.js";
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/api/azure-openai-config.js
var DEFAULT_AZURE_API_VERSION = "v1";
function parseDeploymentNameMap(value) {
	const map = /* @__PURE__ */ new Map();
	if (!value) return map;
	for (const entry of value.split(",")) {
		const trimmed = entry.trim();
		if (!trimmed) continue;
		const [modelId, deploymentName] = trimmed.split("=", 2);
		if (!modelId || !deploymentName) continue;
		map.set(modelId.trim(), deploymentName.trim());
	}
	return map;
}
function resolveDeploymentName(model, options) {
	if (options?.azureDeploymentName) return options.azureDeploymentName;
	return parseDeploymentNameMap(getProviderEnvValue("AZURE_OPENAI_DEPLOYMENT_NAME_MAP", options?.env)).get(model.id) || model.id;
}
function normalizeAzureBaseUrl(baseUrl) {
	const trimmed = baseUrl.trim().replace(/\/+$/, "");
	let url;
	try {
		url = new URL(trimmed);
	} catch {
		throw new Error(`Invalid Azure OpenAI base URL: ${baseUrl}`);
	}
	const isAzureHost = url.hostname.endsWith(".openai.azure.com") || url.hostname.endsWith(".cognitiveservices.azure.com") || url.hostname.endsWith(".ai.azure.com");
	const normalizedPath = url.pathname.replace(/\/+$/, "");
	if (isAzureHost && (normalizedPath === "" || normalizedPath === "/" || normalizedPath === "/openai" || normalizedPath === "/openai/v1/responses")) {
		url.pathname = "/openai/v1";
		url.search = "";
	}
	return url.toString().replace(/\/+$/, "");
}
function buildDefaultBaseUrl(resourceName) {
	return `https://${resourceName}.openai.azure.com/openai/v1`;
}
function resolveAzureBaseUrl(model, options) {
	const baseUrl = options?.azureBaseUrl?.trim() || getProviderEnvValue("AZURE_OPENAI_BASE_URL", options?.env)?.trim() || void 0;
	const resourceName = options?.azureResourceName || getProviderEnvValue("AZURE_OPENAI_RESOURCE_NAME", options?.env);
	let resolvedBaseUrl = baseUrl;
	if (!resolvedBaseUrl && resourceName) resolvedBaseUrl = buildDefaultBaseUrl(resourceName);
	if (!resolvedBaseUrl && model.baseUrl) resolvedBaseUrl = model.baseUrl;
	if (!resolvedBaseUrl) throw new Error("Azure OpenAI base URL is required. Set AZURE_OPENAI_BASE_URL or AZURE_OPENAI_RESOURCE_NAME, or pass azureBaseUrl, azureResourceName, or model.baseUrl.");
	return normalizeAzureBaseUrl(resolvedBaseUrl);
}
function resolveAzureConfig(model, options) {
	return {
		baseUrl: resolveAzureBaseUrl(model, options),
		apiVersion: options?.azureApiVersion || getProviderEnvValue("AZURE_OPENAI_API_VERSION", options?.env) || DEFAULT_AZURE_API_VERSION
	};
}
export { resolveAzureConfig as n, resolveDeploymentName as r, resolveAzureBaseUrl as t };
