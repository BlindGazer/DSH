import { o as e, r as t, t as n } from "./remote-sbbk4JTm.js";
import { a as r, c as i, m as a, n as o, o as s, s as c, t as l } from "./service-mGzEzUp9.js";
import { Remote as u, RemoteError as d, TypertRemoteService as f } from "@deepseek-ai/dsh-typert-protocol";
import { isDeepStrictEqual as p } from "node:util";
// src/shared/failure.ts
function m(e) {
	return e ? e.message.includes("configuration changed") || e.message.includes("preview changed") || e.message.endsWith("(conflict)") ? "conflict" : e.message.includes("cannot be saved") || e.message.endsWith("(unavailable)") ? "unavailable" : e.message.endsWith("(internal)") ? "internal" : e.name === "ZodError" || "code" in e && e.code === "gateway/bad-request" ? "invalid" : "code" in e && (e.code === "gateway/invocation-unavailable" || e.code === "gateway/definition-unavailable") ? "unavailable" : e.message.startsWith("Logger path") || e.message.startsWith("path must") || e.message.includes("confirmation") ? "invalid" : "internal" : "internal";
}
// src/host/remote-service.ts
var h = Object.create, g = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, v = (e, t) => (t = Symbol[e]) ? t : /* @__PURE__ */ Symbol.for("Symbol." + e), y = (e) => {
	throw TypeError(e);
}, b = (e, t, n) => t in e ? g(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, x = (e, t) => g(e, "name", {
	value: t,
	configurable: !0
}), S = (e) => [
	,
	,
	,
	h(e?.[v("metadata")] ?? null)
], C = [
	"class",
	"method",
	"getter",
	"setter",
	"accessor",
	"field",
	"value",
	"get",
	"set"
], w = (e) => e !== void 0 && typeof e != "function" ? y("Function expected") : e, T = (e, t, n, r, i) => ({
	kind: C[e],
	name: t,
	metadata: r,
	addInitializer: (e) => n._ ? y("Already initialized") : i.push(w(e || null))
}), E = (e, t) => b(t, v("metadata"), e[3]), D = (e, t, n, r) => {
	for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++) t & 1 ? a[i].call(n) : r = a[i].call(n, r);
	return r;
}, O = (e, t, n, r, i, a) => {
	var o, s, c, l, u, d = t & 7, f = !!(t & 8), p = !!(t & 16), m = d > 3 ? e.length + 1 : d ? f ? 1 : 2 : 0, h = C[d + 5], v = d > 3 && (e[m - 1] = []), b = e[m] || (e[m] = []), S = d && (!p && !f && (i = i.prototype), d < 5 && (d > 3 || !p) && _(d < 4 ? i : {
		get [n]() {
			return j(this, a);
		},
		set [n](e) {
			return M(this, a, e);
		}
	}, n));
	d ? p && d < 4 && x(a, (d > 2 ? "set " : d > 1 ? "get " : "") + n) : x(i, n);
	for (var D = r.length - 1; D >= 0; D--) l = T(d, n, c = {}, e[3], b), d && (l.static = f, l.private = p, u = l.access = { has: p ? (e) => A(i, e) : (e) => n in e }, d ^ 3 && (u.get = p ? (e) => (d ^ 1 ? j : N)(e, i, d ^ 4 ? a : S.get) : (e) => e[n]), d > 2 && (u.set = p ? (e, t) => M(e, i, t, d ^ 4 ? a : S.set) : (e, t) => e[n] = t)), s = (0, r[D])(d ? d < 4 ? p ? a : S[h] : d > 4 ? void 0 : {
		get: S.get,
		set: S.set
	} : i, l), c._ = 1, d ^ 4 || s === void 0 ? w(s) && (d > 4 ? v.unshift(s) : d ? p ? a = s : S[h] = s : i = s) : typeof s != "object" || !s ? y("Object expected") : (w(o = s.get) && (S.get = o), w(o = s.set) && (S.set = o), w(o = s.init) && v.unshift(o));
	return d || E(e, i), S && g(i, n, S), p ? d ^ 4 ? a : S : i;
}, k = (e, t, n) => t.has(e) || y("Cannot " + n), A = (e, t) => Object(t) === t ? e.has(t) : y("Cannot use the \"in\" operator on this value"), j = (e, t, n) => (k(e, t, "read from private field"), n ? n.call(e) : t.get(e)), M = (e, t, n, r) => (k(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), N = (e, t, n) => (k(e, t, "access private method"), n), P, F, I, L, R, z = class extends (L = f, I = [u], F = [u], P = [u], L) {
	constructor(e, t) {
		super(e, "dshLoggerSettings", { namespace: "loggerSettings" }), this.handlers = t, D(R, 5, this);
	}
	handlers;
	read() {
		return this.run("read", () => this.handlers.read());
	}
	save(e) {
		return this.run("save", () => this.handlers.save(e));
	}
	previewPath(e) {
		return this.run("previewPath", () => this.handlers.previewPath(e));
	}
	async run(e, t) {
		try {
			return await t();
		} catch (t) {
			let n = `dsh-logger: ${e} failed (${m(t instanceof Error ? t : void 0)})`;
			throw console.error(n), this.ctx.logger.error(n), new d("gateway/bad-request", n, {});
		}
	}
};
R = S(L), O(R, 1, "read", I, z), O(R, 1, "save", F, z), O(R, 1, "previewPath", P, z), E(R, z);
// src/host/settings.ts
var B = /* @__PURE__ */ new Set([
	"@kalex/dsh-logger/host",
	"@kalex/dsh-logger",
	"./lib/host.js"
]), V = class {
	context;
	current;
	constructor(e, t) {
		this.context = e, this.current = t;
	}
	read = async () => {
		let e = this.context.get("dshLoggerService"), t = /* @__PURE__ */ new Set([...Object.keys(this.current.plugins ?? {}), ...e?.listPackageNames() ?? []]);
		return {
			config: n.parse(this.current),
			resolvedPath: s(this.current),
			packageNames: [...t].toSorted()
		};
	};
	previewPath = async (e) => {
		let { path: n } = t.parse(e), a = i(s({
			enabled: !1,
			...n ? { path: n } : {}
		}), void 0, { allowOutsideProfile: !0 }), o = s(this.current), { packageNames: c } = await this.read();
		return {
			path: a,
			...r(o, c, a)
		};
	};
	save = async (t) => {
		let l = e.parse(t), { path: u, ...d } = l.config, f = {
			...d,
			...u?.trim() ? { path: u.trim() } : {}
		};
		c(f);
		let m = s(this.current), h = s(f);
		if (m !== h && !l.confirmPathChange) throw Error("Logger path change requires confirmation");
		i(h, void 0, { allowOutsideProfile: l.confirmPathChange || h === m });
		let g = this.context.get("configEditor"), _ = this.context.fiber?.entry ?? g?.entries().find((e) => B.has(e.options.name));
		if (!g || !_) throw Error("Logger configuration cannot be saved");
		let v = (await this.read()).packageNames, y = this.context.get("dshLoggerService")?.listPackageNames() ?? [];
		if (m !== h) {
			let e = r(m, v, h);
			if (l.cleanupPaths === void 0 || !p([...new Set(l.cleanupPaths)].toSorted(), e.deleted.toSorted())) throw Error("Logger cleanup preview changed; preview the path again");
		}
		await g.edit(_, (e, t) => {
			let r = n.parse({
				...a(),
				...t,
				...e
			});
			if (!p(r, l.expectedConfig)) throw Error("Logger configuration changed; reload settings");
			return { ...f };
		}), this.current = f;
		let b;
		if (m !== h) try {
			o(m, !0, void 0, !0, v, h, l.cleanupPaths);
		} catch {
			let e = "dsh-logger: settings saved but old log cleanup failed";
			console.error(e), this.context.logger.error(e), b = "Logger settings saved, but old logs could not be fully removed";
		}
		let x = await this.read();
		return {
			...x,
			packageNames: [.../* @__PURE__ */ new Set([...y, ...x.packageNames])].toSorted(),
			...b ? { cleanupWarning: b } : {}
		};
	};
}, H = "dsh-logger", U = ["configEditor"], W = n, G = class {
	static inject = ["configEditor"];
	runtime;
	constructor(e, t = { enabled: !1 }) {
		this.runtime = new l({ config: t }), t.enabled && this.runtime.load(t, t.path !== void 0), e.provide?.("dshLoggerService", this), e.accessor?.("dshLogger", { get: function() {
			let e = this.get?.("dshLoggerService"), t = this.fiber?.name;
			if (!e || typeof t != "string") return { record: () => void 0 };
			let n = t.startsWith("@") ? t.split("/").slice(0, 2).join("/") : t.split("/")[0];
			return n ? e.getLogger({ packageName: n }, "host") : { record: () => void 0 };
		} }), e.effect?.(() => () => this.runtime.unload());
	}
	getLogger = (...e) => this.runtime.getLogger(...e);
	load = (e) => this.runtime.load(e);
	unload = () => this.runtime.unload();
	listPackageNames = () => this.runtime.listPackageNames();
};
function K(e, t = { enabled: !1 }) {
	new G(e, t), new z(e, new V(e, t));
}
export { H as a, U as i, G as n, K as r, W as t };
