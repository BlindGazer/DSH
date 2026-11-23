import { Service } from "@deepseek-ai/cordis";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import z from "@deepseek-ai/schemastery";
import { homedir, tmpdir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { execFile, spawn } from "node:child_process";
import { appendFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rmdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
// ../dsh-logger-core/src/types.ts
var NOOP_LOGGER = Object.freeze({ record: () => void 0 });
// ../dsh-logger-core/src/factory.ts
/** Ожидаем реальный сервис, а имя пакета передаём явно: имя fiber не является идентификатором пакета. */
function createOptionalLogger(context, packageName) {
	let target = NOOP_LOGGER;
	context.inject?.(["dshLoggerService"], (scope) => {
		target = scope.dshLoggerService?.getLogger({ packageName }, "host") ?? NOOP_LOGGER;
		scope.effect(() => () => {
			target = NOOP_LOGGER;
		}, "optional dsh-logger binding");
	});
	return { record: (record) => target.record(record) };
}
// src/host/config.ts
var StaticDirectoryConfigSchema = z.object({
	path: z.string().required().description("Path to the target directory"),
	alias: z.string().description("Unique alias or label for this directory"),
	description: z.string().description("Purpose of this directory"),
	readOnly: z.boolean().default(false).description("Whether this directory is read-only")
});
var Config = z.object({
	defaultDirectories: z.array(StaticDirectoryConfigSchema).default([]).description("Static directories to link on startup"),
	enableTools: z.boolean().default(true).description("Enable agent tools (list, add, remove directories)"),
	enableContextInjection: z.boolean().default(true).description("Enable prompt context injection of active workspace directories"),
	enforceReadOnly: z.boolean().default(true).description("Enforce write protections for read-only directories"),
	vscodeEnabled: z.boolean().default(true).description("Enable opening workspaces in VS Code")
});
function resolveConfig(config = {}) {
	return {
		defaultDirectories: config.defaultDirectories ?? [],
		enableTools: config.enableTools ?? true,
		enableContextInjection: config.enableContextInjection ?? true,
		enforceReadOnly: config.enforceReadOnly ?? true,
		vscodeEnabled: config.vscodeEnabled ?? true
	};
}
// src/host/services/pathUtils.ts
/** Приводит существующий путь и ближайший существующий родитель к каноническому виду. */
function canonicalizePath(rawPath) {
	const absolutePath = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
	try {
		return realpathSync.native(absolutePath);
	} catch {
		let currentPath = absolutePath;
		const trailingParts = [];
		while (true) {
			const parentPath = dirname(currentPath);
			if (parentPath === currentPath) return absolutePath;
			trailingParts.unshift(basename(currentPath));
			currentPath = parentPath;
			try {
				return join(realpathSync.native(currentPath), ...trailingParts);
			} catch {}
		}
	}
}
function isSubPath(target, root) {
	return isWithinCanonicalPath(canonicalizePath(target), canonicalizePath(root));
}
function isWithinCanonicalPath(target, root) {
	const relativePath = relative(root, target);
	return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}
function expandHome(value) {
	if (value === "~") return homedir();
	if (value.startsWith("~/")) return join(homedir(), value.slice(2));
	return value;
}
function getHarnessProfilesPath() {
	const configuredHome = process.env.DSH_HOME?.trim();
	const homePath = configuredHome === void 0 || configuredHome === "" ? join(homedir(), ".dsh") : expandHome(configuredHome);
	return join(homePath, "profiles");
}
function isHarnessProfilePath(target) {
	return isSubPath(target, getHarnessProfilesPath());
}
// src/host/api/httpRoutes.ts
/**
* HTTP / REST API routes for Addir directory management.
* Consumed by the workspace editor and profile-wide settings.
*
* @module dsh-workspace-manager/api
*/
function writeJson(res, status, body) {
	const json = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(json),
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization"
	});
	res.end(json);
}
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		req.on("end", () => {
			try {
				const raw = Buffer.concat(chunks).toString("utf-8");
				if (!raw.trim()) {
					resolve({});
					return;
				}
				resolve(JSON.parse(raw));
			} catch (err) {
				reject(err);
			}
		});
		req.on("error", reject);
	});
}
function registerAddirRoutes(ctx, service, config = resolveConfig(), onVscodeChanged, logger = NOOP_LOGGER) {
	const configEntry = ctx.fiber.entry;
	let vscodeEnabled = config.vscodeEnabled;
	return ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: "prefix",
			path: "/api/dsh-workspace-manager",
			handler: async (req, res) => {
				if (req.method === "OPTIONS") {
					res.writeHead(204, {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization"
					});
					res.end();
					return;
				}
				const url = new URL(req.url ?? "/", "http://dsh.internal");
				const action = url.pathname.replace(/^\/api\/dsh-workspace-manager\/?/, "");
				try {
					if (action === "config") {
						if (req.method === "GET") {
							writeJson(res, 200, {
								ok: true,
								config: {
									...config,
									vscodeEnabled
								}
							});
							return;
						}
						if (req.method !== "POST") {
							writeJson(res, 405, {
								ok: false,
								error: "Method not allowed"
							});
							return;
						}
						const body = await readJsonBody(req);
						const updates = body && [
							"enableTools",
							"enableContextInjection",
							"enforceReadOnly",
							"vscodeEnabled"
						].filter((key) => Object.hasOwn(body, key));
						if (!updates || updates.length === 0 || updates.some((key) => typeof body[key] !== "boolean")) {
							writeJson(res, 400, {
								ok: false,
								error: "Configuration switches must be booleans"
							});
							return;
						}
						const editor = ctx.get("configEditor");
						if (!editor || !configEntry) {
							logger.record({
								event: "workspace-config-save-failed",
								level: "error",
								operation: "config",
								data: { code: "editorUnavailable" }
							});
							writeJson(res, 409, {
								ok: false,
								error: "Profile configuration editor is unavailable"
							});
							return;
						}
						try {
							await editor.edit(configEntry, (current) => ({
								...current,
								...Object.fromEntries(updates.map((key) => [key, body[key]]))
							}));
						} catch {
							logger.record({
								event: "workspace-config-save-failed",
								level: "error",
								operation: "config",
								data: { code: "editRejected" }
							});
							writeJson(res, 500, {
								ok: false,
								error: "Profile configuration could not be saved"
							});
							return;
						}
						if (body.vscodeEnabled !== void 0) {
							vscodeEnabled = body.vscodeEnabled;
							onVscodeChanged?.(vscodeEnabled);
						}
						writeJson(res, 200, { ok: true });
						return;
					}
					if (action === "replace") {
						if (req.method !== "POST") {
							writeJson(res, 405, {
								ok: false,
								error: "Method not allowed"
							});
							return;
						}
						const body = await readJsonBody(req);
						if (!body || typeof body.workspacePath !== "string" || !Array.isArray(body.directories)) {
							writeJson(res, 400, {
								ok: false,
								error: "Workspace path and directories are required"
							});
							return;
						}
						const directories = [];
						for (const item of body.directories) {
							if (!item || typeof item !== "object" || typeof item.path !== "string" || item.alias !== void 0 && typeof item.alias !== "string" || item.description !== void 0 && typeof item.description !== "string" || typeof item.readOnly !== "boolean") {
								writeJson(res, 400, {
									ok: false,
									error: "Invalid directory fields"
								});
								return;
							}
							directories.push({
								path: item.path,
								alias: item.alias,
								description: item.description,
								readOnly: item.readOnly
							});
						}
						try {
							writeJson(res, 200, {
								ok: true,
								directories: service.replaceWorkspaceDirectories(body.workspacePath, directories)
							});
						} catch (error) {
							writeJson(res, 400, {
								ok: false,
								error: error instanceof Error ? error.message : String(error)
							});
						}
						return;
					}
					if (action === "list") {
						let workspacePath = url.searchParams.get("workspacePath");
						let sessionId = url.searchParams.get("sessionId") ?? void 0;
						if (req.method === "POST") {
							const body = await readJsonBody(req);
							if (body.workspacePath) workspacePath = body.workspacePath;
							if (body.sessionId) sessionId = body.sessionId;
						}
						if (workspacePath) {
							const dirs = service.getDirectoriesForWorkspace(workspacePath);
							writeJson(res, 200, {
								ok: true,
								workspacePath: canonicalizePath(workspacePath),
								directories: dirs
							});
							return;
						}
						writeJson(res, 200, {
							ok: true,
							directories: service.list(sessionId)
						});
						return;
					}
					if (action === "add") {
						if (req.method !== "POST") {
							writeJson(res, 405, {
								ok: false,
								error: "Method not allowed"
							});
							return;
						}
						const body = await readJsonBody(req);
						if (!body.path) {
							writeJson(res, 400, {
								ok: false,
								error: "Path is required"
							});
							return;
						}
						const options = {
							path: body.path,
							alias: body.alias,
							readOnly: body.readOnly,
							description: body.description
						};
						writeJson(res, 200, {
							ok: true,
							entry: body.workspacePath ? await service.addDirectoryToWorkspace(body.workspacePath, options) : await service.add(options, body.sessionId)
						});
						return;
					}
					if (action === "remove") {
						if (req.method !== "POST") {
							writeJson(res, 405, {
								ok: false,
								error: "Method not allowed"
							});
							return;
						}
						const body = await readJsonBody(req);
						if (!body.pathOrAlias) {
							writeJson(res, 400, {
								ok: false,
								error: "pathOrAlias is required"
							});
							return;
						}
						let success;
						if (body.workspacePath) success = await service.removeDirectoryFromWorkspace(body.workspacePath, body.pathOrAlias);
						else success = await service.remove(body.pathOrAlias, body.sessionId);
						writeJson(res, 200, {
							ok: true,
							removed: success
						});
						return;
					}
					if (action === "validate") {
						const body = await readJsonBody(req);
						if (!body.path) {
							writeJson(res, 400, {
								ok: false,
								error: "Path is required"
							});
							return;
						}
						const exists = existsSync(body.path);
						writeJson(res, 200, {
							ok: true,
							exists,
							isDirectory: exists && statSync(body.path).isDirectory(),
							canonicalPath: exists ? canonicalizePath(body.path) : void 0
						});
						return;
					}
					writeJson(res, 404, {
						ok: false,
						error: `Unknown endpoint "${action}"`
					});
				} catch (err) {
					logger.record({
						event: "workspace-api-failed",
						level: "error"
					});
					writeJson(res, 500, {
						ok: false,
						error: err instanceof Error ? err.message : String(err)
					});
				}
			}
		}));
	});
}
// src/host/services/VscodeService.ts
var import_ignore = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function makeArray(subject) {
		return Array.isArray(subject) ? subject : [subject];
	}
	var UNDEFINED = void 0;
	var EMPTY = "";
	var SPACE = " ";
	var ESCAPE = "\\";
	var REGEX_LITERAL_SPECIAL = /[.*+?()[\]{}^$|\\/]/;
	var BOM = "﻿";
	var REGEX_ANCHORED_GLOBSTAR = /^\/\*{2,}$/;
	var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
	var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
	var REGEX_SPLITALL_CRLF = /\r?\n/g;
	var DOUBLE_SLASH = "//";
	var SLASH_CODE = 47;
	var DOT_CODE = 46;
	var SLASH = "/";
	var TMP_KEY_IGNORE = "node-ignore";
	/* istanbul ignore else */
	if (typeof Symbol !== "undefined") TMP_KEY_IGNORE = Symbol.for("node-ignore");
	var KEY_IGNORE = TMP_KEY_IGNORE;
	var define = (object, key, value) => {
		Object.defineProperty(object, key, { value });
		return value;
	};
	var RETURN_FALSE = () => false;
	var POSIX_CLASSES = {
		alnum: "0-9A-Za-z",
		alpha: "A-Za-z",
		blank: " \\t",
		cntrl: "\\x00-\\x1f\\x7f",
		digit: "0-9",
		graph: "!-.0-~",
		lower: "a-z",
		print: " -.0-~",
		punct: "!-.:-@\\[-`{-~",
		space: " \\t\\n\\r",
		upper: "A-Z",
		xdigit: "0-9A-Fa-f"
	};
	var CLASS_MEMBERS_TO_ESCAPE = "\\]^-[";
	var escapeMember = (char) => CLASS_MEMBERS_TO_ESCAPE.indexOf(char) < 0 ? char : ESCAPE + char;
	var NON_SLASH = "(?!\\/)";
	var classSource = (negated, body) => {
		if (negated) return `[^\\/${body}]`;
		const source = `[${body}]`;
		return new RegExp(source).test("/") ? NON_SLASH + source : source;
	};
	var scanBracket = (pattern, start) => {
		const { length } = pattern;
		let index = start + 1;
		let negated = EMPTY;
		const lead = pattern[index];
		if (lead === "!" || lead === "^") {
			negated = "^";
			index++;
		}
		let body = EMPTY;
		let prev = EMPTY;
		for (;;) {
			const char = pattern[index];
			if (char === UNDEFINED) return null;
			if (char === ESCAPE) {
				const escaped = pattern[++index];
				body += escapeMember(escaped);
				prev = escaped;
			} else if (char === "-" && prev && index + 1 < length && pattern[index + 1] !== "]") {
				index++;
				let to = pattern[index];
				if (to === ESCAPE) to = pattern[index += 1];
				if (prev <= to) body += `-${escapeMember(to)}`;
				prev = EMPTY;
			} else if (char === "[" && pattern[index + 1] === ":") {
				const nameStart = index + 2;
				let end = nameStart;
				while (end < length && pattern[end] !== "]") end++;
				if (end === length) return null;
				if (end > nameStart && pattern[end - 1] === ":") {
					const name = pattern.slice(nameStart, end - 1);
					if (!Object.prototype.hasOwnProperty.call(POSIX_CLASSES, name)) return null;
					body += POSIX_CLASSES[name];
					prev = EMPTY;
					index = end;
				} else {
					body += escapeMember("[");
					prev = "[";
					index = nameStart - 2;
				}
			} else {
				body += escapeMember(char);
				prev = char;
			}
			index++;
			if (pattern[index] === "]") return {
				end: index,
				source: classSource(negated, body)
			};
		}
	};
	var NEVER_MATCH = "[]";
	var PLACEHOLDER = "\0";
	var REGEX_RESTORE_PLACEHOLDER = new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g");
	var TRAILING_WILDCARD = "";
	var TRAILING_DOUBLESTAR = "";
	var isReserved = (char) => char === PLACEHOLDER || char === TRAILING_WILDCARD || char === TRAILING_DOUBLESTAR;
	var extractBrackets = (pattern) => {
		const sources = [];
		const hold = (source) => `${PLACEHOLDER}${sources.push(source) - 1}${PLACEHOLDER}`;
		const { length } = pattern;
		let out = EMPTY;
		let index = 0;
		while (index < length) {
			const char = pattern[index];
			if (char === ESCAPE) {
				const escaped = pattern[index + 1];
				if (escaped === SLASH && index + 2 === length) out += hold(NEVER_MATCH);
				else if (escaped === "*" || escaped === "[" || escaped === SPACE) out += pattern.slice(index, index + 2);
				else out += hold(REGEX_LITERAL_SPECIAL.test(escaped) ? ESCAPE + escaped : isReserved(escaped) ? `[${escaped}]` : escaped);
				index += 2;
			} else if (isReserved(char)) {
				out += hold(`[${char}]`);
				index++;
			} else if (char === "[") {
				const scanned = scanBracket(pattern, index);
				if (scanned === null) {
					out += hold(NEVER_MATCH);
					index = length;
				} else {
					out += hold(scanned.source);
					index = scanned.end + 1;
				}
			} else {
				out += char;
				index++;
			}
		}
		return {
			source: out,
			sources
		};
	};
	var DIRECT = null;
	var REGEX_INNER_SLASH = /\/(?!$)/;
	var WILDCARD = "[^\\/]*";
	var REPLACERS = [
		[
			/(\\+)( ?)/g,
			(_, run, space) => space ? run.slice(0, run.length - run.length % 2) + SPACE : run,
			"\\ "
		],
		[
			/(^|\/)\*{3,}(?=\/|$)/g,
			(_, start) => `${start}**`,
			"*"
		],
		[/[\\$.|*+(){^]/g, (match) => `\\${match}`],
		[
			/(?!\\)\?/g,
			() => "[^/]",
			"?"
		],
		[
			/^\//,
			() => "^",
			SLASH
		],
		[
			/\//g,
			() => "\\/",
			SLASH
		],
		[
			/^\^*(?:\\\*\\\*\\\/)+/,
			() => "(?:^|\\/)",
			"*"
		],
		[DIRECT, (source, pattern) => {
			if (!source || source[0] === "^" || source[0] === "(") return source;
			return (!REGEX_INNER_SLASH.test(pattern) ? "(?:^|\\/)" : "^") + source;
		}],
		[
			/\\\/\\\*\\\*(?=\\\/|$)/g,
			(_, index, str) => index + 6 < str.length ? str.slice(index + 6) === "\\/" ? "(?:\\/[^\\/]+)+" : "(?:\\/[^\\/]+)*" : `\\/${TRAILING_DOUBLESTAR}`,
			"*"
		],
		[
			/(^|[^\\])(?:\\\*)+(?!$)/g,
			(_, p1) => p1 + WILDCARD,
			"*"
		],
		[
			/(^|[^\\])((?:\\\\)*)\\\*$/,
			(match, p1, p2) => p2 === EMPTY ? p1 + TRAILING_WILDCARD : match,
			"*"
		],
		[
			/\\\\\\(?=[$.|*+(){^])/g,
			() => ESCAPE,
			"\\\\"
		],
		[
			/\\\\/g,
			() => ESCAPE,
			"\\\\"
		],
		[
			/\\\[([^\]/]*?)($|\])/g,
			(match, range, close) => `\\[${range}${close}`,
			"["
		],
		[DIRECT, (source) => {
			const last = source[source.length - 1];
			if (!last || last === TRAILING_WILDCARD || last === TRAILING_DOUBLESTAR) return source;
			return last === SLASH ? `${source}$` : `${source}(?=$|\\/$)`;
		}]
	];
	var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\uE000$/;
	var MODE_IGNORE = "regex";
	var MODE_CHECK_IGNORE = "checkRegex";
	var replaceTrailingWildcard = (_, p1) => {
		return `${p1 ? `${p1}[^/]+` : "[^/]*"}(?=$|\\/$)`;
	};
	var REGEX_REPLACE_TRAILING_DOUBLESTAR = /\uE001$/;
	var replaceTrailingDoublestar = () => "[\\s\\S]";
	var separatorAfter = (run, at) => {
		let separator = EMPTY;
		for (let index = at + 1; index < run.length && !run[index].wildcard; index++) separator += run[index].single;
		return separator;
	};
	var pinWildcards = (source) => {
		if (source.indexOf(WILDCARD) < 0) return source;
		const tokens = [];
		const { length } = source;
		let index = 0;
		while (index < length) {
			const char = source[index];
			if (source.startsWith(WILDCARD, index)) {
				tokens.push({ wildcard: true });
				index += 6;
			} else if (char === "[") {
				let end = index + 1;
				if (source[end] === "^") end++;
				if (source[end] === "]") end++;
				while (end < length && source[end] !== "]") end += source[end] === ESCAPE ? 2 : 1;
				end++;
				tokens.push({ single: source.slice(index, end) });
				index = end;
			} else if (char === ESCAPE) {
				tokens.push({ single: source.slice(index, index + 2) });
				index += 2;
			} else if (char === "(") {
				let depth = 0;
				let end = index;
				do {
					if (source[end] === ESCAPE) end++;
					else if (source[end] === "(") depth++;
					else if (source[end] === ")") depth--;
					end++;
				} while (end < length && depth > 0);
				if ("*+?".indexOf(source[end]) >= 0) end++;
				tokens.push({ boundary: source.slice(index, end) });
				index = end;
			} else if (char === "^" || char === "$") {
				tokens.push({ boundary: char });
				index++;
			} else {
				tokens.push({ single: char });
				index++;
			}
		}
		let out = EMPTY;
		let run = [];
		const flush = () => {
			let lastWildcard;
			run.forEach((token, at) => {
				if (token.wildcard) lastWildcard = at;
			});
			run.forEach((token, at) => {
				if (!token.wildcard) {
					out += token.single;
					return;
				}
				out += at === lastWildcard ? WILDCARD : `(?:(?!${separatorAfter(run, at)})[^\\/])*`;
			});
			run = [];
		};
		tokens.forEach((token) => {
			if (token.boundary === void 0) {
				run.push(token);
				return;
			}
			flush();
			out += token.boundary;
		});
		flush();
		return out;
	};
	var makeRegexPrefix = (pattern) => {
		if (REGEX_ANCHORED_GLOBSTAR.test(pattern)) pattern = "**";
		const { source, sources } = extractBrackets(pattern);
		const replaced = REPLACERS.reduce((prev, [matcher, replacer, required]) => {
			if (matcher === DIRECT) return replacer(prev, pattern);
			if (required !== UNDEFINED && prev.indexOf(required) < 0) return prev;
			return matcher.test(prev) ? prev.replace(matcher, replacer.bind(pattern)) : prev;
		}, source);
		return sources.length ? replaced.replace(REGEX_RESTORE_PLACEHOLDER, (match, index) => sources[index]) : replaced;
	};
	var checkSourceOf = (body, prefix) => {
		if (body[body.length - 1] === SLASH) prefix = makeRegexPrefix(body.slice(0, -1));
		const head = prefix.slice(0, -1);
		const last = prefix[prefix.length - 1];
		return last === TRAILING_WILDCARD ? `${head}$` : last === TRAILING_DOUBLESTAR ? head : NEVER_MATCH;
	};
	var matchesBasename = (body) => {
		const index = body.indexOf(SLASH);
		return index < 0 || index === body.length - 1;
	};
	var basenameOf = (path) => {
		const end = path.length - 1;
		const index = path.lastIndexOf(SLASH, path[end] === SLASH ? end - 1 : end);
		return index < 0 ? path : path.slice(index + 1);
	};
	var parentOf = (path) => {
		if (path.charCodeAt(0) === SLASH_CODE || path.indexOf(DOUBLE_SLASH) >= 0) {
			const slices = path.split(SLASH).filter(Boolean);
			slices.pop();
			return slices.length ? slices.join(SLASH) + SLASH : EMPTY;
		}
		const end = path.length - 1;
		const cut = path.lastIndexOf(SLASH, path.charCodeAt(end) === SLASH_CODE ? end - 1 : end);
		return cut < 0 ? EMPTY : path.slice(0, cut + 1);
	};
	var isString = (subject) => typeof subject === "string";
	var checkPattern = (pattern) => pattern && isString(pattern);
	var splitPattern = (pattern) => (pattern[pattern.length - 1] === "\r" ? pattern.slice(0, -1) : pattern).split(REGEX_SPLITALL_CRLF).filter(Boolean);
	var IgnoreRule = class {
		constructor(pattern, mark, body, ignoreCase, negative, prefix) {
			this.pattern = pattern;
			this.mark = mark;
			this.negative = negative;
			define(this, "body", body);
			define(this, "ignoreCase", ignoreCase);
			define(this, "regexPrefix", prefix);
		}
		get _basenameOnly() {
			return define(this, "_basenameOnly", matchesBasename(this.body));
		}
		get regex() {
			const key = "_regex";
			if (this[key]) return this[key];
			return this._make(MODE_IGNORE, key);
		}
		get checkRegex() {
			const key = "_checkRegex";
			if (this[key]) return this[key];
			return this._make(MODE_CHECK_IGNORE, key);
		}
		_make(mode, key) {
			const str = pinWildcards(mode === MODE_IGNORE ? this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, replaceTrailingWildcard).replace(REGEX_REPLACE_TRAILING_DOUBLESTAR, replaceTrailingDoublestar) : checkSourceOf(this.body, this.regexPrefix));
			const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
			return define(this, key, regex);
		}
	};
	var hasTrailingBackslash = (str) => {
		let count = 0;
		while (str[str.length - count - 1] === ESCAPE) count++;
		return count % 2 === 1;
	};
	var trimEnd = (body, stripLineEnd) => {
		let lineEnd = body.length;
		let end;
		for (;;) {
			if (stripLineEnd && body[lineEnd - 1] === "\r") lineEnd--;
			end = lineEnd;
			while (body[end - 1] === SPACE) end--;
			if (!stripLineEnd || body[end - 1] !== "\n") break;
			lineEnd = end - 1;
		}
		if (end === lineEnd) return body.slice(0, lineEnd);
		let backslashes = 0;
		while (body[end - backslashes - 1] === ESCAPE) backslashes++;
		return backslashes % 2 ? body.slice(0, end - 1) + SPACE : body.slice(0, end);
	};
	var createRule = (pattern, mark, ignoreCase, stripLineEnd, stripBOM) => {
		let body = stripBOM && pattern[0] === BOM ? pattern.slice(1) : pattern;
		if (body[0] === "#") return;
		let negative = false;
		if (body[0] === "!") {
			negative = true;
			body = body.slice(1);
		}
		const last = body[body.length - 1];
		if (last === SPACE || stripLineEnd && (last === "\r" || last === "\n")) body = trimEnd(body, stripLineEnd);
		if (!body || hasTrailingBackslash(body)) return;
		body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
		const regexPrefix = makeRegexPrefix(body);
		return new IgnoreRule(pattern, mark, body, ignoreCase, negative, regexPrefix);
	};
	var RuleManager = class {
		constructor(ignoreCase) {
			this._ignoreCase = ignoreCase;
			this._rules = [];
			this._basenameCount = 0;
		}
		_add(pattern, index) {
			if (pattern && pattern[KEY_IGNORE]) {
				this._rules = this._rules.concat(pattern._rules._rules);
				this._basenameCount += pattern._rules._basenameCount;
				this._added = true;
				return;
			}
			const isStr = isString(pattern);
			const raw = isStr ? pattern : pattern.pattern;
			const rule = checkPattern(raw) && createRule(raw, isStr ? UNDEFINED : pattern.mark, this._ignoreCase, !this._split, this._stripBOM && !index);
			if (rule) {
				this._added = true;
				this._rules.push(rule);
				if (matchesBasename(rule.body)) this._basenameCount++;
			}
		}
		add(pattern) {
			this._added = false;
			this._split = isString(pattern);
			this._stripBOM = !this._split || pattern[0] === BOM;
			makeArray(this._split ? splitPattern(pattern) : pattern).forEach(this._add, this);
			if (this._added) this._literalRules = UNDEFINED;
			return this._added;
		}
		testLiteral(path) {
			const rules = this._literalRules || (this._literalRules = this._rules.filter(({ body }) => body[body.length - (body[body.length - 1] === SLASH ? 2 : 1)] === "*"));
			let ignored = false;
			let unignored = false;
			let matchedRule;
			for (let index = rules.length - 1; index >= 0; index--) {
				const rule = rules[index];
				if (rule.checkRegex.test(path)) {
					ignored = !rule.negative;
					unignored = rule.negative;
					matchedRule = rule.negative ? UNDEFINED : rule;
					break;
				}
			}
			const ret = {
				ignored,
				unignored
			};
			if (matchedRule) ret.rule = matchedRule;
			return ret;
		}
		test(path, mode) {
			const rules = this._rules;
			const { length } = rules;
			const shortcut = this._basenameCount * 2 >= length;
			const basename = shortcut ? basenameOf(path) : path;
			for (let index = length - 1; index >= 0; index--) {
				const rule = rules[index];
				if (rule[mode].test(shortcut && rule._basenameOnly ? basename : path)) {
					const { negative } = rule;
					const ret = {
						ignored: !negative,
						unignored: negative
					};
					if (!negative) ret.rule = rule;
					return ret;
				}
			}
			return {
				ignored: false,
				unignored: false
			};
		}
	};
	var throwError = (message, Ctor) => {
		throw new Ctor(message);
	};
	var checkPath = (path, originalPath, doThrow) => {
		if (!isString(path)) return doThrow(`path must be a string, but got \`${originalPath}\``, TypeError);
		if (!path) return doThrow(`path must not be empty`, TypeError);
		if (checkPath.isNotRelative(path)) return doThrow(`path should be a \`path.relative()\`d string, but got "${originalPath}"`, RangeError);
		return true;
	};
	var isNotRelative = (path) => {
		const first = path.charCodeAt(0);
		if (first === SLASH_CODE) return true;
		if (first !== DOT_CODE) return false;
		if (path.length === 1) return true;
		const second = path.charCodeAt(1);
		if (second === SLASH_CODE) return true;
		if (second !== DOT_CODE) return false;
		return path.length === 2 || path.charCodeAt(2) === SLASH_CODE;
	};
	checkPath.isNotRelative = isNotRelative;
	/* istanbul ignore next */
	checkPath.convert = (p) => p;
	var convertPath = (target) => isString(target) && checkPath.convert(target);
	var Ignore = class {
		constructor({ ignorecase = true, ignoreCase = ignorecase, allowRelativePaths = false } = {}) {
			define(this, KEY_IGNORE, true);
			this._rules = new RuleManager(ignoreCase);
			this._strictPathCheck = !allowRelativePaths;
			this._initCache();
		}
		_initCache() {
			this._ignoreCache = Object.create(null);
			this._testCache = Object.create(null);
		}
		add(pattern) {
			if (this._rules.add(pattern)) this._initCache();
			return this;
		}
		addPattern(pattern) {
			return this.add(pattern);
		}
		_test(originalPath, cache, path) {
			checkPath(path, originalPath, this._strictPathCheck ? throwError : RETURN_FALSE);
			return path ? this._t(path, cache) : {
				ignored: false,
				unignored: false
			};
		}
		checkIgnore(target) {
			const path = convertPath(target);
			if (!path || path.charCodeAt(path.length - 1) !== SLASH_CODE) return this._test(target, this._testCache, path);
			const dir = this._t(path, this._testCache);
			if (dir.ignored) return dir;
			const literal = this._rules.testLiteral(path);
			return literal.ignored || literal.unignored ? literal : dir;
		}
		_t(path, cache) {
			if (path in cache) return cache[path];
			const parentPath = parentOf(path);
			const parent = parentPath ? this._t(parentPath, cache) : UNDEFINED;
			return cache[path] = parent && parent.ignored ? parent : this._rules.test(path, MODE_IGNORE);
		}
		ignores(path) {
			return this._test(path, this._ignoreCache, convertPath(path)).ignored;
		}
		createFilter() {
			return (path) => !this.ignores(path);
		}
		filter(paths) {
			return makeArray(paths).filter(this.createFilter());
		}
		test(path) {
			return this._test(path, this._testCache, convertPath(path));
		}
	};
	var factory = (options) => new Ignore(options);
	var isPathValid = (path) => checkPath(convertPath(path), path, RETURN_FALSE);
	/* istanbul ignore next */
	var setupWindows = () => {
		const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
		checkPath.convert = makePosix;
		const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
		checkPath.isNotRelative = (path) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
	};
	/* istanbul ignore next */
	if (typeof process !== "undefined" && process.platform === "win32") setupWindows();
	module.exports = factory;
	factory.default = factory;
	module.exports.isPathValid = isPathValid;
	define(module.exports, Symbol.for("setupWindows"), setupWindows);
})))(), 1);
var VscodeError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
	}
};
async function resolveWorkspace(path, profiles) {
	if (!isAbsolute(path) || !(await lstat(path).catch(() => void 0))?.isDirectory()) throw new VscodeError("accessDenied");
	const root = await realpath(path).catch(() => void 0);
	if (root === void 0 || isWithinCanonicalPath(root, profiles)) throw new VscodeError("accessDenied");
	return root;
}
var ignored = /* @__PURE__ */ new Set([
	".git",
	".worktrees",
	"node_modules"
]);
var maxSearchDepth = 3;
var workspaceExtension = /.+\.(?:code-workspace|workspace)$/i;
function relativePatternPath(directory, path) {
	return relative(directory, path).split(sep).join("/");
}
function isIgnored(path, directory, rules) {
	for (let index = rules.length - 1; index >= 0; index--) {
		const rule = rules[index];
		if (rule === void 0) continue;
		const result = rule.matcher.test(relativePatternPath(rule.directory, path) + (directory ? "/" : ""));
		if (result.ignored || result.unignored) return result.ignored;
	}
	return false;
}
function readable(error) {
	return "code" in error && [
		"EACCES",
		"EPERM",
		"ENOENT",
		"ENOTDIR"
	].includes(String(error.code));
}
async function statIfPresent(path) {
	return lstat(path).catch((error) => {
		if (error instanceof Error && readable(error)) return void 0;
		throw error;
	});
}
async function loadRules(directory, inherited) {
	const file = join(directory, ".gitignore");
	if (!(await statIfPresent(file))?.isFile()) return inherited;
	const contents = await readFile(file, "utf8");
	return [...inherited, {
		directory,
		matcher: (0, import_ignore.default)({ ignorecase: false }).add(contents)
	}];
}
async function ancestorRules(root, profiles) {
	if (await statIfPresent(join(root, ".git"))) return [];
	const parents = [];
	for (let dir = dirname(root); dir !== root && !isWithinCanonicalPath(dir, profiles); dir = dirname(dir)) {
		parents.unshift(dir);
		if (await statIfPresent(join(dir, ".git"))) {
			let rules = [];
			for (const directory of parents) {
				if (isIgnored(directory, true, rules)) return void 0;
				rules = await loadRules(directory, rules);
			}
			return isIgnored(root, true, rules) ? void 0 : rules;
		}
		if (dirname(dir) === dir) break;
	}
	return [];
}
async function discoverVscodeWorkspaces(path) {
	const profiles = canonicalizePath(getHarnessProfilesPath());
	const root = await resolveWorkspace(path, profiles);
	const rootRules = await ancestorRules(root, profiles);
	if (rootRules === void 0) return [];
	const stack = [{
		directory: root,
		inherited: rootRules,
		depth: 1
	}];
	const files = [];
	while (stack.length > 0) {
		const item = stack.pop();
		if (item === void 0) break;
		const { directory, inherited } = item;
		const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
			if (directory !== root && error instanceof Error && "code" in error && [
				"EACCES",
				"EPERM",
				"ENOENT"
			].includes(String(error.code))) return [];
			throw error;
		});
		let rules = inherited;
		if (entries.some((entry) => entry.name === ".gitignore" && entry.isFile())) {
			const contents = await readFile(join(directory, ".gitignore"), "utf8");
			rules = [...inherited, {
				directory,
				matcher: (0, import_ignore.default)({ ignorecase: false }).add(contents)
			}];
		}
		for (const entry of entries) {
			const isDirectory = entry.isDirectory();
			if (ignored.has(entry.name.toLowerCase()) || !isDirectory && (!entry.isFile() || !workspaceExtension.test(entry.name))) continue;
			const candidate = join(directory, entry.name);
			if (isWithinCanonicalPath(candidate, profiles) || isIgnored(candidate, isDirectory, rules)) continue;
			if (isDirectory) {
				if (item.depth < maxSearchDepth) stack.push({
					directory: candidate,
					inherited: rules,
					depth: item.depth + 1
				});
			} else files.push(candidate);
		}
		if (directory === root && files.length > 0) break;
	}
	return files.toSorted();
}
function candidates() {
	const paths = (process.env.PATH ?? "").split(delimiter).filter((path) => isAbsolute(path));
	if (process.platform === "win32") {
		const known = [
			process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs"),
			process.env.ProgramFiles,
			process.env["ProgramFiles(x86)"]
		].filter((path) => Boolean(path));
		return [...paths.flatMap((path) => [join(path, "Code.exe"), join(dirname(path), "Code.exe")]), ...known.map((path) => join(path, "Microsoft VS Code", "Code.exe"))];
	}
	return [...paths.map((path) => join(path, "code")), ...process.platform === "darwin" ? ["/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"] : []];
}
async function launchVscode(path, workspaceFile) {
	const profiles = canonicalizePath(getHarnessProfilesPath());
	const root = await resolveWorkspace(path, profiles);
	const target = workspaceFile ?? root;
	if (workspaceFile !== void 0) {
		if ((isAbsolute(target) ? await realpath(target).catch(() => void 0) : void 0) !== target || !workspaceExtension.test(target) || !isWithinCanonicalPath(target, root) || isWithinCanonicalPath(target, profiles) || !(await lstat(target).catch(() => void 0))?.isFile()) throw new VscodeError("workspaceFileMissing");
	}
	const options = {
		cwd: dirname(process.execPath),
		detached: true,
		stdio: "ignore",
		windowsHide: true
	};
	const env = { ...process.env };
	delete env.ELECTRON_RUN_AS_NODE;
	delete env.VSCODE_IPC_HOOK_CLI;
	for (const executable of new Set(candidates())) if (await new Promise((resolve, reject) => {
		const child = spawn(executable, ["--new-window", target], {
			...options,
			env
		});
		child.once("error", (error) => {
			if (error.code === "ENOENT" || error.code === "EACCES") resolve(false);
			else reject(new VscodeError("vscodeFailed"));
		});
		child.once("spawn", () => {
			child.unref();
			resolve(true);
		});
	})) return;
	throw new VscodeError("vscodeUnavailable");
}
// src/host/api/vscodeRoutes.ts
function response$1(value, status = 200) {
	return Response.json(value, {
		status,
		headers: { "Cache-Control": "no-store" }
	});
}
function text$1(value) {
	return typeof value === "string" && value.length > 0 && value.length <= 32768 && !value.includes("\0");
}
function registerVscodeRoutes(ctx, enabled, logger = NOOP_LOGGER) {
	return ctx.inject(["connection", "workspaceRegistry"], (scope) => {
		const { connection, workspaceRegistry } = scope;
		const discoveries = /* @__PURE__ */ new Map();
		for (const action of ["discover", "launch"]) scope.effect(() => connection.fetch.register({
			path: `/api/dsh-workspace-vscode/${action}`,
			methods: ["POST"],
			requestBody: "buffered",
			fetch: async (request) => {
				if (!enabled()) return response$1({
					ok: false,
					code: "vscodeDisabled"
				}, 403);
				if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return response$1({ ok: false }, 415);
				const body = await request.json().catch(() => void 0);
				if (!body || typeof body !== "object" || !("workspaceId" in body) || !text$1(body.workspaceId)) return response$1({ ok: false }, 400);
				const file = "workspaceFile" in body ? body.workspaceFile : void 0;
				if (file !== void 0 && !text$1(file)) return response$1({ ok: false }, 400);
				const workspace = workspaceRegistry.list().find((item) => item.id === body.workspaceId);
				if (workspace === void 0) return response$1({
					ok: false,
					code: "accessDenied"
				}, 404);
				try {
					if (action === "discover") {
						discoveries.delete(workspace.id);
						const files = await discoverVscodeWorkspaces(workspace.path);
						discoveries.set(workspace.id, {
							path: workspace.path,
							files
						});
						return response$1({
							ok: true,
							workspaceFiles: files
						});
					}
					const discovery = discoveries.get(workspace.id);
					if (discovery?.path !== workspace.path || (file === void 0 ? discovery.files.length > 0 : !discovery.files.includes(file))) throw new VscodeError("workspaceFileMissing");
					await launchVscode(workspace.path, file);
					return response$1({ ok: true });
				} catch (error) {
					const code = error instanceof VscodeError ? error.code : "vscodeFailed";
					if (code !== "accessDenied") logger.record({
						event: "workspace-vscode-failed",
						level: "error",
						operation: action,
						data: { code }
					});
					return response$1({
						ok: false,
						code
					}, code === "accessDenied" ? 404 : code === "vscodeFailed" ? 500 : 409);
				}
			}
		}));
	});
}
// src/host/services/WorktreeService.ts
var BRANCH_PREFIX = "refs/heads/";
var REMOTE_PREFIX = "refs/remotes/";
var FILTER_ATTRIBUTES = [
	"clean",
	"smudge",
	"process",
	"required"
];
var DEFAULT_WORKTREE_DIRECTORY = ".worktrees";
var ignoreUpdates = Promise.resolve();
var WorktreeError = class extends Error {
	code;
	constructor(code, options) {
		super(code, options);
		this.code = code;
		this.name = "WorktreeError";
	}
};
var GitCommandError = class extends Error {
	diagnostic;
	constructor(diagnostic) {
		super(diagnostic.reason);
		this.diagnostic = diagnostic;
	}
};
function gitDiagnostic(args, status, stderr, signal) {
	let index = 0;
	while (args[index] === "-c") index += 2;
	const command = args[index] ?? "git";
	const subcommand = command === "worktree" ? ` ${args[index + 1]}` : command === "branch" && args[index + 1] === "-d" ? " -d" : "";
	const reason = signal ? `terminated:${signal}` : /not fully merged/i.test(stderr) ? "branch-not-fully-merged" : /checked out at|used by worktree/i.test(stderr) ? "branch-in-use" : /Permission denied|Access is denied/i.test(stderr) ? "permission-denied" : /unable to (unlink|rmdir)|failed to (delete|remove)|could not (remove|unlink)/i.test(stderr) ? "filesystem-remove-failed" : /directory not empty/i.test(stderr) ? "directory-not-empty" : /resource busy|being used by another process/i.test(stderr) ? "filesystem-busy" : /modified or untracked/i.test(stderr) ? "worktree-has-local-changes" : /locked working tree|is locked/i.test(stderr) ? "worktree-locked" : /not a git repository/i.test(stderr) ? "not-a-repository" : /unable to create .*\.lock|cannot lock ref/i.test(stderr) ? "git-lock-failed" : /identity unknown|unable to auto-detect email/i.test(stderr) ? "git-identity-missing" : /CONFLICT|automatic merge failed/i.test(stderr) ? "merge-conflict" : /no such file or directory/i.test(stderr) ? "path-missing" : status === 0 ? "ok" : stderr.trim() ? "unclassified-git-stderr" : "no-git-stderr";
	return {
		command: `${command}${subcommand}`,
		status,
		reason
	};
}
function worktreeFailureDetails(error) {
	const details = { errorType: error instanceof WorktreeError ? error.code : "unexpected-error" };
	let cause = error;
	while (cause !== void 0) {
		if (cause instanceof GitCommandError) return {
			...details,
			...cause.diagnostic
		};
		if (cause instanceof WorktreeError && cause !== error) details.causeCode = cause.code;
		if ("code" in cause && typeof cause.code === "string" && /^E[A-Z_]+$/.test(cause.code)) details.systemCode = cause.code;
		cause = cause.cause instanceof Error ? cause.cause : void 0;
	}
	return details;
}
function gitEnv(overrides) {
	return {
		...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^git_/i.test(key))),
		LC_ALL: "C",
		GIT_TERMINAL_PROMPT: "0",
		GIT_OPTIONAL_LOCKS: "0",
		GIT_NO_LAZY_FETCH: "1",
		GIT_NO_REPLACE_OBJECTS: "1",
		GIT_ALLOW_PROTOCOL: "",
		...overrides
	};
}
function git(path, args, allowed = [0], overrides) {
	return new Promise((resolveResult, reject) => {
		execFile("git", [
			"-C",
			path,
			"-c",
			"core.hooksPath=/dev/null",
			"-c",
			"core.fsmonitor=false",
			...args
		], {
			cwd: dirname(process.execPath),
			env: gitEnv(overrides),
			windowsHide: true,
			timeout: 12e4,
			maxBuffer: 8388608
		}, (error, stdout, stderr) => {
			const status = error === null ? 0 : error.code;
			const diagnostic = gitDiagnostic(args, status ?? (error?.killed ? "killed" : "unknown"), stderr, error?.signal);
			if (typeof status === "number" && allowed.includes(status)) resolveResult({
				status,
				stdout,
				diagnostic
			});
			else reject(new WorktreeError(status === "ENOENT" ? "gitMissing" : "gitFailed", { cause: new GitCommandError(diagnostic) }));
		});
	});
}
function line(output) {
	return output.replace(/\r?\n$/, "");
}
function branchName(ref = "") {
	return ref.startsWith(BRANCH_PREFIX) ? ref.slice(11) : null;
}
function parseRegistrations(output) {
	return output.split("\0\0").flatMap((record) => {
		const [path, ...fields] = record.split("\0");
		if (!path?.startsWith("worktree ")) return [];
		return [{
			path: path.slice(9),
			branch: branchName(fields.find((field) => field.startsWith("branch "))?.slice(7)),
			bare: fields.includes("bare"),
			prunable: fields.some((field) => field === "prunable" || field.startsWith("prunable ")),
			locked: fields.some((field) => field === "locked" || field.startsWith("locked "))
		}];
	});
}
async function canonicalDirectory(path) {
	try {
		const canonical = await realpath(path);
		return (await stat(canonical)).isDirectory() ? canonical : null;
	} catch {
		return null;
	}
}
async function inspectRepository(workspacePath) {
	const workspace = await canonicalDirectory(workspacePath);
	if (workspace === null) throw new WorktreeError("notRepository");
	const top = await git(workspace, ["rev-parse", "--show-toplevel"], [0, 128]);
	if (top.status !== 0) throw new WorktreeError("notRepository");
	const root = await canonicalDirectory(line(top.stdout));
	if (root === null) throw new WorktreeError("notRepository");
	const [listed, local, remote, head] = await Promise.all([
		git(root, [
			"worktree",
			"list",
			"--porcelain",
			"-z"
		]),
		git(root, [
			"for-each-ref",
			"--format=%(refname)",
			BRANCH_PREFIX
		]),
		git(root, [
			"for-each-ref",
			"--format=%(refname:strip=2)%00%(symref)",
			REMOTE_PREFIX
		]),
		git(root, [
			"symbolic-ref",
			"--quiet",
			"HEAD"
		], [0, 1])
	]);
	const remoteBranches = remote.stdout.split(/\r?\n/).flatMap((record) => {
		const [name, target] = record.split("\0");
		return name && target === "" ? [name] : [];
	});
	const branches = local.stdout.split(/\r?\n/).flatMap((ref) => {
		const branch = branchName(ref);
		return branch === null ? [] : [branch];
	});
	if (branches.length === 0 && (await git(root, [
		"rev-parse",
		"--verify",
		"HEAD^{commit}"
	], [0, 128])).status !== 0) throw new WorktreeError("noCommits");
	const currentBranch = branchName(line(head.stdout));
	const registrations = parseRegistrations(listed.stdout);
	const checkouts = (await Promise.all(registrations.map(async (registration) => {
		if (registration.bare || registration.prunable) return null;
		const path = await canonicalDirectory(registration.path);
		return path === null ? null : {
			path,
			branch: registration.branch
		};
	}))).filter((checkout) => checkout !== null);
	return {
		root,
		workspace,
		registrations,
		repository: {
			currentBranch: currentBranch !== null && branches.includes(currentBranch) ? currentBranch : null,
			isLinkedWorktree: relative(workspace, root) === "" && checkouts.some((checkout) => relative(checkout.path, root) === "") && relative(await gitDirectory(root, "--absolute-git-dir"), await gitDirectory(root, "--git-common-dir")) !== "",
			...relative(workspace, root) === "" && registrations[0] && relative(registrations[0].path, root) === "" ? { deletableCheckouts: checkouts.filter((checkout) => relative(checkout.path, root) !== "") } : {},
			defaultBasePath: join(workspace, DEFAULT_WORKTREE_DIRECTORY),
			branches,
			remoteBranches,
			occupiedBranches: [...new Set(registrations.flatMap(({ branch }) => branch === null ? [] : [branch]))],
			checkouts
		}
	};
}
async function inspectWorktreeRepository(workspacePath) {
	return (await inspectRepository(workspacePath)).repository;
}
async function gitDirectory(root, option) {
	const result = await git(root, [
		"rev-parse",
		"--path-format=absolute",
		option
	]);
	const path = await canonicalDirectory(line(result.stdout));
	if (path === null) throw new WorktreeError("gitFailed", { cause: new GitCommandError({
		command: `rev-parse ${option}`,
		status: result.status,
		reason: "git-directory-missing-or-inaccessible"
	}) });
	return path;
}
async function openCheckout(state, path) {
	const selected = isAbsolute(path) ? await canonicalDirectory(path) : null;
	if (selected === null || !state.repository.checkouts.some((checkout) => relative(checkout.path, selected) === "")) throw new WorktreeError("worktreeMissing");
	const top = await git(selected, ["rev-parse", "--show-toplevel"], [0, 128]);
	const checkoutRoot = top.status === 0 ? await canonicalDirectory(line(top.stdout)) : null;
	if (checkoutRoot === null || relative(checkoutRoot, selected) !== "" || await gitDirectory(selected, "--git-common-dir") !== await gitDirectory(state.root, "--git-common-dir")) throw new WorktreeError("worktreeMissing");
	return selected;
}
async function resolveBranch(state, selection) {
	const { branch } = selection;
	const { root, repository } = state;
	if (!branch || branch === "HEAD" || branch.startsWith("-") || branch.includes("\0") || (await git(root, ["check-ref-format", `${BRANCH_PREFIX}${branch}`], [0, 1])).status !== 0) throw new WorktreeError("invalidBranch");
	if (selection.mode === "existing" && selection.originBranch !== void 0) {
		if (repository.branches.includes(branch)) throw new WorktreeError("branchExists");
		if (repository.occupiedBranches.includes(branch)) throw new WorktreeError("branchOccupied");
		if (selection.originBranch !== `origin/${branch}` || !repository.remoteBranches?.includes(selection.originBranch)) throw new WorktreeError("sourceMissing");
		return `${REMOTE_PREFIX}${selection.originBranch}`;
	}
	if (selection.mode === "existing") {
		if (!repository.branches.includes(branch)) throw new WorktreeError("branchMissing");
		if (repository.occupiedBranches.includes(branch)) throw new WorktreeError("branchOccupied");
		return branch;
	}
	if (repository.branches.includes(branch)) throw new WorktreeError("branchExists");
	if (!(selection.sourceRemote ? repository.remoteBranches : repository.branches)?.includes(selection.sourceBranch)) throw new WorktreeError("sourceMissing");
	const commit = await git(root, [
		"show-ref",
		"--hash",
		"--verify",
		"--",
		`${selection.sourceRemote ? REMOTE_PREFIX : BRANCH_PREFIX}${selection.sourceBranch}`
	], [0, 128]);
	if (commit.status !== 0) throw new WorktreeError("sourceMissing");
	return line(commit.stdout);
}
function validFolder(name) {
	return name.length > 0 && !/[<>:"/\\|?*\p{Cc}]/u.test(name) && !/[. ]$/.test(name) && !/^(?:CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|(?:COM|LPT)[1-9¹²³]) *(?:\.|$)/i.test(name);
}
async function baseDirectory(path) {
	const windows = process.platform === "win32";
	if (!isAbsolute(path) || path.includes("\0") || windows && !/^(?:[a-z]:[\\/]|[\\/]{2}[^\\/.?])/i.test(path) || path.split(windows ? /[\\/]/ : "/").includes("..")) throw new WorktreeError("invalidBasePath");
	const normalized = resolve(path);
	if (windows && relative(parse(normalized).root, normalized).split(sep).some((component) => component !== "" && !validFolder(component))) throw new WorktreeError("invalidBasePath");
	if (await pathEntry(normalized, "invalidBasePath") === null) {
		const parent = dirname(normalized);
		if (parent === normalized) throw new WorktreeError("invalidBasePath");
		return join(await baseDirectory(parent), basename(normalized));
	}
	const canonical = await canonicalDirectory(normalized);
	if (canonical === null) throw new WorktreeError("invalidBasePath");
	return canonical;
}
async function pathEntry(path, errorCode) {
	try {
		return await lstat(path);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
		throw new WorktreeError(errorCode, { cause: error });
	}
}
function ensureWorktreeIgnored(state, checkWritable) {
	const update = ignoreUpdates.then(async () => {
		const { root, workspace, repository } = state;
		if ((await git(root, [
			"check-ignore",
			"--quiet",
			"--no-index",
			"--",
			`${relative(root, repository.defaultBasePath).split(sep).join("/")}/`
		], [0, 1])).status === 0) return;
		const path = join(workspace, ".gitignore");
		const entry = await pathEntry(path, "ignoreFailed");
		if (entry !== null && !entry.isFile()) throw new WorktreeError("ignoreFailed");
		try {
			checkWritable(path);
		} catch (error) {
			throw new WorktreeError("readOnly", { cause: error });
		}
		const content = entry === null ? "" : await readFile(path, "utf8");
		const newline = content.includes("\r\n") ? "\r\n" : "\n";
		const separator = content.length > 0 && !content.endsWith("\n") ? newline : "";
		await appendFile(path, `${separator}/${DEFAULT_WORKTREE_DIRECTORY}/${newline}`, { flag: entry === null ? "ax" : "a" });
	});
	ignoreUpdates = update.catch(() => void 0);
	return update.catch((error) => {
		if (error instanceof WorktreeError && error.code === "readOnly") throw error;
		throw new WorktreeError("ignoreFailed", { cause: error });
	});
}
async function disableFilters(target, gitDir) {
	const list = await git(target, [
		"--git-dir",
		gitDir,
		"--work-tree",
		target,
		"config",
		"--null",
		"--name-only",
		"--get-regexp",
		"^filter\\."
	], [0, 1]);
	const drivers = /* @__PURE__ */ new Set();
	for (const key of list.stdout.split("\0")) {
		const separator = key.lastIndexOf(".");
		if (separator > 7 && FILTER_ATTRIBUTES.includes(key.slice(separator + 1))) drivers.add(key.slice(7, separator));
	}
	const env = { GIT_CONFIG_COUNT: String(drivers.size * FILTER_ATTRIBUTES.length) };
	let index = 0;
	for (const driver of drivers) for (const attribute of FILTER_ATTRIBUTES) {
		env[`GIT_CONFIG_KEY_${index}`] = `filter.${driver}.${attribute}`;
		env[`GIT_CONFIG_VALUE_${index}`] = attribute === "required" ? "false" : "";
		index++;
	}
	return env;
}
async function prepareWorktree(workspacePath, selection, checkWritable) {
	const state = await inspectRepository(workspacePath);
	if (selection.mode === "open") return openCheckout(state, selection.path);
	if (!validFolder(selection.folderName)) throw new WorktreeError("invalidFolder");
	const base = await baseDirectory(selection.basePath);
	const target = join(base, selection.folderName);
	const { root } = state;
	const [common, sourceGitDir] = await Promise.all([gitDirectory(root, "--git-common-dir"), gitDirectory(root, "--absolute-git-dir")]);
	if ([common, sourceGitDir].some((directory) => {
		const path = relative(directory, target);
		return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
	})) throw new WorktreeError("invalidBasePath");
	if (await pathEntry(target, "gitFailed") !== null || state.registrations.some(({ path }) => relative(path, target) === "")) throw new WorktreeError("pathExists");
	const revision = await resolveBranch(state, selection);
	try {
		for (const path of /* @__PURE__ */ new Set([
			common,
			sourceGitDir,
			base,
			target
		])) checkWritable(path);
	} catch (error) {
		throw new WorktreeError("readOnly", { cause: error });
	}
	const defaultBase = state.repository.defaultBasePath;
	if (relative(defaultBase, resolve(selection.basePath)) === "" || relative(defaultBase, base) === "") await ensureWorktreeIgnored(state, checkWritable);
	try {
		await mkdir(base, { recursive: true });
		await mkdir(target);
	} catch (error) {
		throw new WorktreeError(error instanceof Error && "code" in error && error.code === "EEXIST" ? "pathExists" : "gitFailed", { cause: error });
	}
	const branchArgs = selection.mode === "new" ? [
		"--no-track",
		"-b",
		selection.branch
	] : selection.originBranch !== void 0 ? [
		"--track",
		"-b",
		selection.branch
	] : [];
	try {
		await git(root, [
			"--git-dir",
			sourceGitDir,
			"--work-tree",
			root,
			"worktree",
			"add",
			"--no-checkout",
			"--no-guess-remote",
			...branchArgs,
			"--",
			target,
			revision
		]);
	} catch (error) {
		await rmdir(target).catch(() => void 0);
		throw error;
	}
	const checkoutGitDir = await gitDirectory(target, "--absolute-git-dir");
	if (line((await git(target, [
		"--git-dir",
		checkoutGitDir,
		"symbolic-ref",
		"--quiet",
		"HEAD"
	], [0, 1])).stdout) !== `${BRANCH_PREFIX}${selection.branch}`) throw new WorktreeError("gitFailed");
	const filters = await disableFilters(target, checkoutGitDir);
	await git(target, [
		"--git-dir",
		checkoutGitDir,
		"--work-tree",
		target,
		"read-tree",
		"-m",
		"-u",
		"--no-recurse-submodules",
		"HEAD"
	], [0], filters);
	return target;
}
async function assertClean(path, gitDir, code) {
	const status = await git(path, [
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all",
		"--ignore-submodules=none"
	], [0], await disableFilters(path, gitDir));
	const busy = await Promise.all([
		"MERGE_HEAD",
		"CHERRY_PICK_HEAD",
		"REVERT_HEAD",
		"rebase-merge",
		"rebase-apply",
		"sequencer"
	].map((name) => pathEntry(join(gitDir, name), "gitFailed")));
	if (status.stdout !== "" || busy.some((entry) => entry !== null)) throw new WorktreeError(code);
}
async function localBranchTip(path, branch) {
	const tip = await git(path, [
		"show-ref",
		"--hash",
		"--verify",
		"--",
		`${BRANCH_PREFIX}${branch}`
	], [0, 128]);
	if (tip.status !== 0) throw new WorktreeError("branchMissing");
	return line(tip.stdout);
}
async function assertMerged(path, tip, mergeInto) {
	if ((await git(path, [
		"merge-base",
		"--is-ancestor",
		tip,
		await localBranchTip(path, mergeInto)
	], [0, 1])).status !== 0) throw new WorktreeError("branchNotMerged");
}
async function mergeCheckout(path, gitDir, branch, sourceTip) {
	const filters = await disableFilters(path, gitDir);
	const config = await git(path, [
		"config",
		"--null",
		"--name-only",
		"--get-regexp",
		"^merge\\..*\\.driver$"
	], [0, 1]);
	const drivers = [...new Set(config.stdout.split("\0").filter(Boolean))];
	const result = await git(path, [
		"-c",
		`branch.${branch}.mergeOptions=`,
		"-c",
		"rerere.enabled=false",
		"-c",
		"merge.autoStash=false",
		...drivers.flatMap((driver) => ["-c", `${driver}=false`]),
		"merge",
		"--no-edit",
		"--no-autostash",
		"--no-gpg-sign",
		"--",
		sourceTip
	], [
		0,
		1,
		2,
		128
	], filters);
	if (result.status === 0) return;
	const conflicts = await git(path, ["ls-files", "--unmerged"]);
	if (await pathEntry(join(gitDir, "MERGE_HEAD"), "gitFailed")) await git(path, ["merge", "--abort"], [0], filters);
	throw new WorktreeError(conflicts.stdout ? "mergeConflict" : "mergeFailed", { cause: new GitCommandError(result.diagnostic) });
}
async function deleteSelectedWorktree(workspacePath, selection, checkWritable, reportWarning = () => void 0) {
	const state = await inspectRepository(workspacePath);
	const path = await openCheckout(state, selection.worktreePath);
	const gitDir = await gitDirectory(path, "--absolute-git-dir");
	const common = await gitDirectory(path, "--git-common-dir");
	if (relative(gitDir, common) === "") throw new WorktreeError("primaryWorktree");
	const registration = state.registrations.find((item) => relative(item.path, path) === "");
	if (registration === void 0) throw new WorktreeError("worktreeMissing");
	if (registration.locked) throw new WorktreeError("worktreeLocked");
	if (state.registrations.some((item) => {
		const child = relative(path, item.path);
		return child !== "" && child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child);
	})) throw new WorktreeError("worktreeDirty");
	const { expectedBranch: branch, deleteBranch, mergeInto } = selection;
	const assertAttachment = async () => {
		if (branchName(line((await git(path, [
			"symbolic-ref",
			"--quiet",
			"HEAD"
		], [0, 1])).stdout)) !== branch) throw new WorktreeError("worktreeChanged");
	};
	const writable = (target) => {
		try {
			checkWritable(target);
		} catch (error) {
			throw new WorktreeError("readOnly", { cause: error });
		}
	};
	for (const target of [
		common,
		gitDir,
		dirname(path),
		path
	]) writable(target);
	await assertAttachment();
	await assertClean(path, gitDir, "worktreeDirty");
	if (branch === null && (deleteBranch || mergeInto !== void 0)) throw new WorktreeError("invalidBranch");
	const sourceTip = branch === null ? void 0 : await localBranchTip(path, branch);
	const primary = state.repository.checkouts.find((item) => relative(item.path, state.registrations[0]?.path ?? "") === "");
	let commandPath = relative(state.root, path) === "" ? primary?.path : state.root;
	commandPath ??= common;
	let temporary;
	let temporaryAdded = false;
	let branchDeleted = false;
	const warnings = [];
	let worktreeRemoved = false;
	try {
		if (mergeInto !== void 0) {
			if (mergeInto === branch || !state.repository.branches.includes(mergeInto) || sourceTip === void 0) throw new WorktreeError("mergeTargetInvalid");
			const occupied = state.registrations.filter((item) => item.branch === mergeInto);
			if (occupied.length > 1) throw new WorktreeError("mergeTargetInvalid");
			const destination = occupied[0];
			if (destination === void 0) {
				temporary = await mkdtemp(join(tmpdir(), "dsh-worktree-merge-"));
				writable(temporary);
				await git(commandPath, [
					"worktree",
					"add",
					"--no-checkout",
					"--no-guess-remote",
					"--",
					temporary,
					mergeInto
				]);
				temporaryAdded = true;
				commandPath = temporary;
			} else commandPath = await openCheckout(state, destination.path);
			const destinationGitDir = await gitDirectory(commandPath, "--absolute-git-dir");
			writable(commandPath);
			writable(destinationGitDir);
			if (line((await git(commandPath, [
				"symbolic-ref",
				"--quiet",
				"HEAD"
			], [0, 1])).stdout) !== `${BRANCH_PREFIX}${mergeInto}`) throw new WorktreeError("mergeTargetInvalid");
			if (temporary !== void 0) {
				const filters = await disableFilters(commandPath, destinationGitDir);
				await git(commandPath, [
					"read-tree",
					"-m",
					"-u",
					"--no-recurse-submodules",
					"HEAD"
				], [0], filters);
			}
			await assertClean(commandPath, destinationGitDir, "mergeTargetDirty");
			await mergeCheckout(commandPath, destinationGitDir, mergeInto, sourceTip);
		}
		await assertAttachment();
		if (mergeInto !== void 0 && branch !== null && await localBranchTip(path, branch) !== sourceTip) throw new WorktreeError("worktreeChanged");
		await assertClean(path, gitDir, "worktreeDirty");
		const filters = await disableFilters(path, gitDir);
		try {
			await git(commandPath, [
				"worktree",
				"remove",
				"--",
				path
			], [0], filters);
			worktreeRemoved = true;
		} catch (error) {
			throw new WorktreeError("worktreeRemoveFailed", { cause: error });
		}
		if (deleteBranch && branch !== null && sourceTip !== void 0) try {
			if (await localBranchTip(commandPath, branch) !== sourceTip) throw new WorktreeError("worktreeChanged");
			if (mergeInto !== void 0) {
				await assertMerged(commandPath, sourceTip, mergeInto);
				if (line((await git(commandPath, [
					"symbolic-ref",
					"--quiet",
					"HEAD"
				], [0, 1])).stdout) !== `${BRANCH_PREFIX}${mergeInto}`) throw new WorktreeError("mergeTargetInvalid");
				await git(commandPath, [
					"-c",
					`branch.${branch}.remote=dsh-${randomUUID()}`,
					"branch",
					"-d",
					"--",
					branch
				]);
			} else await git(commandPath, [
				"branch",
				"-d",
				"--",
				branch
			]);
			branchDeleted = true;
		} catch (error) {
			warnings.push("branchDeleteFailed");
			if (error instanceof Error) reportWarning("branchDeleteFailed", error);
		}
	} finally {
		try {
			if (temporaryAdded && temporary !== void 0) await git(common, [
				"worktree",
				"remove",
				"--",
				temporary
			]);
			else if (temporary !== void 0) await rmdir(temporary);
		} catch (error) {
			if (worktreeRemoved) warnings.push("mergeCleanupFailed");
			if (error instanceof Error) reportWarning("mergeCleanupFailed", error);
		}
	}
	return {
		worktreeRemoved: true,
		branchDeleted,
		warnings
	};
}
var deletionQueue = Promise.resolve();
function deleteWorktree(workspacePath, selection, checkWritable, reportWarning = () => void 0) {
	const operation = deletionQueue.then(() => deleteSelectedWorktree(workspacePath, selection, checkWritable, reportWarning));
	deletionQueue = operation.then(() => void 0, () => void 0);
	return operation;
}
// src/host/api/worktreeRoutes.ts
var prefix = "/api/dsh-workspace-worktree";
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value) {
	return typeof value === "string" && value.length > 0 && value.length <= 32768 && !value.includes("\0");
}
function parseSelection(value) {
	if (!isRecord(value)) return void 0;
	const { mode, path, basePath, folderName, branch, sourceBranch } = value;
	if (mode === "open" && text(path)) return {
		mode,
		path
	};
	if (!text(basePath) || !text(folderName) || !text(branch)) return void 0;
	if (mode === "new" && text(sourceBranch)) {
		const { sourceRemote } = value;
		if (sourceRemote !== void 0 && typeof sourceRemote !== "boolean") return void 0;
		return {
			mode,
			basePath,
			folderName,
			branch,
			sourceBranch,
			...sourceRemote ? { sourceRemote } : {}
		};
	}
	if (mode === "existing") {
		const { originBranch } = value;
		if (originBranch !== void 0 && !text(originBranch)) return void 0;
		return {
			mode,
			basePath,
			folderName,
			branch,
			...originBranch === void 0 ? {} : { originBranch }
		};
	}
}
function parseDeletion(body) {
	const { worktreePath, expectedBranch, deleteBranch, mergeInto } = body;
	if (!text(worktreePath) || expectedBranch !== null && !text(expectedBranch)) return void 0;
	if (deleteBranch !== void 0 && typeof deleteBranch !== "boolean") return void 0;
	if (mergeInto !== void 0 && !text(mergeInto)) return void 0;
	return {
		worktreePath,
		expectedBranch,
		...deleteBranch !== void 0 && { deleteBranch },
		...mergeInto !== void 0 && { mergeInto }
	};
}
function response(value, status = 200) {
	return Response.json(value, {
		status,
		headers: { "Cache-Control": "no-store" }
	});
}
function registerWorktreeRoutes(ctx, service, logger = NOOP_LOGGER) {
	return ctx.inject(["connection", "workspaceRegistry"], (scope) => {
		const { connection, workspaceRegistry } = scope;
		const route = (action) => ({
			path: `${prefix}/${action}`,
			methods: ["POST"],
			requestBody: "buffered",
			fetch: async (request) => {
				if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return response({ ok: false }, 415);
				const body = await request.json().catch(() => void 0);
				if (!isRecord(body) || !text(body.workspaceId)) return response({ ok: false }, 400);
				try {
					const workspace = workspaceRegistry.list().find((item) => item.id === body.workspaceId);
					if (workspace === void 0 || isHarnessProfilePath(workspace.path)) return response({ ok: false }, 404);
					if (action === "inspect") return response({
						ok: true,
						repository: await inspectWorktreeRepository(workspace.path)
					});
					const protectedDirs = [...service.list(), ...service.getDirectoriesForWorkspace(workspace.path)].filter((dir) => dir.readOnly);
					const checkWritable = (path) => {
						if (isHarnessProfilePath(path) || protectedDirs.some((dir) => isSubPath(path, dir.path))) throw new WorktreeError("readOnly");
					};
					if (action === "delete") {
						const deletion = parseDeletion(body);
						if (deletion === void 0) return response({ ok: false }, 400);
						protectedDirs.push(...service.getDirectoriesForWorkspace(deletion.worktreePath).filter((dir) => dir.readOnly));
						return response({
							ok: true,
							result: await deleteWorktree(workspace.path, deletion, checkWritable, (code, error) => {
								logger.record({
									event: "workspace-worktree-failed",
									level: "error",
									operation: action,
									data: {
										code,
										...worktreeFailureDetails(error),
										deleteBranch: deletion.deleteBranch === true,
										mergeRequested: deletion.mergeInto !== void 0
									}
								});
							})
						});
					}
					const selection = parseSelection(body.selection);
					if (selection === void 0) return response({ ok: false }, 400);
					const path = await prepareWorktree(workspace.path, selection, checkWritable);
					checkWritable(path);
					return response({
						ok: true,
						path
					});
				} catch (error) {
					const code = error instanceof WorktreeError ? error.code : "gitFailed";
					const failed = code === "gitFailed" || code === "worktreeRemoveFailed" || code === "mergeFailed";
					if (failed || action === "delete") logger.record({
						event: "workspace-worktree-failed",
						level: "error",
						operation: action,
						data: {
							code,
							...error instanceof Error ? worktreeFailureDetails(error) : {}
						}
					});
					return response({
						ok: false,
						code
					}, failed ? 500 : 409);
				}
			}
		});
		for (const action of [
			"inspect",
			"prepare",
			"delete"
		]) scope.effect(() => connection.fetch.register(route(action)));
	});
}
// src/host/context/workspaceDirectoriesContext.ts
/**
* Context and prompt injection for multi-directory workspaces.
* Inspired by Antigravity active workspaces and Codex multi-directory prompts.
*
* @module dsh-plugin-workspace-directories/context
*/
var WORKSPACE_DIRECTORIES_CONTEXT_KIND = "workspace-directories";
/**
* Возвращает стабильный отпечаток каталогов без служебного времени добавления.
* Порядок записей не влияет на результат, чтобы перестановка не считалась изменением.
*/
function getWorkspaceDirectoriesFingerprint(directories) {
	return JSON.stringify(directories.map((directory) => ({
		path: directory.path,
		alias: directory.alias,
		description: directory.description ?? "",
		readOnly: directory.readOnly
	})).toSorted((left, right) => left.path.localeCompare(right.path)));
}
/**
* Format the active workspace directories into a clear Markdown guide for the model.
*/
function formatWorkspaceDirectoriesPrompt(directories) {
	if (directories.length <= 1) return "";
	const lines = [
		"# Active Workspace Directories",
		"",
		"The workspace is configured with multiple linked directories:"
	];
	for (const dir of directories) {
		const isPrimary = dir.source === "primary" || dir.alias === "primary";
		const tag = `[${dir.alias}]`;
		const pathStr = `\`${dir.path}\``;
		const primaryLabel = isPrimary ? " (Primary root)" : "";
		const readOnlyLabel = dir.readOnly ? " [Read-Only]" : "";
		const desc = dir.description ? ` - ${dir.description}` : "";
		lines.push(`- ${tag} ${pathStr}${primaryLabel}${readOnlyLabel}${desc}`);
	}
	lines.push("");
	lines.push("**Navigation and Guidelines**:");
	lines.push("- All file reading, searching, and execution tools accept paths located inside any of these directories.");
	lines.push("- You can use full absolute paths or alias-prefixed paths (e.g. `[alias]/path/to/file` or `alias:path/to/file`).");
	lines.push("- Respect directories marked with `[Read-Only]`: only inspect and read from them, do not attempt to write or edit files there.");
	lines.push("- Place new project-specific outputs in the primary root unless explicitly directed otherwise.");
	return lines.join("\n");
}
/**
* Construct a UserMessage containing the multi-directory workspace context.
*/
function createWorkspaceDirectoriesMessage(directories) {
	const promptText = formatWorkspaceDirectoriesPrompt(directories);
	if (!promptText) return void 0;
	return createUserMessage({
		content: [{
			type: "text",
			text: promptText
		}],
		source: {
			kind: WORKSPACE_DIRECTORIES_CONTEXT_KIND,
			form: "instructions"
		}
	});
}
/**
* Check if a UserMessage is generated by this plugin.
*/
function isWorkspaceDirectoriesMessage(message) {
	return message.source.kind === WORKSPACE_DIRECTORIES_CONTEXT_KIND;
}
// src/host/services/AddirStorage.ts
/**
* Persistent storage for workspace-to-directories mappings.
* Saves directory associations durably under $DSH_HOME/storages/addir.json.
*
* @module dsh-workspace-manager/storage
*/
function getDefaultStoragePath() {
	const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
	return join(dshHome, "storages", "addir.json");
}
var AddirStorage = class {
	storageFilePath;
	memoryData;
	constructor(storageFilePath = getDefaultStoragePath()) {
		this.storageFilePath = storageFilePath;
		if (storageFilePath === ":memory:") this.memoryData = { workspaces: {} };
	}
	load() {
		if (this.memoryData) return JSON.parse(JSON.stringify(this.memoryData));
		try {
			if (!existsSync(this.storageFilePath)) return { workspaces: {} };
			const raw = readFileSync(this.storageFilePath, "utf-8");
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.workspaces === "object") return parsed;
			return { workspaces: {} };
		} catch {
			return { workspaces: {} };
		}
	}
	save(data) {
		if (this.memoryData) {
			this.memoryData = JSON.parse(JSON.stringify(data));
			return;
		}
		const dir = dirname(this.storageFilePath);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(this.storageFilePath, `${JSON.stringify(data, void 0, 2)}\n`, "utf-8");
	}
	getDirectories(workspacePath) {
		const canonical = canonicalizePath(workspacePath);
		return this.load().workspaces[canonical] ?? [];
	}
	addDirectory(workspacePath, entry) {
		const canonicalWorkspace = canonicalizePath(workspacePath);
		const canonicalEntryPath = canonicalizePath(entry.path);
		const data = this.load();
		const filtered = (data.workspaces[canonicalWorkspace] ?? []).filter((item) => canonicalizePath(item.path) !== canonicalEntryPath && item.alias !== entry.alias);
		filtered.push({
			...entry,
			path: canonicalEntryPath
		});
		data.workspaces[canonicalWorkspace] = filtered;
		this.save(data);
	}
	removeDirectory(workspacePath, pathOrAlias) {
		const canonicalWorkspace = canonicalizePath(workspacePath);
		const data = this.load();
		const list = data.workspaces[canonicalWorkspace];
		if (!list) return false;
		const initialLen = list.length;
		const canonicalTarget = canonicalizePath(pathOrAlias);
		const filtered = list.filter((item) => item.alias !== pathOrAlias && canonicalizePath(item.path) !== canonicalTarget);
		if (filtered.length !== initialLen) {
			data.workspaces[canonicalWorkspace] = filtered;
			this.save(data);
			return true;
		}
		return false;
	}
};
// src/host/services/WorkspaceDirectoriesService.ts
/**
* Implementation of the WorkspaceDirectoriesService.
*
* @module dsh-plugin-workspace-directories/service
*/
var WorkspaceDirectoriesServiceImpl = class {
	config;
	/**
	* Global directory map: canonicalPath -> LinkedDirectory
	*/
	globalEntries = /* @__PURE__ */ new Map();
	/**
	* Session-scoped directory entries: sessionId -> (canonicalPath -> LinkedDirectory)
	*/
	sessionEntries = /* @__PURE__ */ new Map();
	/**
	* Session primary cwd: sessionId -> canonicalPath
	*/
	sessionPrimaries = /* @__PURE__ */ new Map();
	/**
	* Global primary cwd fallback
	*/
	defaultPrimaryPath;
	/**
	* Persistent storage engine
	*/
	storage;
	constructor(config, defaultCwd = process.cwd(), storage) {
		this.config = config;
		this.storage = storage ?? new AddirStorage();
		this.defaultPrimaryPath = canonicalizePath(defaultCwd);
		if (!isHarnessProfilePath(this.defaultPrimaryPath)) {
			this.registerPrimary(this.defaultPrimaryPath);
			this.loadFromStorageForWorkspace(this.defaultPrimaryPath, this.globalEntries);
		}
		this.loadConfigDefaults();
	}
	loadFromStorageForWorkspace(workspaceRoot, targetMap) {
		for (const [path, entry] of targetMap) if (entry.source === "dynamic") targetMap.delete(path);
		try {
			const stored = this.storage.getDirectories(workspaceRoot);
			for (const item of stored) {
				const canonical = canonicalizePath(item.path);
				if (!existsSync(canonical) || !statSync(canonical).isDirectory()) continue;
				const entry = {
					path: canonical,
					alias: this.ensureUniqueAlias(item.alias, targetMap),
					...item.description ? { description: item.description } : {},
					readOnly: item.readOnly,
					addedAt: item.addedAt || Date.now(),
					source: "dynamic"
				};
				targetMap.set(canonical, entry);
			}
		} catch {}
	}
	loadConfigDefaults() {
		for (const dir of this.config.defaultDirectories) try {
			const canonical = canonicalizePath(dir.path);
			if (!existsSync(canonical) || !statSync(canonical).isDirectory()) continue;
			const alias = dir.alias || basename(canonical);
			const entry = {
				path: canonical,
				alias: this.ensureUniqueAlias(alias, this.globalEntries),
				...dir.description ? { description: dir.description } : {},
				readOnly: dir.readOnly ?? false,
				addedAt: Date.now(),
				source: "config"
			};
			this.globalEntries.set(canonical, entry);
		} catch {}
	}
	registerPrimary(cwd) {
		const canonical = canonicalizePath(cwd);
		const entry = {
			path: canonical,
			alias: "primary",
			description: "Primary workspace root (cwd)",
			readOnly: false,
			addedAt: Date.now(),
			source: "primary"
		};
		this.globalEntries.set(canonical, entry);
		return entry;
	}
	ensureUniqueAlias(desiredAlias, entries) {
		const existingAliases = new Set(Array.from(entries.values()).map((e) => e.alias));
		if (!existingAliases.has(desiredAlias)) return desiredAlias;
		let counter = 1;
		while (existingAliases.has(`${desiredAlias}-${counter}`)) counter++;
		return `${desiredAlias}-${counter}`;
	}
	getSessionMap(sessionId) {
		if (!sessionId) return this.globalEntries;
		let map = this.sessionEntries.get(sessionId);
		if (!map) {
			map = new Map(this.globalEntries);
			this.sessionEntries.set(sessionId, map);
		}
		return map;
	}
	getPrimaryPath(sessionId) {
		if (sessionId) return this.sessionPrimaries.get(sessionId) ?? this.defaultPrimaryPath;
		return this.defaultPrimaryPath;
	}
	setPrimary(cwd, sessionId) {
		const canonical = canonicalizePath(cwd);
		const entry = {
			path: canonical,
			alias: "primary",
			description: "Primary workspace root (cwd)",
			readOnly: false,
			addedAt: Date.now(),
			source: "primary"
		};
		if (sessionId) {
			this.sessionPrimaries.set(sessionId, canonical);
			const map = this.getSessionMap(sessionId);
			map.set(canonical, entry);
			this.loadFromStorageForWorkspace(canonical, map);
		} else {
			this.defaultPrimaryPath = canonical;
			this.globalEntries.set(canonical, entry);
			this.loadFromStorageForWorkspace(canonical, this.globalEntries);
		}
		return entry;
	}
	getDirectoriesForWorkspace(workspacePath) {
		const canonicalWorkspace = canonicalizePath(workspacePath);
		return this.storage.getDirectories(canonicalWorkspace).map((s) => ({
			path: s.path,
			alias: s.alias,
			description: s.description,
			readOnly: s.readOnly,
			addedAt: s.addedAt,
			source: "dynamic"
		}));
	}
	replaceWorkspaceDirectories(workspacePath, directories) {
		const workspace = canonicalizePath(workspacePath);
		const previous = this.storage.getDirectories(workspace);
		const paths = /* @__PURE__ */ new Set([workspace]);
		const aliases = /* @__PURE__ */ new Set(["primary"]);
		const entries = directories.map((directory) => {
			const path = canonicalizePath(isAbsolute(directory.path) ? directory.path : resolve(workspace, directory.path));
			if (!directory.path.trim() || !existsSync(path) || !statSync(path).isDirectory()) throw new Error(`Directory does not exist: "${directory.path}"`);
			if (paths.has(path)) throw new Error(`Duplicate or primary directory: "${path}"`);
			const explicitAlias = directory.alias?.trim();
			let alias = explicitAlias || basename(path);
			if (explicitAlias && aliases.has(alias)) throw new Error(`Duplicate directory alias: "${alias}"`);
			const baseAlias = alias;
			let suffix = 1;
			while (aliases.has(alias)) alias = `${baseAlias}-${suffix++}`;
			paths.add(path);
			aliases.add(alias);
			return {
				path,
				alias,
				readOnly: directory.readOnly ?? false,
				...directory.description?.trim() ? { description: directory.description.trim() } : {},
				addedAt: previous.find((entry) => entry.path === path)?.addedAt ?? Date.now()
			};
		});
		const data = this.storage.load();
		data.workspaces[workspace] = entries;
		this.storage.save(data);
		if (workspace === this.defaultPrimaryPath) this.loadFromStorageForWorkspace(workspace, this.globalEntries);
		for (const [sessionId, primary] of this.sessionPrimaries) {
			const map = this.sessionEntries.get(sessionId);
			if (primary === workspace && map) this.loadFromStorageForWorkspace(workspace, map);
		}
		return this.getDirectoriesForWorkspace(workspace);
	}
	async addDirectoryToWorkspace(workspacePath, options) {
		const canonicalWorkspace = canonicalizePath(workspacePath);
		const rawPath = options.path.trim();
		if (!rawPath) throw new Error("Directory path cannot be empty");
		const absPath = isAbsolute(rawPath) ? rawPath : resolve(canonicalWorkspace, rawPath);
		if (!existsSync(absPath)) throw new Error(`Directory does not exist: "${rawPath}"`);
		if (!statSync(absPath).isDirectory()) throw new Error(`Path is not a directory: "${rawPath}"`);
		const canonical = canonicalizePath(absPath);
		if (canonical === canonicalWorkspace) throw new Error("Cannot add primary workspace itself as an associated directory");
		const currentStored = this.storage.getDirectories(canonicalWorkspace);
		const existing = currentStored.find((d) => canonicalizePath(d.path) === canonical);
		if (existing) return {
			path: existing.path,
			alias: existing.alias,
			description: existing.description,
			readOnly: existing.readOnly,
			addedAt: existing.addedAt,
			source: "dynamic"
		};
		const baseName = basename(canonical) || "dir";
		const existingAliases = new Set(currentStored.map((d) => d.alias));
		let uniqueAlias = (options.alias?.trim() || baseName).replace(/[^a-zA-Z0-9_-]/g, "-");
		let counter = 1;
		const baseAlias = uniqueAlias;
		while (existingAliases.has(uniqueAlias)) {
			uniqueAlias = `${baseAlias}-${counter}`;
			counter++;
		}
		const storedEntry = {
			path: canonical,
			alias: uniqueAlias,
			...options.description ? { description: options.description.trim() } : {},
			readOnly: options.readOnly ?? false,
			addedAt: Date.now()
		};
		this.storage.addDirectory(canonicalWorkspace, storedEntry);
		if (this.defaultPrimaryPath === canonicalWorkspace) this.globalEntries.set(canonical, {
			...storedEntry,
			source: "dynamic"
		});
		for (const [sid, primary] of this.sessionPrimaries.entries()) if (primary === canonicalWorkspace) this.sessionEntries.get(sid)?.set(canonical, {
			...storedEntry,
			source: "dynamic"
		});
		return {
			...storedEntry,
			source: "dynamic"
		};
	}
	async removeDirectoryFromWorkspace(workspacePath, pathOrAlias) {
		const canonicalWorkspace = canonicalizePath(workspacePath);
		const target = pathOrAlias.trim();
		if (!target) return false;
		const ok = this.storage.removeDirectory(canonicalWorkspace, target);
		if (ok) {
			const clean = (map) => {
				for (const [p, e] of map.entries()) if (e.alias === target || e.path === target || canonicalizePath(e.path) === canonicalizePath(target)) {
					if (e.source !== "primary") map.delete(p);
				}
			};
			if (this.defaultPrimaryPath === canonicalWorkspace) clean(this.globalEntries);
			for (const [sid, primary] of this.sessionPrimaries.entries()) if (primary === canonicalWorkspace) {
				const map = this.sessionEntries.get(sid);
				if (map) clean(map);
			}
		}
		return ok;
	}
	list(sessionId) {
		const map = this.getSessionMap(sessionId);
		return Array.from(map.values());
	}
	get(pathOrAlias, sessionId) {
		const map = this.getSessionMap(sessionId);
		const canonical = canonicalizePath(pathOrAlias);
		const direct = map.get(canonical);
		if (direct) return direct;
		for (const entry of map.values()) if (entry.alias === pathOrAlias || entry.path === pathOrAlias) return entry;
	}
	async add(options, sessionId) {
		const rawPath = options.path.trim();
		if (!rawPath) throw new Error("Directory path cannot be empty");
		const primary = this.getPrimaryPath(sessionId);
		const absPath = isAbsolute(rawPath) ? rawPath : resolve(primary, rawPath);
		if (!existsSync(absPath)) throw new Error(`Directory does not exist: "${rawPath}"`);
		if (!statSync(absPath).isDirectory()) throw new Error(`Path is not a directory: "${rawPath}"`);
		const canonical = canonicalizePath(absPath);
		const map = this.getSessionMap(sessionId);
		const existing = map.get(canonical);
		if (existing) return existing;
		const baseName = basename(canonical) || "workspace-dir";
		const desiredAlias = (options.alias?.trim() || baseName).replace(/[^a-zA-Z0-9_-]/g, "-");
		const entry = {
			path: canonical,
			alias: this.ensureUniqueAlias(desiredAlias, map),
			...options.description ? { description: options.description.trim() } : {},
			readOnly: options.readOnly ?? false,
			addedAt: Date.now(),
			source: sessionId ? "dynamic" : "config"
		};
		map.set(canonical, entry);
		if (!sessionId) this.storage.addDirectory(primary, {
			path: entry.path,
			alias: entry.alias,
			...entry.description ? { description: entry.description } : {},
			readOnly: entry.readOnly,
			addedAt: entry.addedAt
		});
		return entry;
	}
	async remove(pathOrAlias, sessionId) {
		const target = pathOrAlias.trim();
		if (!target) return false;
		const map = this.getSessionMap(sessionId);
		const entry = this.get(target, sessionId);
		if (!entry) return false;
		if (entry.source === "primary" || entry.alias === "primary") throw new Error(`Cannot remove primary workspace root: "${entry.path}"`);
		if (!sessionId) {
			const primary = this.getPrimaryPath(sessionId);
			this.storage.removeDirectory(primary, entry.path);
		}
		return map.delete(entry.path);
	}
	resolvePath(target, sessionId) {
		const trimmed = target.trim();
		if (!trimmed) return trimmed;
		const bracketMatch = /^\[([^\]]+)\][/\\]?(.*)$/.exec(trimmed);
		if (bracketMatch) {
			const alias = bracketMatch[1] ?? "";
			const relativePart = bracketMatch[2] ?? "";
			const entry = this.get(alias, sessionId);
			if (entry) return canonicalizePath(resolve(entry.path, relativePart));
		}
		const colonMatch = /^([a-zA-Z0-9_-]+):(.*)$/.exec(trimmed);
		if (colonMatch) {
			const alias = colonMatch[1] ?? "";
			const relativePart = colonMatch[2] ?? "";
			const entry = this.get(alias, sessionId);
			if (entry) return canonicalizePath(resolve(entry.path, relativePart));
		}
		return canonicalizePath(resolve(this.getPrimaryPath(sessionId), trimmed));
	}
	isUnderWorkspace(targetPath, sessionId) {
		const list = this.list(sessionId);
		for (const dir of list) if (isSubPath(targetPath, dir.path)) return true;
		return false;
	}
	isReadOnly(targetPath, sessionId) {
		const list = this.list(sessionId);
		const primary = list.find((dir) => dir.source === "primary");
		for (const dir of list) {
			const readOnlyParentOfPrimary = primary !== void 0 && isSubPath(primary.path, dir.path) && isSubPath(targetPath, primary.path);
			if (dir.readOnly && !readOnlyParentOfPrimary && isSubPath(targetPath, dir.path)) return true;
		}
		return false;
	}
};
// src/host/tools/workspaceDirectoryTools.ts
var directorySchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		path: {
			type: "string",
			required: true
		},
		alias: {
			type: "string",
			required: true
		},
		description: { type: "string" },
		readOnly: {
			type: "boolean",
			required: true
		},
		addedAt: {
			type: "number",
			required: true
		},
		source: {
			type: "string",
			enum: [
				"primary",
				"config",
				"dynamic"
			],
			required: true
		}
	}
};
function toToolDirectory(entry) {
	return {
		path: entry.path,
		alias: entry.alias,
		...entry.description === void 0 ? {} : { description: entry.description },
		readOnly: entry.readOnly,
		addedAt: entry.addedAt,
		source: entry.source
	};
}
function createListTool(service, toolName = "addir_list") {
	return defineTool({
		name: toolName,
		description: "List all root and linked directories associated with the current workspace, including primary cwd, aliases, descriptions, and read-only flags.",
		parameters: { schemaVersion: {
			type: "string",
			const: "v1",
			description: "Optional format version."
		} },
		output: {
			schema: {
				type: "array",
				items: directorySchema
			},
			render: (_args, dirs) => {
				if (dirs.length === 0) return [{
					type: "text",
					text: "No directories associated."
				}];
				const lines = ["### Associated Workspace Directories:"];
				for (const directory of dirs) {
					const readOnly = directory.readOnly ? " `[Read-Only]`" : "";
					const primary = directory.source === "primary" ? " **(Primary Root)**" : "";
					const description = directory.description ? ` - ${directory.description}` : "";
					lines.push(`- **[${directory.alias}]** \`${directory.path}\`${primary}${readOnly}${description}`);
				}
				return [{
					type: "text",
					text: lines.join("\n")
				}];
			}
		},
		isConcurrencySafe: () => true,
		async execute(_args, exec) {
			const sessionId = exec.agent?.session.id;
			return service.list(sessionId).map(toToolDirectory);
		}
	});
}
function createAddTool(service, toolName = "addir_add") {
	return defineTool({
		name: toolName,
		description: "Associate an additional directory with the current workspace. Allows reading, searching, and operating on code in that directory. Inspired by Codex --add-dir.",
		parameters: {
			path: {
				type: "string",
				required: true,
				description: "Absolute or relative path to the directory to link."
			},
			alias: {
				type: "string",
				description: "Optional semantic alias (e.g. \"backend\", \"docs\", \"core-lib\")."
			},
			description: {
				type: "string",
				description: "Optional brief description of what the directory contains."
			},
			readOnly: {
				type: "boolean",
				description: "Whether to protect this directory as read-only (default: false)."
			}
		},
		output: {
			schema: directorySchema,
			render: (_args, directory) => {
				const readOnly = directory.readOnly ? " (Read-Only)" : "";
				return [{
					type: "text",
					text: `Successfully linked directory: [${directory.alias}] "${directory.path}"${readOnly}`
				}];
			}
		},
		isConcurrencySafe: () => false,
		async execute(args, exec) {
			const sessionId = exec.agent?.session.id;
			const addOptions = {
				path: String(args.path),
				...args.alias ? { alias: String(args.alias) } : {},
				...args.description ? { description: String(args.description) } : {},
				readOnly: typeof args.readOnly === "boolean" ? args.readOnly : false
			};
			return toToolDirectory(await service.add(addOptions, sessionId));
		}
	});
}
function createRemoveTool(service, toolName = "addir_remove") {
	return defineTool({
		name: toolName,
		description: "Remove a linked directory from the current workspace by path or alias. The primary workspace root cannot be removed.",
		parameters: { pathOrAlias: {
			type: "string",
			required: true,
			description: "The directory path or alias to unlink."
		} },
		output: {
			schema: { type: "boolean" },
			render: (args, success) => [{
				type: "text",
				text: success ? `Successfully unlinked directory "${args.pathOrAlias}".` : `Failed to unlink directory "${args.pathOrAlias}" (not found or not un-linkable).`
			}]
		},
		isConcurrencySafe: () => false,
		async execute(args, exec) {
			const sessionId = exec.agent?.session.id;
			return service.remove(String(args.pathOrAlias), sessionId);
		}
	});
}
// src/host/index.ts
/**
* Multi-Directory Workspace plugin entry for DeepSeek Harness.
* Inspired by Codex (--add-dir) and Google Antigravity (active multi-root workspaces).
*
* @module dsh-plugin-workspace-directories
*/
var name = "dsh-workspace-manager";
/**
* Service Provider wrapping WorkspaceDirectoriesServiceImpl for Cordis.
*/
var AddirProvider = class extends Service {
	static Config = Config;
	impl;
	contextState = /* @__PURE__ */ new Map();
	constructor(ctx, config = {}) {
		super(ctx, "dsh-workspace-manager");
		const resolved = resolveConfig(config);
		this.impl = new WorkspaceDirectoriesServiceImpl(resolved);
		if (resolved.enableTools) ctx.inject(["tools"], (toolsCtx) => {
			toolsCtx.effect(() => toolsCtx.tools.register(createListTool(this, "addir_list")));
			toolsCtx.effect(() => toolsCtx.tools.register(createAddTool(this, "addir_add")));
			toolsCtx.effect(() => toolsCtx.tools.register(createRemoveTool(this, "addir_remove")));
		});
		if (resolved.enableContextInjection) ctx.on("agent/pre-step", async ({ agent, turn }, next) => {
			const decision = await next();
			if (decision.kind === "reject") return decision;
			const sessionId = agent.session.id;
			const cwd = agent.session.header.cwd;
			if (cwd !== void 0) this.setPrimary(cwd, sessionId);
			const dirs = this.list(sessionId);
			const contextMsg = createWorkspaceDirectoriesMessage(dirs);
			if (!contextMsg) return decision;
			const fingerprint = getWorkspaceDirectoriesFingerprint(dirs);
			const previous = this.contextState.get(sessionId);
			if (!(previous === void 0 || previous.turn !== turn || previous.fingerprint !== fingerprint)) return decision;
			this.contextState.set(sessionId, {
				turn,
				fingerprint
			});
			const filteredMessages = decision.messages.filter((m) => !isWorkspaceDirectoriesMessage(m));
			return {
				...decision,
				messages: [contextMsg, ...filteredMessages]
			};
		});
		ctx.on("agent/disposed", ({ agent }) => {
			this.contextState.delete(agent.session.id);
		});
		if (resolved.enforceReadOnly) ctx.on("tools/execute", async (execution, next) => {
			const args = execution.arguments;
			if ([
				"write",
				"edit",
				"write_file",
				"edit_file"
			].includes(execution.name) && args && typeof args === "object") {
				const filePath = "file_path" in args ? args.file_path : "path" in args ? args.path : "target" in args ? args.target : void 0;
				if (typeof filePath === "string") {
					const sessionId = execution.agent?.session.id;
					const resolvedPath = this.resolvePath(filePath, sessionId);
					if (this.isReadOnly(resolvedPath, sessionId)) throw new Error(`Access Denied: Path "${filePath}" is inside a read-only workspace directory.`);
				}
			}
			return next();
		});
		let vscodeEnabled = resolved.vscodeEnabled;
		const logger = createOptionalLogger(ctx, "@kalex/dsh-workspace-manager");
		registerAddirRoutes(ctx, this.impl, resolved, (enabled) => {
			vscodeEnabled = enabled;
		}, logger);
		registerWorktreeRoutes(ctx, this.impl, logger);
		registerVscodeRoutes(ctx, () => vscodeEnabled, logger);
	}
	list(sessionId) {
		return this.impl.list(sessionId);
	}
	get(pathOrAlias, sessionId) {
		return this.impl.get(pathOrAlias, sessionId);
	}
	add(options, sessionId) {
		return this.impl.add(options, sessionId);
	}
	remove(pathOrAlias, sessionId) {
		return this.impl.remove(pathOrAlias, sessionId);
	}
	resolvePath(target, sessionId) {
		return this.impl.resolvePath(target, sessionId);
	}
	isUnderWorkspace(targetPath, sessionId) {
		return this.impl.isUnderWorkspace(targetPath, sessionId);
	}
	isReadOnly(targetPath, sessionId) {
		return this.impl.isReadOnly(targetPath, sessionId);
	}
	setPrimary(cwd, sessionId) {
		return this.impl.setPrimary(cwd, sessionId);
	}
	getDirectoriesForWorkspace(workspacePath) {
		return this.impl.getDirectoriesForWorkspace(workspacePath);
	}
	addDirectoryToWorkspace(workspacePath, options) {
		return this.impl.addDirectoryToWorkspace(workspacePath, options);
	}
	removeDirectoryFromWorkspace(workspacePath, pathOrAlias) {
		return this.impl.removeDirectoryFromWorkspace(workspacePath, pathOrAlias);
	}
	replaceWorkspaceDirectories(workspacePath, directories) {
		return this.impl.replaceWorkspaceDirectories(workspacePath, directories);
	}
};
/**
* Standard Cordis plugin entry function.
*/
function apply(ctx, config = {}) {
	return new AddirProvider(ctx, config);
}
export { AddirProvider, AddirProvider as WorkspaceDirectoriesProvider, apply, name };
