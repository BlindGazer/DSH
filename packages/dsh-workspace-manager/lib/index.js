import { Service } from "@deepseek-ai/cordis";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
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
	enforceReadOnly: z.boolean().default(true).description("Enforce write protections for read-only directories")
});
function resolveConfig(config = {}) {
	return {
		defaultDirectories: config.defaultDirectories ?? [],
		enableTools: config.enableTools ?? true,
		enableContextInjection: config.enableContextInjection ?? true,
		enforceReadOnly: config.enforceReadOnly ?? true
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
	const canonicalTarget = canonicalizePath(target);
	const canonicalRoot = canonicalizePath(root);
	if (canonicalTarget === canonicalRoot) return true;
	const relativePath = relative(canonicalRoot, canonicalTarget);
	return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}
function expandHome(value) {
	if (value === "~") return homedir();
	if (value.startsWith("~/")) return join(homedir(), value.slice(2));
	return value;
}
function isHarnessProfilePath(target) {
	const configuredHome = process.env.DSH_HOME?.trim();
	const homePath = configuredHome === void 0 || configuredHome === "" ? join(homedir(), ".dsh") : expandHome(configuredHome);
	return isSubPath(target, join(homePath, "profiles"));
}
// src/host/api/httpRoutes.ts
/**
* HTTP / REST API routes for Addir directory management.
* Consumed by the workspace editor and profile-wide settings.
*
* @module dsh-plugin-addir/api
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
function registerAddirRoutes(ctx, service, config = resolveConfig()) {
	return ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: "prefix",
			path: "/api/addir",
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
				const action = url.pathname.replace(/^\/api\/addir\/?/, "");
				try {
					if (action === "config") {
						if (req.method === "GET") {
							writeJson(res, 200, {
								ok: true,
								config
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
						const keys = [
							"enableTools",
							"enableContextInjection",
							"enforceReadOnly"
						];
						if (!body || keys.some((key) => typeof body[key] !== "boolean")) {
							writeJson(res, 400, {
								ok: false,
								error: "Configuration switches must be booleans"
							});
							return;
						}
						const editor = ctx.get("configEditor");
						const entry = editor?.entries().find((row) => row.options.name === "dsh-plugin-addir");
						if (!editor || !entry) {
							writeJson(res, 409, {
								ok: false,
								error: "Profile configuration editor is unavailable"
							});
							return;
						}
						await editor.edit(entry, (current) => ({
							...current,
							...Object.fromEntries(keys.map((key) => [key, body[key]]))
						}));
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
					writeJson(res, 500, {
						ok: false,
						error: err instanceof Error ? err.message : String(err)
					});
				}
			}
		}));
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
* @module dsh-plugin-addir/storage
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
		return canonicalizePath(trimmed);
	}
	isUnderWorkspace(targetPath, sessionId) {
		const list = this.list(sessionId);
		for (const dir of list) if (isSubPath(targetPath, dir.path)) return true;
		return false;
	}
	isReadOnly(targetPath, sessionId) {
		const list = this.list(sessionId);
		for (const dir of list) if (dir.readOnly && isSubPath(targetPath, dir.path)) return true;
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
var name = "dsh-plugin-addir";
/**
* Service Provider wrapping WorkspaceDirectoriesServiceImpl for Cordis.
*/
var AddirProvider = class extends Service {
	static Config = Config;
	impl;
	constructor(ctx, config = {}) {
		super(ctx, "addir");
		const resolved = resolveConfig(config);
		this.impl = new WorkspaceDirectoriesServiceImpl(resolved);
		if (resolved.enableTools) ctx.inject(["tools"], (toolsCtx) => {
			toolsCtx.effect(() => toolsCtx.tools.register(createListTool(this, "addir_list")));
			toolsCtx.effect(() => toolsCtx.tools.register(createAddTool(this, "addir_add")));
			toolsCtx.effect(() => toolsCtx.tools.register(createRemoveTool(this, "addir_remove")));
		});
		if (resolved.enableContextInjection) ctx.on("agent/pre-step", async ({ agent }, next) => {
			const decision = await next();
			if (decision.kind === "reject") return decision;
			const sessionId = agent.session.id;
			const cwd = agent.session.header.cwd;
			if (cwd !== void 0) this.setPrimary(cwd, sessionId);
			const contextMsg = createWorkspaceDirectoriesMessage(this.list(sessionId));
			if (!contextMsg) return decision;
			const filteredMessages = decision.messages.filter((m) => !isWorkspaceDirectoriesMessage(m));
			return {
				...decision,
				messages: [contextMsg, ...filteredMessages]
			};
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
		registerAddirRoutes(ctx, this.impl, resolved);
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
	const provider = new AddirProvider(ctx, config);
	ctx.provide("addir", provider);
}
export { AddirProvider, AddirProvider as WorkspaceDirectoriesProvider, apply, name };
