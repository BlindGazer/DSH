import { closeSync as e, existsSync as t, fsyncSync as n, lstatSync as r, mkdirSync as i, openSync as a, readFileSync as o, readdirSync as s, realpathSync as c, renameSync as l, rmdirSync as u, statSync as d, unlinkSync as f, writeSync as p } from "node:fs";
import { homedir as m } from "node:os";
import { dirname as h, isAbsolute as g, join as _, relative as v, resolve as y, sep as b } from "node:path";
// ../dsh-logger-core/src/types.ts
var x = Object.freeze({ record: () => void 0 }), S = 10485760, C = "info";
function w() {
	return {
		enabled: !1,
		level: C,
		maxFileBytes: S,
		plugins: {}
	};
}
// src/shared/sanitize.ts
var T = [
	"token",
	"authorization",
	"cookie",
	"password",
	"secret",
	"credential",
	"api_key"
], E = 8, ee = 4096, te = "[Truncated]", D = "[Circular]";
function O(e, t = {}) {
	return k(e, 0, [], new Set([...T, ...t.keys ?? []].map((e) => e.toLowerCase().trim())), new Set(t.paths ?? []), /* @__PURE__ */ new WeakSet()) ?? null;
}
function k(e, t, n, r, i, a) {
	if (t > E) return te;
	if (e === void 0 || typeof e == "function" || typeof e == "symbol") return;
	if (e === null) return null;
	if (typeof e == "bigint") return "[BigInt]";
	if (e instanceof Error) return {
		name: j(e.name),
		message: j(e.message)
	};
	if (typeof e == "number") return Number.isFinite(e) ? Object.is(e, -0) ? 0 : e : null;
	if (typeof e == "string") return j(e);
	if (typeof e == "boolean") return e;
	if (typeof e != "object") return;
	if (a.has(e)) return D;
	if (a.add(e), Array.isArray(e)) {
		let o = [];
		for (let [s, c] of e.entries()) {
			let e = [...n, String(s)];
			if (i.has(e.join("."))) continue;
			let l = k(c, t + 1, e, r, i, a);
			l !== void 0 && o.push(l);
		}
		return a.delete(e), o;
	}
	let o = {};
	for (let s of Object.keys(e).toSorted()) {
		let c = [...n, s].join(".");
		if (A(s.toLowerCase(), r) || i.has(c)) continue;
		let l = k(e[s], t + 1, [...n, s], r, i, a);
		l !== void 0 && (o[s] = l);
	}
	return a.delete(e), o;
}
function A(e, t) {
	for (let n of t) if (n !== "" && e.includes(n)) return !0;
	return !1;
}
function j(e) {
	return Array.from(e).slice(0, ee).join("");
}
function M(e, t = {}) {
	return JSON.stringify(O(e, t));
}
// src/host/logger.ts
var N = 5e3, P = 3e4;
function F(e) {
	let t = e.config, n = t?.plugins?.[e.packageName];
	if (!t?.enabled || n?.enabled === !1) return x;
	let r = n?.maxFileBytes ?? t.maxFileBytes ?? 10485760, a = n?.level ?? t.level ?? "info", o = e.directory ?? t.path;
	if (!o) return x;
	try {
		i(o, { recursive: !0 });
	} catch {
		return x;
	}
	let s = _(o, `${e.packageName.replaceAll("/", "-")}.jsonl`);
	return { record(i) {
		try {
			if (!i.event || !z(i.level ?? "info", a)) return;
			let o = {
				event: i.event,
				level: i.level ?? "info",
				packageName: e.packageName,
				source: e.source,
				...i.phase ? { phase: i.phase } : {},
				...i.operation ? { operation: i.operation } : {},
				...i.data === void 0 ? {} : { data: O(i.data, B(t, n)) }
			}, c = `${JSON.stringify(o)}\n`;
			if (Buffer.byteLength(c) > r) {
				let e = ne(o, r);
				e !== void 0 && I(s, `${JSON.stringify(e)}\n`, r);
				return;
			}
			I(s, c, r);
		} catch {
			return;
		}
	} };
}
function ne(e, t) {
	let n = "[Truncated]", r = e.data;
	if (typeof r == "string") for (let i = r.length; i >= 0; --i) {
		let a = {
			...e,
			data: `${r.slice(0, i)}${n}`
		};
		if (Buffer.byteLength(JSON.stringify(a)) + 1 <= t) return a;
	}
	if (Array.isArray(r)) for (let i = r.length; i >= 0; --i) {
		let a = {
			...e,
			data: [...r.slice(0, i), n]
		};
		if (Buffer.byteLength(JSON.stringify(a)) + 1 <= t) return a;
	}
	if (typeof r == "object" && r && !Array.isArray(r)) {
		let i = Object.entries(r);
		for (let r = i.length; r >= 0; --r) {
			let a = {
				...e,
				data: {
					...Object.fromEntries(i.slice(0, r)),
					_truncated: n
				}
			};
			if (Buffer.byteLength(JSON.stringify(a)) + 1 <= t) return a;
		}
	}
	let i = {
		...e,
		data: n
	};
	return Buffer.byteLength(JSON.stringify(i)) <= t ? i : void 0;
}
function I(r, i, s) {
	let c = _(h(r), ".dsh-logger.lock"), u = re(c);
	if (u !== void 0) try {
		R(r);
		let c = (t(r) ? o(r, "utf8") : "").split("\n").filter(Boolean);
		c.push(i.trimEnd());
		let u = `${c.join("\n")}\n`;
		for (; Buffer.byteLength(u) > s && c.length > 1;) c.shift(), u = `${c.join("\n")}\n`;
		if (Buffer.byteLength(u) > s) return;
		let d = `${r}.tmp`, f;
		try {
			f = a(d, "w"), p(f, u, void 0, "utf8"), n(f);
		} finally {
			f !== void 0 && e(f);
		}
		l(d, r);
	} finally {
		try {
			e(u);
		} finally {
			try {
				f(c);
			} catch {}
		}
	}
}
function re(n) {
	let r = Date.now();
	for (; Date.now() - r < N;) try {
		let t = a(n, "wx");
		try {
			p(t, `${process.pid}\n`, void 0, "utf8");
		} catch (n) {
			throw e(t), n;
		}
		return t;
	} catch {
		if (t(n)) try {
			Date.now() - d(n).mtimeMs > P && !L(n) && f(n);
		} catch {}
	}
}
function L(e) {
	try {
		let t = Number(o(e, "utf8").trim());
		return !Number.isInteger(t) || t <= 0 ? !1 : (process.kill(t, 0), !0);
	} catch {
		return !1;
	}
}
function R(e) {
	let n = `${e}.tmp`;
	if (t(n)) {
		try {
			let r = o(n, "utf8");
			for (let e of r.split("\n").filter(Boolean)) JSON.parse(e);
			if (!t(e) || d(n).mtimeMs >= d(e).mtimeMs) {
				l(n, e);
				return;
			}
		} catch {}
		try {
			f(n);
		} catch {}
	}
}
function z(e, t) {
	let n = [
		"debug",
		"info",
		"warn",
		"error"
	];
	return n.indexOf(e) >= n.indexOf(t);
}
function B(e, t) {
	return {
		keys: [.../* @__PURE__ */ new Set([...e?.sanitizer?.keys ?? [], ...t?.sanitizer?.keys ?? []])],
		paths: [.../* @__PURE__ */ new Set([...e?.sanitizer?.paths ?? [], ...t?.sanitizer?.paths ?? []])]
	};
}
// src/host/service.ts
var V = class {
	active = !1;
	config;
	directory;
	profilePath;
	issued = /* @__PURE__ */ new Map();
	constructor(e = {}) {
		this.config = e.config ?? { enabled: !1 }, this.profilePath = e.profilePath ?? process.env.DSH_PROFILE_PATH ?? _(m(), ".dsh"), this.directory = U(this.config, this.profilePath);
	}
	load(e = this.config, t = !1) {
		let n = W(U(e, this.profilePath), this.profilePath, { allowOutsideProfile: t });
		this.config = e, this.directory = n, this.active = !0;
		for (let e of this.issued.values()) e.target = F({
			packageName: e.packageName,
			source: e.source,
			config: this.config,
			directory: this.directory
		});
	}
	listPackageNames() {
		return [...new Set([...this.issued.values()].map((e) => e.packageName))].toSorted();
	}
	unload() {
		this.active = !1;
		for (let e of this.issued.values()) e.target = x;
	}
	getLogger(e, t) {
		if (!e || typeof e.packageName != "string" || !H(e.packageName)) return x;
		let n = `${e.packageName}:${t}`, r = this.issued.get(n);
		if (r !== void 0) return { record: (e) => r.target.record(e) };
		let i = {
			target: x,
			packageName: e.packageName,
			source: t
		};
		return i.target = this.active ? F({
			packageName: e.packageName,
			source: t,
			config: this.config,
			directory: this.directory
		}) : x, this.issued.set(n, i), { record: (e) => i.target.record(e) };
	}
};
function H(e) {
	return e.length === 0 || e.length > 128 || X(e) ? !1 : /^[a-z0-9][a-z0-9._-]*$/u.test(e) || /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u.test(e);
}
function U(e, t) {
	let n = t ?? process.env.DSH_PROFILE_PATH ?? _(m(), ".dsh"), r = e.path ?? _(n, "dsh-logs");
	if (!g(r)) throw Error("Logger path must be absolute");
	return y(r);
}
function W(e, n, i = {}) {
	let a = y(n ?? process.env.DSH_PROFILE_PATH ?? _(m(), ".dsh")), o = U({
		enabled: !1,
		path: e
	}, a), s = q(a);
	if (!i.allowOutsideProfile && !J(s, o)) throw Error("Logger path escapes profile");
	if (i.allowOutsideProfile && t(o) && r(o).isSymbolicLink()) throw Error("Logger path cannot be symbolic link");
	let l = o;
	for (;;) {
		if (t(l)) {
			let e = r(l);
			if (e.isSymbolicLink()) throw Error("Logger path cannot be symbolic link");
			if (!e.isDirectory()) throw Error("Logger path must be a directory");
			let t = c(l);
			if (!i.allowOutsideProfile && !J(s, t)) throw Error("Logger path escapes profile");
			return t === o ? t : o;
		}
		let e = h(l);
		if (e === l) return o;
		l = e;
	}
}
function G(e, n, i, a = !1, o, l, d) {
	if (!n) throw Error("Logger cleanup requires confirmation");
	let p = W(e, i, { allowOutsideProfile: a });
	if (!t(p)) return;
	let h = r(p);
	if (!h.isDirectory() || h.isSymbolicLink()) return;
	let g = c(p), v = q(i ?? process.env.DSH_PROFILE_PATH ?? _(m(), ".dsh"));
	if (!a && !J(v, g)) throw Error("Logger path escapes profile");
	if (l !== void 0 && y(l) === p) return;
	let b = K(p, o, l, i).deleted.filter((e) => d === void 0 || d.includes(e));
	for (let e of b) {
		if (e === p || !t(e)) continue;
		let n = r(e);
		n.isFile() && !n.isSymbolicLink() && c(e) === e && Y(e) && f(e);
	}
	if (b.includes(p) && g !== v && s(g).length === 0) try {
		u(g);
	} catch (e) {
		if (!(e instanceof Error && "code" in e && (e.code === "ENOTEMPTY" || e.code === "EEXIST" || e.code === "ENOENT"))) throw e;
	}
}
function K(e, n, i, a) {
	let o = {
		controlled: 0,
		unknown: 0,
		deleted: [],
		preserved: []
	};
	if (!t(e)) return o;
	let l = r(e);
	if (!l.isDirectory() || l.isSymbolicLink()) return {
		...o,
		unknown: 1,
		preserved: [e]
	};
	let u = n?.map((e) => `${e.replaceAll("/", "-")}.jsonl`), d = i !== void 0 && y(i) === y(e), f = 0, p = 0;
	for (let t of s(e).toSorted()) {
		let n = _(e, t), i = r(n), a = (!u || u.includes(t)) && i.isFile() && !i.isSymbolicLink() && c(n) === n && Y(n);
		a ? f += 1 : p += 1, (a && !d ? o.deleted : o.preserved).push(n);
	}
	let g = y(a ?? process.env.DSH_PROFILE_PATH ?? _(m(), ".dsh")), v = i !== void 0 && J(y(e), y(i));
	return !d && !v && p === 0 && y(e) !== g && h(e) !== e && o.deleted.push(e), {
		...o,
		controlled: f,
		unknown: p
	};
}
function q(e) {
	if (!t(e)) return y(e);
	if (r(e).isSymbolicLink()) throw Error("Logger profile cannot be symbolic link");
	return c(e);
}
function J(e, t) {
	let n = v(e, t);
	return n === "" || !n.startsWith(`..${b}`) && n !== ".." && !g(n);
}
function Y(e) {
	if (!e.endsWith(".jsonl")) return !1;
	let t = e.slice(e.lastIndexOf(b) + 1), n = o(e, "utf8").split("\n").filter(Boolean);
	return n.length !== 0 && n.every((e) => {
		try {
			let n = JSON.parse(e);
			return typeof n.packageName == "string" && H(n.packageName) && `${n.packageName.replaceAll("/", "-")}.jsonl` === t;
		} catch {
			return !1;
		}
	});
}
function X(e) {
	return Array.from(e).some((e) => {
		let t = e.codePointAt(0);
		return t !== void 0 && (t < 32 || t === 127);
	});
}
function ie(e) {
	if (typeof e != "object" || !e) throw Error("config must be an object");
	let t = /* @__PURE__ */ new Set([
		"enabled",
		"level",
		"path",
		"maxFileBytes",
		"sanitizer",
		"plugins"
	]);
	if (Object.keys(e).some((e) => !t.has(e))) throw Error("Unknown config field");
	if (typeof e.enabled != "boolean") throw Error("enabled must be boolean");
	if (Z(e.level), e.path !== void 0 && !g(e.path)) throw Error("path must be absolute");
	if (Q(e.maxFileBytes), $(e.sanitizer), e.plugins !== void 0) {
		if (e.plugins === null || typeof e.plugins != "object") throw Error("plugins must be an object");
		for (let [t, n] of Object.entries(e.plugins)) {
			if (typeof n != "object" || !n) throw Error("Invalid package policy");
			if (Object.keys(n).some((e) => ![
				"enabled",
				"level",
				"maxFileBytes",
				"sanitizer"
			].includes(e))) throw Error("Unknown package policy field");
			if (!H(t)) throw Error("Invalid package name");
			if (typeof n.enabled != "boolean") throw Error("Invalid package policy enabled");
			Z(n.level), Q(n.maxFileBytes), $(n.sanitizer);
		}
	}
}
function Z(e) {
	if (e !== void 0 && e !== "debug" && e !== "info" && e !== "warn" && e !== "error") throw Error("Invalid log level");
}
function Q(e) {
	if (e !== void 0 && (!Number.isInteger(e) || e < 1024)) throw Error("maxFileBytes must be an integer >= 1024");
}
function $(e) {
	if (e === void 0) return;
	if (typeof e != "object" || !e) throw Error("Invalid sanitizer");
	if (Object.keys(e).some((e) => e !== "keys" && e !== "paths")) throw Error("Unknown sanitizer field");
	let t = e.keys ?? [], n = e.paths ?? [];
	if (t.length > 256 || n.length > 256) throw Error("Too many sanitizer rules");
	for (let e of t) if (e.length === 0 || e.length > 128 || X(e)) throw Error("Invalid sanitizer key");
	for (let e of n) if (!/^(?:[A-Za-z0-9_-]+|\d+)(?:\.(?:[A-Za-z0-9_-]+|\d+))*$/u.test(e)) throw Error("Invalid sanitizer path");
}
export { K as a, W as c, M as d, C as f, x as h, H as i, F as l, w as m, G as n, U as o, S as p, Y as r, ie as s, V as t, O as u };
