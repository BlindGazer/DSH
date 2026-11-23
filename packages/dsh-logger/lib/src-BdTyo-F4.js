import { h as e, i as t, m as n, s as r } from "./service-mGzEzUp9.js";
// ../dsh-logger-core/src/factory.ts
function i(e, t) {
	let n = (n, r, i) => {
		t?.(n, r, i), e.record(i === void 0 ? {
			event: r,
			level: n
		} : {
			event: i.event ?? r,
			level: n,
			data: i
		});
	};
	return {
		debug: (e, t) => n("debug", e, t),
		info: (e, t) => n("info", e, t),
		warn: (e, t) => n("warn", e, t),
		error: (e, t) => n("error", e, t)
	};
}
function a(t, n) {
	let r = e;
	return t.inject?.(["dshLoggerService"], (t) => {
		r = t.dshLoggerService?.getLogger({ packageName: n }, "host") ?? e, t.effect(() => () => {
			r = e;
		}, "optional dsh-logger binding");
	}), { record: (e) => r.record(e) };
}
function o(t) {
	return i(t ?? e);
}
function s(t = {}, n) {
	return i(n ?? e, t.sink);
}
// src/host/config.ts
function c(e, t) {
	let n = e.plugins?.[t];
	return {
		enabled: e.enabled && (n?.enabled ?? !0),
		level: n?.level ?? e.level ?? "info",
		maxFileBytes: n?.maxFileBytes ?? e.maxFileBytes ?? 10485760,
		sanitizer: {
			keys: [.../* @__PURE__ */ new Set([...e.sanitizer?.keys ?? [], ...n?.sanitizer?.keys ?? []])],
			paths: [.../* @__PURE__ */ new Set([...e.sanitizer?.paths ?? [], ...n?.sanitizer?.paths ?? []])]
		}
	};
}
var l = class {
	current;
	constructor(e) {
		this.current = structuredClone(e ?? n()), r(this.current);
	}
	get = () => this.current;
	update = (e) => {
		r(e), this.current = structuredClone(e);
	};
	removePackagePolicy = (e) => {
		if (!t(e) || !this.current.plugins?.[e]) return;
		let n = { ...this.current.plugins };
		delete n[e], this.current = {
			...this.current,
			plugins: n
		};
	};
};
function u(e) {
	return e === "debug" || e === "info" || e === "warn" || e === "error";
}
export { o as a, s as i, u as n, a as o, c as r, l as t };
