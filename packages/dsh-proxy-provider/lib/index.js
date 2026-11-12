import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import net from "node:net";
import tls from "node:tls";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
// src/shared/constants/endpoints.ts
/**
* Базовый URL HTTP API плагина внутри веб-сервера DSH.
*/
var API_BASE = "/api/dsh-proxy-provider";
/**
* Адрес по умолчанию для проверки работоспособности прокси-соединения.
*/
var DEFAULT_TEST_URL = "https://generativelanguage.googleapis.com";
/**
* Ключ хранения выбранного языка интерфейса плагина в localStorage.
*/
var PROXY_LOCALE_KEY = "@kalex/dsh-proxy-provider/interface-language";
/**
* Известные пространства имен настроек провайдеров в DSH.
*/
var KNOWN_SETTINGS_NS = [
	"llm-pi-ai",
	"llm-deepseek",
	"llm-deepseek-account",
	"llm-deepseek-api-key",
	""
];
/**
* Встроенные конечные точки провайдеров моделей из @deepseek-ai/dsh-llm-pi-ai и ядра DSH.
*/
var BUILTIN_PROVIDER_ENDPOINTS = Object.freeze({
	"deepseek-account": {
		name: "DeepSeek Account",
		settingsNs: "llm-deepseek-account",
		urls: ["https://api.deepseek.com"]
	},
	"deepseek-official": {
		name: "DeepSeek",
		settingsNs: "llm-deepseek",
		urls: ["https://api.deepseek.com"]
	},
	deepseek: {
		name: "DeepSeek",
		settingsNs: "llm-deepseek",
		urls: ["https://api.deepseek.com"]
	},
	google: {
		name: "google",
		settingsNs: "llm-pi-ai",
		urls: ["https://generativelanguage.googleapis.com/v1beta"]
	},
	openai: {
		name: "OpenAI",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.openai.com/v1"]
	},
	"openai-codex": {
		name: "OpenAI Codex",
		settingsNs: "llm-pi-ai",
		urls: ["https://chatgpt.com/backend-api", "https://auth.openai.com"]
	},
	anthropic: {
		name: "Anthropic",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.anthropic.com"]
	},
	openrouter: {
		name: "OpenRouter",
		settingsNs: "llm-pi-ai",
		urls: ["https://openrouter.ai/api/v1"]
	},
	groq: {
		name: "Groq",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.groq.com/openai/v1"]
	},
	mistral: {
		name: "Mistral",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.mistral.ai"]
	},
	xai: {
		name: "xAI",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.x.ai/v1"]
	},
	cerebras: {
		name: "Cerebras",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.cerebras.ai/v1"]
	},
	fireworks: {
		name: "Fireworks",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.fireworks.ai/inference"]
	},
	"github-copilot": {
		name: "GitHub Copilot",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.individual.githubcopilot.com"]
	},
	huggingface: {
		name: "HuggingFace",
		settingsNs: "llm-pi-ai",
		urls: ["https://router.huggingface.co/v1"]
	},
	"kimi-coding": {
		name: "Kimi Coding",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.kimi.com/coding"]
	},
	meta: {
		name: "Meta",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.meta.ai/v1"]
	},
	minimax: {
		name: "MiniMax",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.minimax.io/anthropic"]
	},
	"minimax-cn": {
		name: "MiniMax CN",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.minimaxi.com/anthropic"]
	},
	moonshotai: {
		name: "Moonshot AI",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.moonshot.ai/v1"]
	},
	"moonshotai-cn": {
		name: "Moonshot AI CN",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.moonshot.cn/v1"]
	},
	nvidia: {
		name: "NVIDIA",
		settingsNs: "llm-pi-ai",
		urls: ["https://integrate.api.nvidia.com/v1"]
	},
	baseten: {
		name: "Baseten",
		settingsNs: "llm-pi-ai",
		urls: ["https://inference.baseten.co/v1"]
	},
	"ant-ling": {
		name: "Ant Ling",
		settingsNs: "llm-pi-ai",
		urls: ["https://api.ant-ling.com/v1"]
	},
	"qwen-token-plan": {
		name: "Qwen Token Plan",
		settingsNs: "llm-pi-ai",
		urls: ["https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"]
	}
});
// ../dsh-core/src/utils/hostSanitizer.ts
/**
* Очищает введенный пользователем адрес узла от схемы (http://, https://), путей и портов.
*/
function sanitizeHostInput(input) {
	if (typeof input !== "string") return "";
	let value = input.trim();
	if (value === "") return "";
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) try {
		return new URL(value).hostname.toLowerCase();
	} catch {
		value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
	}
	value = value.split("/")[0] ?? value;
	if (value.includes(":")) {
		const ipv6Input = value.startsWith("[") ? value : `[${value}]`;
		try {
			const ipv6Host = new URL(`http://${ipv6Input}`).hostname;
			if (ipv6Host.includes(":")) return ipv6Host.toLowerCase();
		} catch {}
	}
	const colonIndex = value.indexOf(":");
	if (colonIndex > 0 && !value.startsWith("[")) return value.slice(0, colonIndex).toLowerCase();
	return value.toLowerCase();
}
/**
* Извлекает нормализованный адрес хоста с нестандартным портом из URL-строки или возвращает null при ошибке.
*/
function extractHost(rawUrl) {
	if (typeof rawUrl !== "string") return null;
	const trimmed = rawUrl.trim();
	if (!trimmed) return null;
	try {
		const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
		const parsed = new URL(withScheme);
		return parsed.host ? parsed.host.toLowerCase() : null;
	} catch {
		return null;
	}
}
// src/shared/utils/hostUtils.ts
/**
* Возвращает список хостов для идентификатора провайдера и необязательного пользовательского baseUrl.
*/
function resolveProviderHosts(providerId, customBaseUrl) {
	const hosts = /* @__PURE__ */ new Set();
	if (typeof customBaseUrl === "string" && customBaseUrl.trim()) {
		const customHost = extractHost(customBaseUrl);
		if (customHost) hosts.add(customHost);
	}
	const builtin = BUILTIN_PROVIDER_ENDPOINTS[providerId];
	if (hosts.size === 0 && builtin) for (const url of builtin.urls) {
		const host = extractHost(url);
		if (host) hosts.add(host);
	}
	return Array.from(hosts);
}
/**
* Создает пустой черновик профиля прокси для формы добавления.
*/
function createEmptyDraft() {
	return {
		id: `proxy-${Date.now().toString(36)}`,
		name: "",
		protocol: "http",
		host: "",
		port: "8080",
		authEnabled: false,
		hasCredentials: false,
		usernameMask: "",
		username: "",
		password: "",
		ignoreSslErrors: false
	};
}
/**
* Преобразует сохраненный профиль прокси в черновик для редактирования.
*/
function draftFromProfile(profile) {
	return {
		id: profile.id,
		name: profile.name || "",
		protocol: profile.protocol || "http",
		host: profile.host || "",
		port: String(profile.port || 8080),
		authEnabled: Boolean(profile.auth?.enabled),
		hasCredentials: Boolean(profile.auth?.hasCredentials),
		usernameMask: profile.auth?.usernameMask || "",
		username: "",
		password: "",
		ignoreSslErrors: Boolean(profile.ignoreSslErrors)
	};
}
/**
* Преобразует черновик формы в структуру профиля прокси для сохранения или проверки.
*/
function profileFromDraft(draft) {
	return {
		id: draft.id,
		name: draft.name.trim(),
		protocol: draft.protocol,
		host: sanitizeHostInput(draft.host),
		port: Number(draft.port),
		auth: {
			enabled: Boolean(draft.authEnabled),
			username: draft.username || "",
			password: draft.password || ""
		},
		ignoreSslErrors: Boolean(draft.ignoreSslErrors)
	};
}
// src/host/api/httpRoutes.ts
/**
* Записывает JSON-ответ с заголовками запрета кэширования.
*/
function writeJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(body),
		"Cache-Control": "no-store"
	});
	res.end(body);
}
var InvalidJsonBodyError = class extends Error {
	constructor() {
		super("Request body must be a JSON object");
	}
};
/**
* Читает JSON-объект входящего HTTP-запроса с ограничением размера 128 КБ.
*/
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let total = 0;
		req.on("data", (chunk) => {
			const buffer = Buffer.from(chunk);
			total += buffer.length;
			if (total > 131072) {
				reject(/* @__PURE__ */ new Error("Request body too large"));
				req.destroy();
				return;
			}
			chunks.push(buffer);
		});
		req.on("end", () => {
			try {
				const raw = Buffer.concat(chunks).toString("utf8").trim();
				const parsed = raw ? JSON.parse(raw) : {};
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
					reject(new InvalidJsonBodyError());
					return;
				}
				resolve(parsed);
			} catch {
				reject(new InvalidJsonBodyError());
			}
		});
		req.on("error", reject);
	});
}
/**
* Проверяет, что HTTP-запрос поступил из веб-интерфейса оболочки DSH того же источника.
*/
function isSameOriginBrowserRequest(req) {
	const site = req.headers?.["sec-fetch-site"];
	if (site && site !== "same-origin" && site !== "none") return false;
	const userAgent = req.headers?.["user-agent"] || "";
	if (/PowerShell|curl\/|Wget\/|python-requests|node-fetch|undici/i.test(userAgent)) return false;
	if (!site && !userAgent.includes("Mozilla/") && req.headers?.["x-kpp-client"] !== "dsh-web-ui") return false;
	const origin = req.headers?.origin;
	if (typeof origin === "string") try {
		if (new URL(origin).host !== req.headers.host) return false;
	} catch {
		return false;
	}
	return true;
}
/**
* Регистрирует HTTP-маршруты управления прокси (/api/dsh-proxy-provider/*) в веб-сервере DSH.
*/
function registerHttpRoutes(ctx, controller) {
	let activeGuiToken = null;
	if (typeof ctx.inject !== "function") return;
	ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: "prefix",
			path: "/api/dsh-proxy-provider",
			handler: async (req, res) => {
				if (!isSameOriginBrowserRequest(req)) {
					writeJson(res, 403, {
						ok: false,
						error: "Forbidden: access restricted to DSH Web GUI"
					});
					return;
				}
				const action = new URL(req.url ?? "/", "http://dsh.internal").pathname.replace(/^\/api\/dsh-proxy-provider\/?/, "");
				try {
					if (action === "session" && req.method === "POST") {
						if ((await readJsonBody(req))?.action === "release") {
							activeGuiToken = null;
							writeJson(res, 200, { ok: true });
							return;
						}
						if (!activeGuiToken) activeGuiToken = randomBytes(24).toString("hex");
						writeJson(res, 200, {
							ok: true,
							token: activeGuiToken
						});
						return;
					}
					const reqToken = req.headers?.["x-kpp-token"];
					if (reqToken && !activeGuiToken) activeGuiToken = String(reqToken);
					if (action === "state" && req.method === "GET") {
						writeJson(res, 200, {
							ok: true,
							...await controller.refreshRouting()
						});
						return;
					}
					if (action === "config" && req.method === "POST") {
						const body = await readJsonBody(req);
						writeJson(res, 200, {
							ok: true,
							...await controller.updateConfig(body)
						});
						return;
					}
					if (action === "export" && (req.method === "GET" || req.method === "POST")) {
						const body = req.method === "POST" ? await readJsonBody(req) : {};
						writeJson(res, 200, {
							ok: true,
							exportData: controller.exportConfig({
								includeCredentials: Boolean(body.includeCredentials),
								password: typeof body.password === "string" ? body.password : ""
							})
						});
						return;
					}
					if (action === "import" && req.method === "POST") {
						const body = await readJsonBody(req);
						writeJson(res, 200, {
							ok: true,
							...await controller.importConfig(body)
						});
						return;
					}
					if (action === "bind" && req.method === "POST") {
						const body = await readJsonBody(req);
						if (!body || typeof body.providerId !== "string") {
							writeJson(res, 400, {
								ok: false,
								error: "providerId is required"
							});
							return;
						}
						const profileId = typeof body.profileId === "string" ? body.profileId : null;
						writeJson(res, 200, {
							ok: true,
							...await controller.bindProvider(body.providerId, profileId)
						});
						return;
					}
					if (action === "test" && req.method === "POST") {
						const body = await readJsonBody(req);
						const rawProfile = body?.profile ?? {};
						const rawCandidate = {
							id: rawProfile.id || "test-profile",
							name: rawProfile.name || "Test Profile",
							...rawProfile
						};
						const profile = controller.resolveProfileWithSecrets(rawCandidate);
						if (!profile) {
							writeJson(res, 400, {
								ok: false,
								tcpOk: false,
								httpOk: false,
								error: "Valid proxy host and port (1-65535) are required"
							});
							return;
						}
						const testUrl = typeof body?.testUrl === "string" ? body.testUrl : void 0;
						writeJson(res, 200, await controller.testConnection(profile, testUrl));
						return;
					}
					writeJson(res, 404, {
						ok: false,
						error: `Unknown endpoint "${action}"`
					});
				} catch (error) {
					writeJson(res, error instanceof InvalidJsonBodyError ? 400 : 500, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		}));
	});
}
// src/host/services/cryptoStore.ts
/**
* Определяет путь к файлу мастер-ключа шифрования учетных данных прокси.
*/
function resolveMasterKeyPath(customKeyPath) {
	if (customKeyPath) return customKeyPath;
	const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
	return join(localAppData, "kalex-dsh-proxy-provider", "master.key");
}
/**
* Загружает или генерирует 256-битный мастер-ключ шифрования учетных данных на диске.
*/
function getOrCreateMasterKey(customKeyPath) {
	const keyPath = resolveMasterKeyPath(customKeyPath);
	try {
		if (existsSync(keyPath)) {
			const hex = readFileSync(keyPath, "utf8").trim();
			if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
		}
		const key = randomBytes(32);
		mkdirSync(dirname(keyPath), { recursive: true });
		writeFileSync(keyPath, key.toString("hex"), {
			encoding: "utf8",
			mode: 384
		});
		return key;
	} catch {
		return randomBytes(32);
	}
}
var fileMasterKeyProvider = { getOrCreate: getOrCreateMasterKey };
/**
* Шифрует логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
*/
function encryptAuthSecret(username, password, masterKey) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
	const payload = JSON.stringify({
		username: username || "",
		password: password || ""
	});
	const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
/**
* Расшифровывает логин и пароль алгоритмом AES-256-GCM с помощью локального мастер-ключа.
*/
function decryptAuthSecret(cipherText, masterKey) {
	if (typeof cipherText !== "string" || !cipherText.includes(":")) return null;
	try {
		const [ivHex, tagHex, dataHex] = cipherText.split(":");
		if (!ivHex || !tagHex || !dataHex) return null;
		const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivHex, "hex"));
		decipher.setAuthTag(Buffer.from(tagHex, "hex"));
		const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
		const parsed = JSON.parse(decrypted);
		return {
			username: typeof parsed?.username === "string" ? parsed.username : "",
			password: typeof parsed?.password === "string" ? parsed.password : ""
		};
	} catch {
		return null;
	}
}
/**
* Формирует безопасную маску имени пользователя для отображения в интерфейсе.
*/
function maskUsername(username) {
	if (typeof username !== "string" || !username) return "";
	if (username.length <= 2) return `${username[0]}*`;
	return `${username[0]}${"*".repeat(Math.min(5, username.length - 2))}${username[username.length - 1]}`;
}
/**
* Шифрует учетные данные прокси паролем пользователя (scrypt + AES-256-GCM) для переноса между устройствами.
*/
function encryptWithPassphrase(username, password, passphrase) {
	const salt = randomBytes(16);
	const iv = randomBytes(12);
	const derivedKey = scryptSync(String(passphrase), salt, 32);
	const cipher = createCipheriv("aes-256-gcm", derivedKey, iv);
	const payload = JSON.stringify({
		username: username || "",
		password: password || ""
	});
	const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
/**
* Расшифровывает экспортированные учетные данные прокси паролем пользователя.
*/
function decryptWithPassphrase(exportCipher, passphrase) {
	if (typeof exportCipher !== "string" || !exportCipher.includes(":")) throw new Error("Invalid encrypted credential format in import file");
	const parts = exportCipher.split(":");
	if (parts.length !== 4) throw new Error("Invalid encrypted credential format in import file");
	const [saltHex, ivHex, tagHex, dataHex] = parts;
	if (!saltHex || !ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted credential format in import file");
	const derivedKey = scryptSync(String(passphrase), Buffer.from(saltHex, "hex"), 32);
	try {
		const decipher = createDecipheriv("aes-256-gcm", derivedKey, Buffer.from(ivHex, "hex"));
		decipher.setAuthTag(Buffer.from(tagHex, "hex"));
		const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
		const parsed = JSON.parse(decrypted);
		return {
			username: typeof parsed?.username === "string" ? parsed.username : "",
			password: typeof parsed?.password === "string" ? parsed.password : ""
		};
	} catch {
		throw new Error("Invalid password for encrypted credentials");
	}
}
// src/host/services/configNormalizer.ts
/**
* Проверяет и нормализует одиночный профиль прокси, при необходимости расшифровывая секреты.
*/
function normalizeProfile(raw, masterKey = null) {
	if (!raw || typeof raw !== "object") return null;
	const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
	const profileName = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "";
	const host = sanitizeHostInput(raw.host ?? "");
	const port = Number(raw.port);
	if (!id || !profileName || !host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
	const protocolRaw = typeof raw.protocol === "string" ? raw.protocol.toLowerCase() : "http";
	const protocol = protocolRaw === "http" || protocolRaw === "https" || protocolRaw === "socks5" ? protocolRaw : "http";
	const authEnabled = Boolean(raw.auth?.enabled);
	let username = typeof raw.auth?.username === "string" ? raw.auth.username : "";
	let password = typeof raw.auth?.password === "string" ? raw.auth.password : "";
	if (!username && !password && typeof raw.auth?.cipher === "string" && masterKey) {
		const decrypted = decryptAuthSecret(raw.auth.cipher, masterKey);
		if (decrypted) {
			username = decrypted.username;
			password = decrypted.password;
		}
	}
	return {
		id,
		name: profileName,
		protocol,
		host,
		port,
		auth: {
			enabled: authEnabled,
			...username ? { username } : {},
			...password ? { password } : {}
		},
		ignoreSslErrors: Boolean(raw.ignoreSslErrors)
	};
}
/**
* Нормализует полную конфигурацию прокси, сбрасывая привязки к несуществующим профилям в null (Direct).
*/
function normalizeProxyConfig(raw = {}, masterKey = null) {
	const profiles = [];
	const validProfileIds = /* @__PURE__ */ new Set();
	if (Array.isArray(raw?.profiles)) for (const item of raw.profiles) {
		const normalized = normalizeProfile(item, masterKey);
		if (normalized && !validProfileIds.has(normalized.id)) {
			validProfileIds.add(normalized.id);
			profiles.push(normalized);
		}
	}
	const providerBindings = {};
	if (raw?.providerBindings && typeof raw.providerBindings === "object") for (const [providerId, profileId] of Object.entries(raw.providerBindings)) {
		if (!providerId) continue;
		providerBindings[providerId] = typeof profileId === "string" && validProfileIds.has(profileId) ? profileId : null;
	}
	return {
		profiles,
		providerBindings,
		defaultTestUrl: typeof raw?.defaultTestUrl === "string" && raw.defaultTestUrl.trim() ? raw.defaultTestUrl.trim() : DEFAULT_TEST_URL
	};
}
/**
* Подготавливает конфигурацию к записи на диск с шифрованием паролей мастер-ключом.
*/
function serializeConfigForDisk(config, masterKey) {
	return {
		profiles: (config.profiles || []).map((profile) => {
			const hasSecret = Boolean(profile.auth?.username || profile.auth?.password);
			return {
				id: profile.id,
				name: profile.name,
				protocol: profile.protocol,
				host: profile.host,
				port: profile.port,
				auth: {
					enabled: Boolean(profile.auth?.enabled),
					...hasSecret ? { cipher: encryptAuthSecret(profile.auth?.username ?? "", profile.auth?.password ?? "", masterKey) } : {}
				},
				ignoreSslErrors: Boolean(profile.ignoreSslErrors)
			};
		}),
		providerBindings: config.providerBindings || {},
		defaultTestUrl: config.defaultTestUrl || "https://generativelanguage.googleapis.com"
	};
}
/**
* Очищает конфигурацию от открытых паролей перед отправкой в веб-интерфейс DSH.
*/
function sanitizeConfigForClient(config) {
	return {
		profiles: (config.profiles || []).map((profile) => {
			const hasCredentials = Boolean(profile.auth?.username || profile.auth?.password);
			return {
				id: profile.id,
				name: profile.name,
				protocol: profile.protocol,
				host: profile.host,
				port: profile.port,
				auth: {
					enabled: Boolean(profile.auth?.enabled),
					hasCredentials,
					usernameMask: hasCredentials ? maskUsername(profile.auth?.username || "") : ""
				},
				ignoreSslErrors: Boolean(profile.ignoreSslErrors)
			};
		}),
		providerBindings: { ...config.providerBindings },
		defaultTestUrl: config.defaultTestUrl || "https://generativelanguage.googleapis.com"
	};
}
/**
* Формирует объект экспорта настроек (с опциональным шифрованием учетных данных паролем).
*/
function exportConfig(currentConfig, options = {}) {
	const includeCredentials = Boolean(options?.includeCredentials);
	const password = typeof options?.password === "string" ? options.password : "";
	if (includeCredentials && !password) throw new Error("Encryption password is required when exporting credentials");
	const baseSanitized = sanitizeConfigForClient(currentConfig);
	if (!includeCredentials) return {
		version: 1,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		encryptedCredentials: false,
		...baseSanitized
	};
	const profiles = (currentConfig.profiles || []).map((profile) => {
		const hasCredentials = Boolean(profile.auth?.username || profile.auth?.password);
		return {
			id: profile.id,
			name: profile.name,
			protocol: profile.protocol,
			host: profile.host,
			port: profile.port,
			auth: {
				enabled: Boolean(profile.auth?.enabled),
				hasCredentials,
				usernameMask: hasCredentials ? maskUsername(profile.auth?.username || "") : "",
				...hasCredentials ? { exportCipher: encryptWithPassphrase(profile.auth?.username || "", profile.auth?.password || "", password) } : {}
			},
			ignoreSslErrors: Boolean(profile.ignoreSslErrors)
		};
	});
	return {
		version: 1,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		encryptedCredentials: true,
		profiles,
		providerBindings: baseSanitized.providerBindings,
		defaultTestUrl: baseSanitized.defaultTestUrl
	};
}
/**
* Импортирует конфигурацию прокси, при необходимости расшифровывая переносимые учетные данные.
*/
async function importConfig(rawInput, passwordArg = "", context) {
	if (!rawInput || typeof rawInput !== "object") throw new Error("Invalid import file: expected a JSON object");
	const rawPayload = rawInput.payload && typeof rawInput.payload === "object" ? rawInput.payload : rawInput;
	const password = typeof passwordArg === "string" && passwordArg ? passwordArg : typeof rawInput.password === "string" ? rawInput.password : "";
	const skipCredentials = Boolean(rawInput.skipCredentials);
	const candidate = rawPayload.config && typeof rawPayload.config === "object" ? rawPayload.config : rawPayload;
	if (!Array.isArray(candidate.profiles)) throw new Error("Invalid import file: \"profiles\" array is required");
	if (candidate.profiles.some((profile) => typeof profile?.auth?.exportCipher === "string" && profile.auth.exportCipher.length > 0) && !skipCredentials && !password) throw new Error("PASSWORD_REQUIRED: This export file contains encrypted credentials. Please enter the decryption password.");
	const hydratedProfiles = candidate.profiles.map((profile) => {
		if (!profile || typeof profile !== "object") return profile;
		if (typeof profile.auth?.exportCipher !== "string" || !profile.auth.exportCipher.length) return profile;
		if (skipCredentials) {
			const { exportCipher: _ignored, ...restAuth } = profile.auth;
			return {
				...profile,
				auth: restAuth
			};
		}
		const decrypted = decryptWithPassphrase(profile.auth.exportCipher, password);
		return {
			...profile,
			auth: {
				enabled: Boolean(profile.auth?.enabled),
				username: decrypted.username,
				password: decrypted.password
			}
		};
	});
	const nextTestUrl = candidate.defaultTestUrl || context.currentConfig.defaultTestUrl;
	return context.updateConfig({
		profiles: hydratedProfiles,
		providerBindings: candidate.providerBindings && typeof candidate.providerBindings === "object" ? candidate.providerBindings : context.currentConfig.providerBindings,
		...nextTestUrl ? { defaultTestUrl: nextTestUrl } : {}
	});
}
// src/host/services/socks5.ts
function parseIpv6Bytes(ipv6) {
	const parts = ipv6.replace(/^\[|\]$/g, "").split("::");
	if (parts.length > 2) return null;
	const left = parts[0] ? parts[0].split(":") : [];
	const right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
	const missing = 8 - (left.length + right.length);
	if (missing < 0) return null;
	const groups = [
		...left,
		...parts.length === 2 ? Array(missing).fill("0") : [],
		...right
	];
	if (groups.length !== 8) return null;
	const buf = Buffer.alloc(16);
	for (let i = 0; i < 8; i++) {
		const val = Number.parseInt(groups[i] || "0", 16);
		if (Number.isNaN(val) || val < 0 || val > 65535) return null;
		buf.writeUInt16BE(val, i * 2);
	}
	return buf;
}
function buildSocks5ConnectPacket(host, port) {
	const portBuf = Buffer.alloc(2);
	portBuf.writeUInt16BE(Number(port), 0);
	const cleanHost = host.replace(/^\[|\]$/g, "");
	if (net.isIPv4(cleanHost)) {
		const ipBytes = cleanHost.split(".").map((octet) => Number(octet) & 255);
		return Buffer.concat([Buffer.from([
			5,
			1,
			0,
			1,
			...ipBytes
		]), portBuf]);
	}
	if (net.isIPv6(cleanHost)) {
		const ipv6Buf = parseIpv6Bytes(cleanHost);
		if (ipv6Buf) return Buffer.concat([
			Buffer.from([
				5,
				1,
				0,
				4
			]),
			ipv6Buf,
			portBuf
		]);
	}
	const hostBuf = Buffer.from(cleanHost, "utf8");
	return Buffer.concat([
		Buffer.from([
			5,
			1,
			0,
			3,
			hostBuf.length
		]),
		hostBuf,
		portBuf
	]);
}
/**
* Устанавливает туннель SOCKS5 (RFC 1928 + аутентификация RFC 1929) поверх TCP-сокета.
*/
function establishSocks5Tunnel(proxyProfile, targetHost, targetPort, timeoutMs = 5e3) {
	return new Promise((resolve, reject) => {
		const useAuth = Boolean(proxyProfile.auth?.enabled && proxyProfile.auth?.username);
		const username = proxyProfile.auth?.username ?? "";
		const password = proxyProfile.auth?.password ?? "";
		const socket = net.createConnection({
			host: proxyProfile.host,
			port: Number(proxyProfile.port)
		});
		let settled = false;
		const fail = (err) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			socket.destroy();
			reject(err instanceof Error ? err : new Error(String(err)));
		};
		const timer = setTimeout(() => {
			fail(/* @__PURE__ */ new Error(`SOCKS5 connection to ${proxyProfile.host}:${proxyProfile.port} timed out (${timeoutMs}ms)`));
		}, timeoutMs);
		let buffer = Buffer.alloc(0);
		let stage = "greeting";
		const onData = (chunk) => {
			buffer = Buffer.concat([buffer, chunk]);
			while (true) {
				if (stage === "greeting") {
					if (buffer.length < 2) return;
					const ver = buffer[0];
					const method = buffer[1];
					buffer = buffer.subarray(2);
					if (ver !== 5) {
						fail(/* @__PURE__ */ new Error(`Invalid SOCKS version from proxy: ${ver}`));
						return;
					}
					if (method === 255) {
						fail(/* @__PURE__ */ new Error("Proxy Authentication Required (407): SOCKS5 proxy rejected authentication methods"));
						return;
					}
					if (method === 2) {
						const uBytes = Buffer.from(username, "utf8");
						const pBytes = Buffer.from(password, "utf8");
						const authPacket = Buffer.concat([
							Buffer.from([1, uBytes.length]),
							uBytes,
							Buffer.from([pBytes.length]),
							pBytes
						]);
						stage = "auth";
						socket.write(authPacket);
						continue;
					}
					if (method === 0) {
						stage = "connect";
						socket.write(buildSocks5ConnectPacket(targetHost, targetPort));
						continue;
					}
					fail(/* @__PURE__ */ new Error(`Unsupported SOCKS5 auth method: ${method}`));
					return;
				}
				if (stage === "auth") {
					if (buffer.length < 2) return;
					const status = buffer[1];
					buffer = buffer.subarray(2);
					if (status !== 0) {
						fail(/* @__PURE__ */ new Error("Proxy Authentication Required (407): check username and password"));
						return;
					}
					stage = "connect";
					socket.write(buildSocks5ConnectPacket(targetHost, targetPort));
					continue;
				}
				if (stage === "connect") {
					if (buffer.length < 4) return;
					const ver = buffer[0];
					const rep = buffer[1] ?? 255;
					const atyp = buffer[3];
					if (ver !== 5) {
						fail(/* @__PURE__ */ new Error(`Invalid SOCKS5 connect response version: ${ver}`));
						return;
					}
					if (rep !== 0) {
						fail(/* @__PURE__ */ new Error(`SOCKS5 CONNECT failed with reply code 0x${rep.toString(16)}`));
						return;
					}
					let totalLen = 0;
					if (atyp === 1) totalLen = 10;
					else if (atyp === 3) {
						if (buffer.length < 5) return;
						totalLen = 5 + (buffer[4] ?? 0) + 2;
					} else if (atyp === 4) totalLen = 22;
					else {
						fail(/* @__PURE__ */ new Error(`Unsupported SOCKS5 address type: ${atyp}`));
						return;
					}
					if (buffer.length < totalLen) return;
					const leftover = buffer.subarray(totalLen);
					socket.pause();
					socket.removeListener("data", onData);
					socket.removeListener("error", onError);
					clearTimeout(timer);
					settled = true;
					if (leftover.length > 0) socket.unshift(leftover);
					resolve(socket);
					return;
				}
			}
		};
		const onError = (err) => fail(err);
		socket.on("error", onError);
		socket.on("data", onData);
		socket.once("connect", () => {
			const greeting = useAuth ? Buffer.from([
				5,
				2,
				0,
				2
			]) : Buffer.from([
				5,
				1,
				0
			]);
			socket.write(greeting);
		});
	});
}
// src/host/services/undiciLoader.ts
function getSymbolObject(target, symbol) {
	if (!symbol) return void 0;
	const value = Object.getOwnPropertyDescriptor(target, symbol)?.value;
	return typeof value === "object" && value !== null ? value : void 0;
}
function isProxyDispatchClient(value) {
	return "dispatch" in value && typeof value.dispatch === "function";
}
function isStringRecord(value) {
	return Object.keys(value).every((key) => typeof Object.getOwnPropertyDescriptor(value, key)?.value === "string");
}
function isolateLegacyProxyAgent(mod) {
	const baseDispatch = mod.ProxyAgent.prototype.dispatch;
	if (typeof baseDispatch !== "function") return mod;
	class IsolatedProxyAgent extends mod.ProxyAgent {
		dispatch(options, handler) {
			const origin = String(options.origin ?? "");
			if (!origin.startsWith("http://")) return baseDispatch.call(this, options, handler);
			const symbols = Object.getOwnPropertySymbols(this);
			const clientSymbol = symbols.find((symbol) => symbol.toString() === "Symbol(proxy client)");
			const headersSymbol = symbols.find((symbol) => symbol.toString() === "Symbol(proxy headers)");
			const clientCandidate = getSymbolObject(this, clientSymbol);
			const client = clientCandidate && isProxyDispatchClient(clientCandidate) ? clientCandidate : void 0;
			const headersCandidate = getSymbolObject(this, headersSymbol);
			const proxyHeaders = headersCandidate && isStringRecord(headersCandidate) ? headersCandidate : {};
			if (!client) return baseDispatch.call(this, options, handler);
			const requestHeaders = {};
			if (Array.isArray(options.headers)) for (let index = 0; index < options.headers.length; index += 2) {
				const key = options.headers[index];
				const value = options.headers[index + 1];
				if (key && value !== void 0) requestHeaders[key] = value;
			}
			else if (options.headers) Object.assign(requestHeaders, options.headers);
			const headers = {
				...requestHeaders,
				...proxyHeaders,
				host: new URL(origin).host
			};
			const proxiedHandler = new Proxy(handler, { get(target, property, receiver) {
				if (property === "onHeaders") return (statusCode, responseHeaders, resume, statusText) => {
					if (statusCode === 407 && typeof target.onError === "function") {
						target.onError(/* @__PURE__ */ new Error("Proxy Authentication Required (407)"));
						return false;
					}
					return target.onHeaders ? target.onHeaders(statusCode, responseHeaders, resume, statusText) : true;
				};
				return Reflect.get(target, property, receiver);
			} });
			return client.dispatch({
				...options,
				path: `${origin}${options.path ?? "/"}`,
				headers
			}, proxiedHandler);
		}
	}
	return {
		...mod,
		ProxyAgent: IsolatedProxyAgent
	};
}
async function resolveUndiciModule() {
	const candidates = ["undici"];
	const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
	const profileUndici = join(dshHome, "profiles", "desktop", "node_modules", "undici", "index.js");
	if (existsSync(profileUndici)) candidates.push(pathToFileURL(profileUndici).href);
	if (existsSync("/usr/share/nodejs/undici/index.js")) try {
		return createRequire("/usr/share/nodejs/index.js")("undici");
	} catch {}
	for (const specifier of candidates) try {
		return await import(specifier);
	} catch {}
	throw new Error("undici package is required but could not be resolved");
}
function createUndiciLoader(resolveModule = resolveUndiciModule) {
	let cachedModule;
	return async () => {
		if (!cachedModule) cachedModule = resolveModule().then(isolateLegacyProxyAgent);
		try {
			return await cachedModule;
		} catch (error) {
			cachedModule = void 0;
			throw error;
		}
	};
}
var defaultUndiciLoader = createUndiciLoader();
function loadUndici() {
	return defaultUndiciLoader();
}
// src/host/services/profileDispatcher.ts
/**
* Создает экземпляр диспетчера undici (ProxyAgent для HTTP/HTTPS или Agent с туннелем SOCKS5).
*/
async function createProfileDispatcher(profile, undiciLoader = loadUndici) {
	const { ProxyAgent, Agent } = await undiciLoader();
	const protocol = (profile.protocol || "http").toLowerCase();
	if (protocol === "socks5") return new Agent({ connect(opts, callback) {
		const targetHost = opts.hostname || opts.host || "localhost";
		const isHttps = opts.protocol === "https:";
		establishSocks5Tunnel(profile, targetHost, Number(opts.port) || (isHttps ? 443 : 80)).then((rawSocket) => {
			if (!isHttps) {
				callback(null, rawSocket);
				return;
			}
			const tlsSocket = tls.connect({
				socket: rawSocket,
				servername: opts.servername || (net.isIP(targetHost) ? void 0 : targetHost),
				rejectUnauthorized: !profile.ignoreSslErrors
			});
			tlsSocket.once("secureConnect", () => {
				callback(null, tlsSocket);
			});
			tlsSocket.once("error", (err) => {
				rawSocket.destroy();
				callback(err, null);
			});
		}).catch((err) => {
			callback(err, null);
		});
	} });
	const token = profile.auth?.enabled && profile.auth.username ? `Basic ${Buffer.from(`${profile.auth.username}:${profile.auth.password ?? ""}`).toString("base64")}` : void 0;
	const tlsOpts = profile.ignoreSslErrors ? { rejectUnauthorized: false } : void 0;
	return new ProxyAgent({
		uri: `${protocol}://${profile.host}:${profile.port}`,
		...token ? { token } : {},
		...tlsOpts ? {
			requestTls: tlsOpts,
			proxyTls: tlsOpts,
			connect: tlsOpts
		} : {}
	});
}
/**
* Кэш активных диспетчеров undici по идентификатору профиля с автоматическим пересозданием при изменении настроек.
*/
var DispatcherManager = class {
	createDispatcher;
	entries = /* @__PURE__ */ new Map();
	operations = /* @__PURE__ */ new Map();
	inflight = /* @__PURE__ */ new Map();
	constructor(createDispatcher = createProfileDispatcher) {
		this.createDispatcher = createDispatcher;
	}
	signatureOf(profile) {
		return JSON.stringify({
			protocol: profile.protocol,
			host: profile.host,
			port: Number(profile.port),
			authEnabled: Boolean(profile.auth?.enabled),
			username: profile.auth?.username ?? "",
			password: profile.auth?.password ?? "",
			ignoreSslErrors: Boolean(profile.ignoreSslErrors)
		});
	}
	getDispatcher(profile) {
		const sig = this.signatureOf(profile);
		const pending = this.inflight.get(profile.id);
		if (pending?.signature === sig) return pending.promise;
		const operation = (this.operations.get(profile.id) ?? Promise.resolve()).then(async () => {
			const existing = this.entries.get(profile.id);
			if (existing?.signature === sig) return existing.dispatcher;
			if (existing) {
				this.entries.delete(profile.id);
				try {
					await existing.dispatcher.destroy?.();
				} catch {}
			}
			const dispatcher = await this.createDispatcher(profile);
			this.entries.set(profile.id, {
				signature: sig,
				dispatcher
			});
			return dispatcher;
		});
		const tail = operation.then(() => {}, () => {});
		const pendingOperation = {
			signature: sig,
			promise: operation
		};
		this.operations.set(profile.id, tail);
		this.inflight.set(profile.id, pendingOperation);
		tail.then(() => {
			if (this.operations.get(profile.id) === tail) this.operations.delete(profile.id);
			if (this.inflight.get(profile.id) === pendingOperation) this.inflight.delete(profile.id);
		});
		return operation;
	}
	async syncProfiles(profiles = []) {
		await Promise.all(this.operations.values());
		const validIds = new Set(profiles.map((p) => p.id));
		for (const [id, entry] of this.entries.entries()) if (!validIds.has(id)) {
			this.entries.delete(id);
			try {
				await entry.dispatcher.destroy?.();
			} catch {}
		}
	}
	async closeAll() {
		await Promise.all(this.operations.values());
		const list = Array.from(this.entries.values());
		this.entries.clear();
		for (const entry of list) try {
			await entry.dispatcher.destroy?.();
		} catch {}
	}
};
// src/host/services/connectionTest.ts
/**
* Этап 1 проверки соединения: проверка TCP-доступности узла и порта прокси с тайм-аутом 5000 мс.
*/
function checkTcpReachability(host, port, timeoutMs = 5e3) {
	const start = Date.now();
	return new Promise((resolve) => {
		const socket = net.createConnection({
			host,
			port: Number(port)
		});
		let done = false;
		const finish = (ok) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			socket.destroy();
			resolve({
				ok,
				latencyMs: Date.now() - start
			});
		};
		const timer = setTimeout(() => finish(false), timeoutMs);
		socket.once("connect", () => finish(true));
		socket.once("error", () => finish(false));
	});
}
/**
* Выполняет HTTP-запрос через загруженный экземпляр undici.fetch с поддержкой распаковки объектов Request.
*/
async function dispatchWithUndiciFetch(input, init, dispatcher) {
	const { fetch: proxyFetch } = await loadUndici();
	if (input && typeof input === "object" && !(input instanceof URL) && typeof input.url === "string") {
		const headers = {};
		if (input.headers && typeof input.headers.forEach === "function") input.headers.forEach((value, key) => {
			headers[key] = value;
		});
		const extra = init?.headers;
		if (extra) {
			if (typeof extra.forEach === "function") extra.forEach((value, key) => {
				headers[key] = value;
			});
			else if (Array.isArray(extra)) for (const [k, v] of extra) headers[k] = v;
			else if (typeof extra === "object") Object.assign(headers, extra);
		}
		const method = init?.method || input.method || "GET";
		let body = init?.body;
		if (body === void 0 && method !== "GET" && method !== "HEAD" && input.body && typeof input.arrayBuffer === "function") body = Buffer.from(await input.arrayBuffer());
		const signal = init?.signal || input.signal;
		return proxyFetch(input.url, {
			method,
			headers,
			...body !== void 0 ? { body } : {},
			...signal ? { signal } : {},
			dispatcher
		});
	}
	return proxyFetch(input, {
		...init,
		dispatcher
	});
}
/**
* Выполняет двухэтапную проверку прокси-соединения (TCP + сквозной HTTP-запрос).
*/
async function testProxyConnection(profile, testUrl = DEFAULT_TEST_URL, fetchImpl = null) {
	if (!profile?.host || !profile.port) return {
		ok: false,
		tcpOk: false,
		httpOk: false,
		error: "Proxy host and port are required"
	};
	const tcp = await checkTcpReachability(profile.host, Number(profile.port), 5e3);
	if (!tcp.ok) return {
		ok: false,
		tcpOk: false,
		httpOk: false,
		error: `TCP connection to proxy ${profile.host}:${profile.port} failed (timeout 5000ms or connection refused)`
	};
	const trimmedUrl = typeof testUrl === "string" ? testUrl.trim() : "";
	if (!trimmedUrl) return {
		ok: true,
		tcpOk: true,
		httpOk: true,
		latencyMs: tcp.latencyMs,
		tcpLatencyMs: tcp.latencyMs
	};
	let dispatcher;
	const httpStart = Date.now();
	try {
		dispatcher = await createProfileDispatcher(profile);
		const response = fetchImpl ? await fetchImpl(trimmedUrl, {
			method: "GET",
			dispatcher,
			signal: AbortSignal.timeout(5e3)
		}) : await dispatchWithUndiciFetch(trimmedUrl, {
			method: "GET",
			signal: AbortSignal.timeout(5e3)
		}, dispatcher);
		const latencyMs = Date.now() - httpStart;
		try {
			await response.arrayBuffer?.();
		} catch {}
		if (response.status === 407) return {
			ok: false,
			tcpOk: true,
			httpOk: false,
			status: 407,
			latencyMs,
			tcpLatencyMs: tcp.latencyMs,
			error: "Proxy Authentication Required (407): check username and password"
		};
		return {
			ok: true,
			tcpOk: true,
			httpOk: true,
			status: response.status,
			latencyMs,
			tcpLatencyMs: tcp.latencyMs
		};
	} catch (err) {
		const latencyMs = Date.now() - httpStart;
		try {
			await dispatcher?.close?.();
		} catch {}
		const errorObj = err;
		const rawMsg = [
			errorObj?.message,
			errorObj?.cause?.message,
			errorObj?.cause?.code
		].filter(Boolean).join(" - ");
		if (/407|Proxy Authentication Required/i.test(rawMsg)) return {
			ok: false,
			tcpOk: true,
			httpOk: false,
			status: 407,
			latencyMs,
			tcpLatencyMs: tcp.latencyMs,
			error: "Proxy Authentication Required (407): check username and password"
		};
		if (/CERT_|certificate|UNABLE_TO_VERIFY|SELF_SIGNED|TLS/i.test(rawMsg)) return {
			ok: false,
			tcpOk: true,
			httpOk: false,
			latencyMs,
			tcpLatencyMs: tcp.latencyMs,
			error: `SSL/TLS certificate error (${rawMsg}). Enable "Ignore SSL / TLS certificate errors" if your proxy uses a corporate root CA.`
		};
		return {
			ok: false,
			tcpOk: true,
			httpOk: false,
			latencyMs,
			tcpLatencyMs: tcp.latencyMs,
			error: `HTTP request through proxy failed: ${rawMsg || String(err)}`
		};
	} finally {
		try {
			await dispatcher?.destroy?.();
		} catch {}
	}
}
// src/host/services/providerYaml.ts
/**
* Разбирает секцию llm-pi-ai из файла cordis.patch.yml для обнаружения пользовательских провайдеров.
*/
function parseProvidersFromPatchYaml(yamlText) {
	const result = {};
	if (typeof yamlText !== "string" || !yamlText.includes("llm-pi-ai")) return result;
	const lines = yamlText.split(/\r?\n/);
	let inPiAi = false;
	let inProviders = false;
	let providersIndent = -1;
	let currentProvider = null;
	let providerIndent = -1;
	for (const rawLine of lines) {
		if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
		const indent = rawLine.search(/\S/);
		const trimmed = rawLine.trim();
		if (trimmed.startsWith("- id:")) {
			inPiAi = trimmed.includes("llm-pi-ai");
			inProviders = false;
			currentProvider = null;
			continue;
		}
		if (!inPiAi) continue;
		if (trimmed === "providers:") {
			inProviders = true;
			providersIndent = indent;
			currentProvider = null;
			continue;
		}
		if (inProviders) {
			if (indent <= providersIndent) {
				inProviders = false;
				currentProvider = null;
				continue;
			}
			if ((providerIndent === -1 || indent === providerIndent) && /^[a-zA-Z0-9._-]+:\s*$/.test(trimmed)) {
				providerIndent = indent;
				currentProvider = trimmed.slice(0, -1).trim();
				result[currentProvider] = result[currentProvider] ?? {};
				continue;
			}
			if (currentProvider && indent > providerIndent) {
				const entry = result[currentProvider];
				if (!entry) continue;
				const baseMatch = /^(?:baseURL|baseUrl):\s*(.+)$/.exec(trimmed);
				if (baseMatch?.[1]) entry.baseURL = baseMatch[1].trim().replace(/^['"]|['"]$/g, "");
				const nameMatch = /^displayName:\s*(.+)$/.exec(trimmed);
				if (nameMatch?.[1]) entry.displayName = nameMatch[1].trim().replace(/^['"]|['"]$/g, "");
			}
		}
	}
	return result;
}
// src/host/services/providerDiscovery.ts
/**
* Обнаруживает все встроенные и пользовательские провайдеры моделей из контекста DSH и файлов профиля.
*/
async function discoverProviders(ctx, extraProviders = {}) {
	const byId = /* @__PURE__ */ new Map();
	const upsert = (rawId, info = {}) => {
		if (!rawId || typeof rawId !== "string") return;
		const id = rawId === "deepseek" ? "deepseek-official" : rawId;
		const prev = byId.get(id);
		const builtin = BUILTIN_PROVIDER_ENDPOINTS[id];
		const baseUrl = info.baseUrl || info.baseURL || prev?.baseUrl || builtin?.urls?.[0];
		const hosts = resolveProviderHosts(id, info.baseUrl || info.baseURL || prev?.baseUrl);
		byId.set(id, {
			id,
			name: info.name || info.displayName || prev?.name || builtin?.name || id,
			custom: Boolean(info.custom ?? prev?.custom ?? !builtin),
			...baseUrl ? { baseUrl } : {},
			hosts,
			settingsNs: info.settingsNs || prev?.settingsNs || builtin?.settingsNs || "llm-pi-ai"
		});
	};
	upsert("deepseek-account", {
		name: "DeepSeek Account",
		custom: false,
		settingsNs: "llm-deepseek-account"
	});
	upsert("deepseek-official", {
		name: "DeepSeek",
		custom: false,
		settingsNs: "llm-deepseek"
	});
	upsert("google", {
		name: "google",
		custom: false,
		settingsNs: "llm-pi-ai"
	});
	const llm = ctx?.get?.("llm") ?? ctx?.llm;
	if (llm) {
		try {
			const configurable = typeof llm.listConfigurableProviders === "function" ? await llm.listConfigurableProviders() : [];
			for (const entry of configurable || []) {
				const cfgBaseUrl = entry.baseURL || entry.baseUrl || entry.defaultBaseURL;
				const entryName = entry.displayName || entry.name;
				upsert(entry.provider || entry.id, {
					...entryName ? { name: entryName } : {},
					...cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {},
					custom: Boolean(entry.declared),
					...entry.settingsNs ? { settingsNs: entry.settingsNs } : {}
				});
			}
		} catch {}
		try {
			const registered = typeof llm.listProviders === "function" ? await llm.listProviders() : [];
			for (const entry of registered || []) {
				const entryName = entry.name || entry.displayName;
				upsert(entry.id || entry.provider, entryName ? { name: entryName } : {});
			}
		} catch {}
	}
	const settings = ctx?.get?.("settings") ?? ctx?.settings;
	if (settings && typeof settings.describe === "function") for (const ns of ["llm-pi-ai", "llm-deepseek"]) try {
		const val = (await settings.describe(ns, { redactSecrets: true }))?.value;
		if (val && typeof val === "object") {
			if (val.providers && typeof val.providers === "object") {
				for (const [routeId, routeCfg] of Object.entries(val.providers)) if (routeCfg && typeof routeCfg === "object") {
					const cfgBaseUrl = routeCfg.baseURL || routeCfg.baseUrl;
					upsert(routeId, {
						name: routeCfg.displayName || routeCfg.name || routeId,
						...cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {},
						custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
						settingsNs: ns
					});
				}
			} else if (ns === "llm-deepseek" && (val.baseURL || val.baseUrl)) {
				const dsBaseUrl = val.baseURL || val.baseUrl;
				upsert("deepseek-official", {
					...dsBaseUrl ? { baseUrl: dsBaseUrl } : {},
					settingsNs: ns
				});
			}
		}
	} catch {}
	const configEditor = ctx?.get?.("configEditor") ?? ctx?.configEditor;
	if (configEditor && typeof configEditor.entries === "function") try {
		for (const entry of configEditor.entries() || []) {
			const cfg = entry?.options?.config ?? entry?.config;
			if (cfg?.providers && typeof cfg.providers === "object") {
				for (const [routeId, routeCfg] of Object.entries(cfg.providers)) if (routeCfg && typeof routeCfg === "object") {
					const cfgBaseUrl = routeCfg.baseURL || routeCfg.baseUrl;
					upsert(routeId, {
						name: routeCfg.displayName || routeCfg.name || routeId,
						...cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {},
						custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
						settingsNs: entry?.options?.id || "llm-pi-ai"
					});
				}
			}
		}
	} catch {}
	try {
		const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
		const patchPaths = [join(dshHome, "profiles", "desktop", "cordis.patch.yml"), join(dshHome, "cordis.patch.yml")];
		for (const patchPath of patchPaths) if (existsSync(patchPath)) {
			const parsed = parseProvidersFromPatchYaml(readFileSync(patchPath, "utf8"));
			for (const [routeId, routeCfg] of Object.entries(parsed)) {
				const cfgBaseUrl = routeCfg.baseURL;
				upsert(routeId, {
					name: routeCfg.displayName || routeId,
					...cfgBaseUrl ? { baseUrl: cfgBaseUrl } : {},
					custom: !(routeId in BUILTIN_PROVIDER_ENDPOINTS),
					settingsNs: "llm-pi-ai"
				});
			}
		}
	} catch {}
	if (extraProviders && typeof extraProviders === "object") {
		for (const [routeId, routeCfg] of Object.entries(extraProviders)) if (routeCfg && typeof routeCfg === "object") upsert(routeId, routeCfg);
	}
	return Array.from(byId.values());
}
// src/host/services/providerRouting.ts
function profileSettingsSignature(profile) {
	if (!profile) return "direct";
	return JSON.stringify({
		protocol: (profile.protocol || "http").toLowerCase(),
		host: (profile.host || "").toLowerCase(),
		port: Number(profile.port),
		authEnabled: Boolean(profile.auth?.enabled),
		username: profile.auth?.username ?? "",
		password: profile.auth?.password ?? "",
		cipher: profile.auth?.cipher ?? "",
		ignoreSslErrors: Boolean(profile.ignoreSslErrors)
	});
}
/**
* Компилирует таблицу маршрутизации хостов в профили прокси и выявляет конфликты доменов между провайдерами.
*/
function compileRoutingTable(providers, config) {
	const profilesById = /* @__PURE__ */ new Map();
	for (const profile of config?.profiles || []) if (profile && typeof profile.id === "string") profilesById.set(profile.id, profile);
	const bindings = { ...config?.providerBindings || {} };
	if (bindings.deepseek && !bindings["deepseek-official"]) bindings["deepseek-official"] = bindings.deepseek;
	const hostEntries = /* @__PURE__ */ new Map();
	const allProviders = [...providers || []];
	const seenIds = new Set(allProviders.map((p) => p.id));
	for (const rawBoundId of Object.keys(bindings)) {
		const boundProviderId = rawBoundId === "deepseek" ? "deepseek-official" : rawBoundId;
		if (!seenIds.has(boundProviderId) && bindings[rawBoundId]) {
			const hosts = resolveProviderHosts(boundProviderId);
			if (hosts.length > 0) {
				allProviders.push({
					id: boundProviderId,
					name: BUILTIN_PROVIDER_ENDPOINTS[boundProviderId]?.name || boundProviderId,
					hosts
				});
				seenIds.add(boundProviderId);
			}
		}
	}
	for (const provider of allProviders) {
		const rawProfileId = bindings[provider.id] ?? null;
		const validProfile = rawProfileId && profilesById.has(rawProfileId) ? profilesById.get(rawProfileId) ?? null : null;
		const effectiveProfileId = validProfile ? validProfile.id : null;
		const effectiveProfileName = validProfile ? validProfile.name : "Direct";
		const settingsSignature = profileSettingsSignature(validProfile);
		for (const rawHost of provider.hosts || []) {
			const host = rawHost.toLowerCase();
			const currentList = hostEntries.get(host) ?? [];
			currentList.push({
				providerId: provider.id,
				providerName: provider.name || provider.id,
				profileId: effectiveProfileId,
				profileName: effectiveProfileName,
				settingsSignature
			});
			hostEntries.set(host, currentList);
		}
	}
	const hostToProfile = /* @__PURE__ */ new Map();
	const routes = {};
	const conflicts = [];
	for (const [host, entries] of hostEntries.entries()) {
		const distinctSettings = new Set(entries.map((e) => e.settingsSignature));
		const firstActive = entries.find((e) => e.profileId !== null);
		if (firstActive?.profileId) {
			const profile = profilesById.get(firstActive.profileId);
			if (profile) {
				hostToProfile.set(host, profile);
				routes[host] = profile.id;
			}
		}
		if (entries.length > 1 && distinctSettings.size > 1 && firstActive?.profileId) conflicts.push({
			host,
			providers: entries.map(({ providerId, providerName, profileId, profileName }) => ({
				providerId,
				providerName,
				profileId,
				profileName
			})),
			appliedProfileId: firstActive.profileId,
			appliedProfileName: firstActive.profileName
		});
	}
	return {
		hostToProfile,
		routes,
		conflicts
	};
}
// src/host/services/storage.ts
/**
* Определяет путь к файлу хранения конфигурации прокси на диске.
*/
function resolveStoragePath(customStoragePath) {
	if (customStoragePath) return customStoragePath;
	const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
	return join(dshHome, "dsh-proxy-provider.json");
}
/**
* Загружает конфигурацию прокси с диска и автоматически перешифровывает открытые пароли при наличии.
*/
function loadConfigFromDisk(storagePath, fallbackConfig = {}, masterKey = null) {
	try {
		if (existsSync(storagePath)) {
			const rawText = readFileSync(storagePath, "utf8");
			const parsed = JSON.parse(rawText);
			const normalized = normalizeProxyConfig(parsed, masterKey);
			if (Array.isArray(parsed?.profiles) && parsed.profiles.some((profile) => profile?.auth?.username || profile?.auth?.password) && masterKey) saveConfigToDisk(storagePath, normalized, masterKey);
			return normalized;
		}
	} catch {}
	return normalizeProxyConfig(fallbackConfig, masterKey);
}
/**
* Сохраняет конфигурацию прокси на диск с шифрованием секретов мастер-ключом.
*/
function saveConfigToDisk(storagePath, config, masterKey) {
	try {
		mkdirSync(dirname(storagePath), { recursive: true });
		const diskPayload = masterKey ? serializeConfigForDisk(config, masterKey) : config;
		writeFileSync(storagePath, JSON.stringify(diskPayload, null, 2), "utf8");
	} catch {}
}
var fileProxyConfigStorage = {
	load: loadConfigFromDisk,
	save: saveConfigToDisk
};
// src/host/services/controller.ts
function extractTargetUrlString(input) {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.href;
	if (input && typeof input === "object" && typeof input.url === "string") return input.url;
	return null;
}
/**
* Создает контроллер проксирования провайдеров и устанавливает селективный перехватчик fetch.
*/
function createProviderProxyController(options = {}) {
	const { ctx = null, initialConfig = {}, storagePath = resolveStoragePath(options.storagePath), masterKeyPath = options.masterKeyPath, extraProviders = {}, fetchTarget = globalThis, configStorage = fileProxyConfigStorage, masterKeyProvider = fileMasterKeyProvider, dispatcherManager = new DispatcherManager() } = options;
	const masterKey = masterKeyProvider.getOrCreate(masterKeyPath);
	let currentConfig = configStorage.load(storagePath, initialConfig, masterKey);
	let cachedProviders = [];
	let compiled = compileRoutingTable([], currentConfig);
	const initialFetch = fetchTarget.fetch;
	let underlyingFetch = initialFetch;
	let interceptorInstalled = false;
	async function refreshRouting() {
		cachedProviders = await discoverProviders(ctx, extraProviders);
		compiled = compileRoutingTable(cachedProviders, currentConfig);
		await dispatcherManager.syncProfiles(currentConfig.profiles);
		return getStateSnapshot();
	}
	function getStateSnapshot() {
		return {
			config: sanitizeConfigForClient(currentConfig),
			providers: cachedProviders,
			conflicts: compiled.conflicts,
			routes: compiled.routes
		};
	}
	function mergeWithExistingSecrets(nextRawConfig) {
		if (!nextRawConfig || typeof nextRawConfig !== "object") return nextRawConfig;
		const existingById = new Map((currentConfig.profiles || []).map((profile) => [profile.id, profile]));
		const mergedProfiles = Array.isArray(nextRawConfig.profiles) ? nextRawConfig.profiles.map((incoming) => {
			if (!incoming || typeof incoming !== "object" || !incoming.id) return incoming;
			const previous = existingById.get(incoming.id);
			if (!previous) return incoming;
			const incomingUser = typeof incoming.auth?.username === "string" ? incoming.auth.username.trim() : "";
			const incomingPass = typeof incoming.auth?.password === "string" ? incoming.auth.password : "";
			if (Boolean(incoming.auth?.enabled) && !incomingUser && !incomingPass && incoming.auth?.clearCredentials !== true && (previous.auth?.username || previous.auth?.password)) return {
				...incoming,
				auth: {
					enabled: Boolean(incoming.auth?.enabled),
					username: previous.auth.username,
					password: previous.auth.password
				}
			};
			return incoming;
		}) : [];
		return {
			...nextRawConfig,
			profiles: mergedProfiles
		};
	}
	async function updateConfig(nextRawConfig) {
		currentConfig = normalizeProxyConfig(mergeWithExistingSecrets(nextRawConfig), masterKey);
		configStorage.save(storagePath, currentConfig, masterKey);
		return refreshRouting();
	}
	async function bindProvider(providerId, profileId) {
		const providerBindings = { ...currentConfig.providerBindings };
		if (profileId) providerBindings[providerId] = profileId;
		else {
			delete providerBindings[providerId];
			if (providerId === "deepseek-official") delete providerBindings.deepseek;
			if (providerId === "deepseek") delete providerBindings["deepseek-official"];
		}
		return updateConfig({
			...currentConfig,
			providerBindings
		});
	}
	function exportConfig$1(opts = {}) {
		return exportConfig(currentConfig, opts);
	}
	async function importConfig$1(rawInput, passwordArg = "") {
		return importConfig(rawInput, passwordArg, {
			currentConfig,
			updateConfig
		});
	}
	function resolveProfileWithSecrets(rawProfile) {
		return normalizeProfile(mergeWithExistingSecrets({ profiles: [rawProfile] }).profiles?.[0], masterKey);
	}
	function resolveProfileForUrl(rawUrl) {
		const urlString = extractTargetUrlString(rawUrl);
		if (!urlString) return null;
		try {
			const parsed = new URL(urlString);
			const host = parsed.host.toLowerCase();
			const hostname = parsed.hostname.toLowerCase();
			return compiled.hostToProfile.get(host) ?? compiled.hostToProfile.get(hostname) ?? null;
		} catch {
			return null;
		}
	}
	async function wrappedFetch(input, init) {
		if (init && typeof init === "object" && init.dispatcher) return underlyingFetch.call(fetchTarget, input, init);
		const profile = resolveProfileForUrl(input);
		if (!profile) return underlyingFetch.call(fetchTarget, input, init);
		return dispatchWithUndiciFetch(input, init, await dispatcherManager.getDispatcher(profile));
	}
	function installFetchInterceptor() {
		if (typeof initialFetch !== "function" || interceptorInstalled) return;
		interceptorInstalled = true;
		try {
			Object.defineProperty(fetchTarget, "fetch", {
				configurable: true,
				enumerable: true,
				get() {
					return wrappedFetch;
				},
				set(nextFn) {
					if (typeof nextFn === "function" && nextFn !== wrappedFetch) underlyingFetch = nextFn;
				}
			});
		} catch {
			fetchTarget.fetch = wrappedFetch;
		}
	}
	async function dispose() {
		if (interceptorInstalled) {
			interceptorInstalled = false;
			const installedFetch = wrappedFetch;
			if (fetchTarget.fetch === installedFetch) try {
				Object.defineProperty(fetchTarget, "fetch", {
					configurable: true,
					enumerable: true,
					writable: true,
					value: underlyingFetch
				});
			} catch {
				fetchTarget.fetch = underlyingFetch;
			}
		}
		await dispatcherManager.closeAll();
	}
	return {
		get config() {
			return sanitizeConfigForClient(currentConfig);
		},
		originalFetch: initialFetch,
		refreshRouting,
		getStateSnapshot,
		updateConfig,
		bindProvider,
		exportConfig: exportConfig$1,
		importConfig: importConfig$1,
		resolveProfileWithSecrets,
		resolveProfileForUrl,
		installFetchInterceptor,
		dispose,
		testConnection: (profile, testUrl) => {
			return testProxyConnection(resolveProfileWithSecrets(profile) || profile, testUrl || currentConfig.defaultTestUrl);
		}
	};
}
// src/host/index.ts
var name = "dsh-proxy-provider";
/**
* Точка входа серверного плагина Cordis для @kalex/dsh-proxy-provider.
*/
function apply(ctx, config = {}) {
	const controller = createProviderProxyController({
		ctx,
		initialConfig: config
	});
	controller.installFetchInterceptor();
	controller.refreshRouting().catch((error) => {
		ctx.logger?.warn?.(`[${name}] Initial routing refresh failed: ${error?.message || error}`);
	});
	if (typeof ctx.on === "function") {
		ctx.on("loader/volatile-update", () => {
			controller.refreshRouting().catch(() => {});
		});
		ctx.on("llm/adapters-updated", () => {
			controller.refreshRouting().catch(() => {});
		});
	}
	if (typeof ctx.effect === "function") ctx.effect(() => () => {
		controller.dispose().catch(() => {});
	});
	registerHttpRoutes(ctx, controller);
}
// ../dsh-core/src/hooks/useLocalePreference.ts
/**
* Вычисляет итоговый язык интерфейса ('en' или 'ru') на основе явного выбора и языка оболочки DSH.
*/
function resolveDshLocale(choice, hostLocale) {
	if (choice === "ru" || choice === "en") return choice;
	return String(hostLocale || (typeof document !== "undefined" ? document.documentElement?.lang : "") || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}
/**
* Читает сохраненный пользователем язык из хранилища по ключу плагина.
*/
function readSavedLocale(storageKey, storage) {
	try {
		const saved = (storage ?? (typeof localStorage !== "undefined" ? localStorage : void 0))?.getItem(storageKey);
		return saved === "ru" || saved === "en" ? saved : void 0;
	} catch {
		return;
	}
}
/**
* Сохраняет выбранный пользователем язык в хранилище по ключу плагина.
*/
function persistLocale(storageKey, locale, storage) {
	if (locale !== "ru" && locale !== "en") return;
	try {
		(storage ?? (typeof localStorage !== "undefined" ? localStorage : void 0))?.setItem(storageKey, locale);
	} catch {}
}
// src/shared/constants/localizations/ProxyLocalization.ts
var ProxyRussianDictionary = {
	Direct: "Напрямую",
	"Direct (No proxy)": "Напрямую (без прокси)",
	"Direct connection (bypasses proxy)": "Прямое подключение без прокси",
	"Proxy settings": "Настройки прокси",
	"Proxy profile for ": "Профиль прокси для ",
	"Proxy: ": "Прокси: ",
	Close: "Закрыть",
	"1. Proxy Profiles": "1. Профили прокси",
	"+ Add Profile": "+ Добавить профиль",
	"No proxy profiles created yet. Click \"+ Add Profile\" to configure HTTP, HTTPS, or SOCKS5 proxy.": "Профили прокси пока не созданы. Нажмите \"+ Добавить профиль\", чтобы настроить прокси HTTP, HTTPS или SOCKS5.",
	Edit: "Изменить",
	Delete: "Удалить",
	Cancel: "Отмена",
	"Confirm Delete & Reset to Direct": "Удалить и сбросить на прямое подключение",
	"Create Proxy Profile": "Создать профиль прокси",
	"Profile Name": "Название профиля",
	"e.g. Corporate Proxy": "Например, корпоративный прокси",
	Protocol: "Протокол",
	"Port (1–65535)": "Порт (1–65535)",
	"Host (IP or domain, scheme stripped automatically)": "Узел (IP-адрес или домен, схема удаляется автоматически)",
	"proxy.corp.local or 127.0.0.1": "proxy.corp.local или 127.0.0.1",
	"Requires authentication (Basic / SOCKS5 Username & Password)": "Требуется аутентификация (имя пользователя и пароль Basic или SOCKS5)",
	"Ignore SSL / TLS certificate errors (rejectUnauthorized: false)": "Игнорировать ошибки сертификата SSL / TLS (rejectUnauthorized: false)",
	"Test Connection (5000ms TCP + HTTP check)": "Проверить подключение (проверка TCP и HTTP, 5000 мс)",
	"Testing...": "Проверка...",
	Test: "Проверить",
	"Saving...": "Сохранение...",
	"Save Profile": "Сохранить профиль",
	"Include credentials": "Включить учетные данные",
	Export: "Экспорт",
	Import: "Импорт",
	"Encrypt Credentials for Portable Export": "Зашифровать учетные данные для переноса",
	"Enter a password to encrypt login & password (AES-256-GCM) so they can be imported on another computer:": "Введите пароль для шифрования имени пользователя и пароля (AES-256-GCM), чтобы импортировать их на другом компьютере:",
	"Enter encryption password...": "Введите пароль шифрования...",
	"Download Export": "Скачать экспорт",
	"Encrypted Credentials Detected in Import File": "В файле импорта найдены зашифрованные учетные данные",
	"Enter the password used when exporting this file to decrypt and restore login & password:": "Введите пароль, указанный при экспорте файла, чтобы расшифровать и восстановить учетные данные:",
	"Enter decryption password...": "Введите пароль расшифровки...",
	"Decrypt & Import": "Расшифровать и импортировать",
	"Import Without Credentials": "Импортировать без учетных данных",
	"Search provider by name or host...": "Поиск провайдера по имени или узлу...",
	"Search provider by name or host": "Поиск провайдера по имени или узлу",
	"Clear search": "Очистить поиск",
	"Domain / Host Routing Conflict Detected": "Обнаружен конфликт маршрутизации домена или узла",
	Custom: "Пользовательский",
	"Interface language": "Язык интерфейса",
	English: "Английский",
	Russian: "Русский",
	Save: "Сохранить",
	Reset: "Сбросить",
	Error: "Ошибка",
	Username: "Имя пользователя",
	"Leave blank to keep saved username": "Оставьте поле пустым, чтобы сохранить имя пользователя",
	"Enter username": "Введите имя пользователя",
	Password: "Пароль",
	"Password (saved encrypted)": "Пароль (сохранен в зашифрованном виде)",
	"Leave blank to keep saved password": "Оставьте поле пустым, чтобы сохранить пароль",
	"Enter password": "Введите пароль",
	Hide: "Скрыть",
	Show: "Показать",
	"Edit Profile: ": "Изменить профиль: ",
	"Profile Name is required.": "Укажите название профиля.",
	"Valid proxy Host (IP or domain without scheme) is required.": "Укажите корректный узел прокси (IP-адрес или домен без схемы).",
	"Port must be an integer between 1 and 65535.": "Порт должен быть целым числом от 1 до 65535.",
	"Failed to save profile": "Не удалось сохранить профиль",
	"Failed to delete profile": "Не удалось удалить профиль",
	"Please enter a valid Host and Port (1–65535) before testing.": "Перед проверкой укажите корректный узел и порт (1–65535).",
	"Connection test request failed": "Не удалось выполнить проверку подключения",
	"When checked, Export will ask for a password and include encrypted login & password for portable transfer to another computer": "Если включено, при экспорте будет запрошен пароль, а учетные данные будут зашифрованы для переноса на другой компьютер",
	"Export proxy settings and password-encrypted credentials": "Экспортировать настройки прокси и зашифрованные учетные данные",
	"Export proxy settings without credentials": "Экспортировать настройки прокси без учетных данных",
	"Import proxy profiles and routing from JSON file": "Импортировать профили прокси и маршрутизацию из файла JSON",
	"Please enter a password to encrypt credentials.": "Введите пароль для шифрования учетных данных.",
	"Please enter the password to decrypt imported credentials.": "Введите пароль для расшифровки импортированных учетных данных.",
	"Failed to export settings": "Не удалось экспортировать настройки",
	"Failed to export encrypted settings": "Не удалось экспортировать зашифрованные настройки",
	"Invalid JSON file for proxy settings import": "Некорректный JSON-файл настроек прокси",
	"Failed to decrypt and import proxy settings": "Не удалось расшифровать и импортировать настройки прокси",
	"Failed to load proxy settings": "Не удалось загрузить настройки прокси",
	"Failed to update proxy binding": "Не удалось обновить привязку прокси",
	"2. Provider Routing (": "2. Маршрутизация провайдеров (",
	"Host ": "Узел ",
	"Failed to save proxy configuration": "Не удалось сохранить настройки прокси",
	"Failed to bind provider proxy": "Не удалось назначить прокси провайдеру",
	"Failed to export proxy configuration": "Не удалось экспортировать настройки прокси",
	"Failed to import proxy configuration": "Не удалось импортировать настройки прокси",
	"Valid proxy host and port (1-65535) are required": "Укажите корректный узел прокси и порт (1-65535)",
	"Proxy host and port are required": "Требуются узел прокси и порт",
	"Proxy Authentication Required (407): check username and password": "Требуется аутентификация прокси (407): проверьте имя пользователя и пароль",
	"Invalid encrypted credential format in import file": "Некорректный формат зашифрованных учетных данных в файле импорта",
	"Invalid password for encrypted credentials": "Неверный пароль для зашифрованных учетных данных",
	"Encryption password is required when exporting credentials": "Для экспорта учетных данных требуется пароль шифрования",
	"Invalid import file: expected a JSON object": "Некорректный файл импорта: ожидался объект JSON",
	"Invalid import file: \"profiles\" array is required": "Некорректный файл импорта: требуется массив \"profiles\"",
	"PASSWORD_REQUIRED: This export file contains encrypted credentials. Please enter the decryption password.": "Для этого файла экспорта требуется пароль расшифровки учетных данных.",
	"Forbidden: access restricted to DSH Web GUI": "Доступ запрещен: доступ разрешен только из веб-интерфейса DSH",
	"providerId is required": "Требуется идентификатор провайдера"
};
/**
* Вычисляет активный язык интерфейса прокси ('en' или 'ru') с учетом выбора пользователя и языка DSH.
*/
function resolveProxyLocale(choice, hostLocale) {
	return resolveDshLocale(choice === "ru" || choice === "en" || choice === "auto" ? choice : void 0, hostLocale);
}
/**
* Читает сохраненный выбор языка прокси из хранилища.
*/
function readSavedProxyLocale(storage) {
	return readSavedLocale(PROXY_LOCALE_KEY, storage);
}
/**
* Сохраняет выбранный пользователем язык прокси в хранилище.
*/
function persistProxyLocale(storage, locale) {
	if (locale === "ru" || locale === "en") persistLocale(PROXY_LOCALE_KEY, locale, storage);
}
/**
* Переводит статические и шаблонные строки интерфейса прокси на выбранный язык.
*/
function translateProxyText(value, locale = "en") {
	if (locale !== "ru" || typeof value !== "string") return value;
	const directMatch = ProxyRussianDictionary[value];
	if (directMatch !== void 0) return directMatch;
	const count = /^(\d+) profile\(s\) • (\d+) proxied provider\(s\)$/.exec(value);
	if (count) return `Профилей: ${count[1]} • провайдеров через прокси: ${count[2]}`;
	const conflicts = /^⚠ (\d+) host conflict\(s\)$/.exec(value);
	if (conflicts) return `⚠ Конфликтов узлов: ${conflicts[1]}`;
	const profile = /^Edit Profile: (.+)$/.exec(value);
	if (profile) return `Изменить профиль: ${profile[1]}`;
	const username = /^Username \(saved: (.+)\)$/.exec(value);
	if (username) return `Имя пользователя (сохранено: ${username[1]})`;
	const routing = /^2\. Provider Routing \((\d+)\/(\d+)\)$/.exec(value);
	if (routing) return `2. Маршрутизация провайдеров (${routing[1]}/${routing[2]})`;
	const profileProxy = /^Proxy: (.+) \((.+)\)$/.exec(value);
	if (profileProxy) return `Прокси: ${profileProxy[1]} (${profileProxy[2]})`;
	const provider = /^(Proxy profile for |Route for )(.+)$/.exec(value);
	if (provider) return `${provider[1] === "Route for " ? "Маршрут для " : "Профиль прокси для "}${provider[2]}`;
	const hostConflict = /^Host (.+) is shared by multiple providers with different proxy settings\. Active proxy "(.+)" is applied to the entire host\.$/.exec(value);
	if (hostConflict) return `Узел ${hostConflict[1]} используется несколькими провайдерами с разными настройками прокси. Прокси "${hostConflict[2]}" применяется ко всему узлу.`;
	const noProviders = /^No providers matching "(.+)"\.$/.exec(value);
	if (noProviders) return `Нет провайдеров по запросу "${noProviders[1]}".`;
	const assigned = /^Profile "(.+)" is currently assigned to: (.+)\. Deleting it will reset those providers to Direct \(No proxy\)\.$/.exec(value);
	if (assigned) return `Профиль "${assigned[1]}" назначен для: ${assigned[2]}. После удаления эти провайдеры будут переключены на прямое подключение.`;
	const imported = /^Imported (\d+) profile\(s\) (.+)\.$/.exec(value);
	if (imported) {
		const detail = imported[2] === "successfully" ? "успешно" : imported[2] === "without credentials" ? "без учетных данных" : "с расшифрованными учетными данными";
		return `Импортировано профилей: ${imported[1]}, ${detail}.`;
	}
	const exported = /^(.+) exported to dsh-proxy-provider-settings\.json$/.exec(value);
	if (exported) return `Экспортированы ${exported[1] === "Settings and password-encrypted credentials" ? "настройки и зашифрованные учетные данные" : "настройки прокси без учетных данных"} (dsh-proxy-provider-settings.json)`;
	const conflictTitle = /^⚠ Host conflict \((.+) → (.+)\)$/.exec(value);
	if (conflictTitle) return `⚠ Конфликт узла (${conflictTitle[1]}, применяется прокси ${conflictTitle[2]})`;
	const conflictDetails = /^Host "(.+)" is shared by \[(.+)\]\. Active proxy "(.+)" is applied to all requests to (.+)\.$/.exec(value);
	if (conflictDetails) return `Узел "${conflictDetails[1]}" используется несколькими провайдерами: ${conflictDetails[2]}. Прокси "${conflictDetails[3]}" применяется ко всем запросам к ${conflictDetails[4]}.`;
	const testSuccess = /^✓ Proxy reachable! TCP OK \((\d+)ms\) • Target HTTP (.+) \((\d+)ms\)$/.exec(value);
	if (testSuccess) return `✓ Прокси доступен. TCP: ${testSuccess[1]} мс. HTTP-ответ: ${testSuccess[2]} (${testSuccess[3]} мс).`;
	const testFailure = /^✕ (.+) \(TCP connected in (\d+)ms, HTTP stage failed\)$/.exec(value);
	if (testFailure) return `✕ ${testFailure[1]} (TCP подключен за ${testFailure[2]} мс, этап HTTP завершился ошибкой)`;
	const tcpFailure = /^TCP connection to proxy (.+):(\d+) failed \(timeout 5000ms or connection refused\)$/.exec(value);
	if (tcpFailure) return `Не удалось подключиться к прокси ${tcpFailure[1]}:${tcpFailure[2]} (тайм-аут 5000 мс или соединение отклонено)`;
	const sslFailure = /^SSL\/TLS certificate error \((.+)\)\. Enable "Ignore SSL \/ TLS certificate errors" if your proxy uses a corporate root CA\.$/.exec(value);
	if (sslFailure) return `Ошибка сертификата SSL/TLS (${sslFailure[1]}). Если прокси использует корпоративный корневой сертификат, включите игнорирование ошибок сертификатов.`;
	const httpFailure = /^HTTP request through proxy failed: (.+)$/.exec(value);
	if (httpFailure) return `Ошибка HTTP-запроса через прокси: ${httpFailure[1]}`;
	const unknownEndpoint = /^Unknown endpoint "(.+)"$/.exec(value);
	if (unknownEndpoint) return `Неизвестный адрес запроса: "${unknownEndpoint[1]}"`;
	const wrappedFailure = /^✕ (.+)$/.exec(value);
	if (wrappedFailure?.[1]) return `✕ ${translateProxyText(wrappedFailure[1], "ru")}`;
	return value;
}
// src/shared/constants/testId.ts
/**
* Тестовые идентификаторы компонентов плагина проксирования.
*/
var ProxyTestId = {
	providerCard: (providerId) => `proxy-card-${providerId}`,
	FooterBar: "proxy-footer-bar",
	SettingsModal: "proxy-settings-modal",
	LocaleSettings: "proxy-locale-settings"
};
export { API_BASE, BUILTIN_PROVIDER_ENDPOINTS, DEFAULT_TEST_URL, DispatcherManager, KNOWN_SETTINGS_NS, PROXY_LOCALE_KEY, ProxyRussianDictionary, ProxyTestId, apply, checkTcpReachability, compileRoutingTable, createEmptyDraft, createProfileDispatcher, createProviderProxyController, decryptAuthSecret, decryptWithPassphrase, discoverProviders, dispatchWithUndiciFetch, draftFromProfile, encryptAuthSecret, encryptWithPassphrase, establishSocks5Tunnel, extractHost, maskUsername, name, normalizeProfile, normalizeProxyConfig, persistProxyLocale, profileFromDraft, readSavedProxyLocale, resolveProviderHosts, resolveProxyLocale, sanitizeConfigForClient, sanitizeHostInput, testProxyConnection, translateProxyText };
