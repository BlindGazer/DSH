import { lstat, mkdir, open, readFile, readdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import path, { posix } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import os from "node:os";
// src/shared/constants/constants.ts
var PLUGIN_ID = "dsh-agents-router";
var PACKAGE_ID = "@kalex/dsh-agents-router";
var PREFIX = "/agents-router";
var CLIENT_PLUGIN_ID = `${PLUGIN_ID}-client`;
var AREA_CONTEXT = `${PLUGIN_ID}:areas`;
var RULE_CONTEXT = `${PLUGIN_ID}:rules`;
var USAGE_SECTION = `${PLUGIN_ID}:usage`;
var AREA_CONTEXT_ORDER = 140;
var RULE_CONTEXT_ORDER = 150;
var USAGE_SECTION_ORDER = 850;
var FILE_ERROR = "AGENTS_ROUTER_REPLAN_REQUIRED";
var DEFAULT_PROJECT_SETTINGS = Object.freeze({
	instructionsRoot: "agents",
	discoveryMode: "merge",
	rulesFolder: "rules",
	skillsFolder: "skills",
	mainFile: "agents.md",
	tokenBudget: 16e3,
	projectLogging: false,
	redirectRootInstructionFiles: false,
	rootInstructionFileNames: Object.freeze(["AGENTS.md"]),
	redirectInstructionDirectories: false,
	instructionDirectoryNames: Object.freeze([".cursor", ".claude"]),
	logCategories: Object.freeze({
		events: true,
		workset: true,
		rulesDiff: true,
		preflight: true
	})
});
var DEFAULT_GLOBAL_SETTINGS = Object.freeze({
	locale: "auto",
	theme: "auto",
	pollingIntervalMs: 3e3,
	globalLogging: false
});
// src/shared/constants/localizations/RouterLocalization.ts
var RouterLocalization = Object.freeze({
	en: {
		router: "Agents Router",
		settings: "Agents Router Settings"
	},
	ru: {
		router: "Agents Router",
		settings: "Настройки Agents Router"
	}
});
// src/host/api/httpRoutes.ts
var MAX_BODY = 65536;
function createRouterHandler(actions) {
	return (req, res) => {
		if (!sameOrigin(req)) return send(res, 403, { error: "cross-origin request denied" });
		dispatch(req, res, actions).catch((error) => {
			if (!res.headersSent) send(res, 500, { error: error.message });
		});
	};
}
async function dispatch(req, res, actions) {
	const url = new URL(req.url ?? "/", "http://localhost");
	if (!url.pathname.startsWith(`/agents-router/`)) return send(res, 404, { error: "not found" });
	const route = url.pathname.slice(PREFIX.length);
	if (route === "/global-settings" && req.method === "GET") return send(res, 200, await actions.globalSettings());
	if (route === "/state" && req.method === "GET") {
		const sessionId = url.searchParams.get("sessionId");
		if (!sessionId) return send(res, 400, { error: "sessionId is required" });
		const result = await actions.state(sessionId);
		return result?.ok === false ? sendResult(res, result) : send(res, 200, result);
	}
	if (route === "/audit" && req.method === "GET") {
		const sessionId = url.searchParams.get("sessionId");
		if (!sessionId) return send(res, 400, { error: "sessionId is required" });
		return sendResult(res, await actions.audit(sessionId));
	}
	if (![
		"/settings",
		"/refresh",
		"/reinitialize",
		"/reset",
		"/diagnose",
		"/open-file",
		"/workset",
		"/global-settings",
		"/audit/delete"
	].includes(route)) return send(res, 404, { error: "not found" });
	if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
	const parsed = await readJson(req);
	if (!parsed.ok || !parsed.value) return send(res, parsed.status ?? 400, { error: parsed.error ?? "invalid request" });
	const body = parsed.value;
	if (route === "/global-settings") {
		if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) return send(res, 400, { error: "settings must be a JSON object" });
		return sendResult(res, await actions.saveGlobalSettings(body.settings));
	}
	if (typeof body.sessionId !== "string" || body.sessionId.length === 0) return send(res, 400, { error: "sessionId is required" });
	if (route === "/audit/delete") return sendResult(res, await actions.deleteAudit(body.sessionId));
	if (route === "/settings") {
		if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) return send(res, 400, { error: "settings must be a JSON object" });
		return sendResult(res, await actions.saveSettings(body.sessionId, body.settings));
	}
	if (route === "/refresh") return sendResult(res, await actions.refresh(body.sessionId));
	if (route === "/reinitialize") {
		const result = await actions.reinitialize(body.sessionId);
		return result?.ok === false ? sendResult(res, result) : send(res, 200, result);
	}
	if (route === "/reset") return sendResult(res, await actions.reset(body.sessionId));
	if (route === "/diagnose") {
		if (typeof body.path !== "string" || body.path.trim() === "") return send(res, 400, { error: "path is required" });
		return sendResult(res, await actions.diagnose(body.sessionId, body.path));
	}
	if (route === "/open-file") {
		if (typeof body.path !== "string" || body.path.trim() === "") return send(res, 400, { error: "path is required" });
		return sendResult(res, await actions.openFile(body.sessionId, body.path));
	}
	if (typeof body.action !== "string" || typeof body.path !== "string" || body.path.trim() === "") return send(res, 400, { error: "workset action and path are required" });
	if (!["add", "release"].includes(body.action)) return send(res, 400, { error: "workset action must be \"add\" or \"release\"" });
	return sendResult(res, await actions.workset(body.sessionId, body.action, body.path));
}
async function readJson(req) {
	const chunks = [];
	let size = 0;
	try {
		for await (const chunk of req) {
			size += chunk.length;
			if (size > MAX_BODY) return {
				ok: false,
				status: 413,
				error: "request body too large"
			};
			chunks.push(chunk);
		}
		const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		if (!value || typeof value !== "object" || Array.isArray(value)) return {
			ok: false,
			status: 400,
			error: "request body must be a JSON object"
		};
		return {
			ok: true,
			value
		};
	} catch {
		return {
			ok: false,
			status: 400,
			error: "invalid JSON request body"
		};
	}
}
function sameOrigin(req) {
	if (req.headers?.["sec-fetch-site"] === "cross-site") return false;
	const origin = req.headers?.origin;
	if (typeof origin !== "string") return true;
	try {
		return new URL(origin).host === req.headers.host;
	} catch {
		return false;
	}
}
function sendResult(res, result) {
	send(res, (result?.ok === false ? result.status : void 0) ?? 200, result?.ok === false ? { error: result.error ?? "unknown error" } : result ?? {});
}
function send(res, status, payload) {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(payload));
}
// src/host/services/metrics.ts
function roughTokenEstimate(text) {
	let tokens = 0;
	for (const character of text) tokens += (character.codePointAt(0) ?? 0) < 128 ? .25 : .7;
	return Math.ceil(tokens);
}
function computeRuleMetrics(state) {
	const text = [state.text, state.areaText].filter(Boolean).join("\n");
	return {
		characters: state.text.length,
		estTokens: roughTokenEstimate(text)
	};
}
function computeContextMetrics(state, availableSkills, modelSkills, messages) {
	const invoked = messages.filter((message) => message.source?.kind === "skill-invocation");
	const loadedNames = [...new Set(invoked.map((message) => message.source?.name).filter((name) => typeof name === "string"))];
	const loadedSkillCharacters = invoked.reduce((total, message) => total + messageCharacters(message), 0);
	const uniqueLoadedCharacters = [...new Set(invoked.map(messageText))].reduce((total, text) => total + text.length, 0);
	const skillCatalogCharacters = modelSkills.reduce((total, skill) => total + skill.name.length + skill.description.length, 0);
	let runtimeSections = [];
	for (const message of messages) {
		const source = message.source;
		if (source?.kind === "runtime-context") runtimeSections = source.form === "snapshot" && Array.isArray(source.sections) ? source.sections : [];
	}
	const currentSections = runtimeSections.filter((section) => section.name === "dsh-agents-router:areas" || section.name === "dsh-agents-router:rules");
	const catalogMessages = messages.filter((message) => message.source?.kind === "skill-catalog");
	const currentSetText = [
		state.text,
		state.areaText,
		...modelSkills.map((skill) => `/${skill.name} ${skill.description}`)
	].filter(Boolean).join("\n");
	const uniqueCurrentSetCharacters = currentSetText.length;
	const visiblePieces = [
		...currentSections.map((section) => typeof section.text === "string" ? section.text : ""),
		...catalogMessages.length ? [messageText(catalogMessages.at(-1))] : [],
		...invoked.map(messageText)
	].filter(Boolean);
	const visibleKnownPluginCharacters = visiblePieces.reduce((total, text) => total + text.length, 0);
	const estimatedTokens = roughTokenEstimate(visiblePieces.length ? visiblePieces.join("\n") : currentSetText);
	return {
		rules: {
			count: state.rules.length,
			characters: state.text.length
		},
		areaCatalog: {
			count: [...state.snapshot.areas.values()].filter((area) => area.enabled && area.available).length,
			characters: state.areaText.length
		},
		skillCatalog: {
			count: modelSkills.length,
			characters: skillCatalogCharacters
		},
		ownSkills: {
			count: availableSkills.length,
			userCommands: availableSkills.filter((skill) => skill.invocation?.userInvocable !== false).length
		},
		loadedSkills: {
			count: loadedNames.length,
			names: loadedNames,
			characters: loadedSkillCharacters,
			scope: "visible skill-invocation-tagged messages only"
		},
		uniqueCurrentSetCharacters,
		uniqueRecognizedSkillBodyCharacters: uniqueLoadedCharacters,
		visibleKnownPluginCharacters,
		estimatedTokens,
		estimatedOverSoftBudget: estimatedTokens > state.settings.tokenBudget,
		unit: "characters plus rough token heuristic",
		note: "Current-set characters include the latest rules, areas and model-callable catalog, not skill bodies that are not re-read for metrics. Visible characters cover recognized runtime snapshots, the latest skill catalog and skill-invocation messages only. Before those messages exist, the estimate falls back to the current set. Token estimate is a rough script-sensitive heuristic, not the selected provider tokenizer; hidden tool results and context overhead may be absent. Treat the soft-budget flag as advisory.",
		tokenBudget: state.settings.tokenBudget
	};
}
function messageText(message) {
	return (message?.content ?? []).filter((block) => block.type === "text").map((block) => block.text).join("");
}
function messageCharacters(message) {
	return messageText(message).length;
}
// src/host/services/auditLogger.ts
function shouldSkipBatchAudit(state, batchKey, addedPaths, hasMissingRules, hasBatchError) {
	return addedPaths.length === 0 && !hasMissingRules && !hasBatchError && state.lastLoggedBatchKey === batchKey;
}
async function recordAudit(state, store, { event, workset, preflight, diagnostics, batchKey } = {}) {
	const previous = state.auditRules ?? /* @__PURE__ */ new Map();
	const current = new Map(state.rules.map((rule) => [rule.sourcePath, rule]));
	const added = [...current].filter(([source]) => !previous.has(source));
	const evicted = [...previous].filter(([source]) => !current.has(source));
	const revised = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash !== rule.hash);
	const unchanged = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash === rule.hash);
	const knownDiagnostics = state.lastLoggedDiagKeys ?? /* @__PURE__ */ new Set();
	const newDiagnostics = (diagnostics ?? []).filter((item) => !knownDiagnostics.has(diagnosticKey$1(item)));
	for (const item of diagnostics ?? []) knownDiagnostics.add(diagnosticKey$1(item));
	if (event === "prompt_assemble" && !added.length && !evicted.length && !revised.length && !newDiagnostics.length) return false;
	const categories = state.settings.logCategories;
	const lines = [];
	if (categories.events && event) lines.push(`event: ${event}`);
	if (categories.workset && workset) lines.push(`workset: ${workset}`);
	if (categories.rulesDiff) {
		const metrics = computeRuleMetrics(state);
		lines.push("rules_diff:", `  active: ${current.size} | chars: ${metrics.characters} | est_tokens: ${metrics.estTokens}`);
		for (const [source, rule] of added) {
			const matchReason = rule.appliesTo.includes("always") ? "always" : `area=${rule.area}; rule=${rule.path?.join(" OR ") || "unrestricted"}; file=${rule.appliesTo.join(", ")}`;
			lines.push(`  + ${source} @${rule.hash?.slice(0, 8) ?? "unknown"} [${matchReason}] (${rule.content?.length ?? 0}c)`);
		}
		if (evicted.length) lines.push(`  evicted: ${evicted.map(([source]) => `${source} (no longer selected)`).join(", ")}`);
		if (revised.length) lines.push(`  rev_changed: ${revised.map(([source, rule]) => `${source} old=${previous.get(source)?.hash?.slice(0, 8) ?? "unknown"} new=${rule.hash?.slice(0, 8) ?? "unknown"} (source revision changed)`).join(", ")}`);
		const unchangedAlways = unchanged.filter(([, rule]) => rule.appliesTo.includes("always")).length;
		const unchangedMatched = unchanged.length - unchangedAlways;
		lines.push(`  unchanged: ${unchanged.length}${unchanged.length ? ` (${unchangedAlways} always, ${unchangedMatched} matched)` : ""} | evicted: ${evicted.length} | rev_changed: ${revised.length}`);
	}
	if (categories.preflight && (preflight || newDiagnostics.length)) {
		if (preflight) lines.push(`diagnostics: ${preflight}`);
		if (newDiagnostics.length) lines.push(`diagnostics: warnings: ${newDiagnostics.length} [${[...new Set(newDiagnostics.map((item) => item.code))].join(", ")}]`);
	}
	if (!lines.length) return false;
	try {
		if (!await store.appendAuditLog(state.projectRoot, state.sessionId, lines.join("\n"))) return false;
		state.auditRules = current;
		state.lastLoggedDiagKeys = knownDiagnostics;
		if (batchKey && event?.startsWith("file_preflight")) state.lastLoggedBatchKey = batchKey;
		return true;
	} catch (error) {
		state.auditWarning = `audit log could not be written: ${error instanceof Error ? error.message : String(error)}`;
		return false;
	}
}
function diagnosticKey$1(item) {
	return item.key ?? `${item.code}:${item.path ?? ""}:${item.message}`;
}
// src/host/services/areaHierarchy.ts
/** Проверяет родительские области без зависимости файлового обхода от селектора правил. */
function parentsAvailable(area, areas) {
	let parent = area.parent;
	while (parent) {
		const item = areas.get(parent);
		if (!item?.enabled || item.available === false) return false;
		parent = item.parent;
	}
	return true;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR$1 = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR$1;
var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
function isCollection(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case MAP:
		case SEQ: return true;
	}
	return false;
}
function isNode(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case ALIAS:
		case MAP:
		case SCALAR$1:
		case SEQ: return true;
	}
	return false;
}
var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/visit.js
var BREAK$1 = Symbol("break visit");
var SKIP$1 = Symbol("skip children");
var REMOVE$1 = Symbol("remove node");
/**
* Apply a visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
function visit$1(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (visit_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else visit_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visit$1.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visit$1.SKIP = SKIP$1;
/** Remove the current node */
visit$1.REMOVE = REMOVE$1;
function visit_(key, node, visitor, path) {
	const ctrl = callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visit_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = visit_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = visit_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = visit_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
/**
* Apply an async visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `Promise`: Must resolve to one of the following values
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
async function visitAsync(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (await visitAsync_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else await visitAsync_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visitAsync.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visitAsync.SKIP = SKIP$1;
/** Remove the current node */
visitAsync.REMOVE = REMOVE$1;
async function visitAsync_(key, node, visitor, path) {
	const ctrl = await callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visitAsync_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = await visitAsync_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = await visitAsync_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = await visitAsync_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
function initVisitor(visitor) {
	if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) return Object.assign({
		Alias: visitor.Node,
		Map: visitor.Node,
		Scalar: visitor.Node,
		Seq: visitor.Node
	}, visitor.Value && {
		Map: visitor.Value,
		Scalar: visitor.Value,
		Seq: visitor.Value
	}, visitor.Collection && {
		Map: visitor.Collection,
		Seq: visitor.Collection
	}, visitor);
	return visitor;
}
function callVisitor(key, node, visitor, path) {
	if (typeof visitor === "function") return visitor(key, node, path);
	if (isMap(node)) return visitor.Map?.(key, node, path);
	if (isSeq(node)) return visitor.Seq?.(key, node, path);
	if (isPair(node)) return visitor.Pair?.(key, node, path);
	if (isScalar(node)) return visitor.Scalar?.(key, node, path);
	if (isAlias(node)) return visitor.Alias?.(key, node, path);
}
function replaceNode(key, path, node) {
	const parent = path[path.length - 1];
	if (isCollection(parent)) parent.items[key] = node;
	else if (isPair(parent)) {
		if (key === "key") parent.key = node;
		else parent.value = node;
	} else if (isDocument(parent)) parent.contents = node;
	else {
		const pt = isAlias(parent) ? "alias" : "scalar";
		throw new Error(`Cannot replace node with ${pt} parent`);
	}
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
	"!": "%21",
	",": "%2C",
	"[": "%5B",
	"]": "%5D",
	"{": "%7B",
	"}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class Directives {
	constructor(yaml, tags) {
		/**
		* The directives-end/doc-start marker `---`. If `null`, a marker may still be
		* included in the document's stringified representation.
		*/
		this.docStart = null;
		/** The doc-end marker `...`.  */
		this.docEnd = false;
		this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
		this.tags = Object.assign({}, Directives.defaultTags, tags);
	}
	clone() {
		const copy = new Directives(this.yaml, this.tags);
		copy.docStart = this.docStart;
		return copy;
	}
	/**
	* During parsing, get a Directives instance for the current document and
	* update the stream state according to the current version's spec.
	*/
	atDocument() {
		const res = new Directives(this.yaml, this.tags);
		switch (this.yaml.version) {
			case "1.1":
				this.atNextDocument = true;
				break;
			case "1.2":
				this.atNextDocument = false;
				this.yaml = {
					explicit: Directives.defaultYaml.explicit,
					version: "1.2"
				};
				this.tags = Object.assign({}, Directives.defaultTags);
		}
		return res;
	}
	/**
	* @param onError - May be called even if the action was successful
	* @returns `true` on success
	*/
	add(line, onError) {
		if (this.atNextDocument) {
			this.yaml = {
				explicit: Directives.defaultYaml.explicit,
				version: "1.1"
			};
			this.tags = Object.assign({}, Directives.defaultTags);
			this.atNextDocument = false;
		}
		const parts = line.trim().split(/[ \t]+/);
		const name = parts.shift();
		switch (name) {
			case "%TAG": {
				if (parts.length !== 2) {
					onError(0, "%TAG directive should contain exactly two parts");
					if (parts.length < 2) return false;
				}
				const [handle, prefix] = parts;
				this.tags[handle] = prefix;
				return true;
			}
			case "%YAML": {
				this.yaml.explicit = true;
				if (parts.length !== 1) {
					onError(0, "%YAML directive should contain exactly one part");
					return false;
				}
				const [version] = parts;
				if (version === "1.1" || version === "1.2") {
					this.yaml.version = version;
					return true;
				} else {
					const isValid = /^\d+\.\d+$/.test(version);
					onError(6, `Unsupported YAML version ${version}`, isValid);
					return false;
				}
			}
			default:
				onError(0, `Unknown directive ${name}`, true);
				return false;
		}
	}
	/**
	* Resolves a tag, matching handles to those defined in %TAG directives.
	*
	* @returns Resolved tag, which may also be the non-specific tag `'!'` or a
	*   `'!local'` tag, or `null` if unresolvable.
	*/
	tagName(source, onError) {
		if (source === "!") return "!";
		if (source[0] !== "!") {
			onError(`Not a valid tag: ${source}`);
			return null;
		}
		if (source[1] === "<") {
			const verbatim = source.slice(2, -1);
			if (verbatim === "!" || verbatim === "!!") {
				onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
				return null;
			}
			if (source[source.length - 1] !== ">") onError("Verbatim tags must end with a >");
			return verbatim;
		}
		const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
		if (!suffix) onError(`The ${source} tag has no suffix`);
		const prefix = this.tags[handle];
		if (prefix) try {
			return prefix + decodeURIComponent(suffix);
		} catch (error) {
			onError(String(error));
			return null;
		}
		if (handle === "!") return source;
		onError(`Could not resolve tag: ${source}`);
		return null;
	}
	/**
	* Given a fully resolved tag, returns its printable string form,
	* taking into account current tag prefixes and defaults.
	*/
	tagString(tag) {
		for (const [handle, prefix] of Object.entries(this.tags)) if (tag.startsWith(prefix)) return handle + escapeTagName(tag.substring(prefix.length));
		return tag[0] === "!" ? tag : `!<${tag}>`;
	}
	toString(doc) {
		const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
		const tagEntries = Object.entries(this.tags);
		let tagNames;
		if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
			const tags = {};
			visit$1(doc.contents, (_key, node) => {
				if (isNode(node) && node.tag) tags[node.tag] = true;
			});
			tagNames = Object.keys(tags);
		} else tagNames = [];
		for (const [handle, prefix] of tagEntries) {
			if (handle === "!!" && prefix === "tag:yaml.org,2002:") continue;
			if (!doc || tagNames.some((tn) => tn.startsWith(prefix))) lines.push(`%TAG ${handle} ${prefix}`);
		}
		return lines.join("\n");
	}
};
Directives.defaultYaml = {
	explicit: false,
	version: "1.2"
};
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/anchors.js
/**
* Verify that the input string is a valid anchor.
*
* Will throw on errors.
*/
function anchorIsValid(anchor) {
	if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
		const msg = `Anchor must not contain whitespace or control characters: ${JSON.stringify(anchor)}`;
		throw new Error(msg);
	}
	return true;
}
function anchorNames(root) {
	const anchors = /* @__PURE__ */ new Set();
	visit$1(root, { Value(_key, node) {
		if (node.anchor) anchors.add(node.anchor);
	} });
	return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
function findNewAnchor(prefix, exclude) {
	for (let i = 1;; ++i) {
		const name = `${prefix}${i}`;
		if (!exclude.has(name)) return name;
	}
}
function createNodeAnchors(doc, prefix) {
	const aliasObjects = [];
	const sourceObjects = /* @__PURE__ */ new Map();
	let prevAnchors = null;
	return {
		onAnchor: (source) => {
			aliasObjects.push(source);
			prevAnchors ?? (prevAnchors = anchorNames(doc));
			const anchor = findNewAnchor(prefix, prevAnchors);
			prevAnchors.add(anchor);
			return anchor;
		},
		/**
		* With circular references, the source node is only resolved after all
		* of its child nodes are. This is why anchors are set only after all of
		* the nodes have been created.
		*/
		setAnchors: () => {
			for (const source of aliasObjects) {
				const ref = sourceObjects.get(source);
				if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) ref.node.anchor = ref.anchor;
				else {
					const error = /* @__PURE__ */ new Error("Failed to resolve repeated object (this should not happen)");
					error.source = source;
					throw error;
				}
			}
		},
		sourceObjects
	};
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/applyReviver.js
/**
* Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
* in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
* 2021 edition: https://tc39.es/ecma262/#sec-json.parse
*
* Includes extensions for handling Map and Set objects.
*/
function applyReviver(reviver, obj, key, val) {
	if (val && typeof val === "object") {
		if (Array.isArray(val)) for (let i = 0, len = val.length; i < len; ++i) {
			const v0 = val[i];
			const v1 = applyReviver(reviver, val, String(i), v0);
			if (v1 === void 0) delete val[i];
			else if (v1 !== v0) val[i] = v1;
		}
		else if (val instanceof Map) for (const k of Array.from(val.keys())) {
			const v0 = val.get(k);
			const v1 = applyReviver(reviver, val, k, v0);
			if (v1 === void 0) val.delete(k);
			else if (v1 !== v0) val.set(k, v1);
		}
		else if (val instanceof Set) for (const v0 of Array.from(val)) {
			const v1 = applyReviver(reviver, val, v0, v0);
			if (v1 === void 0) val.delete(v0);
			else if (v1 !== v0) {
				val.delete(v0);
				val.add(v1);
			}
		}
		else for (const [k, v0] of Object.entries(val)) {
			const v1 = applyReviver(reviver, val, k, v0);
			if (v1 === void 0) delete val[k];
			else if (v1 !== v0) val[k] = v1;
		}
	}
	return reviver.call(obj, key, val);
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/toJS.js
/**
* Recursively convert any node or its contents to native JavaScript
*
* @param value - The input value
* @param arg - If `value` defines a `toJSON()` method, use this
*   as its first argument
* @param ctx - Conversion context, originally set in Document#toJS(). If
*   `{ keep: true }` is not set, output should be suitable for JSON
*   stringification.
*/
function toJS(value, arg, ctx) {
	if (Array.isArray(value)) return value.map((v, i) => toJS(v, String(i), ctx));
	if (value && typeof value.toJSON === "function") {
		if (!ctx || !hasAnchor(value)) return value.toJSON(arg, ctx);
		const data = {
			aliasCount: 0,
			count: 1,
			res: void 0
		};
		ctx.anchors.set(value, data);
		ctx.onCreate = (res) => {
			data.res = res;
			delete ctx.onCreate;
		};
		const res = value.toJSON(arg, ctx);
		if (ctx.onCreate) ctx.onCreate(res);
		return res;
	}
	if (typeof value === "bigint" && !ctx?.keep) return Number(value);
	return value;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
	constructor(type) {
		Object.defineProperty(this, NODE_TYPE, { value: type });
	}
	/** Create a copy of this node.  */
	clone() {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** A plain JavaScript representation of this node. */
	toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		if (!isDocument(doc)) throw new TypeError("A document argument is required");
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc,
			keep: true,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this, "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
	constructor(source) {
		super(ALIAS);
		this.source = source;
		Object.defineProperty(this, "tag", { set() {
			throw new Error("Alias nodes cannot have tags");
		} });
	}
	/**
	* Resolve the value of this alias within `doc`, finding the last
	* instance of the `source` anchor before this node.
	*/
	resolve(doc, ctx) {
		if (ctx?.maxAliasCount === 0) throw new ReferenceError("Alias resolution is disabled");
		let nodes;
		if (ctx?.aliasResolveCache) nodes = ctx.aliasResolveCache;
		else {
			nodes = [];
			visit$1(doc, { Node: (_key, node) => {
				if (isAlias(node) || hasAnchor(node)) nodes.push(node);
			} });
			if (ctx) ctx.aliasResolveCache = nodes;
		}
		let found = void 0;
		for (const node of nodes) {
			if (node === this) break;
			if (node.anchor === this.source) found = node;
		}
		if (found && ctx) {
			const { anchors, doc, maxAliasCount } = ctx;
			let data = anchors.get(found);
			if (!data) {
				toJS(found, null, ctx);
				data = anchors.get(found);
			}
			/* istanbul ignore if */
			if (data?.res === void 0) throw new ReferenceError("This should not happen: Alias anchor was not resolved?");
			if (maxAliasCount >= 0) {
				data.count += 1;
				if (data.aliasCount === 0) data.aliasCount = getAliasCount(doc, found, anchors);
				if (data.count * data.aliasCount > maxAliasCount) throw new ReferenceError("Excessive alias count indicates a resource exhaustion attack");
			}
		}
		return found;
	}
	toJSON(_arg, ctx) {
		if (!ctx) return { source: this.source };
		const source = this.resolve(ctx.doc, ctx);
		if (!source) {
			const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
			throw new ReferenceError(msg);
		}
		return ctx.anchors.get(source).res;
	}
	toString(ctx, _onComment, _onChompKeep) {
		const src = `*${this.source}`;
		if (ctx) {
			anchorIsValid(this.source);
			if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
				const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
				throw new Error(msg);
			}
			if (ctx.implicitKey) return `${src} `;
		}
		return src;
	}
};
function getAliasCount(doc, node, anchors) {
	if (isAlias(node)) {
		const source = node.resolve(doc);
		const anchor = anchors && source && anchors.get(source);
		return anchor ? anchor.count * anchor.aliasCount : 0;
	} else if (isCollection(node)) {
		let count = 0;
		for (const item of node.items) {
			const c = getAliasCount(doc, item, anchors);
			if (c > count) count = c;
		}
		return count;
	} else if (isPair(node)) {
		const kc = getAliasCount(doc, node.key, anchors);
		const vc = getAliasCount(doc, node.value, anchors);
		return Math.max(kc, vc);
	}
	return 1;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
	constructor(value) {
		super(SCALAR$1);
		this.value = value;
	}
	toJSON(arg, ctx) {
		return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
	}
	toString() {
		return String(this.value);
	}
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
	if (tagName) {
		const match = tags.filter((t) => t.tag === tagName);
		const tagObj = match.find((t) => !t.format) ?? match[0];
		if (!tagObj) throw new Error(`Tag ${tagName} not found`);
		return tagObj;
	}
	return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
	if (isDocument(value)) value = value.contents;
	if (isNode(value)) return value;
	if (isPair(value)) {
		const map = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
		map.items.push(value);
		return map;
	}
	if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) value = value.valueOf();
	const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
	let ref = void 0;
	if (aliasDuplicateObjects && value && typeof value === "object") {
		ref = sourceObjects.get(value);
		if (ref) {
			ref.anchor ?? (ref.anchor = onAnchor(value));
			return new Alias(ref.anchor);
		} else {
			ref = {
				anchor: null,
				node: null
			};
			sourceObjects.set(value, ref);
		}
	}
	if (tagName?.startsWith("!!")) tagName = defaultTagPrefix + tagName.slice(2);
	let tagObj = findTagObject(value, tagName, schema.tags);
	if (!tagObj) {
		if (value && typeof value.toJSON === "function") value = value.toJSON();
		if (!value || typeof value !== "object") {
			const node = new Scalar(value);
			if (ref) ref.node = node;
			return node;
		}
		tagObj = value instanceof Map ? schema[MAP] : Symbol.iterator in Object(value) ? schema[SEQ] : schema[MAP];
	}
	if (onTagObj) {
		onTagObj(tagObj);
		delete ctx.onTagObj;
	}
	const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
	if (tagName) node.tag = tagName;
	else if (!tagObj.default) node.tag = tagObj.tag;
	if (ref) ref.node = node;
	return node;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema, path, value) {
	let v = value;
	for (let i = path.length - 1; i >= 0; --i) {
		const k = path[i];
		if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
			const a = [];
			a[k] = v;
			v = a;
		} else v = /* @__PURE__ */ new Map([[k, v]]);
	}
	return createNode(v, void 0, {
		aliasDuplicateObjects: false,
		keepUndefined: false,
		onAnchor: () => {
			throw new Error("This should not happen, please report a bug.");
		},
		schema,
		sourceObjects: /* @__PURE__ */ new Map()
	});
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
	constructor(type, schema) {
		super(type);
		Object.defineProperty(this, "schema", {
			value: schema,
			configurable: true,
			enumerable: false,
			writable: true
		});
	}
	/**
	* Create a copy of this collection.
	*
	* @param schema - If defined, overwrites the original's schema
	*/
	clone(schema) {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (schema) copy.schema = schema;
		copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema) : it);
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/**
	* Adds a value to the collection. For `!!map` and `!!omap` the value must
	* be a Pair instance or a `{ key, value }` object, which may not have a key
	* that already exists in the map.
	*/
	addIn(path, value) {
		if (isEmptyPath(path)) this.add(value);
		else {
			const [key, ...rest] = path;
			const node = this.get(key, true);
			if (isCollection(node)) node.addIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
	/**
	* Removes a value from the collection.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.delete(key);
		const node = this.get(key, true);
		if (isCollection(node)) return node.deleteIn(rest);
		else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		const [key, ...rest] = path;
		const node = this.get(key, true);
		if (rest.length === 0) return !keepScalar && isScalar(node) ? node.value : node;
		else return isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
	}
	hasAllNullValues(allowScalar) {
		return this.items.every((node) => {
			if (!isPair(node)) return false;
			const n = node.value;
			return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
		});
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*/
	hasIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.has(key);
		const node = this.get(key, true);
		return isCollection(node) ? node.hasIn(rest) : false;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		const [key, ...rest] = path;
		if (rest.length === 0) this.set(key, value);
		else {
			const node = this.get(key, true);
			if (isCollection(node)) node.setIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyComment.js
/**
* Stringifies a comment.
*
* Empty comment lines are left empty,
* lines consisting of a single space are replaced by `#`,
* and all other lines are prefixed with a `#`.
*/
var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
	if (/^\n+$/.test(comment)) return comment.substring(1);
	return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
/**
* Tries to keep input at up to `lineWidth` characters, splitting only on spaces
* not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
* terminated with `\n` and started with `indent`.
*/
function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
	if (!lineWidth || lineWidth < 0) return text;
	if (lineWidth < minContentWidth) minContentWidth = 0;
	const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
	if (text.length <= endStep) return text;
	const folds = [];
	const escapedFolds = {};
	let end = lineWidth - indent.length;
	if (typeof indentAtStart === "number") {
		if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);
		else end = lineWidth - indentAtStart;
	}
	let split = void 0;
	let prev = void 0;
	let overflow = false;
	let i = -1;
	let escStart = -1;
	let escEnd = -1;
	if (mode === "block") {
		i = consumeMoreIndentedLines(text, i, indent.length);
		if (i !== -1) end = i + endStep;
	}
	for (let ch; ch = text[i += 1];) {
		if (mode === "quoted" && ch === "\\") {
			escStart = i;
			switch (text[i + 1]) {
				case "x":
					i += 3;
					break;
				case "u":
					i += 5;
					break;
				case "U":
					i += 9;
					break;
				default: i += 1;
			}
			escEnd = i;
		}
		if (ch === "\n") {
			if (mode === "block") i = consumeMoreIndentedLines(text, i, indent.length);
			end = i + indent.length + endStep;
			split = void 0;
		} else {
			if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
				const next = text[i + 1];
				if (next && next !== " " && next !== "\n" && next !== "	") split = i;
			}
			if (i >= end) {
				if (split) {
					folds.push(split);
					end = split + endStep;
					split = void 0;
				} else if (mode === "quoted") {
					while (prev === " " || prev === "	") {
						prev = ch;
						ch = text[i += 1];
						overflow = true;
					}
					const j = i > escEnd + 1 ? i - 2 : escStart - 1;
					if (escapedFolds[j]) return text;
					folds.push(j);
					escapedFolds[j] = true;
					end = j + endStep;
					split = void 0;
				} else overflow = true;
			}
		}
		prev = ch;
	}
	if (overflow && onOverflow) onOverflow();
	if (folds.length === 0) return text;
	if (onFold) onFold();
	let res = text.slice(0, folds[0]);
	for (let i = 0; i < folds.length; ++i) {
		const fold = folds[i];
		const end = folds[i + 1] || text.length;
		if (fold === 0) res = `\n${indent}${text.slice(0, end)}`;
		else {
			if (mode === "quoted" && escapedFolds[fold]) res += `${text[fold]}\\`;
			res += `\n${indent}${text.slice(fold + 1, end)}`;
		}
	}
	return res;
}
/**
* Presumes `i + 1` is at the start of a line
* @returns index of last newline in more-indented block
*/
function consumeMoreIndentedLines(text, i, indent) {
	let end = i;
	let start = i + 1;
	let ch = text[start];
	while (ch === " " || ch === "	") if (i < start + indent) ch = text[++i];
	else {
		do
			ch = text[++i];
		while (ch && ch !== "\n");
		end = i;
		start = i + 1;
		ch = text[start];
	}
	return end;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock) => ({
	indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
	lineWidth: ctx.options.lineWidth,
	minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
	if (!lineWidth || lineWidth < 0) return false;
	const limit = lineWidth - indentLength;
	const strLen = str.length;
	if (strLen <= limit) return false;
	for (let i = 0, start = 0; i < strLen; ++i) if (str[i] === "\n") {
		if (i - start > limit) return true;
		start = i + 1;
		if (strLen - start <= limit) return false;
	}
	return true;
}
function doubleQuotedString(value, ctx) {
	const json = JSON.stringify(value);
	if (ctx.options.doubleQuotedAsJSON) return json;
	const { implicitKey } = ctx;
	const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	let str = "";
	let start = 0;
	for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
		if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
			str += json.slice(start, i) + "\\ ";
			i += 1;
			start = i;
			ch = "\\";
		}
		if (ch === "\\") switch (json[i + 1]) {
			case "u":
				{
					str += json.slice(start, i);
					const code = json.substr(i + 2, 4);
					switch (code) {
						case "0000":
							str += "\\0";
							break;
						case "0007":
							str += "\\a";
							break;
						case "000b":
							str += "\\v";
							break;
						case "001b":
							str += "\\e";
							break;
						case "0085":
							str += "\\N";
							break;
						case "00a0":
							str += "\\_";
							break;
						case "2028":
							str += "\\L";
							break;
						case "2029":
							str += "\\P";
							break;
						default: if (code.substr(0, 2) === "00") str += "\\x" + code.substr(2);
						else str += json.substr(i, 6);
					}
					i += 5;
					start = i + 1;
				}
				break;
			case "n":
				if (implicitKey || json[i + 2] === "\"" || json.length < minMultiLineLength) i += 1;
				else {
					str += json.slice(start, i) + "\n\n";
					while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== "\"") {
						str += "\n";
						i += 2;
					}
					str += indent;
					if (json[i + 2] === " ") str += "\\";
					i += 1;
					start = i + 1;
				}
				break;
			default: i += 1;
		}
	}
	str = start ? str + json.slice(start) : json;
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
	if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
	return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
	const { singleQuote } = ctx.options;
	let qs;
	if (singleQuote === false) qs = doubleQuotedString;
	else {
		const hasDouble = value.includes("\"");
		const hasSingle = value.includes("'");
		if (hasDouble && !hasSingle) qs = singleQuotedString;
		else if (hasSingle && !hasDouble) qs = doubleQuotedString;
		else qs = singleQuote ? singleQuotedString : doubleQuotedString;
	}
	return qs(value, ctx);
}
var blockEndNewlines;
try {
	blockEndNewlines = /* @__PURE__ */ new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch {
	blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
	const { blockQuote, commentString, lineWidth } = ctx.options;
	if (!blockQuote || /\n[\t ]+$/.test(value)) return quotedString(value, ctx);
	const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
	const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
	if (!value) return literal ? "|\n" : ">\n";
	let chomp;
	let endStart;
	for (endStart = value.length; endStart > 0; --endStart) {
		const ch = value[endStart - 1];
		if (ch !== "\n" && ch !== "	" && ch !== " ") break;
	}
	let end = value.substring(endStart);
	const endNlPos = end.indexOf("\n");
	if (endNlPos === -1) chomp = "-";
	else if (value === end || endNlPos !== end.length - 1) {
		chomp = "+";
		if (onChompKeep) onChompKeep();
	} else chomp = "";
	if (end) {
		value = value.slice(0, -end.length);
		if (end[end.length - 1] === "\n") end = end.slice(0, -1);
		end = end.replace(blockEndNewlines, `$&${indent}`);
	}
	let startWithSpace = false;
	let startEnd;
	let startNlPos = -1;
	for (startEnd = 0; startEnd < value.length; ++startEnd) {
		const ch = value[startEnd];
		if (ch === " ") startWithSpace = true;
		else if (ch === "\n") startNlPos = startEnd;
		else break;
	}
	let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
	if (start) {
		value = value.substring(start.length);
		start = start.replace(/\n+/g, `$&${indent}`);
	}
	let header = (startWithSpace ? indent ? "2" : "1" : "") + chomp;
	if (comment) {
		header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
		if (onComment) onComment();
	}
	if (!literal) {
		const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
		let literalFallback = false;
		const foldOptions = getFoldOptions(ctx, true);
		if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) foldOptions.onOverflow = () => {
			literalFallback = true;
		};
		const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
		if (!literalFallback) return `>${header}\n${indent}${body}`;
	}
	value = value.replace(/\n+/g, `$&${indent}`);
	return `|${header}\n${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
	const { type, value } = item;
	const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
	if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) return quotedString(value, ctx);
	if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
	if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) return blockString(item, ctx, onComment, onChompKeep);
	if (containsDocumentMarker(value)) {
		if (indent === "") {
			ctx.forceBlockIndent = true;
			return blockString(item, ctx, onComment, onChompKeep);
		} else if (implicitKey && indent === indentStep) return quotedString(value, ctx);
	}
	const str = value.replace(/\n+/g, `$&\n${indent}`);
	if (actualString) {
		const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
		const { compat, tags } = ctx.doc.schema;
		if (tags.some(test) || compat?.some(test)) return quotedString(value, ctx);
	}
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
	const { implicitKey, inFlow } = ctx;
	const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
	let { type } = item;
	if (type !== Scalar.QUOTE_DOUBLE) {
		if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value)) type = Scalar.QUOTE_DOUBLE;
	}
	const _stringify = (_type) => {
		switch (_type) {
			case Scalar.BLOCK_FOLDED:
			case Scalar.BLOCK_LITERAL: return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
			case Scalar.QUOTE_DOUBLE: return doubleQuotedString(ss.value, ctx);
			case Scalar.QUOTE_SINGLE: return singleQuotedString(ss.value, ctx);
			case Scalar.PLAIN: return plainString(ss, ctx, onComment, onChompKeep);
			default: return null;
		}
	};
	let res = _stringify(type);
	if (res === null) {
		const { defaultKeyType, defaultStringType } = ctx.options;
		const t = implicitKey && defaultKeyType || defaultStringType;
		res = _stringify(t);
		if (res === null) throw new Error(`Unsupported default string type ${t}`);
	}
	return res;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
	const opt = Object.assign({
		blockQuote: true,
		commentString: stringifyComment,
		defaultKeyType: null,
		defaultStringType: "PLAIN",
		directives: null,
		doubleQuotedAsJSON: false,
		doubleQuotedMinMultiLineLength: 40,
		falseStr: "false",
		flowCollectionPadding: true,
		indentSeq: true,
		lineWidth: 80,
		minContentWidth: 20,
		nullStr: "null",
		simpleKeys: false,
		singleQuote: null,
		trailingComma: false,
		trueStr: "true",
		verifyAliasOrder: true
	}, doc.schema.toStringOptions, options);
	let inFlow;
	switch (opt.collectionStyle) {
		case "block":
			inFlow = false;
			break;
		case "flow":
			inFlow = true;
			break;
		default: inFlow = null;
	}
	return {
		anchors: /* @__PURE__ */ new Set(),
		doc,
		flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
		indent: "",
		indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
		inFlow,
		options: opt
	};
}
function getTagObject(tags, item) {
	if (item.tag) {
		const match = tags.filter((t) => t.tag === item.tag);
		if (match.length > 0) return match.find((t) => t.format === item.format) ?? match[0];
	}
	let tagObj = void 0;
	let obj;
	if (isScalar(item)) {
		obj = item.value;
		let match = tags.filter((t) => t.identify?.(obj));
		if (match.length > 1) {
			const testMatch = match.filter((t) => t.test);
			if (testMatch.length > 0) match = testMatch;
		}
		tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
	} else {
		obj = item;
		tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
	}
	if (!tagObj) {
		const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
		throw new Error(`Tag not resolved for ${name} value`);
	}
	return tagObj;
}
function stringifyProps(node, tagObj, { anchors, doc }) {
	if (!doc.directives) return "";
	const props = [];
	const anchor = (isScalar(node) || isCollection(node)) && node.anchor;
	if (anchor && anchorIsValid(anchor)) {
		anchors.add(anchor);
		props.push(`&${anchor}`);
	}
	const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
	if (tag) props.push(doc.directives.tagString(tag));
	return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
	if (isPair(item)) return item.toString(ctx, onComment, onChompKeep);
	if (isAlias(item)) {
		if (ctx.doc.directives) return item.toString(ctx);
		if (ctx.resolvedAliases?.has(item)) throw new TypeError(`Cannot stringify circular structure without alias nodes`);
		else {
			if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);
			else ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
			item = item.resolve(ctx.doc);
		}
	}
	let tagObj = void 0;
	const node = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
	tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
	const props = stringifyProps(node, tagObj, ctx);
	if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
	const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
	if (!props) return str;
	return isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
	const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
	let keyComment = isNode(key) && key.comment || null;
	if (simpleKeys) {
		if (keyComment) throw new Error("With simple keys, key nodes cannot have comments");
		if (isCollection(key) || !isNode(key) && typeof key === "object") throw new Error("With simple keys, collection cannot be used as a key value");
	}
	let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
	ctx = Object.assign({}, ctx, {
		allNullValues: false,
		implicitKey: !explicitKey && (simpleKeys || !allNullValues),
		indent: indent + indentStep
	});
	let keyCommentDone = false;
	let chompKeep = false;
	let str = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
	if (!explicitKey && !ctx.inFlow && str.length > 1024) {
		if (simpleKeys) throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
		explicitKey = true;
	}
	if (ctx.inFlow) {
		if (allNullValues || value == null) {
			if (keyCommentDone && onComment) onComment();
			return str === "" ? "?" : explicitKey ? `? ${str}` : str;
		}
	} else if (allNullValues && !simpleKeys || value == null && explicitKey) {
		str = `? ${str}`;
		if (keyComment && !keyCommentDone) str += lineComment(str, ctx.indent, commentString(keyComment));
		else if (chompKeep && onChompKeep) onChompKeep();
		return str;
	}
	if (keyCommentDone) keyComment = null;
	if (explicitKey) {
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
		str = `? ${str}\n${indent}:`;
	} else {
		str = `${str}:`;
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
	}
	let vsb, vcb, valueComment;
	if (isNode(value)) {
		vsb = !!value.spaceBefore;
		vcb = value.commentBefore;
		valueComment = value.comment;
	} else {
		vsb = false;
		vcb = null;
		valueComment = null;
		if (value && typeof value === "object") value = doc.createNode(value);
	}
	ctx.implicitKey = false;
	if (!explicitKey && !keyComment && isScalar(value)) ctx.indentAtStart = str.length + 1;
	chompKeep = false;
	if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) ctx.indent = ctx.indent.substring(2);
	let valueCommentDone = false;
	const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
	let ws = " ";
	if (keyComment || vsb || vcb) {
		ws = vsb ? "\n" : "";
		if (vcb) {
			const cs = commentString(vcb);
			ws += `\n${indentComment(cs, ctx.indent)}`;
		}
		if (valueStr === "" && !ctx.inFlow) {
			if (ws === "\n" && valueComment) ws = "\n\n";
		} else ws += `\n${ctx.indent}`;
	} else if (!explicitKey && isCollection(value)) {
		const vs0 = valueStr[0];
		const nl0 = valueStr.indexOf("\n");
		const hasNewline = nl0 !== -1;
		const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
		if (hasNewline || !flow) {
			let hasPropsLine = false;
			if (hasNewline && (vs0 === "&" || vs0 === "!")) {
				let sp0 = valueStr.indexOf(" ");
				if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") sp0 = valueStr.indexOf(" ", sp0 + 1);
				if (sp0 === -1 || nl0 < sp0) hasPropsLine = true;
			}
			if (!hasPropsLine) ws = `\n${ctx.indent}`;
		}
	} else if (valueStr === "" || valueStr[0] === "\n") ws = "";
	str += ws + valueStr;
	if (ctx.inFlow) {
		if (valueCommentDone && onComment) onComment();
	} else if (valueComment && !valueCommentDone) str += lineComment(str, ctx.indent, commentString(valueComment));
	else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
	if (logLevel === "debug" || logLevel === "warn") console.warn(warning);
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge = {
	identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
	default: "key",
	tag: "tag:yaml.org,2002:merge",
	test: /^<<$/,
	resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), { addToJSMap: addMergeToJSMap }),
	stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
function addMergeToJSMap(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (isSeq(source)) for (const it of source.items) mergeValue(ctx, map, it);
	else if (Array.isArray(source)) for (const it of source) mergeValue(ctx, map, it);
	else mergeValue(ctx, map, source);
}
function mergeValue(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (!isMap(source)) throw new Error("Merge sources must be maps or map aliases");
	const srcMap = source.toJSON(null, ctx, Map);
	for (const [key, value] of srcMap) if (map instanceof Map) {
		if (!map.has(key)) map.set(key, value);
	} else if (map instanceof Set) map.add(key);
	else if (!Object.prototype.hasOwnProperty.call(map, key)) Object.defineProperty(map, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
	return map;
}
function resolveAliasValue(ctx, value) {
	return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map, { key, value }) {
	if (isNode(key) && key.addToJSMap) key.addToJSMap(ctx, map, value);
	else if (isMergeKey(ctx, key)) addMergeToJSMap(ctx, map, value);
	else {
		const jsKey = toJS(key, "", ctx);
		if (map instanceof Map) map.set(jsKey, toJS(value, jsKey, ctx));
		else if (map instanceof Set) map.add(jsKey);
		else {
			const stringKey = stringifyKey(key, jsKey, ctx);
			const jsValue = toJS(value, stringKey, ctx);
			if (stringKey in map) Object.defineProperty(map, stringKey, {
				value: jsValue,
				writable: true,
				enumerable: true,
				configurable: true
			});
			else map[stringKey] = jsValue;
		}
	}
	return map;
}
function stringifyKey(key, jsKey, ctx) {
	if (jsKey === null) return "";
	if (typeof jsKey !== "object") return String(jsKey);
	if (isNode(key) && ctx?.doc) {
		const strCtx = createStringifyContext(ctx.doc, {});
		strCtx.anchors = /* @__PURE__ */ new Set();
		for (const node of ctx.anchors.keys()) strCtx.anchors.add(node.anchor);
		strCtx.inFlow = true;
		strCtx.inStringifyKey = true;
		const strKey = key.toString(strCtx);
		if (!ctx.mapKeyWarned) {
			let jsonStr = JSON.stringify(strKey);
			if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + "...\"";
			warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
			ctx.mapKeyWarned = true;
		}
		return strKey;
	}
	return JSON.stringify(jsKey);
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
	return new Pair(createNode(key, void 0, ctx), createNode(value, void 0, ctx));
}
var Pair = class Pair {
	constructor(key, value = null) {
		Object.defineProperty(this, NODE_TYPE, { value: PAIR });
		this.key = key;
		this.value = value;
	}
	clone(schema) {
		let { key, value } = this;
		if (isNode(key)) key = key.clone(schema);
		if (isNode(value)) value = value.clone(schema);
		return new Pair(key, value);
	}
	toJSON(_, ctx) {
		return addPairToJSMap(ctx, ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {}, this);
	}
	toString(ctx, onComment, onChompKeep) {
		return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
	return (ctx.inFlow ?? collection.flow ? stringifyFlowCollection : stringifyBlockCollection)(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
	const { indent, options: { commentString } } = ctx;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		type: null
	});
	let chompKeep = false;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (!chompKeep && item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (!chompKeep && ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
			}
		}
		chompKeep = false;
		let str = stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		if (chompKeep && comment) chompKeep = false;
		lines.push(blockItemPrefix + str);
	}
	let str;
	if (lines.length === 0) str = flowChars.start + flowChars.end;
	else {
		str = lines[0];
		for (let i = 1; i < lines.length; ++i) {
			const line = lines[i];
			str += line ? `\n${indent}${line}` : "\n";
		}
	}
	if (comment) {
		str += "\n" + indentComment(commentString(comment), indent);
		if (onComment) onComment();
	} else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
	const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
	itemIndent += indentStep;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		inFlow: true,
		type: null
	});
	let reqNewline = false;
	let linesAtValue = 0;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, false);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, false);
				if (ik.comment) reqNewline = true;
			}
			const iv = isNode(item.value) ? item.value : null;
			if (iv) {
				if (iv.comment) comment = iv.comment;
				if (iv.commentBefore) reqNewline = true;
			} else if (item.value == null && ik?.comment) comment = ik.comment;
		}
		if (comment) reqNewline = true;
		let str = stringify(item, itemCtx, () => comment = null);
		reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
		if (i < items.length - 1) str += ",";
		else if (ctx.options.trailingComma) {
			if (ctx.options.lineWidth > 0) reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
			if (reqNewline) str += ",";
		}
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		lines.push(str);
		linesAtValue = lines.length;
	}
	const { start, end } = flowChars;
	if (lines.length === 0) return start + end;
	else {
		if (!reqNewline) {
			const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
			reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
		}
		if (reqNewline) {
			let str = start;
			for (const line of lines) str += line ? `\n${indentStep}${indent}${line}` : "\n";
			return `${str}\n${indent}${end}`;
		} else return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
	}
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
	if (comment && chompKeep) comment = comment.replace(/^\n+/, "");
	if (comment) {
		const ic = indentComment(commentString(comment), indent);
		lines.push(ic.trimStart());
	}
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
	const k = isScalar(key) ? key.value : key;
	for (const it of items) if (isPair(it)) {
		if (it.key === key || it.key === k) return it;
		if (isScalar(it.key) && it.key.value === k) return it;
	}
}
var YAMLMap = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:map";
	}
	constructor(schema) {
		super(MAP, schema);
		this.items = [];
	}
	/**
	* A generic collection parsing method that can be extended
	* to other node classes that inherit from YAMLMap
	*/
	static from(schema, obj, ctx) {
		const { keepUndefined, replacer } = ctx;
		const map = new this(schema);
		const add = (key, value) => {
			if (typeof replacer === "function") value = replacer.call(obj, key, value);
			else if (Array.isArray(replacer) && !replacer.includes(key)) return;
			if (value !== void 0 || keepUndefined) map.items.push(createPair(key, value, ctx));
		};
		if (obj instanceof Map) for (const [key, value] of obj) add(key, value);
		else if (obj && typeof obj === "object") for (const key of Object.keys(obj)) add(key, obj[key]);
		if (typeof schema.sortMapEntries === "function") map.items.sort(schema.sortMapEntries);
		return map;
	}
	/**
	* Adds a value to the collection.
	*
	* @param overwrite - If not set `true`, using a key that is already in the
	*   collection will throw. Otherwise, overwrites the previous value.
	*/
	add(pair, overwrite) {
		let _pair;
		if (isPair(pair)) _pair = pair;
		else if (!pair || typeof pair !== "object" || !("key" in pair)) _pair = new Pair(pair, pair?.value);
		else _pair = new Pair(pair.key, pair.value);
		const prev = findPair(this.items, _pair.key);
		const sortEntries = this.schema?.sortMapEntries;
		if (prev) {
			if (!overwrite) throw new Error(`Key ${_pair.key} already set`);
			if (isScalar(prev.value) && isScalarValue(_pair.value)) prev.value.value = _pair.value;
			else prev.value = _pair.value;
		} else if (sortEntries) {
			const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
			if (i === -1) this.items.push(_pair);
			else this.items.splice(i, 0, _pair);
		} else this.items.push(_pair);
	}
	delete(key) {
		const it = findPair(this.items, key);
		if (!it) return false;
		return this.items.splice(this.items.indexOf(it), 1).length > 0;
	}
	get(key, keepScalar) {
		const node = findPair(this.items, key)?.value;
		return (!keepScalar && isScalar(node) ? node.value : node) ?? void 0;
	}
	has(key) {
		return !!findPair(this.items, key);
	}
	set(key, value) {
		this.add(new Pair(key, value), true);
	}
	/**
	* @param ctx - Conversion context, originally set in Document#toJS()
	* @param {Class} Type - If set, forces the returned collection type
	* @returns Instance of Type, Map, or Object
	*/
	toJSON(_, ctx, Type) {
		const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const item of this.items) addPairToJSMap(ctx, map, item);
		return map;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		for (const item of this.items) if (!isPair(item)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
		if (!ctx.allNullValues && this.hasAllNullValues(false)) ctx = Object.assign({}, ctx, { allNullValues: true });
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "",
			flowChars: {
				start: "{",
				end: "}"
			},
			itemIndent: ctx.indent || "",
			onChompKeep,
			onComment
		});
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/map.js
var map = {
	collection: "map",
	default: true,
	nodeClass: YAMLMap,
	tag: "tag:yaml.org,2002:map",
	resolve(map, onError) {
		if (!isMap(map)) onError("Expected a mapping for this tag");
		return map;
	},
	createNode: (schema, obj, ctx) => YAMLMap.from(schema, obj, ctx)
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:seq";
	}
	constructor(schema) {
		super(SEQ, schema);
		this.items = [];
	}
	add(value) {
		this.items.push(value);
	}
	/**
	* Removes a value from the collection.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return false;
		return this.items.splice(idx, 1).length > 0;
	}
	get(key, keepScalar) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return void 0;
		const it = this.items[idx];
		return !keepScalar && isScalar(it) ? it.value : it;
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*/
	has(key) {
		const idx = asItemIndex(key);
		return typeof idx === "number" && idx < this.items.length;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*
	* If `key` does not contain a representation of an integer, this will throw.
	* It may be wrapped in a `Scalar`.
	*/
	set(key, value) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") throw new Error(`Expected a valid index, not ${key}.`);
		const prev = this.items[idx];
		if (isScalar(prev) && isScalarValue(value)) prev.value = value;
		else this.items[idx] = value;
	}
	toJSON(_, ctx) {
		const seq = [];
		if (ctx?.onCreate) ctx.onCreate(seq);
		let i = 0;
		for (const item of this.items) seq.push(toJS(item, String(i++), ctx));
		return seq;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "- ",
			flowChars: {
				start: "[",
				end: "]"
			},
			itemIndent: (ctx.indent || "") + "  ",
			onChompKeep,
			onComment
		});
	}
	static from(schema, obj, ctx) {
		const { replacer } = ctx;
		const seq = new this(schema);
		if (obj && Symbol.iterator in Object(obj)) {
			let i = 0;
			for (let it of obj) {
				if (typeof replacer === "function") {
					const key = obj instanceof Set ? it : String(i++);
					it = replacer.call(obj, key, it);
				}
				seq.items.push(createNode(it, void 0, ctx));
			}
		}
		return seq;
	}
};
function asItemIndex(key) {
	let idx = isScalar(key) ? key.value : key;
	if (idx && typeof idx === "string") idx = Number(idx);
	return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/seq.js
var seq = {
	collection: "seq",
	default: true,
	nodeClass: YAMLSeq,
	tag: "tag:yaml.org,2002:seq",
	resolve(seq, onError) {
		if (!isSeq(seq)) onError("Expected a sequence for this tag");
		return seq;
	},
	createNode: (schema, obj, ctx) => YAMLSeq.from(schema, obj, ctx)
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/string.js
var string = {
	identify: (value) => typeof value === "string",
	default: true,
	tag: "tag:yaml.org,2002:str",
	resolve: (str) => str,
	stringify(item, ctx, onComment, onChompKeep) {
		ctx = Object.assign({ actualString: true }, ctx);
		return stringifyString(item, ctx, onComment, onChompKeep);
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/null.js
var nullTag = {
	identify: (value) => value == null,
	createNode: () => new Scalar(null),
	default: true,
	tag: "tag:yaml.org,2002:null",
	test: /^(?:~|[Nn]ull|NULL)?$/,
	resolve: () => new Scalar(null),
	stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag = {
	identify: (value) => typeof value === "boolean",
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
	resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
	stringify({ source, value }, ctx) {
		if (source && boolTag.test.test(source)) {
			if (value === (source[0] === "t" || source[0] === "T")) return source;
		}
		return value ? ctx.options.trueStr : ctx.options.falseStr;
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
	if (typeof value === "bigint") return String(value);
	const num = typeof value === "number" ? value : Number(value);
	if (!isFinite(num)) return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
	let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
	if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
		let i = n.indexOf(".");
		if (i < 0) {
			i = n.length;
			n += ".";
		}
		let d = minFractionDigits - (n.length - i - 1);
		while (d-- > 0) n += "0";
	}
	return n;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str));
		const dot = str.indexOf(".");
		if (dot !== -1 && str[str.length - 1] === "0") node.minFractionDigits = str.length - dot - 1;
		return node;
	},
	stringify: stringifyNumber
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/core/int.js
var intIdentify$2 = (value) => typeof value === "bigint" || Number.isInteger(value);
var intResolve$1 = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
function intStringify$1(node, radix, prefix) {
	const { value } = node;
	if (intIdentify$2(value) && value >= 0) return prefix + value.toString(radix);
	return stringifyNumber(node);
}
var intOct$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^0o[0-7]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 8, opt),
	stringify: (node) => intStringify$1(node, 8, "0o")
};
var int$1 = {
	identify: intIdentify$2,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^0x[0-9a-fA-F]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 16, opt),
	stringify: (node) => intStringify$1(node, 16, "0x")
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/core/schema.js
var schema$2 = [
	map,
	seq,
	string,
	nullTag,
	boolTag,
	intOct$1,
	int$1,
	intHex$1,
	floatNaN$1,
	floatExp$1,
	float$1
];
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify$1(value) {
	return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
	{
		identify: (value) => typeof value === "string",
		default: true,
		tag: "tag:yaml.org,2002:str",
		resolve: (str) => str,
		stringify: stringifyJSON
	},
	{
		identify: (value) => value == null,
		createNode: () => new Scalar(null),
		default: true,
		tag: "tag:yaml.org,2002:null",
		test: /^null$/,
		resolve: () => null,
		stringify: stringifyJSON
	},
	{
		identify: (value) => typeof value === "boolean",
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^true$|^false$/,
		resolve: (str) => str === "true",
		stringify: stringifyJSON
	},
	{
		identify: intIdentify$1,
		default: true,
		tag: "tag:yaml.org,2002:int",
		test: /^-?(?:0|[1-9][0-9]*)$/,
		resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
		stringify: ({ value }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
	},
	{
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
		resolve: (str) => parseFloat(str),
		stringify: stringifyJSON
	}
];
var schema$1 = [map, seq].concat(jsonScalars, {
	default: true,
	tag: "",
	test: /^/,
	resolve(str, onError) {
		onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
		return str;
	}
});
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary = {
	identify: (value) => value instanceof Uint8Array,
	default: false,
	tag: "tag:yaml.org,2002:binary",
	/**
	* Returns a Buffer in node and an Uint8Array in browsers
	*
	* To use the resulting buffer as an image, you'll want to do something like:
	*
	*   const blob = new Blob([buffer], { type: 'image/jpeg' })
	*   document.querySelector('#photo').src = URL.createObjectURL(blob)
	*/
	resolve(src, onError) {
		if (typeof atob === "function") {
			const str = atob(src.replace(/[\n\r]/g, ""));
			const buffer = new Uint8Array(str.length);
			for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);
			return buffer;
		} else {
			onError("This environment does not support reading binary tags; either Buffer or atob is required");
			return src;
		}
	},
	stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
		if (!value) return "";
		const buf = value;
		let str;
		if (typeof btoa === "function") {
			let s = "";
			for (let i = 0; i < buf.length; ++i) s += String.fromCharCode(buf[i]);
			str = btoa(s);
		} else throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
		type ?? (type = Scalar.BLOCK_LITERAL);
		if (type !== Scalar.QUOTE_DOUBLE) {
			const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
			const n = Math.ceil(str.length / lineWidth);
			const lines = new Array(n);
			for (let i = 0, o = 0; i < n; ++i, o += lineWidth) lines[i] = str.substr(o, lineWidth);
			str = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
		}
		return stringifyString({
			comment,
			type,
			value: str
		}, ctx, onComment, onChompKeep);
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq, onError) {
	if (isSeq(seq)) for (let i = 0; i < seq.items.length; ++i) {
		let item = seq.items[i];
		if (isPair(item)) continue;
		else if (isMap(item)) {
			if (item.items.length > 1) onError("Each pair must have its own sequence indicator");
			const pair = item.items[0] || new Pair(new Scalar(null));
			if (item.commentBefore) pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}\n${pair.key.commentBefore}` : item.commentBefore;
			if (item.comment) {
				const cn = pair.value ?? pair.key;
				cn.comment = cn.comment ? `${item.comment}\n${cn.comment}` : item.comment;
			}
			item = pair;
		}
		seq.items[i] = isPair(item) ? item : new Pair(item);
	}
	else onError("Expected a sequence for this tag");
	return seq;
}
function createPairs(schema, iterable, ctx) {
	const { replacer } = ctx;
	const pairs = new YAMLSeq(schema);
	pairs.tag = "tag:yaml.org,2002:pairs";
	let i = 0;
	if (iterable && Symbol.iterator in Object(iterable)) for (let it of iterable) {
		if (typeof replacer === "function") it = replacer.call(iterable, String(i++), it);
		let key, value;
		if (Array.isArray(it)) {
			if (it.length === 2) {
				key = it[0];
				value = it[1];
			} else throw new TypeError(`Expected [key, value] tuple: ${it}`);
		} else if (it && it instanceof Object) {
			const keys = Object.keys(it);
			if (keys.length === 1) {
				key = keys[0];
				value = it[key];
			} else throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
		} else key = it;
		pairs.items.push(createPair(key, value, ctx));
	}
	return pairs;
}
var pairs = {
	collection: "seq",
	default: false,
	tag: "tag:yaml.org,2002:pairs",
	resolve: resolvePairs,
	createNode: createPairs
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class YAMLOMap extends YAMLSeq {
	constructor() {
		super();
		this.add = YAMLMap.prototype.add.bind(this);
		this.delete = YAMLMap.prototype.delete.bind(this);
		this.get = YAMLMap.prototype.get.bind(this);
		this.has = YAMLMap.prototype.has.bind(this);
		this.set = YAMLMap.prototype.set.bind(this);
		this.tag = YAMLOMap.tag;
	}
	/**
	* If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
	* but TypeScript won't allow widening the signature of a child method.
	*/
	toJSON(_, ctx) {
		if (!ctx) return super.toJSON(_);
		const map = /* @__PURE__ */ new Map();
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const pair of this.items) {
			let key, value;
			if (isPair(pair)) {
				key = toJS(pair.key, "", ctx);
				value = toJS(pair.value, key, ctx);
			} else key = toJS(pair, "", ctx);
			if (map.has(key)) throw new Error("Ordered maps must not include duplicate keys");
			map.set(key, value);
		}
		return map;
	}
	static from(schema, iterable, ctx) {
		const pairs = createPairs(schema, iterable, ctx);
		const omap = new this();
		omap.items = pairs.items;
		return omap;
	}
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";
var omap = {
	collection: "seq",
	identify: (value) => value instanceof Map,
	nodeClass: YAMLOMap,
	default: false,
	tag: "tag:yaml.org,2002:omap",
	resolve(seq, onError) {
		const pairs = resolvePairs(seq, onError);
		const seenKeys = [];
		for (const { key } of pairs.items) if (isScalar(key)) {
			if (seenKeys.includes(key.value)) onError(`Ordered maps must not include duplicate keys: ${key.value}`);
			else seenKeys.push(key.value);
		}
		return Object.assign(new YAMLOMap(), pairs);
	},
	createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
	if (source && (value ? trueTag : falseTag).test.test(source)) return source;
	return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag = {
	identify: (value) => value === true,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
	resolve: () => new Scalar(true),
	stringify: boolStringify
};
var falseTag = {
	identify: (value) => value === false,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
	resolve: () => new Scalar(false),
	stringify: boolStringify
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str.replace(/_/g, "")),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str.replace(/_/g, "")));
		const dot = str.indexOf(".");
		if (dot !== -1) {
			const f = str.substring(dot + 1).replace(/_/g, "");
			if (f[f.length - 1] === "0") node.minFractionDigits = f.length;
		}
		return node;
	},
	stringify: stringifyNumber
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
function intResolve(str, offset, radix, { intAsBigInt }) {
	const sign = str[0];
	if (sign === "-" || sign === "+") offset += 1;
	str = str.substring(offset).replace(/_/g, "");
	if (intAsBigInt) {
		switch (radix) {
			case 2:
				str = `0b${str}`;
				break;
			case 8:
				str = `0o${str}`;
				break;
			case 16: str = `0x${str}`;
		}
		const n = BigInt(str);
		return sign === "-" ? BigInt(-1) * n : n;
	}
	const n = parseInt(str, radix);
	return sign === "-" ? -1 * n : n;
}
function intStringify(node, radix, prefix) {
	const { value } = node;
	if (intIdentify(value)) {
		const str = value.toString(radix);
		return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
	}
	return stringifyNumber(node);
}
var intBin = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "BIN",
	test: /^[-+]?0b[0-1_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
	stringify: (node) => intStringify(node, 2, "0b")
};
var intOct = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^[-+]?0[0-7_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
	stringify: (node) => intStringify(node, 8, "0")
};
var int = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9][0-9_]*$/,
	resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^[-+]?0x[0-9a-fA-F_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
	stringify: (node) => intStringify(node, 16, "0x")
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class YAMLSet extends YAMLMap {
	constructor(schema) {
		super(schema);
		this.tag = YAMLSet.tag;
	}
	add(key) {
		let pair;
		if (isPair(key)) pair = key;
		else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null) pair = new Pair(key.key, null);
		else pair = new Pair(key, null);
		if (!findPair(this.items, pair.key)) this.items.push(pair);
	}
	/**
	* If `keepPair` is `true`, returns the Pair matching `key`.
	* Otherwise, returns the value of that Pair's key.
	*/
	get(key, keepPair) {
		const pair = findPair(this.items, key);
		return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
	}
	set(key, value) {
		if (typeof value !== "boolean") throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
		const prev = findPair(this.items, key);
		if (prev && !value) this.items.splice(this.items.indexOf(prev), 1);
		else if (!prev && value) this.items.push(new Pair(key));
	}
	toJSON(_, ctx) {
		return super.toJSON(_, ctx, Set);
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		if (this.hasAllNullValues(true)) return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
		else throw new Error("Set items must all have null values");
	}
	static from(schema, iterable, ctx) {
		const { replacer } = ctx;
		const set = new this(schema);
		if (iterable && Symbol.iterator in Object(iterable)) for (let value of iterable) {
			if (typeof replacer === "function") value = replacer.call(iterable, value, value);
			set.items.push(createPair(value, null, ctx));
		}
		return set;
	}
};
YAMLSet.tag = "tag:yaml.org,2002:set";
var set = {
	collection: "map",
	identify: (value) => value instanceof Set,
	nodeClass: YAMLSet,
	default: false,
	tag: "tag:yaml.org,2002:set",
	createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
	resolve(map, onError) {
		if (isMap(map)) {
			if (map.hasAllNullValues(true)) return Object.assign(new YAMLSet(), map);
			else onError("Set items must all have null values");
		} else onError("Expected a mapping for this tag");
		return map;
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
	const sign = str[0];
	const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
	const num = (n) => asBigInt ? BigInt(n) : Number(n);
	const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
	return sign === "-" ? num(-1) * res : res;
}
/**
* hhhh:mm:ss.sss
*
* Internal types handle bigint as number, because TS can't figure it out.
*/
function stringifySexagesimal(node) {
	let { value } = node;
	let num = (n) => n;
	if (typeof value === "bigint") num = (n) => BigInt(n);
	else if (isNaN(value) || !isFinite(value)) return stringifyNumber(node);
	let sign = "";
	if (value < 0) {
		sign = "-";
		value *= num(-1);
	}
	const _60 = num(60);
	const parts = [value % _60];
	if (value < 60) parts.unshift(0);
	else {
		value = (value - parts[0]) / _60;
		parts.unshift(value % _60);
		if (value >= 60) {
			value = (value - parts[0]) / _60;
			parts.unshift(value);
		}
	}
	return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime = {
	identify: (value) => typeof value === "bigint" || Number.isInteger(value),
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
	resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
	stringify: stringifySexagesimal
};
var floatTime = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
	resolve: (str) => parseSexagesimal(str, false),
	stringify: stringifySexagesimal
};
var timestamp = {
	identify: (value) => value instanceof Date,
	default: true,
	tag: "tag:yaml.org,2002:timestamp",
	test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
	resolve(str) {
		const match = str.match(timestamp.test);
		if (!match) throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
		const [, year, month, day, hour, minute, second] = match.map(Number);
		const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
		let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
		const tz = match[8];
		if (tz && tz !== "Z") {
			let d = parseSexagesimal(tz, false);
			if (Math.abs(d) < 30) d *= 60;
			date -= 6e4 * d;
		}
		return new Date(date);
	},
	stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema = [
	map,
	seq,
	string,
	nullTag,
	trueTag,
	falseTag,
	intBin,
	intOct,
	int,
	intHex,
	floatNaN,
	floatExp,
	float,
	binary,
	merge,
	omap,
	pairs,
	set,
	intTime,
	floatTime,
	timestamp
];
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/tags.js
var schemas = /* @__PURE__ */ new Map([
	["core", schema$2],
	["failsafe", [
		map,
		seq,
		string
	]],
	["json", schema$1],
	["yaml11", schema],
	["yaml-1.1", schema]
]);
var tagsByName = {
	binary,
	bool: boolTag,
	float: float$1,
	floatExp: floatExp$1,
	floatNaN: floatNaN$1,
	floatTime,
	int: int$1,
	intHex: intHex$1,
	intOct: intOct$1,
	intTime,
	map,
	merge,
	null: nullTag,
	omap,
	pairs,
	seq,
	set,
	timestamp
};
var coreKnownTags = {
	"tag:yaml.org,2002:binary": binary,
	"tag:yaml.org,2002:merge": merge,
	"tag:yaml.org,2002:omap": omap,
	"tag:yaml.org,2002:pairs": pairs,
	"tag:yaml.org,2002:set": set,
	"tag:yaml.org,2002:timestamp": timestamp
};
function getTags(customTags, schemaName, addMergeTag) {
	const schemaTags = schemas.get(schemaName);
	if (schemaTags && !customTags) return addMergeTag && !schemaTags.includes(merge) ? schemaTags.concat(merge) : schemaTags.slice();
	let tags = schemaTags;
	if (!tags) {
		if (Array.isArray(customTags)) tags = [];
		else {
			const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
			throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
		}
	}
	if (Array.isArray(customTags)) for (const tag of customTags) tags = tags.concat(tag);
	else if (typeof customTags === "function") tags = customTags(tags.slice());
	if (addMergeTag) tags = tags.concat(merge);
	return tags.reduce((tags, tag) => {
		const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
		if (!tagObj) {
			const tagName = JSON.stringify(tag);
			const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
			throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
		}
		if (!tags.includes(tagObj)) tags.push(tagObj);
		return tags;
	}, []);
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
var Schema = class Schema {
	constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
		this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
		this.name = typeof schema === "string" && schema || "core";
		this.knownTags = resolveKnownTags ? coreKnownTags : {};
		this.tags = getTags(customTags, this.name, merge);
		this.toStringOptions = toStringDefaults ?? null;
		Object.defineProperty(this, MAP, { value: map });
		Object.defineProperty(this, SCALAR$1, { value: string });
		Object.defineProperty(this, SEQ, { value: seq });
		this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
	}
	clone() {
		const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
		copy.tags = this.tags.slice();
		return copy;
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
	const lines = [];
	let hasDirectives = options.directives === true;
	if (options.directives !== false && doc.directives) {
		const dir = doc.directives.toString(doc);
		if (dir) {
			lines.push(dir);
			hasDirectives = true;
		} else if (doc.directives.docStart) hasDirectives = true;
	}
	if (hasDirectives) lines.push("---");
	const ctx = createStringifyContext(doc, options);
	const { commentString } = ctx.options;
	if (doc.commentBefore) {
		if (lines.length !== 1) lines.unshift("");
		const cs = commentString(doc.commentBefore);
		lines.unshift(indentComment(cs, ""));
	}
	let chompKeep = false;
	let contentComment = null;
	if (doc.contents) {
		if (isNode(doc.contents)) {
			if (doc.contents.spaceBefore && hasDirectives) lines.push("");
			if (doc.contents.commentBefore) {
				const cs = commentString(doc.contents.commentBefore);
				lines.push(indentComment(cs, ""));
			}
			ctx.forceBlockIndent = !!doc.comment;
			contentComment = doc.contents.comment;
		}
		const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
		let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
		if (contentComment) body += lineComment(body, "", commentString(contentComment));
		if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") lines[lines.length - 1] = `--- ${body}`;
		else lines.push(body);
	} else lines.push(stringify(doc.contents, ctx));
	if (doc.directives?.docEnd) {
		if (doc.comment) {
			const cs = commentString(doc.comment);
			if (cs.includes("\n")) {
				lines.push("...");
				lines.push(indentComment(cs, ""));
			} else lines.push(`... ${cs}`);
		} else lines.push("...");
	} else {
		let dc = doc.comment;
		if (dc && chompKeep) dc = dc.replace(/^\n+/, "");
		if (dc) {
			if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "") lines.push("");
			lines.push(indentComment(commentString(dc), ""));
		}
	}
	return lines.join("\n") + "\n";
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/Document.js
var Document = class Document {
	constructor(value, replacer, options) {
		/** A comment before this Document */
		this.commentBefore = null;
		/** A comment immediately after this Document */
		this.comment = null;
		/** Errors encountered during parsing. */
		this.errors = [];
		/** Warnings encountered during parsing. */
		this.warnings = [];
		Object.defineProperty(this, NODE_TYPE, { value: DOC });
		let _replacer = null;
		if (typeof replacer === "function" || Array.isArray(replacer)) _replacer = replacer;
		else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const opt = Object.assign({
			intAsBigInt: false,
			keepSourceTokens: false,
			logLevel: "warn",
			prettyErrors: true,
			strict: true,
			stringKeys: false,
			uniqueKeys: true,
			version: "1.2"
		}, options);
		this.options = opt;
		let { version } = opt;
		if (options?._directives) {
			this.directives = options._directives.atDocument();
			if (this.directives.yaml.explicit) version = this.directives.yaml.version;
		} else this.directives = new Directives({ version });
		this.setSchema(version, options);
		this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
	}
	/**
	* Create a deep copy of this Document and its contents.
	*
	* Custom Node values that inherit from `Object` still refer to their original instances.
	*/
	clone() {
		const copy = Object.create(Document.prototype, { [NODE_TYPE]: { value: DOC } });
		copy.commentBefore = this.commentBefore;
		copy.comment = this.comment;
		copy.errors = this.errors.slice();
		copy.warnings = this.warnings.slice();
		copy.options = Object.assign({}, this.options);
		if (this.directives) copy.directives = this.directives.clone();
		copy.schema = this.schema.clone();
		copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** Adds a value to the document. */
	add(value) {
		if (assertCollection(this.contents)) this.contents.add(value);
	}
	/** Adds a value to the document. */
	addIn(path, value) {
		if (assertCollection(this.contents)) this.contents.addIn(path, value);
	}
	/**
	* Create a new `Alias` node, ensuring that the target `node` has the required anchor.
	*
	* If `node` already has an anchor, `name` is ignored.
	* Otherwise, the `node.anchor` value will be set to `name`,
	* or if an anchor with that name is already present in the document,
	* `name` will be used as a prefix for a new unique anchor.
	* If `name` is undefined, the generated anchor will use 'a' as a prefix.
	*/
	createAlias(node, name) {
		if (!node.anchor) {
			const prev = anchorNames(this);
			node.anchor = !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
		}
		return new Alias(node.anchor);
	}
	createNode(value, replacer, options) {
		let _replacer = void 0;
		if (typeof replacer === "function") {
			value = replacer.call({ "": value }, "", value);
			_replacer = replacer;
		} else if (Array.isArray(replacer)) {
			const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
			const asStr = replacer.filter(keyToStr).map(String);
			if (asStr.length > 0) replacer = replacer.concat(asStr);
			_replacer = replacer;
		} else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
		const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(this, anchorPrefix || "a");
		const ctx = {
			aliasDuplicateObjects: aliasDuplicateObjects ?? true,
			keepUndefined: keepUndefined ?? false,
			onAnchor,
			onTagObj,
			replacer: _replacer,
			schema: this.schema,
			sourceObjects
		};
		const node = createNode(value, tag, ctx);
		if (flow && isCollection(node)) node.flow = true;
		setAnchors();
		return node;
	}
	/**
	* Convert a key and a value into a `Pair` using the current schema,
	* recursively wrapping all values as `Scalar` or `Collection` nodes.
	*/
	createPair(key, value, options = {}) {
		return new Pair(this.createNode(key, null, options), this.createNode(value, null, options));
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		return assertCollection(this.contents) ? this.contents.delete(key) : false;
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		if (isEmptyPath(path)) {
			if (this.contents == null) return false;
			this.contents = null;
			return true;
		}
		return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	get(key, keepScalar) {
		return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
	}
	/**
	* Returns item at `path`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		if (isEmptyPath(path)) return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
		return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
	}
	/**
	* Checks if the document includes a value with the key `key`.
	*/
	has(key) {
		return isCollection(this.contents) ? this.contents.has(key) : false;
	}
	/**
	* Checks if the document includes a value at `path`.
	*/
	hasIn(path) {
		if (isEmptyPath(path)) return this.contents !== void 0;
		return isCollection(this.contents) ? this.contents.hasIn(path) : false;
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	set(key, value) {
		if (this.contents == null) this.contents = collectionFromPath(this.schema, [key], value);
		else if (assertCollection(this.contents)) this.contents.set(key, value);
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		if (isEmptyPath(path)) this.contents = value;
		else if (this.contents == null) this.contents = collectionFromPath(this.schema, Array.from(path), value);
		else if (assertCollection(this.contents)) this.contents.setIn(path, value);
	}
	/**
	* Change the YAML version and schema used by the document.
	* A `null` version disables support for directives, explicit tags, anchors, and aliases.
	* It also requires the `schema` option to be given as a `Schema` instance value.
	*
	* Overrides all previously set schema options.
	*/
	setSchema(version, options = {}) {
		if (typeof version === "number") version = String(version);
		let opt;
		switch (version) {
			case "1.1":
				if (this.directives) this.directives.yaml.version = "1.1";
				else this.directives = new Directives({ version: "1.1" });
				opt = {
					resolveKnownTags: false,
					schema: "yaml-1.1"
				};
				break;
			case "1.2":
			case "next":
				if (this.directives) this.directives.yaml.version = version;
				else this.directives = new Directives({ version });
				opt = {
					resolveKnownTags: true,
					schema: "core"
				};
				break;
			case null:
				if (this.directives) delete this.directives;
				opt = null;
				break;
			default: {
				const sv = JSON.stringify(version);
				throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
			}
		}
		if (options.schema instanceof Object) this.schema = options.schema;
		else if (opt) this.schema = new Schema(Object.assign(opt, options));
		else throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
	}
	toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc: this,
			keep: !json,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this.contents, jsonArg ?? "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
	/**
	* A JSON representation of the document `contents`.
	*
	* @param jsonArg Used by `JSON.stringify` to indicate the array index or
	*   property name.
	*/
	toJSON(jsonArg, onAnchor) {
		return this.toJS({
			json: true,
			jsonArg,
			mapAsMap: false,
			onAnchor
		});
	}
	/** A YAML representation of the document. */
	toString(options = {}) {
		if (this.errors.length > 0) throw new Error("Document with errors cannot be stringified");
		if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
			const s = JSON.stringify(options.indent);
			throw new Error(`"indent" option must be a positive integer, not ${s}`);
		}
		return stringifyDocument(this, options);
	}
};
function assertCollection(contents) {
	if (isCollection(contents)) return true;
	throw new Error("Expected a YAML collection as document contents");
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/errors.js
var YAMLError = class extends Error {
	constructor(name, pos, code, message) {
		super();
		this.name = name;
		this.code = code;
		this.message = message;
		this.pos = pos;
	}
};
var YAMLParseError = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLParseError", pos, code, message);
	}
};
var YAMLWarning = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLWarning", pos, code, message);
	}
};
var prettifyError = (src, lc) => (error) => {
	if (error.pos[0] === -1) return;
	error.linePos = error.pos.map((pos) => lc.linePos(pos));
	const { line, col } = error.linePos[0];
	error.message += ` at line ${line}, column ${col}`;
	let ci = col - 1;
	let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
	if (ci >= 60 && lineStr.length > 80) {
		const trimStart = Math.min(ci - 39, lineStr.length - 79);
		lineStr = "…" + lineStr.substring(trimStart);
		ci -= trimStart - 1;
	}
	if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + "…";
	if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
		let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
		if (prev.length > 80) prev = prev.substring(0, 79) + "…\n";
		lineStr = prev + lineStr;
	}
	if (/[^ ]/.test(lineStr)) {
		let count = 1;
		const end = error.linePos[1];
		if (end?.line === line && end.col > col) count = Math.max(1, Math.min(end.col - col, 80 - ci));
		const pointer = " ".repeat(ci) + "^".repeat(count);
		error.message += `:\n\n${lineStr}\n${pointer}\n`;
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
	let spaceBefore = false;
	let atNewline = startOnNewline;
	let hasSpace = startOnNewline;
	let comment = "";
	let commentSep = "";
	let hasNewline = false;
	let reqSpace = false;
	let tab = null;
	let anchor = null;
	let tag = null;
	let newlineAfterProp = null;
	let comma = null;
	let found = null;
	let start = null;
	for (const token of tokens) {
		if (reqSpace) {
			if (token.type !== "space" && token.type !== "newline" && token.type !== "comma") onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
			reqSpace = false;
		}
		if (tab) {
			if (atNewline && token.type !== "comment" && token.type !== "newline") onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
			tab = null;
		}
		switch (token.type) {
			case "space":
				if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) tab = token;
				hasSpace = true;
				break;
			case "comment": {
				if (!hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				const cb = token.source.substring(1) || " ";
				if (!comment) comment = cb;
				else comment += commentSep + cb;
				commentSep = "";
				atNewline = false;
				break;
			}
			case "newline":
				if (atNewline) {
					if (comment) comment += token.source;
					else if (!found || indicator !== "seq-item-ind") spaceBefore = true;
				} else commentSep += token.source;
				atNewline = true;
				hasNewline = true;
				if (anchor || tag) newlineAfterProp = token;
				hasSpace = true;
				break;
			case "anchor":
				if (anchor) onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
				if (token.source.endsWith(":")) onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
				anchor = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case "tag":
				if (tag) onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
				tag = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case indicator:
				if (anchor || tag) onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
				if (found) onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
				found = token;
				atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
				hasSpace = false;
				break;
			case "comma": if (flow) {
				if (comma) onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
				comma = token;
				atNewline = false;
				hasSpace = false;
				break;
			}
			default:
				onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
				atNewline = false;
				hasSpace = false;
		}
	}
	const last = tokens[tokens.length - 1];
	const end = last ? last.offset + last.source.length : offset;
	if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
	if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq")) onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
	return {
		comma,
		found,
		spaceBefore,
		comment,
		hasNewline,
		anchor,
		tag,
		newlineAfterProp,
		end,
		start: start ?? end
	};
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key) {
	if (!key) return null;
	switch (key.type) {
		case "alias":
		case "scalar":
		case "double-quoted-scalar":
		case "single-quoted-scalar":
			if (key.source.includes("\n")) return true;
			if (key.end) {
				for (const st of key.end) if (st.type === "newline") return true;
			}
			return false;
		case "flow-collection":
			for (const it of key.items) {
				for (const st of it.start) if (st.type === "newline") return true;
				if (it.sep) {
					for (const st of it.sep) if (st.type === "newline") return true;
				}
				if (containsNewline(it.key) || containsNewline(it.value)) return true;
			}
			return false;
		default: return true;
	}
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
	if (fc?.type === "flow-collection") {
		const end = fc.end[0];
		if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) onError(end, "BAD_INDENT", "Flow end indicator should be more indented than parent", true);
	}
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search) {
	const { uniqueKeys } = ctx.options;
	if (uniqueKeys === false) return false;
	const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
	return items.some((pair) => isEqual(pair.key, search));
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-block-map.js
var startColMsg = "All mapping items must start at the same column";
function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
	const map = new ((tag?.nodeClass) ?? YAMLMap)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	let offset = bm.offset;
	let commentEnd = null;
	for (const collItem of bm.items) {
		const { start, key, sep, value } = collItem;
		const keyProps = resolveProps(start, {
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: bm.indent,
			startOnNewline: true
		});
		const implicitKey = !keyProps.found;
		if (implicitKey) {
			if (key) {
				if (key.type === "block-seq") onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
				else if ("indent" in key && key.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
			}
			if (!keyProps.anchor && !keyProps.tag && !sep) {
				commentEnd = keyProps.end;
				if (keyProps.comment) {
					if (map.comment) map.comment += "\n" + keyProps.comment;
					else map.comment = keyProps.comment;
				}
				continue;
			}
			if (keyProps.newlineAfterProp || containsNewline(key)) onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
		} else if (keyProps.found?.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
		ctx.atKey = true;
		const keyStart = keyProps.end;
		const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
		if (ctx.schema.compat) flowIndentCheck(bm.indent, key, onError);
		ctx.atKey = false;
		if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
		const valueProps = resolveProps(sep ?? [], {
			indicator: "map-value-ind",
			next: value,
			offset: keyNode.range[2],
			onError,
			parentIndent: bm.indent,
			startOnNewline: !key || key.type === "block-scalar"
		});
		offset = valueProps.end;
		if (valueProps.found) {
			if (implicitKey) {
				if (value?.type === "block-map" && !valueProps.hasNewline) onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
				if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024) onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
			}
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
			if (ctx.schema.compat) flowIndentCheck(bm.indent, value, onError);
			offset = valueNode.range[2];
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		} else {
			if (implicitKey) onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
			if (valueProps.comment) {
				if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
				else keyNode.comment = valueProps.comment;
			}
			const pair = new Pair(keyNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		}
	}
	if (commentEnd && commentEnd < offset) onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
	map.range = [
		bm.offset,
		offset,
		commentEnd ?? offset
	];
	return map;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
	const seq = new ((tag?.nodeClass) ?? YAMLSeq)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = bs.offset;
	let commentEnd = null;
	for (const { start, value } of bs.items) {
		const props = resolveProps(start, {
			indicator: "seq-item-ind",
			next: value,
			offset,
			onError,
			parentIndent: bs.indent,
			startOnNewline: true
		});
		if (!props.found) {
			if (props.anchor || props.tag || value) {
				if (value?.type === "block-seq") onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
				else onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
			} else {
				commentEnd = props.end;
				if (props.comment) seq.comment = props.comment;
				continue;
			}
		}
		const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
		if (ctx.schema.compat) flowIndentCheck(bs.indent, value, onError);
		offset = node.range[2];
		seq.items.push(node);
	}
	seq.range = [
		bs.offset,
		offset,
		commentEnd ?? offset
	];
	return seq;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
	let comment = "";
	if (end) {
		let hasSpace = false;
		let sep = "";
		for (const token of end) {
			const { source, type } = token;
			switch (type) {
				case "space":
					hasSpace = true;
					break;
				case "comment": {
					if (reqSpace && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
					const cb = source.substring(1) || " ";
					if (!comment) comment = cb;
					else comment += sep + cb;
					sep = "";
					break;
				}
				case "newline":
					if (comment) sep += source;
					hasSpace = true;
					break;
				default: onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
			}
			offset += source.length;
		}
	}
	return {
		comment,
		offset
	};
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
var blockMsg = "Block collections are not allowed within flow collections";
var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
	const isMap = fc.start.source === "{";
	const fcName = isMap ? "flow map" : "flow sequence";
	const coll = new ((tag?.nodeClass) ?? (isMap ? YAMLMap : YAMLSeq))(ctx.schema);
	coll.flow = true;
	const atRoot = ctx.atRoot;
	if (atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = fc.offset + fc.start.source.length;
	for (let i = 0; i < fc.items.length; ++i) {
		const collItem = fc.items[i];
		const { start, key, sep, value } = collItem;
		const props = resolveProps(start, {
			flow: fcName,
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: fc.indent,
			startOnNewline: false
		});
		if (!props.found) {
			if (!props.anchor && !props.tag && !sep && !value) {
				if (i === 0 && props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
				else if (i < fc.items.length - 1) onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
				if (props.comment) {
					if (coll.comment) coll.comment += "\n" + props.comment;
					else coll.comment = props.comment;
				}
				offset = props.end;
				continue;
			}
			if (!isMap && ctx.options.strict && containsNewline(key)) onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
		}
		if (i === 0) {
			if (props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
		} else {
			if (!props.comma) onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
			if (props.comment) {
				let prevItemComment = "";
				loop: for (const st of start) switch (st.type) {
					case "comma":
					case "space": break;
					case "comment":
						prevItemComment = st.source.substring(1);
						break loop;
					default: break loop;
				}
				if (prevItemComment) {
					let prev = coll.items[coll.items.length - 1];
					if (isPair(prev)) prev = prev.value ?? prev.key;
					if (prev.comment) prev.comment += "\n" + prevItemComment;
					else prev.comment = prevItemComment;
					props.comment = props.comment.substring(prevItemComment.length + 1);
				}
			}
		}
		if (!isMap && !sep && !props.found) {
			const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
			coll.items.push(valueNode);
			offset = valueNode.range[2];
			if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
		} else {
			ctx.atKey = true;
			const keyStart = props.end;
			const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
			if (isBlock(key)) onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
			ctx.atKey = false;
			const valueProps = resolveProps(sep ?? [], {
				flow: fcName,
				indicator: "map-value-ind",
				next: value,
				offset: keyNode.range[2],
				onError,
				parentIndent: fc.indent,
				startOnNewline: false
			});
			if (valueProps.found) {
				if (!isMap && !props.found && ctx.options.strict) {
					if (sep) for (const st of sep) {
						if (st === valueProps.found) break;
						if (st.type === "newline") {
							onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
							break;
						}
					}
					if (props.start < valueProps.found.offset - 1024) onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
				}
			} else if (value) {
				if ("source" in value && value.source?.[0] === ":") onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
				else onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
			}
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
			if (valueNode) {
				if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
			} else if (valueProps.comment) {
				if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
				else keyNode.comment = valueProps.comment;
			}
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			if (isMap) {
				const map = coll;
				if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
				map.items.push(pair);
			} else {
				const map = new YAMLMap(ctx.schema);
				map.flow = true;
				map.items.push(pair);
				const endRange = (valueNode ?? keyNode).range;
				map.range = [
					keyNode.range[0],
					endRange[1],
					endRange[2]
				];
				coll.items.push(map);
			}
			offset = valueNode ? valueNode.range[2] : valueProps.end;
		}
	}
	const expectedEnd = isMap ? "}" : "]";
	const [ce, ...ee] = fc.end;
	let cePos = offset;
	if (ce?.source === expectedEnd) cePos = ce.offset + ce.source.length;
	else {
		const name = fcName[0].toUpperCase() + fcName.substring(1);
		const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
		onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
		if (ce && ce.source.length !== 1) ee.unshift(ce);
	}
	if (ee.length > 0) {
		const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
		if (end.comment) {
			if (coll.comment) coll.comment += "\n" + end.comment;
			else coll.comment = end.comment;
		}
		coll.range = [
			fc.offset,
			cePos,
			end.offset
		];
	} else coll.range = [
		fc.offset,
		cePos,
		cePos
	];
	return coll;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN, ctx, token, onError, tagName, tag) {
	const coll = token.type === "block-map" ? resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection(CN, ctx, token, onError, tag);
	const Coll = coll.constructor;
	if (tagName === "!" || tagName === Coll.tagName) {
		coll.tag = Coll.tagName;
		return coll;
	}
	if (tagName) coll.tag = tagName;
	return coll;
}
function composeCollection(CN, ctx, token, props, onError) {
	const tagToken = props.tag;
	const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
	if (token.type === "block-seq") {
		const { anchor, newlineAfterProp: nl } = props;
		const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
		if (lastProp && (!nl || nl.offset < lastProp.offset)) onError(lastProp, "MISSING_CHAR", "Missing newline after block sequence props");
	}
	const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
	if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") return resolveCollection(CN, ctx, token, onError, tagName);
	let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
	if (!tag) {
		const kt = ctx.schema.knownTags[tagName];
		if (kt?.collection === expType) {
			ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
			tag = kt;
		} else {
			if (kt) onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
			else onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
			return resolveCollection(CN, ctx, token, onError, tagName);
		}
	}
	const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
	const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
	const node = isNode(res) ? res : new Scalar(res);
	node.range = coll.range;
	node.tag = tagName;
	if (tag?.format) node.format = tag.format;
	return node;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar, onError) {
	const start = scalar.offset;
	const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
	if (!header) return {
		value: "",
		type: null,
		comment: "",
		range: [
			start,
			start,
			start
		]
	};
	const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
	const lines = scalar.source ? splitLines(scalar.source) : [];
	let chompStart = lines.length;
	for (let i = lines.length - 1; i >= 0; --i) {
		const content = lines[i][1];
		if (content === "" || content === "\r") chompStart = i;
		else break;
	}
	if (chompStart === 0) {
		const value = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
		let end = start + header.length;
		if (scalar.source) end += scalar.source.length;
		return {
			value,
			type,
			comment: header.comment,
			range: [
				start,
				end,
				end
			]
		};
	}
	let trimIndent = scalar.indent + header.indent;
	let offset = scalar.offset + header.length;
	let contentStart = 0;
	for (let i = 0; i < chompStart; ++i) {
		const [indent, content] = lines[i];
		if (content === "" || content === "\r") {
			if (header.indent === 0 && indent.length > trimIndent) trimIndent = indent.length;
		} else {
			if (indent.length < trimIndent) onError(offset + indent.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator");
			if (header.indent === 0) trimIndent = indent.length;
			contentStart = i;
			if (trimIndent === 0 && !ctx.atRoot) onError(offset, "BAD_INDENT", "Block scalar values in collections must be indented");
			break;
		}
		offset += indent.length + content.length + 1;
	}
	for (let i = lines.length - 1; i >= chompStart; --i) if (lines[i][0].length > trimIndent) chompStart = i + 1;
	let value = "";
	let sep = "";
	let prevMoreIndented = false;
	for (let i = 0; i < contentStart; ++i) value += lines[i][0].slice(trimIndent) + "\n";
	for (let i = contentStart; i < chompStart; ++i) {
		let [indent, content] = lines[i];
		offset += indent.length + content.length + 1;
		const crlf = content[content.length - 1] === "\r";
		if (crlf) content = content.slice(0, -1);
		/* istanbul ignore if already caught in lexer */
		if (content && indent.length < trimIndent) {
			const message = `Block scalar lines must not be less indented than their ${header.indent ? "explicit indentation indicator" : "first line"}`;
			onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
			indent = "";
		}
		if (type === Scalar.BLOCK_LITERAL) {
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
		} else if (indent.length > trimIndent || content[0] === "	") {
			if (sep === " ") sep = "\n";
			else if (!prevMoreIndented && sep === "\n") sep = "\n\n";
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
			prevMoreIndented = true;
		} else if (content === "") {
			if (sep === "\n") value += "\n";
			else sep = "\n";
		} else {
			value += sep + content;
			sep = " ";
			prevMoreIndented = false;
		}
	}
	switch (header.chomp) {
		case "-": break;
		case "+":
			for (let i = chompStart; i < lines.length; ++i) value += "\n" + lines[i][0].slice(trimIndent);
			if (value[value.length - 1] !== "\n") value += "\n";
			break;
		default: value += "\n";
	}
	const end = start + header.length + scalar.source.length;
	return {
		value,
		type,
		comment: header.comment,
		range: [
			start,
			end,
			end
		]
	};
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
	/* istanbul ignore if should not happen */
	if (props[0].type !== "block-scalar-header") {
		onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
		return null;
	}
	const { source } = props[0];
	const mode = source[0];
	let indent = 0;
	let chomp = "";
	let error = -1;
	for (let i = 1; i < source.length; ++i) {
		const ch = source[i];
		if (!chomp && (ch === "-" || ch === "+")) chomp = ch;
		else {
			const n = Number(ch);
			if (!indent && n) indent = n;
			else if (error === -1) error = offset + i;
		}
	}
	if (error !== -1) onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
	let hasSpace = false;
	let comment = "";
	let length = source.length;
	for (let i = 1; i < props.length; ++i) {
		const token = props[i];
		switch (token.type) {
			case "space": hasSpace = true;
			case "newline":
				length += token.source.length;
				break;
			case "comment":
				if (strict && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				length += token.source.length;
				comment = token.source.substring(1);
				break;
			case "error":
				onError(token, "UNEXPECTED_TOKEN", token.message);
				length += token.source.length;
				break;
			/* istanbul ignore next should not happen */
			default: {
				onError(token, "UNEXPECTED_TOKEN", `Unexpected token in block scalar header: ${token.type}`);
				const ts = token.source;
				if (ts && typeof ts === "string") length += ts.length;
			}
		}
	}
	return {
		mode,
		indent,
		chomp,
		comment,
		length
	};
}
/** @returns Array of lines split up as `[indent, content]` */
function splitLines(source) {
	const split = source.split(/\n( *)/);
	const first = split[0];
	const m = first.match(/^( *)/);
	const lines = [m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first]];
	for (let i = 1; i < split.length; i += 2) lines.push([split[i], split[i + 1]]);
	return lines;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar, strict, onError) {
	const { offset, type, source, end } = scalar;
	let _type;
	let value;
	const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
	switch (type) {
		case "scalar":
			_type = Scalar.PLAIN;
			value = plainValue(source, _onError);
			break;
		case "single-quoted-scalar":
			_type = Scalar.QUOTE_SINGLE;
			value = singleQuotedValue(source, _onError);
			break;
		case "double-quoted-scalar":
			_type = Scalar.QUOTE_DOUBLE;
			value = doubleQuotedValue(source, _onError);
			break;
		/* istanbul ignore next should not happen */
		default:
			onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
			return {
				value: "",
				type: null,
				comment: "",
				range: [
					offset,
					offset + source.length,
					offset + source.length
				]
			};
	}
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, strict, onError);
	return {
		value,
		type: _type,
		comment: re.comment,
		range: [
			offset,
			valueEnd,
			re.offset
		]
	};
}
function plainValue(source, onError) {
	let badChar = "";
	switch (source[0]) {
		/* istanbul ignore next should not happen */
		case "	":
			badChar = "a tab character";
			break;
		case ",":
			badChar = "flow indicator character ,";
			break;
		case "%":
			badChar = "directive indicator character %";
			break;
		case "|":
		case ">":
			badChar = `block scalar indicator ${source[0]}`;
			break;
		case "@":
		case "`": badChar = `reserved character ${source[0]}`;
	}
	if (badChar) onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
	return unfoldLines(source);
}
function singleQuotedValue(source, onError) {
	if (source[source.length - 1] !== "'" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
	return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function unfoldLines(source) {
	const line = /(.*?)\r?\n/sy;
	let match = line.exec(source);
	if (!match) return source;
	/**
	* The negative lookbehinds in these RegExps are to
	* prevent causing a polynomial search time in certain cases.
	*
	* The try-catch is for Safari < 16.4 and other old browsers:
	* https://caniuse.com/js-regexp-lookbehind
	*/
	let trimEnd, trimBoth;
	try {
		trimEnd = /* @__PURE__ */ new RegExp("(?<![ 	])[ 	]+$");
		trimBoth = /* @__PURE__ */ new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
	} catch {
		trimEnd = /[ \t]+$/;
		trimBoth = /^[ \t]+|[ \t]+$/g;
	}
	let res = match[1].replace(trimEnd, "");
	let sep = " ";
	let pos = line.lastIndex;
	while (match = line.exec(source)) {
		const lm = match[1].replace(trimBoth, "");
		if (lm === "") {
			if (sep === "\n") res += sep;
			else sep = "\n";
		} else {
			res += sep + lm;
			sep = " ";
		}
		pos = line.lastIndex;
	}
	const last = /[ \t]*(.*)/sy;
	last.lastIndex = pos;
	match = last.exec(source);
	return res + sep + (match?.[1] ?? "");
}
function doubleQuotedValue(source, onError) {
	let res = "";
	for (let i = 1; i < source.length - 1; ++i) {
		const ch = source[i];
		if (ch === "\r" && source[i + 1] === "\n") continue;
		if (ch === "\n") {
			const { fold, offset } = foldNewline(source, i);
			res += fold;
			i = offset;
		} else if (ch === "\\") {
			let next = source[++i];
			const cc = escapeCodes[next];
			if (cc) res += cc;
			else if (next === "\n") {
				next = source[i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "\r" && source[i + 1] === "\n") {
				next = source[++i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "x" || next === "u" || next === "U") {
				const length = next === "x" ? 2 : next === "u" ? 4 : 8;
				res += parseCharCode(source, i + 1, length, onError);
				i += length;
			} else {
				const raw = source.substr(i - 1, 2);
				onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
				res += raw;
			}
		} else if (ch === " " || ch === "	") {
			const wsStart = i;
			let next = source[i + 1];
			while (next === " " || next === "	") next = source[++i + 1];
			if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n")) res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
		} else res += ch;
	}
	if (source[source.length - 1] !== "\"" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing \"quote");
	return res;
}
/**
* Fold a single newline into a space, multiple newlines to N - 1 newlines.
* Presumes `source[offset] === '\n'`
*/
function foldNewline(source, offset) {
	let fold = "";
	let ch = source[offset + 1];
	while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
		if (ch === "\r" && source[offset + 2] !== "\n") break;
		if (ch === "\n") fold += "\n";
		offset += 1;
		ch = source[offset + 1];
	}
	if (!fold) fold = " ";
	return {
		fold,
		offset
	};
}
var escapeCodes = {
	"0": "\0",
	a: "\x07",
	b: "\b",
	e: "\x1B",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	",
	v: "\v",
	N: "",
	_: "\xA0",
	L: "\u2028",
	P: "\u2029",
	" ": " ",
	"\"": "\"",
	"/": "/",
	"\\": "\\",
	"	": "	"
};
function parseCharCode(source, offset, length, onError) {
	const cc = source.substr(offset, length);
	const code = cc.length === length && /^[0-9a-fA-F]+$/.test(cc) ? parseInt(cc, 16) : NaN;
	try {
		return String.fromCodePoint(code);
	} catch {
		const raw = source.substr(offset - 2, length + 2);
		onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
		return raw;
	}
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
	const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
	const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
	let tag;
	if (ctx.options.stringKeys && ctx.atKey) tag = ctx.schema[SCALAR$1];
	else if (tagName) tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
	else if (token.type === "scalar") tag = findScalarTagByTest(ctx, value, token, onError);
	else tag = ctx.schema[SCALAR$1];
	let scalar;
	try {
		const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
		scalar = isScalar(res) ? res : new Scalar(res);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
		scalar = new Scalar(value);
	}
	scalar.range = range;
	scalar.source = value;
	if (type) scalar.type = type;
	if (tagName) scalar.tag = tagName;
	if (tag.format) scalar.format = tag.format;
	if (comment) scalar.comment = comment;
	return scalar;
}
function findScalarTagByName(schema, value, tagName, tagToken, onError) {
	if (tagName === "!") return schema[SCALAR$1];
	const matchWithTest = [];
	for (const tag of schema.tags) if (!tag.collection && tag.tag === tagName) {
		if (tag.default && tag.test) matchWithTest.push(tag);
		else return tag;
	}
	for (const tag of matchWithTest) if (tag.test?.test(value)) return tag;
	const kt = schema.knownTags[tagName];
	if (kt && !kt.collection) {
		schema.tags.push(Object.assign({}, kt, {
			default: false,
			test: void 0
		}));
		return kt;
	}
	onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
	return schema[SCALAR$1];
}
function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
	const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[SCALAR$1];
	if (schema.compat) {
		const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[SCALAR$1];
		if (tag.tag !== compat.tag) onError(token, "TAG_RESOLVE_FAILED", `Value may be parsed as either ${directives.tagString(tag.tag)} or ${directives.tagString(compat.tag)}`, true);
	}
	return tag;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
	if (before) {
		pos ?? (pos = before.length);
		for (let i = pos - 1; i >= 0; --i) {
			let st = before[i];
			switch (st.type) {
				case "space":
				case "comment":
				case "newline":
					offset -= st.source.length;
					continue;
			}
			st = before[++i];
			while (st?.type === "space") {
				offset += st.source.length;
				st = before[++i];
			}
			break;
		}
	}
	return offset;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/compose-node.js
var CN = {
	composeNode,
	composeEmptyNode
};
function composeNode(ctx, token, props, onError) {
	const atKey = ctx.atKey;
	const { spaceBefore, comment, anchor, tag } = props;
	let node;
	let isSrcToken = true;
	switch (token.type) {
		case "alias":
			node = composeAlias(ctx, token, onError);
			if (anchor || tag) onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
			break;
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "block-scalar":
			node = composeScalar(ctx, token, tag, onError);
			if (anchor) node.anchor = anchor.source.substring(1);
			break;
		case "block-map":
		case "block-seq":
		case "flow-collection":
			try {
				node = composeCollection(CN, ctx, token, props, onError);
				if (anchor) node.anchor = anchor.source.substring(1);
			} catch (error) {
				onError(token, "RESOURCE_EXHAUSTION", error instanceof Error ? error.message : String(error));
			}
			break;
		default:
			onError(token, "UNEXPECTED_TOKEN", token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`);
			isSrcToken = false;
	}
	node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
	if (anchor && node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	if (atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) onError(tag ?? token, "NON_STRING_KEY", "With stringKeys, all keys must be strings");
	if (spaceBefore) node.spaceBefore = true;
	if (comment) {
		if (token.type === "scalar" && token.source === "") node.comment = comment;
		else node.commentBefore = comment;
	}
	if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
	return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
	const node = composeScalar(ctx, {
		type: "scalar",
		offset: emptyScalarPosition(offset, before, pos),
		indent: -1,
		source: ""
	}, tag, onError);
	if (anchor) {
		node.anchor = anchor.source.substring(1);
		if (node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	}
	if (spaceBefore) node.spaceBefore = true;
	if (comment) {
		node.comment = comment;
		node.range[2] = end;
	}
	return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
	const alias = new Alias(source.substring(1));
	if (alias.source === "") onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
	if (alias.source.endsWith(":")) onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, options.strict, onError);
	alias.range = [
		offset,
		valueEnd,
		re.offset
	];
	if (re.comment) alias.comment = re.comment;
	return alias;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
	const doc = new Document(void 0, Object.assign({ _directives: directives }, options));
	const ctx = {
		atKey: false,
		atRoot: true,
		directives: doc.directives,
		options: doc.options,
		schema: doc.schema
	};
	const props = resolveProps(start, {
		indicator: "doc-start",
		next: value ?? end?.[0],
		offset,
		onError,
		parentIndent: 0,
		startOnNewline: true
	});
	if (props.found) {
		doc.directives.docStart = true;
		if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline) onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
	}
	doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
	const contentEnd = doc.contents.range[2];
	const re = resolveEnd(end, contentEnd, false, onError);
	if (re.comment) doc.comment = re.comment;
	doc.range = [
		offset,
		contentEnd,
		re.offset
	];
	return doc;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
	if (typeof src === "number") return [src, src + 1];
	if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
	const { offset, source } = src;
	return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
	let comment = "";
	let atComment = false;
	let afterEmptyLine = false;
	for (let i = 0; i < prelude.length; ++i) {
		const source = prelude[i];
		switch (source[0]) {
			case "#":
				comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
				atComment = true;
				afterEmptyLine = false;
				break;
			case "%":
				if (prelude[i + 1]?.[0] !== "#") i += 1;
				atComment = false;
				break;
			default:
				if (!atComment) afterEmptyLine = true;
				atComment = false;
		}
	}
	return {
		comment,
		afterEmptyLine
	};
}
/**
* Compose a stream of CST nodes into a stream of YAML Documents.
*
* ```ts
* import { Composer, Parser } from 'yaml'
*
* const src: string = ...
* const tokens = new Parser().parse(src)
* const docs = new Composer().compose(tokens)
* ```
*/
var Composer = class {
	constructor(options = {}) {
		this.doc = null;
		this.atDirectives = false;
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
		this.onError = (source, code, message, warning) => {
			const pos = getErrorPos(source);
			if (warning) this.warnings.push(new YAMLWarning(pos, code, message));
			else this.errors.push(new YAMLParseError(pos, code, message));
		};
		this.directives = new Directives({ version: options.version || "1.2" });
		this.options = options;
	}
	decorate(doc, afterDoc) {
		const { comment, afterEmptyLine } = parsePrelude(this.prelude);
		if (comment) {
			const dc = doc.contents;
			if (afterDoc) doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
			else if (afterEmptyLine || doc.directives.docStart || !dc) doc.commentBefore = comment;
			else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
				let it = dc.items[0];
				if (isPair(it)) it = it.key;
				const cb = it.commentBefore;
				it.commentBefore = cb ? `${comment}\n${cb}` : comment;
			} else {
				const cb = dc.commentBefore;
				dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
			}
		}
		if (afterDoc) {
			for (let i = 0; i < this.errors.length; ++i) doc.errors.push(this.errors[i]);
			for (let i = 0; i < this.warnings.length; ++i) doc.warnings.push(this.warnings[i]);
		} else {
			doc.errors = this.errors;
			doc.warnings = this.warnings;
		}
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
	}
	/**
	* Current stream status information.
	*
	* Mostly useful at the end of input for an empty stream.
	*/
	streamInfo() {
		return {
			comment: parsePrelude(this.prelude).comment,
			directives: this.directives,
			errors: this.errors,
			warnings: this.warnings
		};
	}
	/**
	* Compose tokens into documents.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*compose(tokens, forceDoc = false, endOffset = -1) {
		for (const token of tokens) yield* this.next(token);
		yield* this.end(forceDoc, endOffset);
	}
	/** Advance the composer by one CST token. */
	*next(token) {
		switch (token.type) {
			case "directive":
				this.directives.add(token.source, (offset, message, warning) => {
					const pos = getErrorPos(token);
					pos[0] += offset;
					this.onError(pos, "BAD_DIRECTIVE", message, warning);
				});
				this.prelude.push(token.source);
				this.atDirectives = true;
				break;
			case "document": {
				const doc = composeDoc(this.options, this.directives, token, this.onError);
				if (this.atDirectives && !doc.directives.docStart) this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
				this.decorate(doc, false);
				if (this.doc) yield this.doc;
				this.doc = doc;
				this.atDirectives = false;
				break;
			}
			case "byte-order-mark":
			case "space": break;
			case "comment":
			case "newline":
				this.prelude.push(token.source);
				break;
			case "error": {
				const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
				const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
				if (this.atDirectives || !this.doc) this.errors.push(error);
				else this.doc.errors.push(error);
				break;
			}
			case "doc-end": {
				if (!this.doc) {
					this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", "Unexpected doc-end without preceding document"));
					break;
				}
				this.doc.directives.docEnd = true;
				const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
				this.decorate(this.doc, true);
				if (end.comment) {
					const dc = this.doc.comment;
					this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
				}
				this.doc.range[2] = end.offset;
				break;
			}
			default: this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
		}
	}
	/**
	* Call at end of input to yield any remaining document.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*end(forceDoc = false, endOffset = -1) {
		if (this.doc) {
			this.decorate(this.doc, true);
			yield this.doc;
			this.doc = null;
		} else if (forceDoc) {
			const doc = new Document(void 0, Object.assign({ _directives: this.directives }, this.options));
			if (this.atDirectives) this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
			doc.range = [
				0,
				endOffset,
				endOffset
			];
			this.decorate(doc, false);
			yield doc;
		}
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove item");
/**
* Apply a visitor to a CST document or item.
*
* Walks through the tree (depth-first) starting from the root, calling a
* `visitor` function with two arguments when entering each item:
*   - `item`: The current item, which included the following members:
*     - `start: SourceToken[]` – Source tokens before the key or value,
*       possibly including its anchor or tag.
*     - `key?: Token | null` – Set for pair values. May then be `null`, if
*       the key before the `:` separator is empty.
*     - `sep?: SourceToken[]` – Source tokens between the key and the value,
*       which should include the `:` map value indicator if `value` is set.
*     - `value?: Token` – The value of a sequence item, or of a map pair.
*   - `path`: The steps from the root to the current node, as an array of
*     `['key' | 'value', number]` tuples.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this token, continue with
*      next sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current item, then continue with the next one
*   - `number`: Set the index of the next step. This is useful especially if
*     the index of the current token has changed.
*   - `function`: Define the next visitor for this item. After the original
*     visitor is called on item entry, next visitors are called after handling
*     a non-empty `key` and when exiting the item.
*/
function visit(cst, visitor) {
	if ("type" in cst && cst.type === "document") cst = {
		start: cst.start,
		value: cst.value
	};
	_visit(Object.freeze([]), cst, visitor);
}
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current item */
visit.SKIP = SKIP;
/** Remove the current item */
visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */
visit.itemAtPath = (cst, path) => {
	let item = cst;
	for (const [field, index] of path) {
		const tok = item?.[field];
		if (tok && "items" in tok) item = tok.items[index];
		else return void 0;
	}
	return item;
};
/**
* Get the immediate parent collection of the item at `path` from `cst` as the root.
*
* Throws an error if the collection is not found, which should never happen if the item itself exists.
*/
visit.parentCollection = (cst, path) => {
	const parent = visit.itemAtPath(cst, path.slice(0, -1));
	const field = path[path.length - 1][0];
	const coll = parent?.[field];
	if (coll && "items" in coll) return coll;
	throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
	let ctrl = visitor(item, path);
	if (typeof ctrl === "symbol") return ctrl;
	for (const field of ["key", "value"]) {
		const token = item[field];
		if (token && "items" in token) {
			for (let i = 0; i < token.items.length; ++i) {
				const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK) return BREAK;
				else if (ci === REMOVE) {
					token.items.splice(i, 1);
					i -= 1;
				}
			}
			if (typeof ctrl === "function" && field === "key") ctrl = ctrl(item, path);
		}
	}
	return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */
function tokenType(source) {
	switch (source) {
		case "﻿": return "byte-order-mark";
		case "": return "doc-mode";
		case "": return "flow-error-end";
		case "": return "scalar";
		case "---": return "doc-start";
		case "...": return "doc-end";
		case "":
		case "\n":
		case "\r\n": return "newline";
		case "-": return "seq-item-ind";
		case "?": return "explicit-key-ind";
		case ":": return "map-value-ind";
		case "{": return "flow-map-start";
		case "}": return "flow-map-end";
		case "[": return "flow-seq-start";
		case "]": return "flow-seq-end";
		case ",": return "comma";
	}
	switch (source[0]) {
		case " ":
		case "	": return "space";
		case "#": return "comment";
		case "%": return "directive-line";
		case "*": return "alias";
		case "&": return "anchor";
		case "!": return "tag";
		case "'": return "single-quoted-scalar";
		case "\"": return "double-quoted-scalar";
		case "|":
		case ">": return "block-scalar-header";
	}
	return null;
}
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty(ch) {
	switch (ch) {
		case void 0:
		case " ":
		case "\n":
		case "\r":
		case "	": return true;
		default: return false;
	}
}
var hexDigits = /* @__PURE__ */ new Set("0123456789ABCDEFabcdef");
var tagChars = /* @__PURE__ */ new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = /* @__PURE__ */ new Set(",[]{}");
var invalidAnchorChars = /* @__PURE__ */ new Set(" ,[]{}\n\r	");
var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
/**
* Splits an input string into lexical tokens, i.e. smaller strings that are
* easily identifiable by `tokens.tokenType()`.
*
* Lexing starts always in a "stream" context. Incomplete input may be buffered
* until a complete token can be emitted.
*
* In addition to slices of the original input, the following control characters
* may also be emitted:
*
* - `\x02` (Start of Text): A document starts with the next token
* - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
* - `\x1f` (Unit Separator): Next token is a scalar value
* - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
*/
var Lexer = class {
	constructor() {
		/**
		* Flag indicating whether the end of the current buffer marks the end of
		* all input
		*/
		this.atEnd = false;
		/**
		* Explicit indent set in block scalar header, as an offset from the current
		* minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
		* explicitly set.
		*/
		this.blockScalarIndent = -1;
		/**
		* Block scalars that include a + (keep) chomping indicator in their header
		* include trailing empty lines, which are otherwise excluded from the
		* scalar's contents.
		*/
		this.blockScalarKeep = false;
		/** Current input */
		this.buffer = "";
		/**
		* Flag noting whether the map value indicator : can immediately follow this
		* node within a flow context.
		*/
		this.flowKey = false;
		/** Count of surrounding flow collection levels. */
		this.flowLevel = 0;
		/**
		* Minimum level of indentation required for next lines to be parsed as a
		* part of the current scalar value.
		*/
		this.indentNext = 0;
		/** Indentation level of the current line. */
		this.indentValue = 0;
		/** Position of the next \n character. */
		this.lineEndPos = null;
		/** Stores the state of the lexer if reaching the end of incpomplete input */
		this.next = null;
		/** A pointer to `buffer`; the current position of the lexer. */
		this.pos = 0;
	}
	/**
	* Generate YAML tokens from the `source` string. If `incomplete`,
	* a part of the last line may be left as a buffer for the next call.
	*
	* @returns A generator of lexical tokens
	*/
	*lex(source, incomplete = false) {
		if (source) {
			if (typeof source !== "string") throw TypeError("source is not a string");
			this.buffer = this.buffer ? this.buffer + source : source;
			this.lineEndPos = null;
		}
		this.atEnd = !incomplete;
		let next = this.next ?? "stream";
		while (next && (incomplete || this.hasChars(1))) next = yield* this.parseNext(next);
	}
	atLineEnd() {
		let i = this.pos;
		let ch = this.buffer[i];
		while (ch === " " || ch === "	") ch = this.buffer[++i];
		if (!ch || ch === "#" || ch === "\n") return true;
		if (ch === "\r") return this.buffer[i + 1] === "\n";
		return false;
	}
	charAt(n) {
		return this.buffer[this.pos + n];
	}
	continueScalar(offset) {
		let ch = this.buffer[offset];
		if (this.indentNext > 0) {
			let indent = 0;
			while (ch === " ") ch = this.buffer[++indent + offset];
			if (ch === "\r") {
				const next = this.buffer[indent + offset + 1];
				if (next === "\n" || !next && !this.atEnd) return offset + indent + 1;
			}
			return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
		}
		if (ch === "-" || ch === ".") {
			const dt = this.buffer.substr(offset, 3);
			if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3])) return -1;
		}
		return offset;
	}
	getLine() {
		let end = this.lineEndPos;
		if (typeof end !== "number" || end !== -1 && end < this.pos) {
			end = this.buffer.indexOf("\n", this.pos);
			this.lineEndPos = end;
		}
		if (end === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
		if (this.buffer[end - 1] === "\r") end -= 1;
		return this.buffer.substring(this.pos, end);
	}
	hasChars(n) {
		return this.pos + n <= this.buffer.length;
	}
	setNext(state) {
		this.buffer = this.buffer.substring(this.pos);
		this.pos = 0;
		this.lineEndPos = null;
		this.next = state;
		return null;
	}
	peek(n) {
		return this.buffer.substr(this.pos, n);
	}
	*parseNext(next) {
		switch (next) {
			case "stream": return yield* this.parseStream();
			case "line-start": return yield* this.parseLineStart();
			case "block-start": return yield* this.parseBlockStart();
			case "doc": return yield* this.parseDocument();
			case "flow": return yield* this.parseFlowCollection();
			case "quoted-scalar": return yield* this.parseQuotedScalar();
			case "block-scalar": return yield* this.parseBlockScalar();
			case "plain-scalar": return yield* this.parsePlainScalar();
		}
	}
	*parseStream() {
		let line = this.getLine();
		if (line === null) return this.setNext("stream");
		if (line[0] === "﻿") {
			yield* this.pushCount(1);
			line = line.substring(1);
		}
		if (line[0] === "%") {
			let dirEnd = line.length;
			let cs = line.indexOf("#");
			while (cs !== -1) {
				const ch = line[cs - 1];
				if (ch === " " || ch === "	") {
					dirEnd = cs - 1;
					break;
				} else cs = line.indexOf("#", cs + 1);
			}
			while (true) {
				const ch = line[dirEnd - 1];
				if (ch === " " || ch === "	") dirEnd -= 1;
				else break;
			}
			const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
			yield* this.pushCount(line.length - n);
			this.pushNewline();
			return "stream";
		}
		if (this.atLineEnd()) {
			const sp = yield* this.pushSpaces(true);
			yield* this.pushCount(line.length - sp);
			yield* this.pushNewline();
			return "stream";
		}
		yield "";
		return yield* this.parseLineStart();
	}
	*parseLineStart() {
		const ch = this.charAt(0);
		if (!ch && !this.atEnd) return this.setNext("line-start");
		if (ch === "-" || ch === ".") {
			if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
			const s = this.peek(3);
			if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
				yield* this.pushCount(3);
				this.indentValue = 0;
				this.indentNext = 0;
				return s === "---" ? "doc" : "stream";
			}
		}
		this.indentValue = yield* this.pushSpaces(false);
		if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1))) this.indentNext = this.indentValue;
		return yield* this.parseBlockStart();
	}
	*parseBlockStart() {
		const [ch0, ch1] = this.peek(2);
		if (!ch1 && !this.atEnd) return this.setNext("block-start");
		if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
			const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
			this.indentNext = this.indentValue + 1;
			this.indentValue += n;
			return "block-start";
		}
		return "doc";
	}
	*parseDocument() {
		yield* this.pushSpaces(true);
		const line = this.getLine();
		if (line === null) return this.setNext("doc");
		let n = yield* this.pushIndicators();
		switch (line[n]) {
			case "#": yield* this.pushCount(line.length - n);
			case void 0:
				yield* this.pushNewline();
				return yield* this.parseLineStart();
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel = 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				return "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "doc";
			case "\"":
			case "'": return yield* this.parseQuotedScalar();
			case "|":
			case ">":
				n += yield* this.parseBlockScalarHeader();
				n += yield* this.pushSpaces(true);
				yield* this.pushCount(line.length - n);
				yield* this.pushNewline();
				return yield* this.parseBlockScalar();
			default: return yield* this.parsePlainScalar();
		}
	}
	*parseFlowCollection() {
		let nl, sp;
		let indent = -1;
		do {
			nl = yield* this.pushNewline();
			if (nl > 0) {
				sp = yield* this.pushSpaces(false);
				this.indentValue = indent = sp;
			} else sp = 0;
			sp += yield* this.pushSpaces(true);
		} while (nl + sp > 0);
		const line = this.getLine();
		if (line === null) return this.setNext("flow");
		if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
			if (!(indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}"))) {
				this.flowLevel = 0;
				yield "";
				return yield* this.parseLineStart();
			}
		}
		let n = 0;
		while (line[n] === ",") {
			n += yield* this.pushCount(1);
			n += yield* this.pushSpaces(true);
			this.flowKey = false;
		}
		n += yield* this.pushIndicators();
		switch (line[n]) {
			case void 0: return "flow";
			case "#":
				yield* this.pushCount(line.length - n);
				return "flow";
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel += 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				this.flowKey = true;
				this.flowLevel -= 1;
				return this.flowLevel ? "flow" : "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "flow";
			case "\"":
			case "'":
				this.flowKey = true;
				return yield* this.parseQuotedScalar();
			case ":": {
				const next = this.charAt(1);
				if (this.flowKey || isEmpty(next) || next === ",") {
					this.flowKey = false;
					yield* this.pushCount(1);
					yield* this.pushSpaces(true);
					return "flow";
				}
			}
			default:
				this.flowKey = false;
				return yield* this.parsePlainScalar();
		}
	}
	*parseQuotedScalar() {
		const quote = this.charAt(0);
		let end = this.buffer.indexOf(quote, this.pos + 1);
		if (quote === "'") while (end !== -1 && this.buffer[end + 1] === "'") end = this.buffer.indexOf("'", end + 2);
		else while (end !== -1) {
			let n = 0;
			while (this.buffer[end - 1 - n] === "\\") n += 1;
			if (n % 2 === 0) break;
			end = this.buffer.indexOf("\"", end + 1);
		}
		const qb = this.buffer.substring(0, end);
		let nl = qb.indexOf("\n", this.pos);
		if (nl !== -1) {
			while (nl !== -1) {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = qb.indexOf("\n", cs);
			}
			if (nl !== -1) end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
		}
		if (end === -1) {
			if (!this.atEnd) return this.setNext("quoted-scalar");
			end = this.buffer.length;
		}
		yield* this.pushToIndex(end + 1, false);
		return this.flowLevel ? "flow" : "doc";
	}
	*parseBlockScalarHeader() {
		this.blockScalarIndent = -1;
		this.blockScalarKeep = false;
		let i = this.pos;
		while (true) {
			const ch = this.buffer[++i];
			if (ch === "+") this.blockScalarKeep = true;
			else if (ch > "0" && ch <= "9") this.blockScalarIndent = Number(ch) - 1;
			else if (ch !== "-") break;
		}
		return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
	}
	*parseBlockScalar() {
		let nl = this.pos - 1;
		let indent = 0;
		let ch;
		loop: for (let i = this.pos; ch = this.buffer[i]; ++i) switch (ch) {
			case " ":
				indent += 1;
				break;
			case "\n":
				nl = i;
				indent = 0;
				break;
			case "\r": {
				const next = this.buffer[i + 1];
				if (!next && !this.atEnd) return this.setNext("block-scalar");
				if (next === "\n") break;
			}
			default: break loop;
		}
		if (!ch && !this.atEnd) return this.setNext("block-scalar");
		if (indent >= this.indentNext) {
			if (this.blockScalarIndent === -1) this.indentNext = indent;
			else this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
			do {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = this.buffer.indexOf("\n", cs);
			} while (nl !== -1);
			if (nl === -1) {
				if (!this.atEnd) return this.setNext("block-scalar");
				nl = this.buffer.length;
			}
		}
		let i = nl + 1;
		ch = this.buffer[i];
		while (ch === " ") ch = this.buffer[++i];
		if (ch === "	") {
			while (ch === "	" || ch === " " || ch === "\r" || ch === "\n") ch = this.buffer[++i];
			nl = i - 1;
		} else if (!this.blockScalarKeep) do {
			let i = nl - 1;
			let ch = this.buffer[i];
			if (ch === "\r") ch = this.buffer[--i];
			const lastChar = i;
			while (ch === " ") ch = this.buffer[--i];
			if (ch === "\n" && i >= this.pos && i + 1 + indent > lastChar) nl = i;
			else break;
		} while (true);
		yield "";
		yield* this.pushToIndex(nl + 1, true);
		return yield* this.parseLineStart();
	}
	*parsePlainScalar() {
		const inFlow = this.flowLevel > 0;
		let end = this.pos - 1;
		let i = this.pos - 1;
		let ch;
		while (ch = this.buffer[++i]) if (ch === ":") {
			const next = this.buffer[i + 1];
			if (isEmpty(next) || inFlow && flowIndicatorChars.has(next)) break;
			end = i;
		} else if (isEmpty(ch)) {
			let next = this.buffer[i + 1];
			if (ch === "\r") {
				if (next === "\n") {
					i += 1;
					ch = "\n";
					next = this.buffer[i + 1];
				} else end = i;
			}
			if (next === "#" || inFlow && flowIndicatorChars.has(next)) break;
			if (ch === "\n") {
				const cs = this.continueScalar(i + 1);
				if (cs === -1) break;
				i = Math.max(i, cs - 2);
			}
		} else {
			if (inFlow && flowIndicatorChars.has(ch)) break;
			end = i;
		}
		if (!ch && !this.atEnd) return this.setNext("plain-scalar");
		yield "";
		yield* this.pushToIndex(end + 1, true);
		return inFlow ? "flow" : "doc";
	}
	*pushCount(n) {
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos += n;
			return n;
		}
		return 0;
	}
	*pushToIndex(i, allowEmpty) {
		const s = this.buffer.slice(this.pos, i);
		if (s) {
			yield s;
			this.pos += s.length;
			return s.length;
		} else if (allowEmpty) yield "";
		return 0;
	}
	*pushIndicators() {
		let n = 0;
		loop: while (true) {
			switch (this.charAt(0)) {
				case "!":
					n += yield* this.pushTag();
					n += yield* this.pushSpaces(true);
					continue loop;
				case "&":
					n += yield* this.pushUntil(isNotAnchorChar);
					n += yield* this.pushSpaces(true);
					continue loop;
				case "-":
				case "?":
				case ":": {
					const inFlow = this.flowLevel > 0;
					const ch1 = this.charAt(1);
					if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
						if (!inFlow) this.indentNext = this.indentValue + 1;
						else if (this.flowKey) this.flowKey = false;
						n += yield* this.pushCount(1);
						n += yield* this.pushSpaces(true);
						continue loop;
					}
				}
			}
			break loop;
		}
		return n;
	}
	*pushTag() {
		if (this.charAt(1) === "<") {
			let i = this.pos + 2;
			let ch = this.buffer[i];
			while (!isEmpty(ch) && ch !== ">") ch = this.buffer[++i];
			return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
		} else {
			let i = this.pos + 1;
			let ch = this.buffer[i];
			while (ch) if (tagChars.has(ch)) ch = this.buffer[++i];
			else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) ch = this.buffer[i += 3];
			else break;
			return yield* this.pushToIndex(i, false);
		}
	}
	*pushNewline() {
		const ch = this.buffer[this.pos];
		if (ch === "\n") return yield* this.pushCount(1);
		else if (ch === "\r" && this.charAt(1) === "\n") return yield* this.pushCount(2);
		else return 0;
	}
	*pushSpaces(allowTabs) {
		let i = this.pos - 1;
		let ch;
		do
			ch = this.buffer[++i];
		while (ch === " " || allowTabs && ch === "	");
		const n = i - this.pos;
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos = i;
		}
		return n;
	}
	*pushUntil(test) {
		let i = this.pos;
		let ch = this.buffer[i];
		while (!test(ch)) ch = this.buffer[++i];
		return yield* this.pushToIndex(i, false);
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/line-counter.js
/**
* Tracks newlines during parsing in order to provide an efficient API for
* determining the one-indexed `{ line, col }` position for any offset
* within the input.
*/
var LineCounter = class {
	constructor() {
		this.lineStarts = [];
		/**
		* Should be called in ascending order. Otherwise, call
		* `lineCounter.lineStarts.sort()` before calling `linePos()`.
		*/
		this.addNewLine = (offset) => this.lineStarts.push(offset);
		/**
		* Performs a binary search and returns the 1-indexed { line, col }
		* position of `offset`. If `line === 0`, `addNewLine` has never been
		* called or `offset` is before the first known newline.
		*/
		this.linePos = (offset) => {
			let low = 0;
			let high = this.lineStarts.length;
			while (low < high) {
				const mid = low + high >> 1;
				if (this.lineStarts[mid] < offset) low = mid + 1;
				else high = mid;
			}
			if (this.lineStarts[low] === offset) return {
				line: low + 1,
				col: 1
			};
			if (low === 0) return {
				line: 0,
				col: offset
			};
			const start = this.lineStarts[low - 1];
			return {
				line: low,
				col: offset - start + 1
			};
		};
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list, type) {
	for (let i = 0; i < list.length; ++i) if (list[i].type === type) return true;
	return false;
}
function findNonEmptyIndex(list) {
	for (let i = 0; i < list.length; ++i) switch (list[i].type) {
		case "space":
		case "comment":
		case "newline": break;
		default: return i;
	}
	return -1;
}
function isFlowToken(token) {
	switch (token?.type) {
		case "alias":
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "flow-collection": return true;
		default: return false;
	}
}
function getPrevProps(parent) {
	switch (parent.type) {
		case "document": return parent.start;
		case "block-map": {
			const it = parent.items[parent.items.length - 1];
			return it.sep ?? it.start;
		}
		case "block-seq": return parent.items[parent.items.length - 1].start;
		/* istanbul ignore next should not happen */
		default: return [];
	}
}
/** Note: May modify input array */
function getFirstKeyStartProps(prev) {
	if (prev.length === 0) return [];
	let i = prev.length;
	loop: while (--i >= 0) switch (prev[i].type) {
		case "doc-start":
		case "explicit-key-ind":
		case "map-value-ind":
		case "seq-item-ind":
		case "newline": break loop;
	}
	while (prev[++i]?.type === "space");
	return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
	if (source.length < 1e5) Array.prototype.push.apply(target, source);
	else for (let i = 0; i < source.length; ++i) target.push(source[i]);
}
function fixFlowSeqItems(fc) {
	if (fc.start.type === "flow-seq-start") {
		for (const it of fc.items) if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
			if (it.key) it.value = it.key;
			delete it.key;
			if (isFlowToken(it.value)) {
				if (it.value.end) arrayPushArray(it.value.end, it.sep);
				else it.value.end = it.sep;
			} else arrayPushArray(it.start, it.sep);
			delete it.sep;
		}
	}
}
/**
* A YAML concrete syntax tree (CST) parser
*
* ```ts
* const src: string = ...
* for (const token of new Parser().parse(src)) {
*   // token: Token
* }
* ```
*
* To use the parser with a user-provided lexer:
*
* ```ts
* function* parse(source: string, lexer: Lexer) {
*   const parser = new Parser()
*   for (const lexeme of lexer.lex(source))
*     yield* parser.next(lexeme)
*   yield* parser.end()
* }
*
* const src: string = ...
* const lexer = new Lexer()
* for (const token of parse(src, lexer)) {
*   // token: Token
* }
* ```
*/
var Parser = class {
	/**
	* @param onNewLine - If defined, called separately with the start position of
	*   each new line (in `parse()`, including the start of input).
	*/
	constructor(onNewLine) {
		/** If true, space and sequence indicators count as indentation */
		this.atNewLine = true;
		/** If true, next token is a scalar value */
		this.atScalar = false;
		/** Current indentation level */
		this.indent = 0;
		/** Current offset since the start of parsing */
		this.offset = 0;
		/** On the same line with a block map key */
		this.onKeyLine = false;
		/** Top indicates the node that's currently being built */
		this.stack = [];
		/** The source of the current token, set in parse() */
		this.source = "";
		/** The type of the current token, set in parse() */
		this.type = "";
		this.lexer = new Lexer();
		this.onNewLine = onNewLine;
	}
	/**
	* Parse `source` as a YAML stream.
	* If `incomplete`, a part of the last line may be left as a buffer for the next call.
	*
	* Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
	*
	* @returns A generator of tokens representing each directive, document, and other structure.
	*/
	*parse(source, incomplete = false) {
		if (this.onNewLine && this.offset === 0) this.onNewLine(0);
		for (const lexeme of this.lexer.lex(source, incomplete)) yield* this.next(lexeme);
		if (!incomplete) yield* this.end();
	}
	/**
	* Advance the parser by the `source` of one lexical token.
	*/
	*next(source) {
		this.source = source;
		if (this.atScalar) {
			this.atScalar = false;
			yield* this.step();
			this.offset += source.length;
			return;
		}
		const type = tokenType(source);
		if (!type) {
			const message = `Not a YAML token: ${source}`;
			yield* this.pop({
				type: "error",
				offset: this.offset,
				message,
				source
			});
			this.offset += source.length;
		} else if (type === "scalar") {
			this.atNewLine = false;
			this.atScalar = true;
			this.type = "scalar";
		} else {
			this.type = type;
			yield* this.step();
			switch (type) {
				case "newline":
					this.atNewLine = true;
					this.indent = 0;
					if (this.onNewLine) this.onNewLine(this.offset + source.length);
					break;
				case "space":
					if (this.atNewLine && source[0] === " ") this.indent += source.length;
					break;
				case "explicit-key-ind":
				case "map-value-ind":
				case "seq-item-ind":
					if (this.atNewLine) this.indent += source.length;
					break;
				case "doc-mode":
				case "flow-error-end": return;
				default: this.atNewLine = false;
			}
			this.offset += source.length;
		}
	}
	/** Call at end of input to push out any remaining constructions */
	*end() {
		while (this.stack.length > 0) yield* this.pop();
	}
	get sourceToken() {
		return {
			type: this.type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	*step() {
		const top = this.peek(1);
		if (this.type === "doc-end" && top?.type !== "doc-end") {
			while (this.stack.length > 0) yield* this.pop();
			this.stack.push({
				type: "doc-end",
				offset: this.offset,
				source: this.source
			});
			return;
		}
		if (!top) return yield* this.stream();
		switch (top.type) {
			case "document": return yield* this.document(top);
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return yield* this.scalar(top);
			case "block-scalar": return yield* this.blockScalar(top);
			case "block-map": return yield* this.blockMap(top);
			case "block-seq": return yield* this.blockSequence(top);
			case "flow-collection": return yield* this.flowCollection(top);
			case "doc-end": return yield* this.documentEnd(top);
		}
		/* istanbul ignore next should not happen */
		yield* this.pop();
	}
	peek(n) {
		return this.stack[this.stack.length - n];
	}
	*pop(error) {
		const token = error ?? this.stack.pop();
		/* istanbul ignore if should not happen */
		if (!token) yield {
			type: "error",
			offset: this.offset,
			source: "",
			message: "Tried to pop an empty stack"
		};
		else if (this.stack.length === 0) yield token;
		else {
			const top = this.peek(1);
			if (token.type === "block-scalar") token.indent = "indent" in top ? top.indent : 0;
			else if (token.type === "flow-collection" && top.type === "document") token.indent = 0;
			if (token.type === "flow-collection") fixFlowSeqItems(token);
			switch (top.type) {
				case "document":
					top.value = token;
					break;
				case "block-scalar":
					top.props.push(token);
					break;
				case "block-map": {
					const it = top.items[top.items.length - 1];
					if (it.value) {
						top.items.push({
							start: [],
							key: token,
							sep: []
						});
						this.onKeyLine = true;
						return;
					} else if (it.sep) it.value = token;
					else {
						Object.assign(it, {
							key: token,
							sep: []
						});
						this.onKeyLine = !it.explicitKey;
						return;
					}
					break;
				}
				case "block-seq": {
					const it = top.items[top.items.length - 1];
					if (it.value) top.items.push({
						start: [],
						value: token
					});
					else it.value = token;
					break;
				}
				case "flow-collection": {
					const it = top.items[top.items.length - 1];
					if (!it || it.value) top.items.push({
						start: [],
						key: token,
						sep: []
					});
					else if (it.sep) it.value = token;
					else Object.assign(it, {
						key: token,
						sep: []
					});
					return;
				}
				/* istanbul ignore next should not happen */
				default:
					yield* this.pop();
					yield* this.pop(token);
			}
			if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
				const last = token.items[token.items.length - 1];
				if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
					if (top.type === "document") top.end = last.start;
					else top.items.push({ start: last.start });
					token.items.splice(-1, 1);
				}
			}
		}
	}
	*stream() {
		switch (this.type) {
			case "directive-line":
				yield {
					type: "directive",
					offset: this.offset,
					source: this.source
				};
				return;
			case "byte-order-mark":
			case "space":
			case "comment":
			case "newline":
				yield this.sourceToken;
				return;
			case "doc-mode":
			case "doc-start": {
				const doc = {
					type: "document",
					offset: this.offset,
					start: []
				};
				if (this.type === "doc-start") doc.start.push(this.sourceToken);
				this.stack.push(doc);
				return;
			}
		}
		yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML stream`,
			source: this.source
		};
	}
	*document(doc) {
		if (doc.value) return yield* this.lineEnd(doc);
		switch (this.type) {
			case "doc-start":
				if (findNonEmptyIndex(doc.start) !== -1) {
					yield* this.pop();
					yield* this.step();
				} else doc.start.push(this.sourceToken);
				return;
			case "anchor":
			case "tag":
			case "space":
			case "comment":
			case "newline":
				doc.start.push(this.sourceToken);
				return;
		}
		const bv = this.startBlockValue(doc);
		if (bv) this.stack.push(bv);
		else yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML document`,
			source: this.source
		};
	}
	*scalar(scalar) {
		if (this.type === "map-value-ind") {
			const start = getFirstKeyStartProps(getPrevProps(this.peek(2)));
			let sep;
			if (scalar.end) {
				sep = scalar.end;
				sep.push(this.sourceToken);
				delete scalar.end;
			} else sep = [this.sourceToken];
			const map = {
				type: "block-map",
				offset: scalar.offset,
				indent: scalar.indent,
				items: [{
					start,
					key: scalar,
					sep
				}]
			};
			this.onKeyLine = true;
			this.stack[this.stack.length - 1] = map;
		} else yield* this.lineEnd(scalar);
	}
	*blockScalar(scalar) {
		switch (this.type) {
			case "space":
			case "comment":
			case "newline":
				scalar.props.push(this.sourceToken);
				return;
			case "scalar":
				scalar.source = this.source;
				this.atNewLine = true;
				this.indent = 0;
				if (this.onNewLine) {
					let nl = this.source.indexOf("\n") + 1;
					while (nl !== 0) {
						this.onNewLine(this.offset + nl);
						nl = this.source.indexOf("\n", nl) + 1;
					}
				}
				yield* this.pop();
				break;
			/* istanbul ignore next should not happen */
			default:
				yield* this.pop();
				yield* this.step();
		}
	}
	*blockMap(map) {
		const it = map.items[map.items.length - 1];
		switch (this.type) {
			case "newline":
				this.onKeyLine = false;
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else map.items.push({ start: [this.sourceToken] });
				} else if (it.sep) it.sep.push(this.sourceToken);
				else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) map.items.push({ start: [this.sourceToken] });
				else if (it.sep) it.sep.push(this.sourceToken);
				else {
					if (this.atIndentedComment(it.start, map.indent)) {
						const end = map.items[map.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							map.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
		}
		if (this.indent >= map.indent) {
			const atMapIndent = !this.onKeyLine && this.indent === map.indent;
			const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
			let start = [];
			if (atNextItem && it.sep && !it.value) {
				const nl = [];
				for (let i = 0; i < it.sep.length; ++i) {
					const st = it.sep[i];
					switch (st.type) {
						case "newline":
							nl.push(i);
							break;
						case "space": break;
						case "comment":
							if (st.indent > map.indent) nl.length = 0;
							break;
						default: nl.length = 0;
					}
				}
				if (nl.length >= 2) start = it.sep.splice(nl[1]);
			}
			switch (this.type) {
				case "anchor":
				case "tag":
					if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({ start });
						this.onKeyLine = true;
					} else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "explicit-key-ind":
					if (!it.sep && !it.explicitKey) {
						it.start.push(this.sourceToken);
						it.explicitKey = true;
					} else if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({
							start,
							explicitKey: true
						});
					} else this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [this.sourceToken],
							explicitKey: true
						}]
					});
					this.onKeyLine = true;
					return;
				case "map-value-ind":
					if (it.explicitKey) {
						if (!it.sep) {
							if (includesToken(it.start, "newline")) Object.assign(it, {
								key: null,
								sep: [this.sourceToken]
							});
							else {
								const start = getFirstKeyStartProps(it.start);
								this.stack.push({
									type: "block-map",
									offset: this.offset,
									indent: this.indent,
									items: [{
										start,
										key: null,
										sep: [this.sourceToken]
									}]
								});
							}
						} else if (it.value) map.items.push({
							start: [],
							key: null,
							sep: [this.sourceToken]
						});
						else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key: null,
								sep: [this.sourceToken]
							}]
						});
						else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
							const start = getFirstKeyStartProps(it.start);
							const key = it.key;
							const sep = it.sep;
							sep.push(this.sourceToken);
							delete it.key;
							delete it.sep;
							this.stack.push({
								type: "block-map",
								offset: this.offset,
								indent: this.indent,
								items: [{
									start,
									key,
									sep
								}]
							});
						} else if (start.length > 0) it.sep = it.sep.concat(start, this.sourceToken);
						else it.sep.push(this.sourceToken);
					} else if (!it.sep) Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.value || atNextItem) map.items.push({
						start,
						key: null,
						sep: [this.sourceToken]
					});
					else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [],
							key: null,
							sep: [this.sourceToken]
						}]
					});
					else it.sep.push(this.sourceToken);
					this.onKeyLine = true;
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (atNextItem || it.value) {
						map.items.push({
							start,
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					} else if (it.sep) this.stack.push(fs);
					else {
						Object.assign(it, {
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					}
					return;
				}
				default: {
					const bv = this.startBlockValue(map);
					if (bv) {
						if (bv.type === "block-seq") {
							if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
								yield* this.pop({
									type: "error",
									offset: this.offset,
									message: "Unexpected block-seq-ind on same line with key",
									source: this.source
								});
								return;
							}
						} else if (atMapIndent) map.items.push({ start });
						this.stack.push(bv);
						return;
					}
				}
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*blockSequence(seq) {
		const it = seq.items[seq.items.length - 1];
		switch (this.type) {
			case "newline":
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else seq.items.push({ start: [this.sourceToken] });
				} else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) seq.items.push({ start: [this.sourceToken] });
				else {
					if (this.atIndentedComment(it.start, seq.indent)) {
						const end = seq.items[seq.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							seq.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
			case "anchor":
			case "tag":
				if (it.value || this.indent <= seq.indent) break;
				it.start.push(this.sourceToken);
				return;
			case "seq-item-ind":
				if (this.indent !== seq.indent) break;
				if (it.value || includesToken(it.start, "seq-item-ind")) seq.items.push({ start: [this.sourceToken] });
				else it.start.push(this.sourceToken);
				return;
		}
		if (this.indent > seq.indent) {
			const bv = this.startBlockValue(seq);
			if (bv) {
				this.stack.push(bv);
				return;
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*flowCollection(fc) {
		const it = fc.items[fc.items.length - 1];
		if (this.type === "flow-error-end") {
			let top;
			do {
				yield* this.pop();
				top = this.peek(1);
			} while (top?.type === "flow-collection");
		} else if (fc.end.length === 0) {
			switch (this.type) {
				case "comma":
				case "explicit-key-ind":
					if (!it || it.sep) fc.items.push({ start: [this.sourceToken] });
					else it.start.push(this.sourceToken);
					return;
				case "map-value-ind":
					if (!it || it.value) fc.items.push({
						start: [],
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.sep) it.sep.push(this.sourceToken);
					else Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					return;
				case "space":
				case "comment":
				case "newline":
				case "anchor":
				case "tag":
					if (!it || it.value) fc.items.push({ start: [this.sourceToken] });
					else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (!it || it.value) fc.items.push({
						start: [],
						key: fs,
						sep: []
					});
					else if (it.sep) this.stack.push(fs);
					else Object.assign(it, {
						key: fs,
						sep: []
					});
					return;
				}
				case "flow-map-end":
				case "flow-seq-end":
					fc.end.push(this.sourceToken);
					return;
			}
			const bv = this.startBlockValue(fc);
			/* istanbul ignore else should not happen */
			if (bv) this.stack.push(bv);
			else {
				yield* this.pop();
				yield* this.step();
			}
		} else {
			const parent = this.peek(2);
			if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
				yield* this.pop();
				yield* this.step();
			} else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
				const start = getFirstKeyStartProps(getPrevProps(parent));
				fixFlowSeqItems(fc);
				const sep = fc.end.splice(1, fc.end.length);
				sep.push(this.sourceToken);
				const map = {
					type: "block-map",
					offset: fc.offset,
					indent: fc.indent,
					items: [{
						start,
						key: fc,
						sep
					}]
				};
				this.onKeyLine = true;
				this.stack[this.stack.length - 1] = map;
			} else yield* this.lineEnd(fc);
		}
	}
	flowScalar(type) {
		if (this.onNewLine) {
			let nl = this.source.indexOf("\n") + 1;
			while (nl !== 0) {
				this.onNewLine(this.offset + nl);
				nl = this.source.indexOf("\n", nl) + 1;
			}
		}
		return {
			type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	startBlockValue(parent) {
		switch (this.type) {
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return this.flowScalar(this.type);
			case "block-scalar-header": return {
				type: "block-scalar",
				offset: this.offset,
				indent: this.indent,
				props: [this.sourceToken],
				source: ""
			};
			case "flow-map-start":
			case "flow-seq-start": return {
				type: "flow-collection",
				offset: this.offset,
				indent: this.indent,
				start: this.sourceToken,
				items: [],
				end: []
			};
			case "seq-item-ind": return {
				type: "block-seq",
				offset: this.offset,
				indent: this.indent,
				items: [{ start: [this.sourceToken] }]
			};
			case "explicit-key-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				start.push(this.sourceToken);
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						explicitKey: true
					}]
				};
			}
			case "map-value-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						key: null,
						sep: [this.sourceToken]
					}]
				};
			}
		}
		return null;
	}
	atIndentedComment(start, indent) {
		if (this.type !== "comment") return false;
		if (this.indent <= indent) return false;
		return start.every((st) => st.type === "newline" || st.type === "space");
	}
	*documentEnd(docEnd) {
		if (this.type !== "doc-mode") {
			if (docEnd.end) docEnd.end.push(this.sourceToken);
			else docEnd.end = [this.sourceToken];
			if (this.type === "newline") yield* this.pop();
		}
	}
	*lineEnd(token) {
		switch (this.type) {
			case "comma":
			case "doc-start":
			case "doc-end":
			case "flow-seq-end":
			case "flow-map-end":
			case "map-value-ind":
				yield* this.pop();
				yield* this.step();
				break;
			case "newline": this.onKeyLine = false;
			default:
				if (token.end) token.end.push(this.sourceToken);
				else token.end = [this.sourceToken];
				if (this.type === "newline") yield* this.pop();
		}
	}
};
// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
	const prettyErrors = options.prettyErrors !== false;
	return {
		lineCounter: options.lineCounter || prettyErrors && new LineCounter() || null,
		prettyErrors
	};
}
/** Parse an input string into a single YAML.Document */
function parseDocument(source, options = {}) {
	const { lineCounter, prettyErrors } = parseOptions(options);
	const parser = new Parser(lineCounter?.addNewLine);
	const composer = new Composer(options);
	let doc = null;
	for (const _doc of composer.compose(parser.parse(source), true, source.length)) if (!doc) doc = _doc;
	else if (doc.options.logLevel !== "silent") {
		doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
		break;
	}
	if (prettyErrors && lineCounter) {
		doc.errors.forEach(prettifyError(source, lineCounter));
		doc.warnings.forEach(prettifyError(source, lineCounter));
	}
	return doc;
}
function parse(src, reviver, options) {
	let _reviver = void 0;
	if (typeof reviver === "function") _reviver = reviver;
	else if (options === void 0 && reviver && typeof reviver === "object") options = reviver;
	const doc = parseDocument(src, options);
	if (!doc) return null;
	doc.warnings.forEach((warning) => warn(doc.options.logLevel, warning));
	if (doc.errors.length > 0) {
		if (doc.options.logLevel !== "silent") throw doc.errors[0];
		else doc.errors = [];
	}
	return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
// src/shared/utils/validation.ts
function validateGlobalSettings(value = {}) {
	const errors = [];
	if (!isConfigRecord(value)) return {
		valid: false,
		settings: DEFAULT_GLOBAL_SETTINGS,
		errors: ["global settings must be an object"]
	};
	const settings = {
		...DEFAULT_GLOBAL_SETTINGS,
		...value
	};
	if (typeof settings.locale !== "string" || ![
		"auto",
		"ru",
		"en"
	].includes(settings.locale)) errors.push("locale must be auto, ru, or en");
	if (typeof settings.theme !== "string" || ![
		"auto",
		"dark",
		"light"
	].includes(settings.theme)) errors.push("theme must be auto, dark, or light");
	if (typeof settings.pollingIntervalMs !== "number" || ![
		2e3,
		3e3,
		5e3,
		1e4
	].includes(settings.pollingIntervalMs)) errors.push("pollingIntervalMs must be 2000, 3000, 5000, or 10000");
	if (typeof settings.globalLogging !== "boolean") errors.push("globalLogging must be a boolean");
	const unrecognized = Object.keys(value).filter((key) => !Object.hasOwn(DEFAULT_GLOBAL_SETTINGS, key));
	if (unrecognized.length) errors.push(`unrecognized global setting(s): ${unrecognized.join(", ")}`);
	return errors.length ? {
		valid: false,
		settings: DEFAULT_GLOBAL_SETTINGS,
		errors
	} : {
		valid: true,
		settings,
		errors
	};
}
var TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["areas"]);
var AREA_KEYS = /* @__PURE__ */ new Set([
	"path",
	"keywords",
	"enabled"
]);
var LOG_CATEGORY_KEYS = /* @__PURE__ */ new Set([
	"events",
	"workset",
	"rulesDiff",
	"preflight"
]);
var NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Validate the plugin-owned, per-project settings (not the project's area JSON). */
function validateProjectSettings(value = {}) {
	const errors = [];
	if (!isConfigRecord(value)) return {
		valid: false,
		settings: DEFAULT_PROJECT_SETTINGS,
		errors: ["project settings must be an object"]
	};
	const allowed = new Set(Object.keys(DEFAULT_PROJECT_SETTINGS));
	const unrecognized = Object.keys(value).filter((key) => !allowed.has(key));
	if (unrecognized.length) errors.push(`unrecognized project setting(s): ${unrecognized.join(", ")}`);
	const settings = {
		...DEFAULT_PROJECT_SETTINGS,
		...value
	};
	if (settings.discoveryMode !== "strict" && settings.discoveryMode !== "fallback" && settings.discoveryMode !== "merge") errors.push("discoveryMode must be strict, fallback, or merge");
	const root = safeRelative(settings.instructionsRoot, "instructionsRoot", errors);
	const rulesFolder = singleName(settings.rulesFolder, "rulesFolder", errors);
	const skillsFolder = singleName(settings.skillsFolder, "skillsFolder", errors);
	const mainFile = singleName(settings.mainFile, "mainFile", errors);
	if (rulesFolder && skillsFolder && rulesFolder.toLowerCase() === skillsFolder.toLowerCase()) errors.push("rulesFolder and skillsFolder must differ without case sensitivity");
	if (!Number.isInteger(settings.tokenBudget) || settings.tokenBudget < 1) errors.push("tokenBudget must be a positive integer");
	if (typeof settings.projectLogging !== "boolean") errors.push("projectLogging must be a boolean");
	if (typeof settings.redirectRootInstructionFiles !== "boolean") errors.push("redirectRootInstructionFiles must be a boolean");
	if (typeof settings.redirectInstructionDirectories !== "boolean") errors.push("redirectInstructionDirectories must be a boolean");
	const rootInstructionFileNames = singleNameList(settings.rootInstructionFileNames, "rootInstructionFileNames", errors);
	const instructionDirectoryNames = singleNameList(settings.instructionDirectoryNames, "instructionDirectoryNames", errors);
	const categories = settings.logCategories;
	if (!isRecord(categories) || [
		"events",
		"workset",
		"rulesDiff",
		"preflight"
	].some((key) => typeof categories[key] !== "boolean") || Object.keys(categories).some((key) => !LOG_CATEGORY_KEYS.has(key))) errors.push("logCategories must contain boolean events, workset, rulesDiff, and preflight fields");
	if (errors.length) return {
		valid: false,
		settings: DEFAULT_PROJECT_SETTINGS,
		errors
	};
	return {
		valid: true,
		settings: {
			...settings,
			instructionsRoot: root,
			rulesFolder,
			skillsFolder,
			mainFile,
			rootInstructionFileNames,
			instructionDirectoryNames,
			logCategories: { ...categories }
		},
		errors
	};
}
function singleNameList(value, field, errors) {
	if (!Array.isArray(value) || value.some((name) => typeof name !== "string" || name.trim() === "" || name === "." || name === ".." || /[\\/]/.test(name))) {
		errors.push(`${field} must be an array of single path segments`);
		return DEFAULT_PROJECT_SETTINGS[field];
	}
	return [...new Set(value.map((name) => name.trim()))];
}
/** Parse and partially validate agents-router.json. Bad areas do not disable good siblings. */
function parseAreasConfig(text, settings = DEFAULT_PROJECT_SETTINGS) {
	let value;
	try {
		value = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			areas: /* @__PURE__ */ new Map(),
			errors: [`invalid JSON: ${message}`],
			valid: false
		};
	}
	if (!isConfigRecord(value)) return {
		areas: /* @__PURE__ */ new Map(),
		errors: ["top-level JSON value must be an object"],
		valid: false
	};
	const unrecognizedTop = Object.keys(value).filter((key) => !TOP_LEVEL_KEYS.has(key));
	if (unrecognizedTop.length) return {
		areas: /* @__PURE__ */ new Map(),
		errors: [`unrecognized top-level field(s): ${unrecognizedTop.join(", ")}`],
		valid: false
	};
	if (value.areas === void 0) return {
		areas: /* @__PURE__ */ new Map(),
		errors: [],
		valid: true
	};
	if (!isRecord(value.areas)) return {
		areas: /* @__PURE__ */ new Map(),
		errors: ["\"areas\" must be an object"],
		valid: false
	};
	const areas = /* @__PURE__ */ new Map();
	const errors = [];
	const invalid = /* @__PURE__ */ new Set();
	for (const [name, raw] of Object.entries(value.areas).toSorted(([a], [b]) => a.localeCompare(b))) {
		const parent = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : void 0;
		const badParent = parent !== void 0 && (!areas.has(parent) || invalid.has(parent));
		const result = validateArea(name, raw, settings);
		if (badParent) result.errors.push(`parent area "${parent}" is missing or invalid`);
		if (result.errors.length) {
			invalid.add(name);
			errors.push(...result.errors.map((message) => `${name}: ${message}`));
			continue;
		}
		if (!result.area) continue;
		areas.set(name, {
			...result.area,
			...parent === void 0 ? {} : { parent }
		});
	}
	for (const name of invalid) for (const child of areas.keys()) if (child.startsWith(`${name}/`)) areas.delete(child);
	return {
		areas,
		errors,
		valid: true
	};
}
function validateArea(name, raw, settings) {
	const errors = [];
	if (!name.split("/").every((segment) => NAME.test(segment))) errors.push("area names must use lowercase letters, digits, and hyphens");
	if (name.split("/").some((segment) => [
		"dsh",
		settings.rulesFolder.toLowerCase(),
		settings.skillsFolder.toLowerCase()
	].includes(segment.toLowerCase()))) errors.push("area name contains a reserved segment");
	if (!isConfigRecord(raw)) return { errors: [...errors, "area value must be an object"] };
	const unrecognized = Object.keys(raw).filter((key) => !AREA_KEYS.has(key));
	if (unrecognized.length) errors.push(`unrecognized field(s): ${unrecognized.join(", ")}`);
	const paths = typeof raw.path === "string" ? [raw.path] : raw.path;
	if (!Array.isArray(paths) || paths.length === 0 || !paths.every(validProjectFilter)) errors.push("path must be a non-empty string or array of non-empty project-relative paths");
	if (raw.enabled !== void 0 && typeof raw.enabled !== "boolean") errors.push("enabled must be a boolean");
	const keywordValues = raw.keywords;
	if (keywordValues !== void 0 && (!Array.isArray(keywordValues) || !keywordValues.every((word) => typeof word === "string"))) errors.push("keywords must be an array of strings");
	if (errors.length) return { errors };
	return {
		errors,
		area: {
			name,
			path: Array.isArray(paths) ? paths.filter(validProjectFilter) : [],
			keywords: Array.isArray(keywordValues) ? keywordValues.filter((word) => typeof word === "string") : [],
			enabled: typeof raw.enabled === "boolean" ? raw.enabled : true
		}
	};
}
function validProjectFilter(value) {
	if (typeof value !== "string") return false;
	const trimmed = value.trim();
	if (!trimmed || trimmed === "!") return false;
	const raw = trimmed.startsWith("!") ? trimmed.slice(1).trim() : trimmed;
	if (!raw || raw.startsWith("!")) return false;
	const normalized = raw.replaceAll("\\", "/");
	return !normalized.startsWith("/") && !/^[A-Za-z]:/.test(normalized) && !normalized.split("/").includes("..");
}
function safeRelative(value, field, errors) {
	if (typeof value !== "string" || value.trim() === "") {
		errors.push(`${field} must be a non-empty project-relative path`);
		return DEFAULT_PROJECT_SETTINGS.instructionsRoot;
	}
	const normalized = value.replaceAll("\\", "/");
	if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").includes("..")) {
		errors.push(`${field} must stay inside the project`);
		return DEFAULT_PROJECT_SETTINGS.instructionsRoot;
	}
	return normalized.replace(/^\.\//, "");
}
function singleName(value, field, errors) {
	if (typeof value !== "string" || value === "" || value === "." || value === ".." || /[\\/]/.test(value)) {
		errors.push(`${field} must be one path segment`);
		return DEFAULT_PROJECT_SETTINGS[field];
	}
	return value;
}
function isConfigRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
// src/host/services/globNormalizer.ts
var UNQUOTED_GLOB_LINE = /^(\s*(?:globs?|paths?)\s*:\s*)(.+)$/i;
var GLOB_META$1 = /[*?[{!]/;
function sanitizeFrontmatterYaml(rawFrontmatter) {
	return rawFrontmatter.split(/\r?\n/).map((line) => {
		const match = UNQUOTED_GLOB_LINE.exec(line);
		if (!match) return line;
		const value = match[2]?.trim() ?? "";
		if (!value || /^[["']/.test(value) || /^(?:null|~)$/i.test(value)) return line;
		const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
		return `${match[1]}"${escaped}"`;
	}).join("\n");
}
function splitGlobString(input) {
	const patterns = [];
	let token = "";
	let braceDepth = 0;
	let bracketDepth = 0;
	for (const character of input) {
		if (character === "{") braceDepth += 1;
		else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
		else if (character === "[") bracketDepth += 1;
		else if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
		if (character === "," && braceDepth === 0 && bracketDepth === 0) {
			appendPattern(patterns, token);
			token = "";
		} else token += character;
	}
	appendPattern(patterns, token);
	return patterns;
}
function normalizeRulePatterns(frontmatter) {
	const patterns = [];
	appendValues(frontmatter.path, true, patterns);
	appendValues(frontmatter.paths, true, patterns);
	appendValues(frontmatter.glob, false, patterns);
	appendValues(frontmatter.globs, false, patterns);
	return [...new Set(patterns)];
}
function appendValues(value, legacyPath, patterns) {
	const values = typeof value === "string" ? [value] : value ?? [];
	for (const item of values) for (const pattern of splitGlobString(item)) {
		if (legacyPath && !GLOB_META$1.test(pattern)) {
			const directory = pattern.replace(/\/+$/, "");
			const filename = directory.slice(directory.lastIndexOf("/") + 1);
			const extension = filename.lastIndexOf(".");
			if (directory && (extension <= 0 || extension === filename.length - 1)) {
				patterns.push(directory, `${directory}/**`);
				continue;
			}
		}
		patterns.push(pattern);
	}
}
function appendPattern(patterns, source) {
	let pattern = source.trim().replaceAll("\\", "/");
	if (pattern.startsWith("!./")) pattern = `!${pattern.slice(3)}`;
	else pattern = pattern.replace(/^\.\//, "");
	if (pattern) patterns.push(pattern);
}
// src/host/services/frontmatter.ts
var RULE_FIELDS = /* @__PURE__ */ new Set([
	"path",
	"paths",
	"glob",
	"globs",
	"alwaysApply",
	"description",
	"enabled"
]);
var SKILL_FIELDS = /* @__PURE__ */ new Set([
	"name",
	"description",
	"license",
	"compatibility",
	"metadata",
	"allowed-tools",
	"disable-model-invocation",
	"user-invocable",
	"enabled",
	"whenToUse"
]);
var MAX_FRONTMATTER_BYTES = 65536;
var MetadataError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "MetadataError";
	}
};
function parseInstruction(text, kind, context) {
	const frontmatterStart = /^(?:\uFEFF)?---[ \t]*\r?\n/.exec(text);
	if (frontmatterStart) {
		const remaining = text.slice(frontmatterStart[0].length);
		const endMatch = /^([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(remaining);
		if (!endMatch) throw new MetadataError("YAML frontmatter opening delimiter without closing delimiter");
		const rawMetadata = parseObject(endMatch[1] ?? "", kind === "rule");
		const allowed = kind === "skill" ? SKILL_FIELDS : RULE_FIELDS;
		for (const key of Object.keys(rawMetadata)) if (!allowed.has(key)) throw new MetadataError(`unrecognized ${kind} frontmatter field "${key}"`);
		if (rawMetadata.description !== void 0 && typeof rawMetadata.description !== "string") throw new MetadataError("frontmatter field \"description\" must be a string");
		const source = text.slice(frontmatterStart[0].length + endMatch[0].length);
		if (kind === "rule") return {
			metadata: buildRuleMetadata(rawMetadata, context),
			content: source
		};
		const filters = [...rawMetadata.path === void 0 || rawMetadata.path === "" || Object.is(rawMetadata.path, null) ? [] : Array.isArray(rawMetadata.path) ? rawMetadata.path : [rawMetadata.path], ...rawMetadata.paths === void 0 || rawMetadata.paths === "" || Object.is(rawMetadata.paths, null) ? [] : Array.isArray(rawMetadata.paths) ? rawMetadata.paths : [rawMetadata.paths]];
		if (!filters.every(validProjectFilter)) throw new MetadataError("frontmatter fields \"path\" and \"paths\" must contain non-empty project-relative paths");
		const pathFilters = [...new Set(filters)];
		const { paths: legacyPaths, metadata: rawSkillMetadata, ...supportedMetadata } = rawMetadata;
		const enabled = booleanField(rawMetadata.enabled, "enabled", true);
		const metadata = {
			...supportedMetadata,
			path: pathFilters,
			enabled,
			...rawSkillMetadata === void 0 ? {} : { metadata: rawSkillMetadata }
		};
		if (typeof rawMetadata.description !== "string" || rawMetadata.description.trim() === "") throw new MetadataError("skill frontmatter requires a non-empty \"description\"");
		if (rawMetadata.name !== void 0 && (typeof rawMetadata.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawMetadata.name))) throw new MetadataError("skill frontmatter field \"name\" must be a lowercase kebab-case name");
		if (rawMetadata.whenToUse !== void 0 && typeof rawMetadata.whenToUse !== "string") throw new MetadataError("skill frontmatter field \"whenToUse\" must be a string");
		if (rawMetadata.metadata !== void 0 && !isRecord(rawMetadata.metadata)) throw new MetadataError("skill frontmatter field \"metadata\" must be an object");
		return {
			metadata: {
				...metadata,
				description: rawMetadata.description,
				modelInvocable: !booleanField(rawMetadata["disable-model-invocation"], "disable-model-invocation", false),
				userInvocable: booleanField(rawMetadata["user-invocable"], "user-invocable", true)
			},
			content: source
		};
	}
	if (kind === "skill") throw new MetadataError("skill frontmatter requires a non-empty \"description\"");
	return {
		metadata: buildRuleMetadata({}, context),
		content: text
	};
}
/** Read and parse only SKILL.md frontmatter; the body is deferred until invocation. */
async function readSkillMetadata(filePath) {
	const handle = await open(filePath, "r");
	try {
		const chunk = Buffer.alloc(4096);
		let bytes = Buffer.alloc(0);
		let position = 0;
		while (bytes.length <= MAX_FRONTMATTER_BYTES) {
			const { bytesRead } = await handle.read(chunk, 0, chunk.length, position);
			if (bytesRead === 0) break;
			bytes = Buffer.concat([bytes, chunk.subarray(0, bytesRead)]);
			position += bytesRead;
			const text = bytes.toString("utf8");
			const match = /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
			if (match) return parseInstruction(match[0], "skill").metadata;
		}
		if (bytes.length > MAX_FRONTMATTER_BYTES) throw new MetadataError("skill frontmatter exceeds 64 KiB");
		return parseInstruction(bytes.toString("utf8"), "skill").metadata;
	} finally {
		await handle.close();
	}
}
function buildRuleMetadata(rawMetadata, context) {
	const pathValues = [...patternField(rawMetadata.path, "path"), ...patternField(rawMetadata.paths, "paths")];
	const globValues = [...patternField(rawMetadata.glob, "glob"), ...patternField(rawMetadata.globs, "globs")];
	if (![...pathValues, ...globValues].every(validProjectFilter)) throw new MetadataError("frontmatter fields \"path\", \"paths\", \"glob\", and \"globs\" must contain non-empty project-relative paths");
	const pathFilters = [...new Set(pathValues)];
	const globs = normalizeRulePatterns(rawMetadata);
	if (!globs.every(validProjectFilter)) throw new MetadataError("frontmatter fields \"path\", \"paths\", \"glob\", and \"globs\" must contain non-empty project-relative paths");
	const explicitlyAlwaysApply = booleanField(rawMetadata.alwaysApply, "alwaysApply", false);
	const sourcePath = context?.sourcePath?.replaceAll("\\", "/");
	const isRootInstruction = sourcePath !== void 0 && !sourcePath.includes("/") && [
		"agent.md",
		"agents.md",
		"claude.md",
		".cursorrules"
	].includes(sourcePath.toLowerCase()) && globs.length === 0;
	const defaultAlwaysApply = rawMetadata.alwaysApply === void 0 && context?.defaultAlwaysApply === true && globs.length === 0 && !rawMetadata.description?.trim();
	const alwaysApply = context?.forceAlwaysApply === true || explicitlyAlwaysApply || isRootInstruction || defaultAlwaysApply;
	const activationMode = alwaysApply ? "always" : globs.length ? "glob" : rawMetadata.description?.trim() ? "agent-requested" : "manual";
	return {
		path: pathFilters,
		enabled: booleanField(rawMetadata.enabled, "enabled", true),
		globs,
		alwaysApply,
		activationMode,
		...rawMetadata.description === void 0 ? {} : { description: rawMetadata.description },
		...context?.sourceVendor === void 0 ? {} : { sourceVendor: context.sourceVendor }
	};
}
function patternField(value, field) {
	if (value === void 0 || Object.is(value, null) || value === "") return [];
	if (typeof value === "string") return [value];
	if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
	throw new MetadataError(`frontmatter field "${field}" must contain strings`);
}
function quotePathGlobs(source) {
	let listIndent;
	return source.split(/\r?\n/).map((line) => {
		const scalar = /^([ \t]*(?:globs?|paths?):[ \t]*)(![^ \t#]+)([ \t]*(?:#.*)?)$/.exec(line);
		if (scalar?.[1] !== void 0 && scalar[2] !== void 0 && scalar[3] !== void 0) return `${scalar[1]}"${scalar[2]}"${scalar[3]}`;
		const field = /^([ \t]*)(?:globs?|paths?):[ \t]*(?:#.*)?$/.exec(line);
		if (field?.[1] !== void 0) {
			listIndent = field[1].length;
			return line;
		}
		if (listIndent === void 0 || !line.trim()) return line;
		if ((line.match(/^[ \t]*/)?.[0].length ?? 0) <= listIndent) {
			listIndent = void 0;
			return line;
		}
		return line.replace(/^([ \t]*-[ \t]+)([!*?][^ \t#]*)([ \t]*(?:#.*)?)$/, "$1\"$2\"$3");
	}).join("\n");
}
function parseObject(source, sanitizeGlobs) {
	try {
		const value = parse(quotePathGlobs(sanitizeGlobs ? sanitizeFrontmatterYaml(source) : source));
		if (value === null || value === void 0) return {};
		if (!isRecord(value)) throw new MetadataError("YAML frontmatter must be a mapping");
		return value;
	} catch (error) {
		if (error instanceof MetadataError) throw error;
		throw new MetadataError(`invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
	}
}
function booleanField(value, field, fallback) {
	if (value === void 0) return fallback;
	if (typeof value === "boolean") return value;
	if (value === 1 || value === "1") return true;
	if (value === 0 || value === "0") return false;
	if (typeof value === "string") switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on": return true;
		case "false":
		case "no":
		case "off": return false;
	}
	throw new MetadataError(`frontmatter field "${field}" must be a boolean`);
}
// src/host/services/discoveryFs.ts
var compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
async function discoverAreaFolders(instructionsRoot, areas, settings, projectRoot, diagnostics) {
	const reserved = /* @__PURE__ */ new Set([
		"dsh",
		settings.rulesFolder.toLowerCase(),
		settings.skillsFolder.toLowerCase()
	]);
	let entries;
	try {
		entries = await readdir(instructionsRoot, { withFileTypes: true });
	} catch (error) {
		diagnostics.push(diagnostic("instructions-root", posixRelative(projectRoot, instructionsRoot), `cannot list instruction root: ${error instanceof Error ? error.message : String(error)}`));
		return;
	}
	for (const entry of entries) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (reserved.has(entry.name.toLowerCase())) continue;
		if (![...areas.keys()].some((name) => name.split("/")[0] === entry.name)) diagnostics.push(diagnostic("unconfigured-area", posixRelative(projectRoot, path.join(instructionsRoot, entry.name)), "unconfigured area folder is ignored"));
	}
	for (const [name, area] of areas) {
		if (!area.enabled || !parentsAvailable(area, areas)) {
			area.available = false;
			continue;
		}
		const folder = path.join(instructionsRoot, ...name.split("/"));
		area.directory = folder;
		area.available = Boolean(await safeDirectory(folder, projectRoot, diagnostics, "missing-area"));
	}
	for (const [name, area] of areas) {
		if (!area.available || !area.directory) continue;
		let children;
		try {
			children = await readdir(area.directory, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of children) {
			if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
			if (reserved.has(entry.name.toLowerCase()) || areas.has(`${name}/${entry.name}`)) continue;
			diagnostics.push(diagnostic("unconfigured-area", posixRelative(projectRoot, path.join(area.directory, entry.name)), "unconfigured area folder is ignored"));
		}
	}
}
async function addRuleFile(filePath, area, projectRoot, rules, diagnostics, optional, options = {}) {
	const existing = await findCaseInsensitiveEntry(path.dirname(filePath), path.basename(filePath), diagnostics, projectRoot);
	if (!existing) {
		if (!optional) diagnostics.push(diagnostic("missing-rule-folder", posixRelative(projectRoot, filePath), "configured rule source is missing"));
		return;
	}
	await parseRuleFile(existing, area, projectRoot, rules, diagnostics, options);
}
async function collectRules(directory, area, projectRoot, rules, diagnostics, options = {}) {
	for (const file of await collectMarkdown(directory, projectRoot, diagnostics)) await parseRuleFile(file, area, projectRoot, rules, diagnostics, options);
}
async function collectTopLevelRules(directory, area, projectRoot, rules, diagnostics, options = {}) {
	const canonicalDirectory = await safeDirectory(directory, projectRoot, diagnostics, "rules-folder", true);
	if (!canonicalDirectory) return;
	let entries;
	try {
		entries = await readdir(canonicalDirectory, { withFileTypes: true });
	} catch (error) {
		diagnostics.push(diagnostic("rules-folder", posixRelative(projectRoot, canonicalDirectory), `cannot list rules: ${error instanceof Error ? error.message : String(error)}`));
		return;
	}
	const files = entries.filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && /\.(?:md|mdc)$/i.test(entry.name)).map((entry) => path.join(canonicalDirectory, entry.name)).toSorted(compare);
	for (const file of files) await parseRuleFile(file, area, projectRoot, rules, diagnostics, options);
}
async function parseRuleFile(filePath, area, projectRoot, rules, diagnostics, options) {
	try {
		const canonical = await realpath(filePath);
		if (!inside(projectRoot, canonical)) throw new Error("symbolic link points outside the project");
		if (options.seenFiles?.has(canonical)) return;
		options.seenFiles?.add(canonical);
		const text = await readFile(canonical, "utf8");
		const sourcePath = posixRelative(projectRoot, filePath);
		const { metadata, content } = parseInstruction(text, "rule", {
			sourcePath,
			sourceVendor: options.sourceVendor ?? "agents",
			...options.forceAlwaysApply === void 0 ? {} : { forceAlwaysApply: options.forceAlwaysApply },
			...options.defaultAlwaysApply === void 0 ? {} : { defaultAlwaysApply: options.defaultAlwaysApply }
		});
		const hash = digest(text);
		rules.push({
			id: `${sourcePath}:${hash}`,
			hash,
			sourcePath,
			filePath,
			area,
			...metadata,
			content
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		diagnostics.push(diagnostic("rule-file", posixRelative(projectRoot, filePath), errorMessage));
	}
}
async function collectCommandSkills(directory, projectRoot, skills, diagnostics, seenFiles = /* @__PURE__ */ new Set()) {
	for (const filePath of await collectMarkdown(directory, projectRoot, diagnostics)) try {
		const canonicalFile = await realpath(filePath);
		if (!inside(projectRoot, canonicalFile)) throw new Error("symbolic link points outside the project");
		if (seenFiles.has(canonicalFile)) continue;
		seenFiles.add(canonicalFile);
		const metadata = await readSkillMetadata(canonicalFile);
		const fallbackName = path.relative(directory, filePath).replace(/\.(?:md|mdc)$/i, "").split(path.sep).join("-").toLowerCase();
		const name = metadata.name ?? fallbackName;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
			diagnostics.push(diagnostic("skill-name", posixRelative(projectRoot, filePath), "command name must use lowercase letters, digits, and hyphens"));
			continue;
		}
		const fileInfo = await stat(canonicalFile);
		const hash = digest(`${metadata.description}\0${metadata.whenToUse ?? ""}\0${fileInfo.size}\0${fileInfo.mtimeMs}`);
		skills.push({
			name,
			folderName: name,
			sourcePath: posixRelative(projectRoot, filePath),
			filePath,
			area: "global",
			description: metadata.description,
			...metadata.whenToUse === void 0 ? {} : { whenToUse: metadata.whenToUse },
			enabled: metadata.enabled,
			invocation: {
				modelInvocable: metadata.modelInvocable,
				userInvocable: metadata.userInvocable
			},
			...metadata.metadata === void 0 ? {} : { metadata: metadata.metadata },
			hash,
			...metadata.license === void 0 ? {} : { license: metadata.license },
			...metadata.compatibility === void 0 ? {} : { compatibility: metadata.compatibility },
			...metadata["allowed-tools"] === void 0 ? {} : { "allowed-tools": metadata["allowed-tools"] }
		});
	} catch (error) {
		diagnostics.push(diagnostic("skill-file", posixRelative(projectRoot, filePath), error instanceof Error ? error.message : String(error)));
	}
}
async function collectSkills(directory, area, projectRoot, skills, diagnostics, seenFiles = /* @__PURE__ */ new Set()) {
	const canonical = await safeDirectory(directory, projectRoot, diagnostics, "skills-folder", true);
	if (!canonical) return;
	let entries;
	try {
		entries = await readdir(canonical, { withFileTypes: true });
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) diagnostics.push(diagnostic("skills-folder", posixRelative(projectRoot, canonical), `cannot list skills: ${error instanceof Error ? error.message : String(error)}`));
		return;
	}
	for (const entry of entries.toSorted((a, b) => compare(a.name, b.name))) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
			diagnostics.push(diagnostic("skill-name", posixRelative(projectRoot, path.join(canonical, entry.name)), "skill folder name must use lowercase letters, digits, and hyphens"));
			continue;
		}
		const skillDir = await safeDirectory(path.join(canonical, entry.name), projectRoot, diagnostics, "skill-folder");
		if (!skillDir) continue;
		const skillFile = await findCaseInsensitiveEntry(skillDir, "SKILL.md", diagnostics, projectRoot);
		if (!skillFile) {
			diagnostics.push(diagnostic("skill-file", posixRelative(projectRoot, skillDir), "missing SKILL.md; skill is ignored"));
			continue;
		}
		try {
			const canonicalFile = await realpath(skillFile);
			if (!inside(projectRoot, canonicalFile)) throw new Error("symbolic link points outside the project");
			if (seenFiles.has(canonicalFile)) continue;
			seenFiles.add(canonicalFile);
			const metadata = await readSkillMetadata(canonicalFile);
			const fileInfo = await stat(canonicalFile);
			const name = area === "global" ? entry.name : `${area.replaceAll("/", "-")}-${entry.name}`;
			const hash = digest(`${metadata.description}\0${metadata.whenToUse ?? ""}\0${fileInfo.size}\0${fileInfo.mtimeMs}`);
			skills.push({
				name,
				folderName: entry.name,
				sourcePath: posixRelative(projectRoot, skillFile),
				filePath: skillFile,
				area,
				description: metadata.description,
				...metadata.whenToUse === void 0 ? {} : { whenToUse: metadata.whenToUse },
				enabled: metadata.enabled,
				invocation: {
					modelInvocable: metadata.modelInvocable,
					userInvocable: metadata.userInvocable
				},
				...metadata.metadata === void 0 ? {} : { metadata: metadata.metadata },
				hash,
				...metadata.license === void 0 ? {} : { license: metadata.license },
				...metadata.compatibility === void 0 ? {} : { compatibility: metadata.compatibility },
				...metadata["allowed-tools"] === void 0 ? {} : { "allowed-tools": metadata["allowed-tools"] }
			});
		} catch (error) {
			diagnostics.push(diagnostic("skill-file", posixRelative(projectRoot, skillFile), error instanceof Error ? error.message : String(error)));
		}
	}
}
async function collectMarkdown(directory, projectRoot, diagnostics) {
	const files = [];
	const seenDirectories = /* @__PURE__ */ new Set();
	const seenFiles = /* @__PURE__ */ new Set();
	await walk(directory);
	return files.toSorted(compare);
	async function walk(current, viaSymlink = false) {
		const canonical = await safeDirectory(current, projectRoot, diagnostics, "rules-folder", true);
		if (!canonical) return;
		if (seenDirectories.has(canonical)) {
			if (viaSymlink) diagnostics.push(diagnostic("symlink-cycle", posixRelative(projectRoot, current), "cyclic or duplicate directory link skipped"));
			return;
		}
		seenDirectories.add(canonical);
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch (error) {
			diagnostics.push(diagnostic("rules-folder", posixRelative(projectRoot, current), `cannot list rules: ${error instanceof Error ? error.message : String(error)}`));
			return;
		}
		for (const entry of entries.toSorted((a, b) => compare(a.name, b.name))) {
			const candidate = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(candidate);
				continue;
			}
			if (entry.isSymbolicLink()) try {
				const target = await realpath(candidate);
				if (!inside(projectRoot, target)) throw new Error("symbolic link points outside the project");
				const info = await stat(target);
				if (info.isDirectory()) await walk(candidate, true);
				else if (info.isFile()) await addFile(candidate, target);
			} catch (error) {
				diagnostics.push(diagnostic("symlink", posixRelative(projectRoot, candidate), error instanceof Error ? error.message : String(error)));
			}
			else if (entry.isFile()) await addFile(candidate, candidate);
		}
	}
	async function addFile(displayPath, targetPath) {
		if (!/\.(?:md|mdc)$/i.test(displayPath)) return;
		try {
			const canonical = await realpath(targetPath);
			if (!inside(projectRoot, canonical)) throw new Error("symbolic link points outside the project");
			if (seenFiles.has(canonical)) return;
			seenFiles.add(canonical);
			files.push(displayPath);
		} catch (error) {
			diagnostics.push(diagnostic("rule-file", posixRelative(projectRoot, displayPath), error instanceof Error ? error.message : String(error)));
		}
	}
}
async function safeDirectory(candidate, projectRoot, diagnostics, code, quietMissing = false) {
	try {
		const canonical = await realpath(candidate);
		if (!inside(projectRoot, canonical)) throw new Error("symbolic link points outside the project");
		if (!(await stat(canonical)).isDirectory()) throw new Error("expected a directory");
		return canonical;
	} catch (error) {
		if (!(quietMissing && error instanceof Error && "code" in error && error.code === "ENOENT")) diagnostics.push(diagnostic(code, posixRelative(projectRoot, candidate), error instanceof Error ? error.message : String(error)));
		return;
	}
}
async function findCaseInsensitiveEntry(directory, wanted, diagnostics, projectRoot) {
	let entries;
	try {
		const canonicalDirectory = await realpath(directory);
		if (!inside(projectRoot, canonicalDirectory)) throw new Error("symbolic link points outside the project");
		if (!(await stat(canonicalDirectory)).isDirectory()) throw new Error("expected a directory");
		entries = await readdir(canonicalDirectory);
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) diagnostics.push(diagnostic("file-discovery", posixRelative(projectRoot, directory), error instanceof Error ? error.message : String(error)));
		return;
	}
	const matches = entries.filter((name) => name.toLowerCase() === wanted.toLowerCase()).toSorted(compare);
	if (matches.length > 1) {
		diagnostics.push(diagnostic("case-collision", posixRelative(projectRoot, directory), `multiple case variants of ${wanted}; none selected`));
		return;
	}
	const match = matches[0];
	if (!match) return void 0;
	const filePath = path.join(directory, match);
	try {
		const canonical = await realpath(filePath);
		if (!inside(projectRoot, canonical)) throw new Error("symbolic link points outside the project");
		if (!(await stat(canonical)).isFile()) throw new Error("expected a file");
		return filePath;
	} catch (error) {
		diagnostics.push(diagnostic("file-discovery", posixRelative(projectRoot, filePath), error instanceof Error ? error.message : String(error)));
		return;
	}
}
function inside(root, target) {
	const rel = path.relative(root, target);
	return rel === "" || rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}
function posixRelative(root, target) {
	return path.relative(root, target).split(path.sep).join("/");
}
function areaOrder(area) {
	return area === "global" ? "" : area;
}
function digest(value) {
	return createHash("sha256").update(value).digest("hex");
}
function diagnostic(code, pathValue, message) {
	return {
		code,
		target: pathValue,
		message,
		key: `${code}:${pathValue}:${message}`
	};
}
// src/host/services/instructionRedirection.ts
function matchInstructionRedirect(paths, settings) {
	const segments = paths.map((value) => value.split("/"));
	if (segments.some(([first]) => sameName(first ?? "", "agents"))) return void 0;
	if (settings.redirectRootInstructionFiles) {
		for (const parts of segments) if (parts.length === 1 && settings.rootInstructionFileNames.some((name) => sameName(name, parts[0] ?? ""))) return parts[0];
	}
	if (settings.redirectInstructionDirectories) {
		for (const parts of segments) if (parts.length > 1 && settings.instructionDirectoryNames.some((name) => sameName(name, parts[0] ?? ""))) return parts.slice(1).join("/");
	}
}
function filterRootInstructionMessages(messages, rootInstructionFileNames) {
	if (!Array.isArray(messages) || !Array.isArray(rootInstructionFileNames) || !rootInstructionFileNames.length) return messages;
	let changed = false;
	const filtered = messages.flatMap((message) => {
		const source = message?.source;
		if (source?.kind !== "agent-instructions" || !Array.isArray(source.changes)) return [message];
		const removed = new Set(source.changes.filter((change) => typeof change?.path === "string" && !change.path.includes("/") && !change.path.includes("\\") && rootInstructionFileNames.some((name) => typeof name === "string" && sameName(name, change.path ?? ""))));
		if (!removed.size) return [message];
		changed = true;
		const headers = source.changes.map((change) => ({
			change,
			header: instructionSectionHeader(change)
		}));
		const textIndex = message.content?.findIndex((block) => block?.type === "text" && typeof block.text === "string") ?? -1;
		if (headers.some(({ header }) => !header) || textIndex < 0) return [];
		const textBlock = message.content?.[textIndex];
		if (!textBlock || typeof textBlock.text !== "string") return [];
		const text = textBlock.text;
		const sections = [];
		let cursor = 0;
		for (const entry of headers) {
			const header = entry.header;
			if (!header) return [];
			const start = findInstructionHeader(text, header, cursor);
			if (start < 0) return [];
			sections.push({
				...entry,
				start
			});
			cursor = start + header.length;
		}
		const firstSection = sections[0];
		if (!firstSection) return [];
		const content = text.slice(0, firstSection.start) + sections.flatMap((section, index) => {
			if (removed.has(section.change)) return [];
			const end = sections[index + 1]?.start ?? text.length;
			return [text.slice(section.start, end)];
		}).join("");
		const changes = source.changes.filter((change) => !removed.has(change));
		if (!changes.length) return [];
		const nextContent = [...message.content];
		nextContent[textIndex] = {
			...nextContent[textIndex],
			text: content
		};
		return [{
			...message,
			content: nextContent,
			source: {
				...source,
				changes
			}
		}];
	});
	return changed ? filtered : messages;
}
async function resolveInstructionDestination(projectRoot, relativeTarget) {
	if (typeof relativeTarget !== "string" || !relativeTarget || path.isAbsolute(relativeTarget) || path.win32.isAbsolute(relativeTarget)) throw new Error("redirect destination is not a safe project-relative path");
	const segments = relativeTarget.split("/");
	if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0"))) throw new Error("redirect destination is not a safe project-relative path");
	const canonicalProject = await realpath(projectRoot);
	const lexicalAgents = path.resolve(canonicalProject, "agents");
	const canonicalAgents = await realpath(lexicalAgents);
	if (!inside(canonicalProject, canonicalAgents)) throw new Error("agents directory resolves outside the project");
	const lexicalTarget = path.resolve(lexicalAgents, ...segments);
	if (!inside(lexicalAgents, lexicalTarget) || lexicalTarget === lexicalAgents) throw new Error("redirect destination escapes agents");
	const canonicalTarget = await realpath(lexicalTarget);
	if (!inside(canonicalAgents, canonicalTarget)) throw new Error("redirect destination resolves outside agents");
	if (!(await stat(canonicalTarget)).isFile()) throw new Error("redirect destination is not a file");
	return canonicalTarget;
}
function instructionSectionHeader(change) {
	const prefix = change?.action === "set" ? "Instructions from: " : change?.action === "replace" ? "Updated instructions from: " : change?.action === "remove" ? "Instructions removed: " : void 0;
	return prefix && typeof change.path === "string" ? `${prefix}${change.path}\n\n` : void 0;
}
function findInstructionHeader(text, header, from) {
	let index = text.indexOf(header, from);
	while (index >= 0) {
		if (index === 0 || text[index - 1] === "\n") return index;
		index = text.indexOf(header, index + 1);
	}
	return -1;
}
function sameName(left, right) {
	return globalThis.process?.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}
// src/host/services/preflight.ts
var FILE_TOOLS = /* @__PURE__ */ new Set([
	"read",
	"read_image",
	"write",
	"edit",
	"str_replace_editor"
]);
function isFileTool(name) {
	return FILE_TOOLS.has(name);
}
/** Validate one known file call before any sibling in the same assistant batch runs. */
function extractFileOperation(name, args) {
	if (!FILE_TOOLS.has(name)) return { paths: [] };
	if (args === void 0 || !isRecord(args)) return { error: `${name} arguments must be an object` };
	const input = args;
	let field = "file_path";
	if (name === "str_replace_editor") {
		field = "path";
		if (typeof input.command !== "string" || input.command.length === 0) return { error: "str_replace_editor requires a command" };
	}
	const filePath = input[field];
	if (typeof filePath !== "string" || filePath.trim() === "") return { error: `${name} requires a non-empty ${field}` };
	return { paths: [filePath] };
}
/** Read all file calls in a model-authored message, or one PTC child call. */
function fileBatch(agent, exec) {
	if (exec.parent !== void 0) {
		const operation = extractFileOperation(exec.name, exec.arguments);
		return operation.error ? {
			error: operation.error,
			calls: [{
				callId: exec.callId,
				name: exec.name
			}]
		} : { calls: [{
			callId: exec.callId,
			name: exec.name,
			paths: operation.paths ?? []
		}] };
	}
	const messages = agent?.session?.deriveMessages?.() ?? [];
	let batch;
	for (let i = messages.length - 1; i >= 0 && !batch; i--) {
		const message = messages[i];
		if (message?.role !== "assistant" || !Array.isArray(message.content)) continue;
		if (message.content.some((block) => block.type === "tool-call" && block.id === exec.callId)) batch = message.content.filter((block) => block.type === "tool-call" && typeof block.id === "string" && typeof block.name === "string");
	}
	if (!batch) return {
		error: "the assistant tool-call batch is unavailable for safe preflight",
		calls: [{
			callId: exec.callId,
			name: exec.name
		}]
	};
	const calls = [];
	let error;
	for (const block of batch) {
		if (!FILE_TOOLS.has(block.name)) continue;
		let args;
		if (block.id === exec.callId) args = exec.arguments;
		else try {
			args = typeof block.arguments === "string" ? JSON.parse(block.arguments) : block.arguments;
		} catch {
			error ??= `${block.name} arguments are not valid JSON`;
		}
		const operation = extractFileOperation(block.name, args);
		error ??= operation.error;
		calls.push({
			callId: block.id,
			name: block.name,
			paths: operation.paths ?? []
		});
	}
	if (!calls.some((call) => call.callId === exec.callId)) return {
		error: "the current file call is not present in the assistant tool-call batch",
		calls: [{
			callId: exec.callId,
			name: exec.name
		}]
	};
	return {
		calls,
		...error ? { error } : {}
	};
}
/** Resolve aliases against the current Session directory and return project-relative forms. */
async function projectPaths(projectRoot, workingDirectory, rawPath) {
	if (typeof rawPath !== "string" || rawPath.trim() === "") return [];
	let lexical;
	try {
		lexical = path.resolve(workingDirectory, rawPath);
	} catch {
		return [];
	}
	const paths = /* @__PURE__ */ new Set();
	const lexicalRelative = relativeInside(projectRoot, lexical);
	if (lexicalRelative !== void 0) paths.add(lexicalRelative);
	try {
		const canonicalRelative = relativeInside(projectRoot, await realpath(lexical));
		if (canonicalRelative !== void 0) paths.add(canonicalRelative);
	} catch (error) {
		if (!(error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR"))) throw error;
		let ancestor = lexical;
		const tail = [];
		while (true) {
			const parent = path.dirname(ancestor);
			if (parent === ancestor) break;
			tail.unshift(path.basename(ancestor));
			ancestor = parent;
			try {
				const canonicalParent = await realpath(ancestor);
				const canonicalRelative = relativeInside(projectRoot, path.resolve(canonicalParent, ...tail));
				if (canonicalRelative !== void 0) paths.add(canonicalRelative);
				break;
			} catch (parentError) {
				if (!(parentError instanceof Error && "code" in parentError && (parentError.code === "ENOENT" || parentError.code === "ENOTDIR"))) throw parentError;
			}
		}
	}
	return [...paths];
}
function relativeInside(root, target) {
	const rel = path.relative(root, target);
	if (rel === "" || rel === ".") return ".";
	if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return void 0;
	return rel.split(path.sep).join("/");
}
// src/host/services/pathTool.ts
var defineTool = (spec) => spec;
try {
	const toolsMod = await import("@deepseek-ai/dsh-tools");
	if (typeof toolsMod.defineTool === "function") defineTool = toolsMod.defineTool;
} catch {}
function createPathTool(ctx, store, state, { refreshState, currentDirectory }) {
	return defineTool({
		name: "agents_router_paths",
		description: "Declare or release project files in the router workset. Use before opaque terminal or script access; native file tools are tracked automatically.",
		parameters: {
			action: {
				type: "string",
				required: true,
				enum: ["add", "release"]
			},
			paths: {
				type: "array",
				required: true,
				items: { type: "string" },
				description: "File or directory paths relative to the current Session directory, or absolute paths."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				required: [
					"action",
					"message",
					"paths"
				],
				properties: {
					action: { type: "string" },
					message: { type: "string" },
					paths: {
						type: "array",
						items: { type: "string" }
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.message
			}]
		},
		async execute(args, exec) {
			const agent = exec.agent;
			if (!agent || agent.id !== state.agent.id) throw new Error("agents_router_paths is only available in its owning DSH session");
			const cwd = currentDirectory(ctx, state, agent);
			const previousPaths = state.activePaths;
			const paths = /* @__PURE__ */ new Set();
			let ignored = 0;
			for (const raw of args.paths) {
				const resolved = await projectPaths(state.projectRoot, cwd, raw);
				if (!resolved.length) ignored++;
				for (const value of resolved) if (typeof value === "string") paths.add(value);
			}
			state.activePaths = (await store.updateSession(state.sessionId, state.projectRoot, (session) => {
				const entries = new Map(state.activePaths.map((value) => [value.toLowerCase(), value]));
				if (args.action === "add") for (const value of paths) entries.set(value.toLowerCase(), value);
				else if (paths.has(".")) entries.clear();
				else for (const value of paths) {
					const key = value.toLowerCase().replace(/\/$/, "");
					for (const existing of entries.keys()) if (existing === key || existing.startsWith(`${key}/`)) entries.delete(existing);
				}
				return {
					...session,
					activePaths: [...entries.values()]
				};
			})).state.activePaths;
			state.forceEmptyWorkset = false;
			await refreshState(ctx, store, state);
			const added = state.activePaths.filter((item) => !previousPaths.includes(item));
			const released = previousPaths.filter((item) => !state.activePaths.includes(item));
			await recordAudit(state, store, {
				event: "tool_call agents_router_paths",
				workset: `+added: [${added.join(", ")}] | -released: [${released.join(", ")}] | total: ${state.activePaths.length}`
			});
			state.invalidateSkills();
			const message = `${args.action === "add" ? "added" : "released"} ${paths.size} project path(s)${ignored ? `; ignored ${ignored} path(s) outside this project` : ""}`;
			return {
				action: args.action,
				message,
				paths: [...paths]
			};
		}
	});
}
// src/host/services/pathMatch.ts
var GLOB_META = /[?*[{]/;
var REGEX_META = /* @__PURE__ */ new Set([
	"\\",
	".",
	"^",
	"$",
	"+",
	"?",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	"|"
]);
/** Match a rule/area path filter against one project-relative path. */
function matchesPath(candidate, filter) {
	return explainPathMatch(candidate, filter).matched;
}
/** Match normalized rule metadata using include, exclude, and basename glob semantics. */
function matchesRule(rule, targetPath) {
	if (rule.alwaysApply) return true;
	if (rule.globs.length === 0) return false;
	const target = normalize(targetPath).replace(/^\/+/, "").toLowerCase();
	if (!target) return false;
	const patterns = rule.globs.map((pattern) => normalize(pattern.trim()).toLowerCase()).filter((pattern) => pattern.length > 0);
	if (!patterns.length) return false;
	const positive = patterns.filter((pattern) => !pattern.startsWith("!"));
	const negative = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => pattern.slice(1));
	const matchesAny = (candidates) => candidates.some((pattern) => matchesGlob(target, pattern));
	return (positive.length === 0 || matchesAny(positive)) && !matchesAny(negative);
}
/** Explain the last matching include/exclude rule for a project-relative path. */
function explainPathMatch(candidate, filter) {
	if (filter === void 0 || filter === "" || Array.isArray(filter) && filter.length === 0) return {
		matched: true,
		reason: "unrestricted"
	};
	const path = normalize(candidate).toLowerCase();
	const rawList = (Array.isArray(filter) ? filter : [filter]).filter((item) => typeof item === "string" && item.trim().length > 0);
	if (!rawList.length) return {
		matched: false,
		reason: "invalid filter"
	};
	const parsed = rawList.map((raw) => {
		const trimmed = raw.trim();
		const negated = trimmed.startsWith("!");
		return {
			raw: trimmed,
			negated,
			pattern: normalize(negated ? trimmed.slice(1).trim() : trimmed).toLowerCase()
		};
	}).filter(({ pattern }) => pattern.length > 0);
	if (!parsed.length) return {
		matched: false,
		reason: "invalid filter"
	};
	const hasPositive = parsed.some(({ negated }) => !negated);
	let matched = !hasPositive;
	let lastMatchedRule = hasPositive ? void 0 : "implicit-all";
	let excludedBy;
	for (const item of parsed) {
		if (!matchesSinglePattern(path, item.pattern)) continue;
		if (item.negated) {
			matched = false;
			excludedBy = item.raw;
		} else {
			matched = true;
			lastMatchedRule = item.raw;
			excludedBy = void 0;
		}
	}
	return {
		matched,
		reason: matched ? `matched ${lastMatchedRule}` : excludedBy ? `excluded by ${excludedBy}` : "path did not match"
	};
}
function matchesSinglePattern(path, pattern) {
	if (pattern.endsWith("/")) return path.startsWith(pattern) || path === pattern.slice(0, -1);
	if (!GLOB_META.test(pattern)) return path === pattern;
	return matchesGlob(pattern.includes("/") ? path : posix.basename(path), pattern);
}
function matchesGlob(target, pattern) {
	if (!pattern) return false;
	try {
		const matcher = globRegex(pattern);
		return matcher.test(target) || !pattern.includes("/") && matcher.test(posix.basename(target));
	} catch {
		return false;
	}
}
function normalize(value) {
	return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}
function globRegex(pattern) {
	return new RegExp(`^${globToSource(pattern)}$`);
}
function globToSource(pattern) {
	let source = "";
	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern[index];
		if (character === void 0) continue;
		if (character === "*") {
			if (pattern[index + 1] === "*") {
				index += 1;
				if (pattern[index + 1] === "/") {
					index += 1;
					source += "(?:[^/]+/)*";
				} else source += ".*";
			} else source += "[^/]*";
			continue;
		}
		if (character === "?") {
			source += "[^/]";
			continue;
		}
		if (character === "{") {
			const end = findClosingBrace(pattern, index);
			if (end >= 0) {
				const alternatives = splitBraceAlternatives(pattern.slice(index + 1, end));
				if (alternatives.length > 1) {
					source += `(?:${alternatives.map(globToSource).join("|")})`;
					index = end;
					continue;
				}
			}
			source += "\\{";
			continue;
		}
		if (character === "[") {
			const end = pattern.indexOf("]", index + 1);
			if (end > index + 1) {
				const contents = pattern.slice(index + 1, end);
				const characterClass = contents.startsWith("!") && contents.length > 1 ? `^${contents.slice(1)}` : contents;
				source += `[${characterClass}]`;
				index = end;
				continue;
			}
			source += "\\[";
			continue;
		}
		if (character === "}" || REGEX_META.has(character)) source += `\\${character}`;
		else source += character;
	}
	return source;
}
function findClosingBrace(pattern, start) {
	let depth = 0;
	for (let index = start; index < pattern.length; index += 1) if (pattern[index] === "[") {
		const bracketEnd = pattern.indexOf("]", index + 1);
		if (bracketEnd >= 0) index = bracketEnd;
	} else if (pattern[index] === "{") depth += 1;
	else if (pattern[index] === "}") {
		depth -= 1;
		if (depth === 0) return index;
	}
	return -1;
}
function splitBraceAlternatives(value) {
	const alternatives = [];
	let token = "";
	let braceDepth = 0;
	let bracketDepth = 0;
	for (const character of value) {
		if (character === "{") braceDepth += 1;
		else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
		else if (character === "[") bracketDepth += 1;
		else if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
		if (character === "," && braceDepth === 0 && bracketDepth === 0) {
			alternatives.push(token);
			token = "";
		} else token += character;
	}
	alternatives.push(token);
	return alternatives;
}
// src/host/services/ruleSelector.ts
/** Return managed rules matching active paths; unfiltered global rules are always included. */
function selectRules(snapshot, activePaths = []) {
	const paths = [...new Map(activePaths.map(normalizePath).filter(Boolean).map((value) => [value.toLowerCase(), value])).values()].toSorted(compare);
	const selected = /* @__PURE__ */ new Map();
	for (const rule of snapshot.rules) {
		if (!rule.enabled || !rule.path || typeof rule.content !== "string") continue;
		if (rule.area === "global") {
			const appliesTo = alwaysApplies(rule) ? ["always"] : paths.filter((candidate) => matchesDiscoveredRule(rule, candidate));
			if (appliesTo.length) selected.set(rule.id ?? rule.sourcePath, {
				...rule,
				path: rule.path,
				content: rule.content,
				appliesTo
			});
			continue;
		}
		const area = snapshot.areas.get(rule.area);
		if (!area?.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) continue;
		const appliesTo = paths.filter((candidate) => areaMatches(snapshot, area, candidate) && matchesDiscoveredRule(rule, candidate));
		if (appliesTo.length) selected.set(rule.id ?? rule.sourcePath, {
			...rule,
			path: rule.path,
			content: rule.content,
			appliesTo
		});
	}
	return [...selected.values()];
}
function renderRules(rules) {
	return rules.map((rule) => {
		const applies = rule.appliesTo.includes("always") ? "always" : rule.appliesTo.map((file) => `\`${file}\``).join(", ");
		return `## ${rule.description || rule.sourcePath.split("/").at(-1)}\nSource: ${rule.sourcePath}${rule.area === "global" ? "" : ` (area ${rule.area})`}\nRevision: ${rule.hash}\nApplies to: ${applies}\n\n${rule.content.trim()}`;
	}).join("\n\n---\n\n");
}
/** Explain whether a project-relative file would activate each configured rule. */
function diagnosePath(snapshot, filePath) {
	const candidate = normalizePath(filePath);
	const rows = [];
	for (const rule of snapshot.rules) {
		if (!rule.enabled) {
			rows.push({
				rule,
				applies: false,
				reason: "disabled"
			});
			continue;
		}
		if (rule.area === "global") {
			const ruleMatch = explainRuleMatch(rule, candidate);
			rows.push({
				rule,
				applies: ruleMatch.matched,
				reason: ruleMatch.reason
			});
			continue;
		}
		const area = snapshot.areas.get(rule.area);
		if (!area?.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) {
			rows.push({
				rule,
				applies: false,
				reason: "area or parent is unavailable/disabled"
			});
			continue;
		}
		const areaResult = explainAreaPathMatch(snapshot, area, candidate);
		const ruleResult = explainRuleMatch(rule, candidate);
		rows.push({
			rule,
			applies: areaResult.matched && ruleResult.matched,
			reason: !areaResult.matched ? areaResult.reason : !ruleResult.matched ? ruleResult.reason : "area and rule paths matched"
		});
	}
	return rows;
}
function renderAreas(snapshot) {
	const rows = [...snapshot.areas].toSorted(([a], [b]) => a.localeCompare(b)).filter(([, area]) => {
		let current = area;
		while (current) {
			if (!current.enabled || !current.available) return false;
			if (!current.parent) return true;
			current = snapshot.areas.get(current.parent);
		}
		return false;
	}).map(([name, area]) => {
		const paths = Array.isArray(area.path) ? area.path : [area.path];
		const keywords = area.keywords?.length ? `; keywords: ${area.keywords.join(", ")}` : "";
		return `- ${name}: ${paths.join(" OR ")}${keywords}`;
	});
	return rows.length ? `## Project areas (search hints only; they do not activate rules)\n${rows.join("\n")}` : "";
}
function alwaysApplies(rule) {
	return rule.alwaysApply === true || isUnfilteredLegacyAgentRule(rule);
}
function isUnfilteredLegacyAgentRule(rule) {
	return rule.sourceVendor === "agents" && (rule.globs?.length ?? 0) === 0 && (rule.path?.length ?? 0) === 0;
}
function matchesDiscoveredRule(rule, candidate) {
	if (isUnfilteredLegacyAgentRule(rule)) return true;
	if (rule.sourceVendor === "agents" && rule.path?.length) return matchesPath(candidate, rule.path);
	if (rule.globs === void 0) return matchesPath(candidate, rule.path);
	return matchesRule({
		globs: rule.globs,
		alwaysApply: rule.alwaysApply ?? false,
		activationMode: rule.activationMode ?? "manual",
		...rule.sourceVendor === void 0 ? {} : { sourceVendor: rule.sourceVendor }
	}, candidate);
}
function explainRuleMatch(rule, candidate) {
	if (alwaysApplies(rule)) return {
		matched: true,
		reason: "always"
	};
	if (rule.sourceVendor === "agents" && rule.path?.length) {
		const result = explainPathMatch(candidate, rule.path);
		return {
			matched: result.matched,
			reason: explainFilterReason(result, "rule")
		};
	}
	if (rule.globs === void 0) {
		const result = explainPathMatch(candidate, rule.path);
		return {
			matched: result.matched,
			reason: explainFilterReason(result, "rule")
		};
	}
	const matched = matchesDiscoveredRule(rule, candidate);
	return {
		matched,
		reason: matched ? "rule glob patterns matched" : "rule glob patterns did not match"
	};
}
function areaMatches(snapshot, area, candidate) {
	return explainAreaPathMatch(snapshot, area, candidate).matched;
}
function explainAreaPathMatch(snapshot, area, candidate) {
	let current = area;
	while (current) {
		if (!current.enabled || !current.available) return {
			matched: false,
			reason: "area or parent is unavailable/disabled"
		};
		const result = explainPathMatch(candidate, current.path);
		if (!result.matched) return {
			matched: false,
			reason: explainFilterReason(result, "area")
		};
		if (!current.parent) return {
			matched: true,
			reason: "area path matched"
		};
		current = snapshot.areas.get(current.parent);
	}
	return {
		matched: false,
		reason: "area or parent is unavailable/disabled"
	};
}
function explainFilterReason(result, kind) {
	if (result.reason.startsWith("excluded by ")) return `excluded by ${kind} pattern ${result.reason.slice(12)}`;
	return `${kind} path did not match`;
}
function normalizePath(value) {
	if (typeof value !== "string") return "";
	return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/^\//, "");
}
// src/host/services/discovery.ts
/** Discover configured project instructions without creating or modifying project files. */
async function discoverProject(projectPath, settings = DEFAULT_PROJECT_SETTINGS) {
	const diagnostics = [];
	const snapshot = {
		rules: [],
		skills: [],
		areas: /* @__PURE__ */ new Map(),
		areasConfigValid: false,
		diagnostics,
		complete: true,
		rulesComplete: true
	};
	let projectRoot;
	try {
		projectRoot = await realpath(projectPath);
		if (!(await stat(projectRoot)).isDirectory()) throw new Error("project root is not a directory");
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorCode = error.code;
		diagnostics.push(diagnostic("project-root", projectPath, `cannot open project root: ${errorMessage}`));
		snapshot.complete = ![
			"EACCES",
			"EPERM",
			"EIO"
		].includes(errorCode ?? "");
		snapshot.rulesComplete = snapshot.complete;
		return snapshot;
	}
	snapshot.projectRoot = projectRoot;
	const mode = settings.discoveryMode ?? "merge";
	const configuredInstructionsRoot = await safeDirectory(path.resolve(projectRoot, ...settings.instructionsRoot.split("/")), projectRoot, diagnostics, "instructions-root", mode !== "strict");
	let instructionsRoot = configuredInstructionsRoot;
	if (!instructionsRoot && mode !== "strict" && settings.instructionsRoot === DEFAULT_PROJECT_SETTINGS.instructionsRoot) instructionsRoot = await safeDirectory(path.join(projectRoot, ".agents"), projectRoot, diagnostics, "instructions-root", true);
	if (!instructionsRoot && mode === "strict") {
		snapshot.rulesComplete = !diagnostics.some(({ message }) => /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message));
		return snapshot;
	}
	const seenRuleFiles = /* @__PURE__ */ new Set();
	const seenSkillFiles = /* @__PURE__ */ new Set();
	if (instructionsRoot) {
		snapshot.instructionsRoot = instructionsRoot;
		const configDirectory = path.join(instructionsRoot, "dsh");
		const configFile = await findCaseInsensitiveEntry(configDirectory, "agents-router.json", diagnostics, projectRoot);
		let configText;
		if (configFile) try {
			const canonicalConfig = await realpath(configFile);
			if (!inside(projectRoot, canonicalConfig)) throw new Error("symbolic link points outside the project");
			configText = await readFile(canonicalConfig, "utf8");
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			diagnostics.push(diagnostic("area-config", posixRelative(projectRoot, configFile), `cannot read area config: ${errorMessage}`));
		}
		const parsed = configText === void 0 ? {
			areas: /* @__PURE__ */ new Map(),
			errors: [],
			valid: true
		} : parseAreasConfig(configText, settings);
		snapshot.areasConfigValid = Boolean(configFile && configText !== void 0 && parsed.valid && parsed.errors.length === 0);
		for (const message of parsed.errors) diagnostics.push(diagnostic("area-config", posixRelative(projectRoot, configFile ?? path.join(configDirectory, "agents-router.json")), message));
		await discoverAreaFolders(instructionsRoot, parsed.areas, settings, projectRoot, diagnostics);
		snapshot.areas = parsed.areas;
		const agentRules = {
			sourceVendor: "agents",
			seenFiles: seenRuleFiles
		};
		await addRuleFile(path.join(instructionsRoot, settings.mainFile), "global", projectRoot, snapshot.rules, diagnostics, true, agentRules);
		await collectRules(path.join(instructionsRoot, settings.rulesFolder), "global", projectRoot, snapshot.rules, diagnostics, agentRules);
		await collectSkills(path.join(instructionsRoot, settings.skillsFolder), "global", projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
		for (const [name, area] of [...parsed.areas].toSorted(([a], [b]) => compare(a, b))) {
			if (!area.available || !area.enabled) continue;
			const directory = path.join(instructionsRoot, ...name.split("/"));
			await addRuleFile(path.join(directory, settings.mainFile), name, projectRoot, snapshot.rules, diagnostics, true, agentRules);
			await collectRules(path.join(directory, settings.rulesFolder), name, projectRoot, snapshot.rules, diagnostics, agentRules);
			await collectSkills(path.join(directory, settings.skillsFolder), name, projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
		}
	}
	if (mode === "merge" || !configuredInstructionsRoot) await discoverWorkspaceSources(projectRoot, snapshot, diagnostics, seenRuleFiles, seenSkillFiles);
	snapshot.rules.sort((a, b) => compare(areaOrder(a.area), areaOrder(b.area)) || compare(a.sourcePath, b.sourcePath));
	snapshot.skills.sort((a, b) => compare(a.name, b.name) || compare(a.sourcePath, b.sourcePath));
	snapshot.complete = !diagnostics.some(({ code, message }) => [
		"skills-folder",
		"skill-folder",
		"file-discovery"
	].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message));
	snapshot.rulesComplete = !diagnostics.some(({ code, message }) => ["rules-folder", "file-discovery"].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message));
	return snapshot;
}
async function discoverWorkspaceSources(projectRoot, snapshot, diagnostics, seenRuleFiles, seenSkillFiles) {
	for (const name of [
		"AGENTS.md",
		"AGENT.md",
		"CLAUDE.md",
		".cursorrules"
	]) await addRuleFile(path.join(projectRoot, name), "global", projectRoot, snapshot.rules, diagnostics, true, {
		sourceVendor: "root-file",
		forceAlwaysApply: true,
		seenFiles: seenRuleFiles
	});
	const cursor = path.join(projectRoot, ".cursor");
	await collectRules(path.join(cursor, "rules"), "global", projectRoot, snapshot.rules, diagnostics, {
		sourceVendor: "cursor",
		seenFiles: seenRuleFiles
	});
	await collectSkills(path.join(cursor, "skills"), "global", projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
	const claude = path.join(projectRoot, ".claude");
	await addRuleFile(path.join(claude, "CLAUDE.md"), "global", projectRoot, snapshot.rules, diagnostics, true, {
		sourceVendor: "claude",
		forceAlwaysApply: true,
		seenFiles: seenRuleFiles
	});
	await collectRules(path.join(claude, "rules"), "global", projectRoot, snapshot.rules, diagnostics, {
		sourceVendor: "claude",
		seenFiles: seenRuleFiles
	});
	await collectSkills(path.join(claude, "skills"), "global", projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
	await collectCommandSkills(path.join(claude, "commands"), projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
	const codex = path.join(projectRoot, ".codex");
	const codexRules = {
		sourceVendor: "codex",
		defaultAlwaysApply: true,
		seenFiles: seenRuleFiles
	};
	await collectRules(path.join(codex, "rules"), "global", projectRoot, snapshot.rules, diagnostics, codexRules);
	await collectTopLevelRules(codex, "global", projectRoot, snapshot.rules, diagnostics, codexRules);
	await collectSkills(path.join(codex, "skills"), "global", projectRoot, snapshot.skills, diagnostics, seenSkillFiles);
}
/** Load a skill's full body only after the native DSH loader asks for it. */
async function loadSkillDefinition(projectRoot, settings, locator) {
	let canonicalRoot;
	try {
		canonicalRoot = await realpath(projectRoot);
	} catch {
		return;
	}
	const matchingNames = (await discoverProject(canonicalRoot, settings)).skills.filter((skill) => skill.name === locator?.name && skill.enabled);
	if (matchingNames.length !== 1) return void 0;
	const current = matchingNames.find((skill) => skill.sourcePath === locator?.sourcePath);
	if (!current) return void 0;
	try {
		const canonicalFile = await realpath(current.filePath);
		if (!inside(canonicalRoot, canonicalFile)) return void 0;
		const { metadata, content } = parseInstruction(await readFile(canonicalFile, "utf8"), "skill");
		if (!metadata.enabled) return void 0;
		return {
			...current,
			description: metadata.description,
			...metadata.whenToUse === void 0 ? {} : { whenToUse: metadata.whenToUse },
			invocation: {
				modelInvocable: metadata.modelInvocable,
				userInvocable: metadata.userInvocable
			},
			...metadata.metadata === void 0 ? {} : { metadata: metadata.metadata },
			content
		};
	} catch {
		return;
	}
}
// src/host/services/sessionController.ts
async function reportDiagnostics(ctx, store, state, items) {
	for (const item of items) state.runtimeDiagnostics.set(diagnosticKey(item), item);
	if (!items.length) return [];
	try {
		const fresh = await store.markDiagnostics(state.sessionId, state.projectRoot, items);
		for (const item of fresh) ctx.logger.warn(`agents-router: ${item.path}: ${item.message}`);
		return fresh;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		ctx.logger.error(`agents-router: could not persist diagnostics for ${state.sessionId}: ${message}`);
		return items;
	}
}
async function refreshState(ctx, store, state) {
	const project = await store.loadProjectSettings(state.projectRoot);
	const session = await store.loadSession(state.sessionId, state.projectRoot);
	state.settings = project.settings;
	state.activePaths = state.forceEmptyWorkset ? [] : session.state.activePaths;
	state.snapshot = await discoverProject(state.projectRoot, project.settings);
	state.runtimeDiagnostics = new Map(state.snapshot.diagnostics.map((item) => [diagnosticKey(item), item]));
	state.areaText = renderAreas(state.snapshot);
	state.rules = selectRules(state.snapshot, state.activePaths);
	state.text = renderRules(state.rules);
	if (!state.snapshot.rulesComplete) state.text = [state.text, "Router warning: project rule discovery is incomplete; do not perform project file operations until access is restored."].filter(Boolean).join("\n\n");
	const warnings = [
		project.warning,
		session.warning,
		state.restoreWarning
	].filter((message) => typeof message === "string").map((message) => ({
		code: "restore-warning",
		path: state.projectRoot,
		message,
		key: `restore-warning:${state.projectRoot}:${message}`
	}));
	if ((project.settings.redirectRootInstructionFiles || project.settings.redirectInstructionDirectories) && !state.snapshot.areasConfigValid) {
		const configPath = `${project.settings.instructionsRoot}/dsh/agents-router.json`;
		warnings.push({
			code: "instruction-redirection-config",
			path: configPath,
			message: "Instruction redirection is disabled until agents-router.json exists and is valid; original reads are unchanged.",
			key: `instruction-redirection-config:${state.projectRoot}:${configPath}`
		});
	}
	await reportDiagnostics(ctx, store, state, [...state.snapshot.diagnostics, ...warnings]);
	return state;
}
function findLiveState(ctx, states, sessionId) {
	const agent = ctx.agents.list().find((item) => item.session.id === sessionId);
	const state = agent ? states.get(agent.id) : void 0;
	return agent && state ? {
		agent,
		state
	} : void 0;
}
function currentDirectory(ctx, state, agent) {
	try {
		const value = ctx.workingDirectory.get(agent.session);
		if (typeof value === "string" && path.isAbsolute(value)) return value;
	} catch {}
	return state.projectRoot;
}
function isTrulyIdle(agent) {
	return agent.status === "idle" && agent.inbox.nextTurn.length === 0 && agent.inbox.nextStep.length === 0;
}
function historyHasRule(session, rule) {
	const messages = session.deriveMessages();
	let latestSections = [];
	for (const message of messages) {
		const source = message.source;
		if (source?.kind !== "runtime-context") continue;
		latestSections = source.form === "snapshot" && Array.isArray(source.sections) ? source.sections : [];
	}
	const contribution = latestSections.find((section) => section.name === RULE_CONTEXT);
	return typeof contribution?.text === "string" && contribution.text.includes(`Revision: ${rule.hash}`);
}
function denyCalls(calls, exec, pendingFeedback, state, reason) {
	for (const call of calls) pendingFeedback.set(feedbackKey(state.agent.id, call.callId), reason);
	if (exec.parent !== void 0) state.blockedRoots.set(exec.rootCallId ?? exec.callId, reason);
	return {
		kind: "deny",
		reason,
		info: {
			name: "AgentsRouterPreflightError",
			code: "AGENTS_ROUTER_REPLAN_REQUIRED",
			reason
		}
	};
}
function feedbackKey(agentId, callId) {
	return `${agentId}:${callId}`;
}
function preflightEvent(kind, tool, resolvedPaths, calls) {
	const resolved = [...resolvedPaths];
	if (kind === "file_preflight") {
		const count = resolved.length;
		return `${kind} tool="${tool}" (${count ? `+${count} paths` : "cached workset"})`;
	}
	return `${kind} tool="${tool}" (${(resolved.length ? resolved : calls.flatMap((call) => call.paths ?? [])).join(", ")})`;
}
async function readRouterState(ctx, store, states, sessionId) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	const { agent, state } = found;
	await refreshState(ctx, store, state);
	const snapshot = state.snapshot;
	if (!snapshot) throw new Error("project discovery is unavailable after refresh");
	state.invalidateSkills();
	const availableSkills = (await ctx.skills.list({
		cwd: state.projectRoot,
		scope: agent
	})).filter((skill) => skill.provider === "agents-router-project");
	const modelSkills = availableSkills.filter((skill) => skill.invocation?.modelInvocable !== false);
	const selected = new Map(state.rules.map((rule) => [rule.id ?? rule.sourcePath, rule]));
	const rules = snapshot.rules.map((rule) => {
		const current = selected.get(rule.id ?? rule.sourcePath);
		return {
			source: rule.sourcePath,
			sourcePath: rule.sourcePath,
			filePath: rule.filePath,
			area: rule.area,
			description: rule.description,
			enabled: rule.enabled,
			selected: Boolean(current),
			appliesTo: current?.appliesTo ?? [],
			characters: rule.content?.length ?? 0,
			reason: current ? current.appliesTo.includes("always") ? "always" : "matches active workset" : !rule.enabled ? "disabled" : !state.activePaths.length ? "requires a matching project path" : "path or area filters did not match"
		};
	});
	const messages = agent.session.deriveMessages();
	const metrics = computeContextMetrics({
		text: state.text,
		areaText: state.areaText,
		rules: state.rules.map((rule) => ({ id: rule.id ?? rule.sourcePath })),
		snapshot: { areas: new Map([...snapshot.areas].map(([name, area]) => [name, {
			enabled: Boolean(area.enabled),
			available: Boolean(area.available)
		}])) },
		settings: { tokenBudget: state.settings.tokenBudget }
	}, availableSkills, modelSkills, messages);
	return {
		ok: true,
		sessionId,
		status: agent.status,
		canReset: isTrulyIdle(agent),
		projectRoot: state.projectRoot,
		instructionsRoot: state.settings.instructionsRoot,
		resolvedInstructionsRoot: snapshot.instructionsRoot,
		areasConfigPath: path.posix.join(snapshot.instructionsRoot ? path.relative(state.projectRoot, snapshot.instructionsRoot).split(path.sep).join("/") : state.settings.instructionsRoot, "dsh", "agents-router.json"),
		settings: state.settings,
		activePaths: state.activePaths,
		rules,
		areas: [...snapshot.areas].map(([name, area]) => ({
			name,
			path: area.path,
			keywords: area.keywords,
			enabled: area.enabled,
			available: area.available,
			parent: area.parent,
			reason: !area.enabled ? "disabled" : !area.available ? area.parent ? "parent or area folder unavailable" : "area folder unavailable" : "available"
		})),
		skills: availableSkills.map(({ name, description, path: sourcePath, invocation }) => ({
			name,
			description,
			sourcePath,
			invocation
		})),
		diagnostics: [...state.runtimeDiagnostics.values()].map((item) => ({
			...item,
			path: path.resolve(state.projectRoot, item.path ?? item.target ?? "")
		})),
		auditWarning: state.auditWarning,
		globalSettings: (await store.loadGlobalSettings()).settings,
		metrics,
		coverage: [
			{
				tool: "read",
				pathField: "file_path",
				coverage: "single path; all assistant file calls preflighted before execution"
			},
			{
				tool: "read_image",
				pathField: "file_path",
				coverage: "single path; all assistant file calls preflighted before execution"
			},
			{
				tool: "write",
				pathField: "file_path",
				coverage: "single target path; new files supported"
			},
			{
				tool: "edit",
				pathField: "file_path",
				coverage: "single target path"
			},
			{
				tool: "str_replace_editor",
				pathField: "path",
				coverage: "single path; supported command required"
			},
			{
				tool: "glob / grep",
				pathField: "none",
				coverage: "search only; results do not enter workset"
			},
			{
				tool: "terminal / scripts / other tools",
				pathField: "agents_router_paths(paths)",
				coverage: "opaque accesses are not guaranteed; declared paths are advisory inputs"
			}
		]
	};
}
function diagnosticKey(item) {
	return item.key ?? `${item.code}:${item.path ?? ""}:${item.message}`;
}
// src/host/services/preflightHook.ts
function createPreflightHook(ctx, store, states, pendingFeedback) {
	return async (exec, next) => {
		if (!isFileTool(exec.name)) return next();
		const agent = exec.agent;
		if (!agent) return next();
		const state = states.get(agent.id);
		if (!state) return next();
		const rootCallId = exec.rootCallId ?? exec.callId;
		if (exec.parent !== void 0 && state.blockedRoots.has(rootCallId)) {
			const reason = state.blockedRoots.get(rootCallId) ?? "";
			pendingFeedback.set(feedbackKey(state.agent.id, exec.callId), reason);
			return {
				kind: "deny",
				reason
			};
		}
		const batch = fileBatch(exec.agent, exec);
		const calls = batch.calls.length ? batch.calls : [{
			callId: exec.callId,
			name: exec.name,
			paths: []
		}];
		const batchKey = calls.map((call) => call.callId).toSorted().join("|");
		const cwd = currentDirectory(ctx, state, agent);
		const paths = /* @__PURE__ */ new Set();
		let currentPaths = [];
		let pathError;
		for (const call of calls) for (const rawPath of call.paths ?? []) try {
			const resolvedPaths = await projectPaths(state.projectRoot, cwd, rawPath);
			if (call.callId === exec.callId) currentPaths = resolvedPaths;
			for (const resolved of resolvedPaths) paths.add(resolved);
		} catch (error) {
			pathError ??= error instanceof Error ? error : new Error(String(error));
		}
		if (pathError) {
			const reason = `agents-router could not resolve a project file path; file operation denied: ${pathError.message}`;
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				preflight: `denied: ${FILE_ERROR} (${pathError.message})`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		if (!paths.size && !batch.error) return next();
		const previousPaths = state.activePaths;
		let persisted;
		try {
			persisted = await store.updateSession(state.sessionId, state.projectRoot, (session) => ({
				...session,
				activePaths: [...new Map([...state.activePaths, ...paths].map((value) => [value.toLowerCase(), value])).values()]
			}));
		} catch (error) {
			const reason = `agents-router could not persist the project workset; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				preflight: `denied: ${FILE_ERROR} (workset persistence failed)`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		state.activePaths = persisted.state.activePaths;
		state.forceEmptyWorkset = false;
		let addedPaths = [];
		try {
			await refreshState(ctx, store, state);
			addedPaths = state.activePaths.filter((item) => !previousPaths.includes(item));
		} catch (error) {
			const reason = `agents-router could not refresh project instructions; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				preflight: `denied: ${FILE_ERROR} (refresh failed)`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		const snapshot = state.snapshot;
		let worksetChange = `+added: [${addedPaths.join(", ")}] | total: ${state.activePaths.length}`;
		if (!snapshot) {
			const reason = "agents-router could not inspect project rules; file operation denied.";
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				workset: worksetChange,
				preflight: `denied: ${FILE_ERROR} (project discovery unavailable)`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		if (batch.error) {
			const reason = `agents-router could not safely preflight this file-call batch: ${batch.error}. No file call in the batch was run.`;
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				workset: worksetChange,
				preflight: `denied: ${FILE_ERROR} (${batch.error})`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		if (!paths.size) return next();
		if (!snapshot.rulesComplete) {
			const reason = "agents-router could not read all configured project rules; file operation denied until rule discovery succeeds.";
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				workset: worksetChange,
				preflight: `denied: ${FILE_ERROR} (rule discovery incomplete)`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		let redirectPath;
		const redirectEnabled = state.settings.redirectRootInstructionFiles || state.settings.redirectInstructionDirectories;
		if (exec.name === "read" && redirectEnabled && snapshot.areasConfigValid) {
			const relativeTarget = matchInstructionRedirect(currentPaths, state.settings);
			if (relativeTarget) {
				paths.add(`agents/${relativeTarget}`);
				try {
					redirectPath = await resolveInstructionDestination(state.projectRoot, relativeTarget);
				} catch (error) {
					const reason = `agents-router could not safely redirect this read to agents/${relativeTarget}; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
					await recordAudit(state, store, {
						event: preflightEvent("preflight_intercept", exec.name, paths, calls),
						workset: worksetChange,
						preflight: `denied: ${FILE_ERROR} (instruction destination unavailable or unsafe)`
					});
					return denyCalls(calls, exec, pendingFeedback, state, reason);
				}
				const destinationRelative = path.relative(state.projectRoot, redirectPath).split(path.sep).join("/");
				paths.add(destinationRelative);
				if (!state.activePaths.some((value) => value.toLowerCase() === destinationRelative.toLowerCase())) {
					try {
						persisted = await store.updateSession(state.sessionId, state.projectRoot, (session) => ({
							...session,
							activePaths: [...new Map([...session.activePaths, destinationRelative].map((value) => [value.toLowerCase(), value])).values()]
						}));
					} catch (error) {
						const reason = `agents-router could not persist the redirected project path; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
						await recordAudit(state, store, {
							event: preflightEvent("preflight_intercept", exec.name, paths, calls),
							workset: worksetChange,
							preflight: `denied: ${FILE_ERROR} (redirected workset persistence failed)`
						});
						return denyCalls(calls, exec, pendingFeedback, state, reason);
					}
					state.activePaths = persisted.state.activePaths;
					state.rules = selectRules(snapshot, state.activePaths);
					state.text = renderRules(state.rules);
					addedPaths = state.activePaths.filter((item) => !previousPaths.includes(item));
					worksetChange = `+added: [${addedPaths.join(", ")}] | total: ${state.activePaths.length}`;
				}
			}
		}
		const continueWithRedirect = async () => {
			if (!redirectPath) return next();
			try {
				exec.arguments = {
					...exec.arguments,
					file_path: redirectPath
				};
				if (exec.arguments.file_path !== redirectPath) throw new Error("the tool arguments are immutable");
			} catch (error) {
				const reason = `agents-router could not safely apply the redirected file path; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
				await recordAudit(state, store, {
					event: preflightEvent("preflight_intercept", exec.name, paths, calls),
					workset: worksetChange,
					preflight: `denied: ${FILE_ERROR} (argument rewrite failed)`
				});
				return denyCalls(calls, exec, pendingFeedback, state, reason);
			}
			return next();
		};
		const missing = selectRules(snapshot, [...paths]).filter((rule) => !historyHasRule(agent.session, rule));
		if (missing.length) {
			const reason = `agents-router loaded new or changed instructions for this file-call batch: ${missing.map((rule) => `${rule.sourcePath} (${rule.hash?.slice(0, 12) ?? ""})`).join(", ")}. No file call in the batch was run. Review the current runtime context and re-plan before retrying.`;
			await recordAudit(state, store, {
				event: preflightEvent("preflight_intercept", exec.name, paths, calls),
				workset: worksetChange,
				preflight: `denied: ${FILE_ERROR} (new instructions injected)`
			});
			return denyCalls(calls, exec, pendingFeedback, state, reason);
		}
		if (shouldSkipBatchAudit(state, batchKey, addedPaths, missing.length > 0, Boolean(batch.error))) return continueWithRedirect();
		await recordAudit(state, store, {
			event: preflightEvent("file_preflight", exec.name, addedPaths, calls),
			workset: worksetChange,
			preflight: "preflight: ok",
			diagnostics: [...state.runtimeDiagnostics.values()],
			batchKey
		});
		return continueWithRedirect();
	};
}
// src/host/services/sessionActions.ts
async function readAuditLog(ctx, store, states, sessionId) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	return {
		ok: true,
		text: await store.readAuditLog(found.state.projectRoot, sessionId)
	};
}
async function deleteAuditLog(ctx, store, states, sessionId) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	await store.deleteSessionAuditLog(found.state.projectRoot, sessionId);
	return { ok: true };
}
async function saveRouterSettings(ctx, store, states, sessionId, settings) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	const saved = await store.saveProjectSettings(found.state.projectRoot, settings);
	if (!saved.saved) return {
		ok: false,
		status: 400,
		error: saved.errors.join("; ")
	};
	await refreshProjectStates(ctx, store, states, found.state.projectRoot);
	for (const agent of ctx.agents.list()) {
		const state = states.get(agent.id);
		if (state?.projectRoot === found.state.projectRoot) await recordAudit(state, store, { event: "settings_change" });
	}
	return {
		ok: true,
		settings: saved.settings
	};
}
async function refreshRouterProject(ctx, store, states, sessionId) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	await refreshProjectStates(ctx, store, states, found.state.projectRoot);
	return {
		ok: true,
		projectRoot: found.state.projectRoot
	};
}
async function refreshProjectStates(ctx, store, states, projectRoot) {
	for (const agent of ctx.agents.list()) {
		const state = states.get(agent.id);
		if (!state || state.projectRoot !== projectRoot) continue;
		await refreshState(ctx, store, state);
		state.invalidateSkills();
		await ctx.skills.list({
			cwd: state.projectRoot,
			scope: agent
		});
	}
}
async function resetRouterWorkset(ctx, store, states, sessionId) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	try {
		return await found.agent.runMaintenance(async (signal) => {
			signal.throwIfAborted();
			const result = await store.resetSession(sessionId, found.state.projectRoot);
			found.state.activePaths = result.state.activePaths;
			found.state.forceEmptyWorkset = false;
			await refreshState(ctx, store, found.state);
			await recordAudit(found.state, store, {
				event: "reset",
				workset: "-released all paths | total: 0"
			});
			return {
				ok: true,
				activePaths: found.state.activePaths,
				note: "history is unchanged; old instruction messages may remain visible to DSH"
			};
		});
	} catch (error) {
		if (!isTrulyIdle(found.agent)) return {
			ok: false,
			status: 409,
			error: "workset can only be reset while the session is truly idle"
		};
		throw error;
	}
}
async function diagnoseRouterPath(ctx, store, states, sessionId, filePath) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	const { state, agent } = found;
	await refreshState(ctx, store, state);
	const snapshot = state.snapshot;
	if (!snapshot) throw new Error("project discovery is unavailable after refresh");
	const candidates = await projectPaths(state.projectRoot, currentDirectory(ctx, state, agent), filePath);
	if (!candidates.length) return {
		ok: true,
		filePath,
		projectPaths: [],
		rules: [],
		note: "outside the bound project; router file rules do not apply"
	};
	return {
		ok: true,
		filePath,
		projectPaths: candidates,
		results: candidates.map((candidate) => ({
			path: candidate,
			rules: diagnosePath(snapshot, candidate).map(({ rule, applies, reason }) => ({
				source: rule.sourcePath,
				area: rule.area,
				applies,
				reason
			}))
		})),
		note: "diagnosis does not add the path to the workset"
	};
}
async function updateRouterWorkset(ctx, store, states, sessionId, action, filePath) {
	const found = findLiveState(ctx, states, sessionId);
	if (!found) return {
		ok: false,
		status: 404,
		error: "session is not active in this DSH process"
	};
	try {
		return await found.agent.runMaintenance(async (signal) => {
			signal.throwIfAborted();
			const { state } = found;
			const previousPaths = state.activePaths;
			const paths = await projectPaths(state.projectRoot, currentDirectory(ctx, state, found.agent), filePath);
			state.activePaths = (await store.updateSession(sessionId, state.projectRoot, (session) => {
				const entries = new Map(state.activePaths.map((value) => [value.toLowerCase(), value]));
				if (action === "add") for (const value of paths) entries.set(value.toLowerCase(), value);
				else if (paths.includes(".")) entries.clear();
				else for (const value of paths) {
					const key = value.toLowerCase().replace(/\/$/, "");
					for (const existing of entries.keys()) if (existing === key || existing.startsWith(`${key}/`)) entries.delete(existing);
				}
				return {
					...session,
					activePaths: [...entries.values()]
				};
			})).state.activePaths;
			state.forceEmptyWorkset = false;
			await refreshState(ctx, store, state);
			const added = state.activePaths.filter((item) => !previousPaths.includes(item));
			const released = previousPaths.filter((item) => !state.activePaths.includes(item));
			await recordAudit(state, store, {
				event: "tool_call agents_router_paths",
				workset: `+added: [${added.join(", ")}] | -released: [${released.join(", ")}] | total: ${state.activePaths.length}`
			});
			state.invalidateSkills();
			return {
				ok: true,
				activePaths: state.activePaths,
				ignored: paths.length ? 0 : 1
			};
		});
	} catch (error) {
		if (!isTrulyIdle(found.agent)) return {
			ok: false,
			status: 409,
			error: "workset can only be changed from the UI while the session is truly idle"
		};
		throw error;
	}
}
// src/host/services/skillsProvider.ts
var PROVIDER_NAME = "agents-router-project";
var PROJECT_AGENTS_RANK = 200;
var noop = () => {};
/** Register this provider inside one Agent scope so its skills stay project-bound. */
async function registerSkillsProvider(agent, rootContext, projectRoot, store, reportDiagnostics = async () => []) {
	let invalidate = noop;
	await agent.ctx.inject(["skills"], (scope) => {
		scope.skills.registerProvider((control) => {
			invalidate = control.invalidate;
			let lastGood = [];
			return {
				name: PROVIDER_NAME,
				async list(options) {
					options.signal?.throwIfAborted();
					control.signal.throwIfAborted();
					const { settings } = await store.loadProjectSettings(projectRoot);
					const snapshot = await discoverProject(projectRoot, settings);
					await reportDiagnostics(snapshot.diagnostics);
					if (!snapshot.complete) return {
						candidates: lastGood,
						complete: false
					};
					const globalSkills = await rootContext.skills.list({
						cwd: projectRoot,
						signal: options.signal
					});
					options.signal?.throwIfAborted();
					const globalByName = /* @__PURE__ */ new Map();
					for (const skill of globalSkills) {
						const list = globalByName.get(skill.name) ?? [];
						list.push(skill);
						globalByName.set(skill.name, list);
					}
					const ownByName = /* @__PURE__ */ new Map();
					for (const skill of snapshot.skills) if (skill.enabled) {
						const list = ownByName.get(skill.name) ?? [];
						list.push(skill);
						ownByName.set(skill.name, list);
					}
					const conflicts = snapshot.skills.filter((skill) => skill.enabled && (globalByName.has(skill.name) || (ownByName.get(skill.name)?.length ?? 0) > 1));
					if (conflicts.length) await reportDiagnostics(conflicts.map((skill) => {
						const own = ownByName.get(skill.name) ?? [];
						const global = globalByName.get(skill.name) ?? [];
						const sources = [...own.length > 1 ? own.map((entry) => entry.sourcePath) : [], ...global.map((entry) => `${entry.provider ?? "another provider"}${entry.path ? ` (${entry.path})` : ""}`)];
						return {
							code: "skill-name-conflict",
							path: skill.sourcePath,
							message: `skill /${skill.name} conflicts with ${sources.join(", ")}; every project copy of this name is unavailable`,
							key: `skill-name-conflict:${skill.sourcePath}:${skill.name}:${sources.join("|")}`
						};
					}));
					const blocked = new Set(conflicts.map((skill) => skill.sourcePath));
					lastGood = snapshot.skills.filter((skill) => skill.enabled && !blocked.has(skill.sourcePath)).map((skill) => ({
						path: skill.filePath,
						name: skill.name,
						description: skill.description,
						...skill.whenToUse ? { whenToUse: skill.whenToUse } : {},
						invocation: skill.invocation,
						source: "project-agents",
						provider: PROVIDER_NAME,
						resourceBase: {
							kind: "directory",
							path: path.dirname(skill.filePath)
						},
						rank: PROJECT_AGENTS_RANK,
						locator: {
							name: skill.name,
							sourcePath: skill.sourcePath
						},
						...skill.metadata ? { metadata: skill.metadata } : {}
					}));
					return {
						candidates: lastGood,
						complete: true
					};
				},
				async get(candidate, options) {
					options.signal?.throwIfAborted();
					control.signal.throwIfAborted();
					if ((await rootContext.skills.list({
						cwd: projectRoot,
						signal: options.signal
					})).some((skill) => skill.name === candidate.name)) return void 0;
					const { settings } = await store.loadProjectSettings(projectRoot);
					const definition = await loadSkillDefinition(projectRoot, settings, candidate.locator);
					options.signal?.throwIfAborted();
					if (!definition) return void 0;
					return {
						path: definition.filePath,
						name: definition.name,
						description: definition.description,
						...definition.whenToUse ? { whenToUse: definition.whenToUse } : {},
						invocation: definition.invocation,
						source: "project-agents",
						provider: PROVIDER_NAME,
						resourceBase: {
							kind: "directory",
							path: path.dirname(definition.filePath)
						},
						content: definition.content,
						...definition.metadata ? { metadata: definition.metadata } : {}
					};
				}
			};
		});
	});
	return () => invalidate();
}
// src/host/services/auditStorage.ts
var MAX_LOG_ENTRIES = 200;
var MAX_LOG_BYTES = 262144;
var AuditStorage = class {
	store;
	constructor(store) {
		this.store = store;
	}
	async appendAuditLog(projectRoot, sessionId, entry) {
		const [{ settings: global }, { settings: project }] = await Promise.all([this.store.loadGlobalSettings(), this.store.loadProjectSettings(projectRoot)]);
		if (!global.globalLogging || !project.projectLogging || typeof entry !== "string" || entry.length === 0) return false;
		const file = this.store.auditFile(projectRoot, sessionId);
		return this.store.serial(file, async () => {
			await this.auditDirectory(true);
			let current = "";
			try {
				const info = await lstat(file);
				if (!info.isFile() || info.nlink !== 1) throw new Error("audit log path is not a private regular file");
				current = await readFile(file, "utf8");
			} catch (error) {
				if (error instanceof Error && error.code !== "ENOENT") throw error;
			}
			const blocks = `${current}${current ? "\n\n" : ""}## #${current ? current.split(/^## #/m).length : 1} [${(/* @__PURE__ */ new Date()).toISOString().slice(11, 19)}]\n${entry}`.split(/(?=^## #)/m).filter(Boolean);
			while (blocks.length > MAX_LOG_ENTRIES || Buffer.byteLength(blocks.join(""), "utf8") > MAX_LOG_BYTES) {
				if (blocks.length <= 1) {
					const firstBlock = blocks[0];
					if (firstBlock) blocks[0] = firstBlock.slice(-262144);
					break;
				}
				blocks.shift();
			}
			await this.writeAuditFile(file, blocks.join("").trimStart());
			return true;
		});
	}
	async readAuditLog(projectRoot, sessionId) {
		const directory = await this.auditDirectory(false);
		if (!directory) return "";
		const file = path.join(directory, path.basename(this.store.auditFile(projectRoot, sessionId)));
		try {
			const info = await lstat(file);
			if (!info.isFile() || info.nlink !== 1) throw new Error("audit log path is not a private regular file");
			return await readFile(file, "utf8");
		} catch (error) {
			if (error instanceof Error && error.code === "ENOENT") return "";
			throw error;
		}
	}
	deleteSessionAuditLog(projectRoot, sessionId) {
		return this.deleteAuditFiles((name) => name === path.basename(this.store.auditFile(projectRoot, sessionId)));
	}
	deleteProjectAuditLogs(projectRoot) {
		const prefix = `${this.store.projectId(projectRoot)}-`;
		return this.deleteAuditFiles((name) => name.startsWith(prefix) && name.endsWith(".log.md"));
	}
	deleteAllAuditLogs() {
		return this.deleteAuditFiles((name) => name.endsWith(".log.md"));
	}
	async deleteAuditFiles(match) {
		const directory = await this.auditDirectory(false);
		if (!directory) return 0;
		const files = await readdir(directory, { withFileTypes: true });
		let deleted = 0;
		for (const file of files) {
			if (!file.isFile() && !file.isSymbolicLink() || !match(file.name)) continue;
			await unlink(path.join(directory, file.name));
			deleted++;
		}
		return deleted;
	}
	async auditDirectory(create) {
		const store = this.store;
		let safeHome;
		try {
			safeHome = await realpath(store.home);
		} catch (error) {
			if (error instanceof Error && error.code !== "ENOENT" || !create) return void 0;
			await mkdir(store.home, {
				recursive: true,
				mode: 448
			});
			safeHome = await realpath(store.home);
		}
		let safeBase;
		try {
			safeBase = await realpath(store.base);
		} catch (error) {
			if (error instanceof Error && error.code !== "ENOENT" || !create) return void 0;
			await mkdir(store.base, {
				recursive: true,
				mode: 448
			});
			safeBase = await realpath(store.base);
		}
		const baseInfo = await lstat(store.base);
		if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, safeBase)) throw new Error("audit storage resolves outside DSH home");
		const directory = store.logsDirectory();
		if (create) await mkdir(directory, {
			recursive: true,
			mode: 448
		});
		let safeDirectory;
		try {
			safeDirectory = await realpath(directory);
		} catch (error) {
			if (error instanceof Error && error.code === "ENOENT") return void 0;
			throw error;
		}
		const directoryInfo = await lstat(directory);
		if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink() || !inside(safeHome, safeDirectory)) throw new Error("audit log directory resolves outside DSH home");
		return safeDirectory;
	}
	async writeAuditFile(file, text) {
		await this.auditDirectory(true);
		try {
			const info = await lstat(file);
			if (!info.isFile() || info.nlink !== 1) throw new Error("audit log path is not a private regular file");
		} catch (error) {
			if (error instanceof Error && error.code !== "ENOENT") throw error;
		}
		const temporary = `${file}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporary, text, {
				encoding: "utf8",
				flag: "wx",
				mode: 384
			});
			await rename(temporary, file);
		} catch (error) {
			try {
				await unlink(temporary);
			} catch (cleanupError) {
				if (cleanupError instanceof Error && cleanupError.code !== "ENOENT") throw cleanupError;
			}
			throw error;
		}
	}
};
// src/host/services/store.ts
var VERSION = 1;
var EMPTY_SESSION = (sessionId, projectRoot) => ({
	version: VERSION,
	sessionId,
	projectRoot,
	activePaths: [],
	seenDiagnostics: []
});
/** Plugin-owned data below DSH home; project roots are read-only instruction sources. */
var RouterStore = class {
	home;
	base;
	queues;
	auditStorage;
	constructor(dshHome = globalThis.process?.env?.DSH_HOME || path.join(os.homedir(), ".dsh")) {
		this.home = path.resolve(dshHome);
		this.base = path.join(this.home, "agents-router");
		this.queues = /* @__PURE__ */ new Map();
		this.auditStorage = new AuditStorage(this);
	}
	async loadGlobalSettings() {
		try {
			const record = await this.readJson(this.globalSettingsFile());
			const checked = validateGlobalSettings(record.settings);
			if (record.version !== VERSION || !checked.valid) throw new Error(checked.errors.join("; ") || "unsupported settings version");
			return {
				settings: checked.settings,
				warning: void 0
			};
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT") return {
				settings: DEFAULT_GLOBAL_SETTINGS,
				warning: void 0
			};
			return {
				settings: DEFAULT_GLOBAL_SETTINGS,
				warning: `global settings could not be restored: ${error instanceof Error ? error.message : String(error)}`
			};
		}
	}
	async saveGlobalSettings(input) {
		const checked = validateGlobalSettings(input);
		if (!checked.valid) return {
			saved: false,
			settings: (await this.loadGlobalSettings()).settings,
			errors: checked.errors
		};
		return this.serial("global-settings", async () => {
			await this.writeJson(this.globalSettingsFile(), {
				version: VERSION,
				settings: checked.settings
			});
			if (!checked.settings.globalLogging) await this.deleteAllAuditLogs();
			return {
				saved: true,
				settings: checked.settings,
				errors: []
			};
		});
	}
	async loadProjectSettings(projectRoot) {
		const file = this.projectFile(projectRoot);
		try {
			const record = await this.readJson(file);
			if (record.projectRoot !== projectRoot) throw new Error("stored project identity does not match");
			const checked = validateProjectSettings(record.settings);
			if (!checked.valid) throw new Error(checked.errors.join("; "));
			return {
				settings: checked.settings,
				warning: void 0
			};
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT") return {
				settings: DEFAULT_PROJECT_SETTINGS,
				warning: void 0
			};
			return {
				settings: DEFAULT_PROJECT_SETTINGS,
				warning: `project settings could not be restored: ${error instanceof Error ? error.message : String(error)}`
			};
		}
	}
	async saveProjectSettings(projectRoot, input) {
		const checked = validateProjectSettings(input);
		if (!checked.valid) return {
			saved: false,
			settings: (await this.loadProjectSettings(projectRoot)).settings,
			errors: checked.errors
		};
		return this.serial(`project:${this.projectId(projectRoot)}`, async () => {
			await this.writeJson(this.projectFile(projectRoot), {
				version: VERSION,
				projectRoot,
				settings: checked.settings
			});
			if (!checked.settings.projectLogging) await this.deleteProjectAuditLogs(projectRoot);
			return {
				saved: true,
				settings: checked.settings,
				errors: []
			};
		});
	}
	appendAuditLog(projectRoot, sessionId, entry) {
		return this.auditStorage.appendAuditLog(projectRoot, sessionId, entry);
	}
	readAuditLog(projectRoot, sessionId) {
		return this.auditStorage.readAuditLog(projectRoot, sessionId);
	}
	deleteSessionAuditLog(projectRoot, sessionId) {
		return this.auditStorage.deleteSessionAuditLog(projectRoot, sessionId);
	}
	deleteProjectAuditLogs(projectRoot) {
		return this.auditStorage.deleteProjectAuditLogs(projectRoot);
	}
	deleteAllAuditLogs() {
		return this.auditStorage.deleteAllAuditLogs();
	}
	async loadSession(sessionId, projectRoot) {
		try {
			const state = await this.readJson(this.sessionFile(sessionId));
			if (state.version !== VERSION || state.sessionId !== sessionId || state.projectRoot !== projectRoot) throw new Error("stored session identity does not match the current DSH session");
			return {
				state: normalizeSession(state, sessionId, projectRoot),
				warning: void 0,
				missing: false
			};
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT") return {
				state: EMPTY_SESSION(sessionId, projectRoot),
				warning: void 0,
				missing: true
			};
			const message = error instanceof Error ? error.message : String(error);
			return {
				state: EMPTY_SESSION(sessionId, projectRoot),
				warning: `session working set could not be restored: ${message}`,
				missing: false
			};
		}
	}
	async updateSession(sessionId, projectRoot, update) {
		return this.serial(`session:${this.sessionId(sessionId)}`, async () => {
			const { state, warning } = await this.loadSession(sessionId, projectRoot);
			const next = normalizeSession(await update(state), sessionId, projectRoot);
			await this.writeJson(this.sessionFile(sessionId), next);
			return {
				state: next,
				warning
			};
		});
	}
	async markDiagnostics(sessionId, projectRoot, diagnostics) {
		const fresh = [];
		await this.updateSession(sessionId, projectRoot, (state) => {
			const seen = new Set(state.seenDiagnostics);
			for (const item of diagnostics) {
				if (item.key === void 0 || !seen.has(item.key)) fresh.push(item);
				if (item.key !== void 0) seen.add(item.key);
			}
			return {
				...state,
				seenDiagnostics: [...seen].slice(-1e3)
			};
		});
		return fresh;
	}
	async resetSession(sessionId, projectRoot) {
		return this.updateSession(sessionId, projectRoot, (state) => ({
			...state,
			activePaths: []
		}));
	}
	projectId(projectRoot) {
		return hash(globalThis.process?.platform === "win32" ? projectRoot.toLowerCase() : projectRoot);
	}
	sessionId(sessionId) {
		if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]+$/.test(sessionId)) throw new Error("invalid DSH session id");
		return hash(sessionId);
	}
	projectFile(projectRoot) {
		return path.join(this.base, "projects", `${this.projectId(projectRoot)}.json`);
	}
	sessionFile(sessionId) {
		return path.join(this.base, "sessions", `${this.sessionId(sessionId)}.json`);
	}
	globalSettingsFile() {
		return path.join(this.base, "global-settings.json");
	}
	logsDirectory() {
		return path.join(this.base, "logs");
	}
	auditFile(projectRoot, sessionId) {
		return path.join(this.logsDirectory(), `${this.projectId(projectRoot)}-${this.sessionId(sessionId)}.log.md`);
	}
	async readJson(file) {
		const text = await readFile(file, "utf8");
		const value = JSON.parse(text);
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("sidecar JSON must be an object");
		return value;
	}
	async writeJson(file, value) {
		await mkdir(this.home, {
			recursive: true,
			mode: 448
		});
		const safeHome = await realpath(this.home);
		await mkdir(this.base, {
			recursive: true,
			mode: 448
		});
		let directory = this.base;
		const baseInfo = await lstat(directory);
		if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, await realpath(directory))) throw new Error("sidecar storage resolves outside DSH home");
		const subdirectory = path.relative(this.base, path.dirname(file));
		if (subdirectory.startsWith("..") || path.isAbsolute(subdirectory)) throw new Error("sidecar path is outside plugin storage");
		for (const segment of subdirectory.split(path.sep).filter(Boolean)) {
			directory = path.join(directory, segment);
			await mkdir(directory, {
				recursive: false,
				mode: 448
			}).catch((error) => {
				if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
			});
			const info = await lstat(directory);
			if (!info.isDirectory() || info.isSymbolicLink() || !inside(safeHome, await realpath(directory))) throw new Error("sidecar directory resolves outside DSH home");
		}
		const temporary = `${file}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
				encoding: "utf8",
				flag: "wx",
				mode: 384
			});
			await rename(temporary, file);
		} catch (error) {
			try {
				await unlink(temporary);
			} catch (cleanupError) {
				if (!(cleanupError instanceof Error && "code" in cleanupError && cleanupError.code === "ENOENT")) throw cleanupError;
			}
			throw error;
		}
	}
	serial(key, operation) {
		const current = (this.queues.get(key) ?? Promise.resolve()).then(operation, operation);
		this.queues.set(key, current.then(() => void 0, () => void 0));
		return current;
	}
};
function normalizeSession(value, sessionId, projectRoot) {
	if (!isStringArray(value.activePaths)) throw new Error("session sidecar has invalid active paths");
	if (!isStringArray(value.seenDiagnostics)) throw new Error("session sidecar has invalid diagnostic history");
	return {
		version: VERSION,
		sessionId,
		projectRoot,
		activePaths: [...new Map(value.activePaths.map((item) => [item.toLowerCase(), item])).values()],
		seenDiagnostics: value.seenDiagnostics.slice(-1e3)
	};
}
function isStringArray(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function hash(value) {
	return createHash("sha256").update(value).digest("hex");
}
// src/host/services/plugin.ts
var llmModuleName = "@deepseek-ai/dsh-llm";
var createUserMessage = (payload) => ({
	role: "user",
	content: payload.content,
	source: payload.source
});
try {
	const llmMod = await import(llmModuleName);
	if (typeof llmMod.createUserMessage === "function") createUserMessage = llmMod.createUserMessage;
} catch {}
var name = PLUGIN_ID;
var inject = [
	"agents",
	"tools",
	"skills",
	"systemPrompt",
	"workingDirectory",
	"sessionController"
];
function apply(ctx) {
	const store = new RouterStore();
	const states = /* @__PURE__ */ new Map();
	const pendingFeedback = /* @__PURE__ */ new Map();
	const initializeAgent = async ({ agent, source, signal }) => {
		try {
			signal?.throwIfAborted();
			const headerCwd = agent.session.header.cwd;
			if (typeof headerCwd !== "string" || headerCwd.length === 0) return;
			let projectRoot;
			try {
				projectRoot = await realpath(headerCwd);
				if (!(await stat(projectRoot)).isDirectory()) throw new Error("session project path is not a directory");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn(`agents-router: cannot bind session ${agent.session.id} to its project root: ${message}`);
				return;
			}
			const state = {
				agent,
				sessionId: agent.session.id,
				projectRoot,
				settings: DEFAULT_PROJECT_SETTINGS,
				activePaths: [],
				areaText: "",
				snapshot: void 0,
				rules: [],
				text: "",
				source,
				blockedRoots: /* @__PURE__ */ new Map(),
				runtimeDiagnostics: /* @__PURE__ */ new Map(),
				forceEmptyWorkset: false,
				auditRules: /* @__PURE__ */ new Map(),
				lastLoggedDiagKeys: /* @__PURE__ */ new Set(),
				invalidateSkills: () => {}
			};
			states.set(agent.id, state);
			if (source === "startup" || source === "clear") try {
				state.activePaths = (await store.resetSession(state.sessionId, projectRoot)).state.activePaths;
			} catch (error) {
				state.activePaths = [];
				state.forceEmptyWorkset = true;
				state.restoreWarning = `new-session workset reset could not be persisted: ${error instanceof Error ? error.message : String(error)}`;
			}
			else {
				const loaded = await store.loadSession(state.sessionId, projectRoot);
				if (loaded.warning) state.restoreWarning = loaded.warning;
				if (source === "resume" && loaded.missing) state.restoreWarning = "session workset was missing; restored as an empty project workset";
				state.activePaths = loaded.state.activePaths;
			}
			await refreshState(ctx, store, state);
			await recordAudit(state, store, {
				event: source === "clear" ? "reset" : `session_init (source="${source}")`,
				workset: state.activePaths.length ? `[${state.activePaths.join(", ")}]` : "[] (empty)",
				diagnostics: [...state.runtimeDiagnostics.values()].map((item) => ({
					...item,
					path: item.path ?? item.target ?? ""
				}))
			});
			agent.ctx.systemPrompt.context({
				name: AREA_CONTEXT,
				order: 140,
				text: () => state.areaText,
				required: true,
				interpolate: false
			});
			agent.ctx.systemPrompt.context({
				name: RULE_CONTEXT,
				order: 150,
				text: () => state.text,
				required: true,
				interpolate: false
			});
			agent.ctx.systemPrompt.section({
				name: USAGE_SECTION,
				order: 850,
				interpolate: false,
				text: "Project instructions are selected from the session project root and the current router workset. Use built-in file tools for project files; before a terminal or other opaque tool accesses project files, call agents_router_paths(action=\"add\", paths=[...]) first. If a file operation is denied because instructions were refreshed, read the current runtime context and re-plan; do not repeat the same call unchanged."
			});
			state.invalidateSkills = await registerSkillsProvider(agent, ctx, projectRoot, store, (items) => reportDiagnostics(ctx, store, state, items));
			agent.ctx.tools.register(createPathTool(ctx, store, state, {
				refreshState,
				currentDirectory
			}));
			agent.ctx.on("system-prompt/assemble", async (_assembly, _context, next) => {
				state.invalidateSkills();
				await refreshState(ctx, store, state);
				await recordAudit(state, store, {
					event: "prompt_assemble",
					workset: `unchanged (${state.activePaths.length} paths)`,
					diagnostics: [...state.runtimeDiagnostics.values()].map((item) => ({
						...item,
						path: item.path ?? item.target ?? ""
					}))
				});
				const result = await next();
				const texts = /* @__PURE__ */ new Map([[AREA_CONTEXT, state.areaText], [RULE_CONTEXT, state.text]]);
				const contexts = result.contexts.map((item) => {
					const text = texts.get(item.name);
					return text === void 0 ? item : {
						...item,
						text,
						interpolate: false
					};
				});
				for (const [contextName, text] of texts) if (text && !contexts.some((item) => item.name === contextName)) contexts.push({
					name: contextName,
					text,
					interpolate: false
				});
				return {
					...result,
					contexts
				};
			}, { prepend: true });
			agent.ctx.on("agent/pre-step", async (_payload, next) => {
				state.invalidateSkills();
				const decision = await next();
				if (decision.kind !== "enter" || !state.settings.redirectRootInstructionFiles || !state.snapshot?.areasConfigValid) return decision;
				const messages = filterRootInstructionMessages(decision.messages, state.settings.rootInstructionFileNames);
				return messages === decision.messages ? decision : {
					...decision,
					messages
				};
			}, { prepend: true });
		} catch (error) {
			if (signal?.aborted) return;
			const message = `plugin initialization failed: ${error instanceof Error ? error.message : String(error)}`;
			const state = states.get(agent?.id);
			if (state) {
				const item = {
					code: "initialization",
					path: state.projectRoot,
					message,
					key: `initialization:${state.projectRoot}:${message}`
				};
				state.runtimeDiagnostics.set(item.key, item);
				state.text = [state.text, `Router warning: ${message}`].filter(Boolean).join("\n\n");
				try {
					await reportDiagnostics(ctx, store, state, [item]);
				} catch {}
			}
			ctx.logger.error(`agents-router: ${message}`);
		}
	};
	ctx.on("agent/created", initializeAgent);
	ctx.on("agent/disposed", ({ agent }) => states.delete(agent.id));
	ctx.on("tools/pre-execute", createPreflightHook(ctx, store, states, pendingFeedback));
	ctx.on("tools/post-execute", async (exec, _result, next) => {
		const agentId = exec.agent?.id;
		const state = agentId === void 0 ? void 0 : states.get(agentId);
		const key = state ? feedbackKey(state.agent.id, exec.callId) : void 0;
		const notice = key === void 0 ? void 0 : pendingFeedback.get(key);
		if (key === void 0 || !notice) return next();
		pendingFeedback.delete(key);
		const decision = await next();
		const message = createUserMessage({
			content: [{
				type: "text",
				text: notice
			}],
			source: {
				kind: name,
				form: "notice",
				summary: "A project file operation was deferred until current rules were applied."
			}
		});
		return {
			...decision,
			additionalContexts: [...decision.additionalContexts ?? [], message]
		};
	});
	ctx.on("tools/result", (exec) => {
		const agentId = exec.agent?.id;
		const state = agentId === void 0 ? void 0 : states.get(agentId);
		if (state && exec.parent === void 0) state.blockedRoots.delete(exec.callId);
	});
	ctx.inject(["webServer"], (scope) => {
		const actions = {
			state: (sessionId) => readRouterState(ctx, store, states, sessionId),
			reinitialize: async (sessionId) => {
				const agent = ctx.agents.list().find((item) => item.session.id === sessionId);
				if (!agent) return {
					ok: false,
					status: 404,
					error: "session is not active in this DSH process"
				};
				if (!states.has(agent.id)) await initializeAgent({
					agent,
					source: "resume"
				});
				return readRouterState(ctx, store, states, sessionId);
			},
			saveSettings: (sessionId, settings) => saveRouterSettings(ctx, store, states, sessionId, settings),
			globalSettings: async () => ({ settings: { ...(await store.loadGlobalSettings()).settings } }),
			saveGlobalSettings: (settings) => store.saveGlobalSettings(settings).then((result) => result.saved ? {
				ok: true,
				settings: result.settings
			} : {
				ok: false,
				status: 400,
				error: result.errors.join("; ")
			}),
			audit: (sessionId) => readAuditLog(ctx, store, states, sessionId),
			deleteAudit: (sessionId) => deleteAuditLog(ctx, store, states, sessionId),
			refresh: (sessionId) => refreshRouterProject(ctx, store, states, sessionId),
			reset: (sessionId) => resetRouterWorkset(ctx, store, states, sessionId),
			diagnose: (sessionId, filePath) => diagnoseRouterPath(ctx, store, states, sessionId, filePath),
			openFile: async (sessionId, filePath) => {
				const agent = ctx.agents.list().find((item) => item.session.id === sessionId);
				if (!(agent === void 0 ? void 0 : states.get(agent.id))?.snapshot?.rules.some((rule) => rule.filePath === filePath)) return {
					ok: false,
					status: 404,
					error: "rule file is not available in this session"
				};
				if (!ctx.sessionController.canOpenWorkspacePath()) return {
					ok: false,
					status: 503,
					error: "workspace file opening is unavailable"
				};
				try {
					await ctx.sessionController.openWorkspacePath({
						path: filePath,
						action: "reveal"
					}, new AbortController().signal);
					return { ok: true };
				} catch (error) {
					return {
						ok: false,
						status: 500,
						error: error instanceof Error ? error.message : String(error)
					};
				}
			},
			workset: (sessionId, action, filePath) => updateRouterWorkset(ctx, store, states, sessionId, action, filePath)
		};
		scope.effect(() => scope.webServer.register({
			kind: "prefix",
			path: "/agents-router",
			handler: createRouterHandler(actions)
		}), "agents-router: web routes");
	});
}
export { AREA_CONTEXT, AREA_CONTEXT_ORDER, CLIENT_PLUGIN_ID, DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS, FILE_ERROR, PACKAGE_ID, PLUGIN_ID, PREFIX, RULE_CONTEXT, RULE_CONTEXT_ORDER, RouterLocalization, USAGE_SECTION, USAGE_SECTION_ORDER, apply, inject, isRecord, name, parseAreasConfig, validProjectFilter, validateGlobalSettings, validateProjectSettings };
