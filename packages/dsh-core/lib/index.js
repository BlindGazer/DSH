import { Fragment as e, Suspense as t, createElement as n, useEffect as r, useId as i, useRef as a, useState as o, useSyncExternalStore as s } from "react";
import { jsx as c, jsxs as l } from "react/jsx-runtime";
import { createPortal as u } from "react-dom";
// \0rolldown/runtime.js
var d = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), f = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}), p = (/* @__PURE__ */ d(((e, t) => {
	var n = Object.create, r = Object.defineProperty, i = Object.getOwnPropertyDescriptor, a = Object.getOwnPropertyNames, o = Object.getPrototypeOf, s = Object.prototype.hasOwnProperty, c = (e, t) => {
		for (var n in t) r(e, n, {
			get: t[n],
			enumerable: !0
		});
	}, l = (e, t, n, o) => {
		if (t && typeof t == "object" || typeof t == "function") for (let c of a(t)) !s.call(e, c) && c !== n && r(e, c, {
			get: () => t[c],
			enumerable: !(o = i(t, c)) || o.enumerable
		});
		return e;
	}, u = (e, t, i) => (i = e == null ? {} : n(o(e)), l(t || !e || !e.__esModule ? r(i, "default", {
		value: e,
		enumerable: !0
	}) : i, e)), d = (e) => l(r({}, "__esModule", { value: !0 }), e), p = {};
	c(p, {
		$dispatcherGuard: () => T,
		$makeReadOnly: () => D,
		$reset: () => E,
		$structuralCheck: () => P,
		c: () => b,
		clearRenderCounterRegistry: () => k,
		renderCounterRegistry: () => O,
		useRenderCounter: () => M
	}), t.exports = d(p);
	var m = u(f("react")), { useRef: h, useEffect: g, isValidElement: _ } = m, v = m.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ?? m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, y = Symbol.for("react.memo_cache_sentinel"), b = typeof m.__COMPILER_RUNTIME?.c == "function" ? m.__COMPILER_RUNTIME.c : function(e) {
		return m.useMemo(() => {
			let t = Array(e);
			for (let n = 0; n < e; n++) t[n] = y;
			return t[y] = !0, t;
		}, []);
	}, x = {};
	[
		"readContext",
		"useCallback",
		"useContext",
		"useEffect",
		"useImperativeHandle",
		"useInsertionEffect",
		"useLayoutEffect",
		"useMemo",
		"useReducer",
		"useRef",
		"useState",
		"useDebugValue",
		"useDeferredValue",
		"useTransition",
		"useMutableSource",
		"useSyncExternalStore",
		"useId",
		"unstable_isNewReconciler",
		"getCacheSignal",
		"getCacheForType",
		"useCacheRefresh"
	].forEach((e) => {
		x[e] = () => {
			throw Error(`[React] Unexpected React hook call (${e}) from a React compiled function. Check that all hooks are called directly and named according to convention ('use[A-Z]') `);
		};
	});
	var S = null;
	x.useMemoCache = (e) => {
		if (S == null) throw Error("React Compiler internal invariant violation: unexpected null dispatcher");
		return S.useMemoCache(e);
	};
	function C(e) {
		return v.ReactCurrentDispatcher.current = e, v.ReactCurrentDispatcher.current;
	}
	var w = [];
	function T(e) {
		let t = v.ReactCurrentDispatcher.current;
		if (e === 0) {
			if (w.push(t), w.length === 1 && (S = t), t === x) throw Error("[React] Unexpected call to custom hook or component from a React compiled function. Check that (1) all hooks are called directly and named according to convention ('use[A-Z]') and (2) components are returned as JSX instead of being directly invoked.");
			C(x);
		} else if (e === 1) {
			let e = w.pop();
			if (e == null) throw Error("React Compiler internal error: unexpected null in guard stack");
			w.length === 0 && (S = null), C(e);
		} else if (e === 2) w.push(t), C(S);
		else if (e === 3) {
			let e = w.pop();
			if (e == null) throw Error("React Compiler internal error: unexpected null in guard stack");
			C(e);
		} else throw Error("React Compiler internal error: unreachable block" + e);
	}
	function E(e) {
		for (let t = 0; t < e.length; t++) e[t] = y;
	}
	function D() {
		throw Error("TODO: implement $makeReadOnly in react-compiler-runtime");
	}
	var O = /* @__PURE__ */ new Map();
	function k() {
		for (let e of O.values()) e.forEach((e) => {
			e.count = 0;
		});
	}
	function A(e, t) {
		let n = O.get(e);
		n ?? (n = /* @__PURE__ */ new Set(), O.set(e, n)), n.add(t);
	}
	function j(e, t) {
		O.get(e)?.delete(t);
	}
	function M(e) {
		let t = h(null);
		t.current != null && (t.current.count += 1), g(() => {
			if (t.current == null) {
				let n = { count: 0 };
				A(e, n), t.current = n;
			}
			return () => {
				t.current !== null && j(e, t.current);
			};
		});
	}
	var N = /* @__PURE__ */ new Set();
	function P(e, t, n, r, i, a) {
		function o(e, t, o, s) {
			let c = `${r}:${a} [${i}] ${n}${o} changed from ${e} to ${t} at depth ${s}`;
			N.has(c) || (N.add(c), console.error(c));
		}
		function s(e, t, n, r) {
			if (!(r > 2) && e !== t) {
				if (typeof e != typeof t) o(`type ${typeof e}`, `type ${typeof t}`, n, r);
				else if (typeof e == "object") {
					let i = Array.isArray(e), a = Array.isArray(t);
					if (e === null && t !== null) o("null", `type ${typeof t}`, n, r);
					else if (t === null) o(`type ${typeof e}`, "null", n, r);
					else if (e instanceof Map) {
						if (!(t instanceof Map)) o("Map instance", "other value", n, r);
						else if (e.size !== t.size) o(`Map instance with size ${e.size}`, `Map instance with size ${t.size}`, n, r);
						else for (let [i, a] of e) t.has(i) ? s(a, t.get(i), `${n}.get(${i})`, r + 1) : o(`Map instance with key ${i}`, `Map instance without key ${i}`, n, r);
					} else if (t instanceof Map) o("other value", "Map instance", n, r);
					else if (e instanceof Set) {
						if (!(t instanceof Set)) o("Set instance", "other value", n, r);
						else if (e.size !== t.size) o(`Set instance with size ${e.size}`, `Set instance with size ${t.size}`, n, r);
						else for (let i of t) e.has(i) || o(`Set instance without element ${i}`, `Set instance with element ${i}`, n, r);
					} else if (t instanceof Set) o("other value", "Set instance", n, r);
					else if (i || a) {
						if (i !== a) o(`type ${i ? "array" : "object"}`, `type ${a ? "array" : "object"}`, n, r);
						else if (e.length !== t.length) o(`array with length ${e.length}`, `array with length ${t.length}`, n, r);
						else for (let i = 0; i < e.length; i++) s(e[i], t[i], `${n}[${i}]`, r + 1);
					} else if (_(e) || _(t)) _(e) === _(t) ? e.type === t.type ? s(e.props, t.props, `[props of ${n}]`, r + 1) : o(`React element of type ${e.type}`, `React element of type ${t.type}`, n, r) : o(`type ${_(e) ? "React element" : "object"}`, `type ${_(t) ? "React element" : "object"}`, n, r);
					else {
						for (let i in t) i in e || o(`object without key ${i}`, `object with key ${i}`, n, r);
						for (let i in e) i in t ? s(e[i], t[i], `${n}.${i}`, r + 1) : o(`object with key ${i}`, `object without key ${i}`, n, r);
					}
				} else if (typeof e == "function") return;
				else isNaN(e) || isNaN(t) ? isNaN(e) !== isNaN(t) && o(`${isNaN(e) ? "NaN" : "non-NaN value"}`, `${isNaN(t) ? "NaN" : "non-NaN value"}`, n, r) : e !== t && o(e, t, n, r);
			}
		}
		s(e, t, "", 0);
	}
	0 && (t.exports = {
		$dispatcherGuard: T,
		$makeReadOnly: D,
		$reset: E,
		$structuralCheck: P,
		c: b,
		clearRenderCounterRegistry: k,
		renderCounterRegistry: O,
		useRenderCounter: M
	});
})))(), m = { Common: {
	Loading: "dsh-common-loading",
	SelectTrigger: "dsh-select-trigger",
	SelectMenu: "dsh-select-menu",
	SelectOption: "dsh-select-option",
	Switch: "dsh-switch-control",
	Button: "dsh-button",
	IconButton: "dsh-icon-button",
	ModalBackdrop: "dsh-modal-backdrop",
	ModalCard: "dsh-modal-card",
	ModalClose: "dsh-modal-close",
	TabsList: "dsh-tabs-list",
	TabButton: "dsh-tab-button"
} };
// src/utils/classNames.ts
function h(...e) {
	return e.filter((e) => typeof e == "string" && e.trim().length > 0).join(" ");
}
// src/components/Button/Button.tsx
function g(e) {
	let t = (0, p.c)(13), { children: n, onClick: r, variant: i, size: a, disabled: o, title: s, ariaLabel: l, className: u, type: d } = e, f = i === void 0 ? "secondary" : i, g = a === void 0 ? "md" : a, _ = o !== void 0 && o, v = d === void 0 ? "button" : d, y = f === "primary" && "dsh-btn-primary", b = f === "danger" && "dsh-btn-danger", x = g === "sm" && "dsh-btn-sm ar-btn-sm", S;
	t[0] !== u || t[1] !== y || t[2] !== b || t[3] !== x ? (S = h("dsh-btn", y, b, x, u), t[0] = u, t[1] = y, t[2] = b, t[3] = x, t[4] = S) : S = t[4];
	let C;
	return t[5] !== l || t[6] !== n || t[7] !== _ || t[8] !== r || t[9] !== S || t[10] !== s || t[11] !== v ? (C = /* @__PURE__ */ c("button", {
		type: v,
		"data-testid": m.Common.Button,
		disabled: _,
		title: s,
		"aria-label": l,
		onClick: r,
		className: S,
		children: n
	}), t[5] = l, t[6] = n, t[7] = _, t[8] = r, t[9] = S, t[10] = s, t[11] = v, t[12] = C) : C = t[12], C;
}
// src/components/Button/IconButton.tsx
function _(e) {
	let t = (0, p.c)(9), { children: n, ariaLabel: r, title: i, onClick: a, disabled: o, className: s } = e, l = o !== void 0 && o, u = i ?? r, d;
	t[0] === s ? d = t[1] : (d = h("dsh-icon-btn", s), t[0] = s, t[1] = d);
	let f;
	return t[2] !== r || t[3] !== n || t[4] !== l || t[5] !== a || t[6] !== u || t[7] !== d ? (f = /* @__PURE__ */ c("button", {
		type: "button",
		"data-testid": m.Common.IconButton,
		"aria-label": r,
		title: u,
		disabled: l,
		onClick: a,
		className: d,
		children: n
	}), t[2] = r, t[3] = n, t[4] = l, t[5] = a, t[6] = u, t[7] = d, t[8] = f) : f = t[8], f;
}
// src/components/Loader/ProgressBar.tsx
function v(e) {
	let t = (0, p.c)(5), { label: n, className: r } = e, i = n === void 0 ? "Loading..." : n, a;
	t[0] === r ? a = t[1] : (a = h("dsh-progress-bar", r), t[0] = r, t[1] = a);
	let o;
	return t[2] !== i || t[3] !== a ? (o = /* @__PURE__ */ c("div", {
		role: "progressbar",
		"aria-label": i,
		"data-testid": m.Common.Loading,
		className: a
	}), t[2] = i, t[3] = a, t[4] = o) : o = t[4], o;
}
// src/components/Loader/Skeleton.tsx
function y(e) {
	let t = (0, p.c)(9), { width: n, height: r, markLoadingRoot: i, className: a } = e, o = n === void 0 ? "100%" : n, s = r === void 0 ? 32 : r, l = i === void 0 || i ? m.Common.Loading : void 0, u;
	t[0] !== s || t[1] !== o ? (u = {
		width: o,
		height: s
	}, t[0] = s, t[1] = o, t[2] = u) : u = t[2];
	let d;
	t[3] === a ? d = t[4] : (d = h("dsh-skeleton", a), t[3] = a, t[4] = d);
	let f;
	return t[5] !== l || t[6] !== u || t[7] !== d ? (f = /* @__PURE__ */ c("div", {
		"aria-busy": "true",
		"data-testid": l,
		style: u,
		className: d
	}), t[5] = l, t[6] = u, t[7] = d, t[8] = f) : f = t[8], f;
}
// src/components/Loader/Spinner.tsx
function b(e) {
	let t = (0, p.c)(6), { label: n, markLoadingRoot: r, className: i } = e, a = n === void 0 ? "Loading..." : n, o = r === void 0 || r ? m.Common.Loading : void 0, s;
	t[0] === i ? s = t[1] : (s = h("dsh-spinner", i), t[0] = i, t[1] = s);
	let l;
	return t[2] !== a || t[3] !== o || t[4] !== s ? (l = /* @__PURE__ */ c("span", {
		role: "status",
		"aria-label": a,
		"data-testid": o,
		className: s
	}), t[2] = a, t[3] = o, t[4] = s, t[5] = l) : l = t[5], l;
}
// src/components/Loader/ChildrenLazy.tsx
function x(e) {
	let n = (0, p.c)(6), { variant: r, loader: i, children: a } = e, o = r === void 0 ? "spinner" : r, s;
	n[0] !== i || n[1] !== o ? (s = i === void 0 ? c(o === "progress" ? v : o === "skeleton" ? y : b, {}) : i, n[0] = i, n[1] = o, n[2] = s) : s = n[2];
	let l = s, u;
	return n[3] !== a || n[4] !== l ? (u = /* @__PURE__ */ c(t, {
		fallback: l,
		children: a
	}), n[3] = a, n[4] = l, n[5] = u) : u = n[5], u;
}
// src/theme/palettes.ts
var S = {
	bgPage: "transparent",
	bgModal: "#1b1b1e",
	surface: "#1c1c1f",
	elevated: "#242428",
	hover: "#2c2c31",
	active: "#35353b",
	border: "rgba(255, 255, 255, 0.09)",
	borderStrong: "rgba(255, 255, 255, 0.16)",
	focusRing: "rgba(59, 130, 246, 0.45)",
	text: "#f2f2f5",
	muted: "#a1a1aa",
	tertiary: "#71717a",
	accent: "#3b82f6",
	accentHover: "#2563eb",
	onAccent: "#ffffff",
	primaryBg: "#f2f2f5",
	primaryFg: "#151517",
	switchOff: "rgba(255, 255, 255, 0.24)",
	switchOn: "#f2f2f5",
	switchThumbOff: "#a1a1aa",
	switchThumbOn: "#151517",
	info: "#60a5fa",
	infoSoft: "rgba(37, 99, 235, 0.16)",
	success: "#34d399",
	successSoft: "rgba(16, 185, 129, 0.16)",
	warning: "#fbbf24",
	warningSoft: "rgba(217, 119, 6, 0.16)",
	danger: "#ef4444",
	dangerSoft: "rgba(239, 68, 68, 0.12)",
	backdrop: "rgba(0, 0, 0, 0.6)",
	shadowElevated: "0 10px 28px rgba(0, 0, 0, 0.28)"
}, C = {
	bgPage: "transparent",
	bgModal: "#ffffff",
	surface: "#ffffff",
	elevated: "#f4f4f5",
	hover: "#e4e4e7",
	active: "#d4d4d8",
	border: "#e4e4e7",
	borderStrong: "#d4d4d8",
	focusRing: "rgba(37, 99, 235, 0.35)",
	text: "#0f1115",
	muted: "#52525b",
	tertiary: "#71717a",
	accent: "#2563eb",
	accentHover: "#1d4ed8",
	onAccent: "#ffffff",
	primaryBg: "#0f1115",
	primaryFg: "#ffffff",
	switchOff: "#d4d4d8",
	switchOn: "#0f1115",
	switchThumbOff: "#ffffff",
	switchThumbOn: "#ffffff",
	info: "#1d4ed8",
	infoSoft: "rgba(37, 99, 235, 0.1)",
	success: "#047857",
	successSoft: "rgba(5, 150, 105, 0.1)",
	warning: "#b45309",
	warningSoft: "rgba(180, 83, 9, 0.1)",
	danger: "#dc2626",
	dangerSoft: "rgba(220, 38, 38, 0.1)",
	backdrop: "rgba(0, 0, 0, 0.48)",
	shadowElevated: "0 10px 28px rgba(15, 17, 21, 0.14)"
}, w = /* @__PURE__ */ new Map([["dark", {
	id: "dark",
	baseMode: "dark",
	tokens: S
}], ["light", {
	id: "light",
	baseMode: "light",
	tokens: C
}]]), T = /* @__PURE__ */ new Set(), E = 0;
function D() {
	return E;
}
function O(e) {
	return T.add(e), () => {
		T.delete(e);
	};
}
function k(e) {
	w.set(e.id, e), E += 1, T.forEach((e) => {
		e();
	});
}
function A(e) {
	return w.get(e) ?? {
		id: "dark",
		baseMode: "dark",
		tokens: S
	};
}
function j() {
	return [...w.values()];
}
var M = [
	["bgPage", "--dsh-ui-bg-page"],
	["bgModal", "--dsh-ui-bg-modal"],
	["surface", "--dsh-ui-surface"],
	["elevated", "--dsh-ui-elevated"],
	["hover", "--dsh-ui-hover"],
	["active", "--dsh-ui-active"],
	["border", "--dsh-ui-border"],
	["borderStrong", "--dsh-ui-border-strong"],
	["focusRing", "--dsh-ui-focus-ring"],
	["text", "--dsh-ui-text"],
	["muted", "--dsh-ui-muted"],
	["tertiary", "--dsh-ui-tertiary"],
	["accent", "--dsh-ui-accent"],
	["accentHover", "--dsh-ui-accent-hover"],
	["onAccent", "--dsh-ui-on-accent"],
	["primaryBg", "--dsh-ui-primary-bg"],
	["primaryFg", "--dsh-ui-primary-fg"],
	["switchOff", "--dsh-ui-switch-off"],
	["switchOn", "--dsh-ui-switch-on"],
	["switchThumbOff", "--dsh-ui-switch-thumb-off"],
	["switchThumbOn", "--dsh-ui-switch-thumb-on"],
	["info", "--dsh-ui-info"],
	["infoSoft", "--dsh-ui-info-soft"],
	["success", "--dsh-ui-success"],
	["successSoft", "--dsh-ui-success-soft"],
	["warning", "--dsh-ui-warning"],
	["warningSoft", "--dsh-ui-warning-soft"],
	["danger", "--dsh-ui-danger"],
	["dangerSoft", "--dsh-ui-danger-soft"],
	["backdrop", "--dsh-ui-backdrop"],
	["shadowElevated", "--dsh-ui-shadow-elevated"]
];
function N(e, t) {
	let n = t ? {
		...e,
		...t
	} : e;
	return M.map(([e, t]) => `${t}:${n[e]}`).join(";");
}
// src/hooks/useEffectiveTheme.ts
var P = ".dsh-core-root, .ar-root, .ar-settings-root";
function F(e) {
	let t = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(e);
	if (t?.[1] && t[2] && t[3]) return {
		r: Number(t[1]),
		g: Number(t[2]),
		b: Number(t[3]),
		a: t[4] === void 0 ? 1 : Number(t[4])
	};
}
function I({ r: e, g: t, b: n }) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function L(e, t = P) {
	if (typeof document > "u") return "dark";
	let n = [];
	for (let r = e?.parentElement; r; r = r.parentElement) !r.matches(t) && r.matches("[data-theme], [data-color-scheme], .dark, .light") && n.push(r);
	document.documentElement && n.push(document.documentElement), document.body && n.push(document.body);
	for (let e of n) {
		let t = (e.getAttribute?.("data-theme") || e.getAttribute?.("data-color-scheme") || e.getAttribute?.("data-mode") || "").toLowerCase();
		if (t === "light" || t === "dark") return t;
		if (e.classList?.contains("light")) return "light";
		if (e.classList?.contains("dark")) return "dark";
		let n = typeof getComputedStyle == "function" ? getComputedStyle(e).colorScheme : "";
		if (n === "light" || n === "dark") return n;
	}
	let r = e?.parentElement || document.body;
	if (r && typeof getComputedStyle == "function") {
		for (let e = r; e; e = e.parentElement) {
			let t = F(getComputedStyle(e).backgroundColor);
			if (t && t.a > .2) return I(t) > 140 ? "light" : "dark";
		}
		if (document.body) {
			let e = F(getComputedStyle(document.body).color);
			if (e) return I(e) < 100 ? "light" : "dark";
		}
	}
	return typeof window < "u" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}
function R(e, t) {
	let n = (0, p.c)(8), i = e === void 0 ? "auto" : e, a;
	n[0] === i ? a = n[1] : (a = i !== "auto" && i.trim() !== "" ? A(i).id : void 0, n[0] = i, n[1] = a);
	let s = a, c;
	n[2] === s ? c = n[3] : (c = () => s ?? L(), n[2] = s, n[3] = c);
	let [l, u] = o(c), d, f;
	return n[4] !== s || n[5] !== t ? (d = () => {
		if (s) return;
		let e = () => {
			u(L(t?.current ?? void 0));
		}, n = typeof MutationObserver > "u" ? void 0 : new MutationObserver(e);
		if (typeof document < "u") for (let e of [document.documentElement, document.body].filter(Boolean)) n?.observe(e, {
			attributes: !0,
			attributeFilter: [
				"class",
				"style",
				"data-theme",
				"data-color-scheme",
				"data-mode"
			]
		});
		let r = typeof window < "u" ? window.matchMedia?.("(prefers-color-scheme: light)") : void 0;
		return r?.addEventListener?.("change", e), queueMicrotask(e), () => {
			n?.disconnect(), r?.removeEventListener?.("change", e);
		};
	}, f = [s, t], n[4] = s, n[5] = t, n[6] = d, n[7] = f) : (d = n[6], f = n[7]), r(d, f), s ?? l;
}
// src/components/Modal/Modal.tsx
function z(t) {
	let i = (0, p.c)(28), { open: o, onClose: s, title: u, headerExtra: d, closeLabel: f, theme: g, backdropClassName: _, cardClassName: v, children: y } = t, b = f === void 0 ? "Close" : f, x = R(g ?? "auto"), S = a(void 0), C = a(s), w, T;
	i[0] === s ? (w = i[1], T = i[2]) : (w = () => {
		C.current = s;
	}, T = [s], i[0] = s, i[1] = w, i[2] = T), r(w, T);
	let E, D;
	if (i[3] === o ? (E = i[4], D = i[5]) : (E = () => {
		if (!o || typeof document > "u") return;
		let e = document.activeElement, t = S.current, n = () => Array.from(t?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])") ?? []).filter(B), r = (e) => {
			if (e.key === "Escape") {
				C.current();
				return;
			}
			if (e.key !== "Tab" || !t) return;
			let r = n(), i = r[0], a = r.at(-1);
			!i || !a ? (e.preventDefault(), t.focus()) : e.shiftKey && (document.activeElement === i || !t.contains(document.activeElement)) ? (e.preventDefault(), a.focus()) : e.shiftKey || document.activeElement !== a && t.contains(document.activeElement) || (e.preventDefault(), i.focus());
		};
		return n()[0]?.focus(), document.addEventListener("keydown", r), () => {
			document.removeEventListener("keydown", r), e instanceof HTMLElement && e.isConnected && e.focus();
		};
	}, D = [o], i[3] = o, i[4] = E, i[5] = D), r(E, D), !o) {
		let t;
		return i[6] === Symbol.for("react.memo_cache_sentinel") ? (t = n(e), i[6] = t) : t = i[6], t;
	}
	let O;
	i[7] === _ ? O = i[8] : (O = h("dsh-modal-backdrop", "ar-modal", _), i[7] = _, i[8] = O);
	let k;
	i[9] === s ? k = i[10] : (k = /* @__PURE__ */ c("button", {
		type: "button",
		className: "dsh-modal-backdrop-control",
		"aria-hidden": "true",
		tabIndex: -1,
		onClick: s
	}), i[9] = s, i[10] = k);
	let A;
	i[11] === Symbol.for("react.memo_cache_sentinel") ? (A = (e) => {
		S.current = e ?? void 0;
	}, i[11] = A) : A = i[11];
	let j;
	i[12] === v ? j = i[13] : (j = h("dsh-modal-card", "ar-modal-card", v), i[12] = v, i[13] = j);
	let M;
	i[14] !== b || i[15] !== d || i[16] !== s || i[17] !== u ? (M = u !== void 0 || d !== void 0 ? /* @__PURE__ */ l("div", {
		className: "dsh-modal-header",
		children: [/* @__PURE__ */ c("div", {
			className: "dsh-modal-title",
			children: u
		}), /* @__PURE__ */ l("div", {
			className: "dsh-modal-actions ar-settings-header-right",
			children: [d, /* @__PURE__ */ c("button", {
				type: "button",
				"data-testid": m.Common.ModalClose,
				className: "dsh-btn dsh-btn-sm",
				"aria-label": b,
				onClick: s,
				children: b
			})]
		})]
	}) : void 0, i[14] = b, i[15] = d, i[16] = s, i[17] = u, i[18] = M) : M = i[18];
	let N;
	i[19] !== y || i[20] !== M || i[21] !== j ? (N = /* @__PURE__ */ l("div", {
		ref: A,
		role: "dialog",
		"aria-modal": "true",
		tabIndex: -1,
		"data-testid": m.Common.ModalCard,
		className: j,
		children: [M, y]
	}), i[19] = y, i[20] = M, i[21] = j, i[22] = N) : N = i[22];
	let P;
	return i[23] !== x || i[24] !== N || i[25] !== O || i[26] !== k ? (P = /* @__PURE__ */ l("div", {
		"data-theme": x,
		"data-testid": m.Common.ModalBackdrop,
		className: O,
		children: [k, N]
	}), i[23] = x, i[24] = N, i[25] = O, i[26] = k, i[27] = P) : P = i[27], P;
}
function B(e) {
	return !e.hasAttribute("hidden") && e.getAttribute("aria-hidden") !== "true";
}
// src/components/Progress/progressOptions.ts
function V(e) {
	return !e || e === "default" ? "var(--dsw-alias-label-tertiary)" : e === "accent" ? "var(--dsw-alias-button-info-fill)" : e;
}
// src/components/Progress/CircularProgress.tsx
function H(e) {
	let t = (0, p.c)(31), { value: n, label: r, size: i, color: a, className: o, title: s } = e, u = i === void 0 ? "standard" : i, d = a === void 0 ? "default" : a, f;
	t[0] === n ? f = t[1] : (f = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, t[0] = n, t[1] = f);
	let m = f, g = u === "small" ? 14 : 20, _ = g / 2, v = u === "small" ? 2 : 2.5, y = u === "small" ? 5.5 : _ - v / 2, b = 2 * Math.PI * y, x;
	t[2] === o ? x = t[3] : (x = h("dsh-circular-progress", o), t[2] = o, t[3] = x);
	let S = `0 0 ${g} ${g}`, C;
	t[4] === d ? C = t[5] : (C = V(d), t[4] = d, t[5] = C);
	let w;
	t[6] === C ? w = t[7] : (w = { "--dsh-progress-color": C }, t[6] = C, t[7] = w);
	let T = w, E = s ?? r, D;
	t[8] === E ? D = t[9] : (D = /* @__PURE__ */ c("title", { children: E }), t[8] = E, t[9] = D);
	let O;
	t[10] !== _ || t[11] !== y || t[12] !== v ? (O = /* @__PURE__ */ c("circle", {
		className: "dsh-circular-progress-track",
		cx: _,
		cy: _,
		r: y,
		strokeWidth: v
	}), t[10] = _, t[11] = y, t[12] = v, t[13] = O) : O = t[13];
	let k = `${b * m / 100} ${b}`, A = `rotate(-90 ${_} ${_})`, j;
	t[14] !== _ || t[15] !== y || t[16] !== v || t[17] !== k || t[18] !== A ? (j = /* @__PURE__ */ c("circle", {
		className: "dsh-circular-progress-fill",
		cx: _,
		cy: _,
		r: y,
		strokeWidth: v,
		strokeDasharray: k,
		transform: A
	}), t[14] = _, t[15] = y, t[16] = v, t[17] = k, t[18] = A, t[19] = j) : j = t[19];
	let M;
	return t[20] !== m || t[21] !== g || t[22] !== r || t[23] !== u || t[24] !== D || t[25] !== O || t[26] !== j || t[27] !== x || t[28] !== S || t[29] !== T ? (M = /* @__PURE__ */ l("svg", {
		className: x,
		"data-size": u,
		viewBox: S,
		width: g,
		height: g,
		role: "progressbar",
		"aria-label": r,
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-valuenow": m,
		style: T,
		children: [
			D,
			O,
			j
		]
	}), t[20] = m, t[21] = g, t[22] = r, t[23] = u, t[24] = D, t[25] = O, t[26] = j, t[27] = x, t[28] = S, t[29] = T, t[30] = M) : M = t[30], M;
}
// src/components/Progress/LinearProgress.tsx
function U(e) {
	let t = (0, p.c)(16), { value: n, label: r, size: i, color: a, className: o, title: s } = e, l = i === void 0 ? "standard" : i, u = a === void 0 ? "accent" : a, d;
	t[0] === n ? d = t[1] : (d = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, t[0] = n, t[1] = d);
	let f = d, m;
	t[2] === o ? m = t[3] : (m = h("dsh-linear-progress", o), t[2] = o, t[3] = m);
	let g = `${f}%`, _;
	t[4] === u ? _ = t[5] : (_ = V(u), t[4] = u, t[5] = _);
	let v;
	t[6] !== g || t[7] !== _ ? (v = {
		"--dsh-progress-value": g,
		"--dsh-progress-color": _
	}, t[6] = g, t[7] = _, t[8] = v) : v = t[8];
	let y = v, b;
	return t[9] !== f || t[10] !== r || t[11] !== l || t[12] !== m || t[13] !== y || t[14] !== s ? (b = /* @__PURE__ */ c("div", {
		className: m,
		"data-size": l,
		role: "progressbar",
		"aria-label": r,
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-valuenow": f,
		title: s,
		style: y
	}), t[9] = f, t[10] = r, t[11] = l, t[12] = m, t[13] = y, t[14] = s, t[15] = b) : b = t[15], b;
}
// src/components/SwitchControl/SwitchControl.tsx
function W(e) {
	let t = (0, p.c)(14), { checked: n, onChange: r, disabled: i, labelledBy: a, ariaLabel: o, className: s } = e, l = i !== void 0 && i, u;
	t[0] === s ? u = t[1] : (u = h("dsh-switch", "ar-settings-switch", s), t[0] = s, t[1] = u);
	let d;
	t[2] !== n || t[3] !== l || t[4] !== r ? (d = () => {
		l || r(!n);
	}, t[2] = n, t[3] = l, t[4] = r, t[5] = d) : d = t[5];
	let f;
	t[6] === Symbol.for("react.memo_cache_sentinel") ? (f = /* @__PURE__ */ c("span", {}), t[6] = f) : f = t[6];
	let g;
	return t[7] !== o || t[8] !== n || t[9] !== l || t[10] !== a || t[11] !== u || t[12] !== d ? (g = /* @__PURE__ */ c("button", {
		type: "button",
		role: "switch",
		"data-testid": m.Common.Switch,
		"aria-labelledby": a,
		"aria-label": o,
		"aria-checked": n,
		disabled: l,
		className: u,
		onClick: d,
		children: f
	}), t[7] = o, t[8] = n, t[9] = l, t[10] = a, t[11] = u, t[12] = d, t[13] = g) : g = t[13], g;
}
// src/components/Tabs/Tabs.tsx
function G(e) {
	let t = (0, p.c)(15), { items: n, activeValue: r, onChange: i, ariaLabel: a, className: o, tabClassName: s } = e, l;
	t[0] === o ? l = t[1] : (l = h("dsh-tabs", "ar-tabs", o), t[0] = o, t[1] = l);
	let u;
	if (t[2] !== r || t[3] !== n || t[4] !== i || t[5] !== s) {
		let e;
		t[7] !== r || t[8] !== i || t[9] !== s ? (e = (e) => {
			let t = e.value === r;
			return /* @__PURE__ */ c("button", {
				type: "button",
				role: "tab",
				"data-testid": m.Common.TabButton,
				"aria-selected": t,
				disabled: e.disabled,
				className: h("dsh-tab", "ar-tab", t && "active", s),
				onClick: () => {
					!e.disabled && e.value !== r && i(e.value);
				},
				children: e.label
			}, e.value);
		}, t[7] = r, t[8] = i, t[9] = s, t[10] = e) : e = t[10], u = n.map(e), t[2] = r, t[3] = n, t[4] = i, t[5] = s, t[6] = u;
	} else u = t[6];
	let d;
	return t[11] !== a || t[12] !== l || t[13] !== u ? (d = /* @__PURE__ */ c("div", {
		role: "tablist",
		"aria-label": a,
		"data-testid": m.Common.TabsList,
		className: l,
		children: u
	}), t[11] = a, t[12] = l, t[13] = u, t[14] = d) : d = t[14], d;
}
var K = {
	scope: "_scope_nqc75_2",
	"dsh-pulse": "_dsh-pulse_nqc75_1",
	"dsh-spin": "_dsh-spin_nqc75_328"
}, q = "._scope_nqc75_2{--dsh-style-scope:1}.dsh-select,.ar-themed-select{flex:0 220px;width:220px;min-width:0;max-width:100%;position:relative}.dsh-select-full{flex:auto;width:100%}.dsh-select-trigger,.ar-themed-select-trigger{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:100%;height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;text-align:left;cursor:pointer;border-radius:6px;justify-content:space-between;align-items:center;gap:10px;padding:0 10px;font-size:12px;transition:background-color .15s,border-color .15s,box-shadow .15s;display:flex}.dsh-select-trigger:hover:not(:disabled),.ar-themed-select-trigger:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-select-trigger:focus-visible,.ar-themed-select-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-select-trigger:disabled,.ar-themed-select-trigger:disabled{opacity:.55;cursor:not-allowed}.dsh-select-label,.ar-themed-select-trigger span:first-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dsh-select-menu,.ar-themed-select-menu{z-index:30;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);max-height:220px;box-shadow:var(--dsh-ui-shadow-elevated);border-radius:8px;padding:4px;position:absolute;top:calc(100% + 4px);left:0;right:0;overflow:auto}.dsh-select-option,.ar-themed-select-menu button{width:100%;min-height:30px;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:12px;transition:background-color .12s;display:flex;color:var(--dsh-ui-text)!important}.dsh-select-option:hover,.dsh-select-option.active,.ar-themed-select-menu button:hover,.ar-themed-select-menu button.active{background:var(--dsh-ui-hover);color:var(--dsh-ui-text)!important}.dsh-switch,.ar-settings-switch{background:var(--dsh-ui-switch-off);cursor:pointer;border:0;border-radius:999px;align-items:center;width:36px;height:20px;padding:2px;transition:background-color .16s;display:inline-flex;position:relative}.dsh-switch[aria-checked=true],.ar-settings-switch[aria-checked=true]{background:var(--dsh-ui-switch-on)}.dsh-switch:disabled,.ar-settings-switch:disabled{opacity:.5;cursor:not-allowed}.dsh-switch span,.ar-settings-switch span{background:var(--dsh-ui-switch-thumb-off);border-radius:50%;width:16px;height:16px;transition:transform .16s,background-color .16s;display:block}.dsh-switch[aria-checked=true] span,.ar-settings-switch[aria-checked=true] span{background:var(--dsh-ui-switch-thumb-on);transform:translate(16px)}.dsh-checkbox,.dsh-core-root input[type=checkbox]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}.dsh-checkbox:focus-visible,.dsh-core-root input[type=checkbox]:focus-visible{outline:2px solid var(--dsh-ui-accent);outline-offset:2px}.dsh-checkbox:disabled,.dsh-core-root input[type=checkbox]:disabled{cursor:not-allowed;opacity:.55}.dsh-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;white-space:nowrap;cursor:pointer;border-radius:6px;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,border-color .15s;display:inline-flex}.dsh-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-btn:disabled{opacity:.55;cursor:not-allowed}.dsh-btn-primary{background:var(--dsh-ui-primary-bg);color:var(--dsh-ui-primary-fg);border-color:#0000}.dsh-btn-primary:hover:not(:disabled){background:color-mix(in srgb, var(--dsh-ui-primary-bg) 90%, var(--dsh-ui-primary-fg));color:var(--dsh-ui-primary-fg)}.dsh-btn-danger{color:var(--dsh-ui-danger);border-color:var(--dsh-ui-danger-soft);background:var(--dsh-ui-danger-soft)}.dsh-btn-sm{height:28px;min-height:28px;padding:0 10px;font-size:11px}.dsh-icon-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:32px;min-width:32px;height:32px;min-height:32px;color:var(--dsh-ui-text);cursor:pointer;border-radius:6px;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:background-color .15s;display:inline-flex}.dsh-icon-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-tabs{border:1px solid var(--dsh-ui-border);background:var(--dsh-ui-elevated);border-radius:8px;align-items:center;gap:4px;width:fit-content;max-width:100%;padding:3px;display:inline-flex}.dsh-tab{height:28px;color:var(--dsh-ui-muted);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #0000;border-radius:6px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:inline-flex}.dsh-tab.active{background:var(--dsh-ui-surface);color:var(--dsh-ui-text);border-color:var(--dsh-ui-border-strong)}.dsh-modal-backdrop{z-index:1000;background:var(--dsh-ui-backdrop);place-items:center;padding:16px;display:grid;position:fixed;inset:0;overflow:auto}.dsh-modal-backdrop-control{background:0 0;border:0;width:100%;height:100%;padding:0;position:absolute;inset:0}.dsh-modal-card{z-index:1;background:var(--dsh-ui-bg-modal);width:min(760px,100%);max-height:calc(100dvh - 32px);color:var(--dsh-ui-text);border:1px solid var(--dsh-ui-border-strong);box-shadow:var(--dsh-ui-shadow-elevated);border-radius:10px;position:relative;overflow:auto}.dsh-modal-header{border-bottom:1px solid var(--dsh-ui-border);justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;display:flex}.dsh-modal-title{overflow-wrap:anywhere;flex:auto;min-width:0;font-size:18px;font-weight:600;line-height:24px}.dsh-modal-actions{flex:none;align-items:center;gap:8px;display:flex}@keyframes _dsh-pulse_nqc75_1{0%,to{opacity:.55}50%{opacity:.9}}@keyframes _dsh-spin_nqc75_328{to{transform:rotate(360deg)}}.dsh-skeleton{background:var(--dsh-ui-elevated);border-radius:6px;animation:1.4s ease-in-out infinite dsh-pulse;display:block}.dsh-spinner{border:2px solid var(--dsh-ui-border-strong);border-top-color:var(--dsh-ui-accent);border-radius:50%;width:14px;height:14px;animation:.75s linear infinite dsh-spin;display:inline-block}.dsh-progress-bar{background:var(--dsh-ui-elevated);border-radius:999px;width:100%;height:3px;position:relative;overflow:hidden}.dsh-progress-bar:after{content:\"\";background:var(--dsh-ui-accent);animation:1.1s ease-in-out infinite dsh-pulse;position:absolute;inset:0}.dsh-linear-progress{background:var(--dsw-alias-border-l3);border-radius:999px;width:100%;height:6px;position:relative;overflow:hidden}.dsh-linear-progress[data-size=small]{height:4px}.dsh-linear-progress:before{content:\"\";width:var(--dsh-progress-value,0%);border-radius:inherit;background:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));transition:width .16s;position:absolute;inset:0 auto 0 0}.dsh-circular-progress{flex:none;display:block;overflow:visible}.dsh-circular-progress-track{fill:none;stroke:var(--dsw-alias-border-l3)}.dsh-circular-progress-fill{fill:none;stroke:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));stroke-linecap:round}.dsh-tooltip{flex:none;align-items:center;display:inline-flex}.dsh-tooltip-trigger{appearance:none;border-radius:var(--dsw-radius-sm);color:inherit;font:inherit;text-align:inherit;cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;margin:0;padding:0;display:inline-flex}.dsh-tooltip-trigger:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill);outline-offset:2px}.dsh-tooltip-content{z-index:1100;box-sizing:border-box;width:min(264px,100vw - 24px);max-width:calc(100vw - 24px);max-height:calc(100dvh - 12px - max(12px, var(--dsh-frame-overlay-top,12px)));border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);min-height:0;-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;white-space:normal;position-area:none;top:max(12px, var(--dsh-frame-overlay-top,12px));bottom:max(12px, anchor(top) + 8px);left:max(12px, anchor(left));position-try-fallbacks:--dsh-core-tooltip-window, --dsh-core-tooltip-opposite, --dsh-core-tooltip-wide-opposite, --dsh-core-tooltip-tall, --dsh-core-tooltip-viewport;border:0;place-self:end start;height:fit-content;margin:0;padding:12px;font-size:12px;line-height:20px;position:fixed;right:12px;overflow:hidden auto}@position-try --dsh-core-tooltip-window{}@position-try --dsh-core-tooltip-opposite{}@position-try --dsh-core-tooltip-wide-opposite{}@position-try --dsh-core-tooltip-tall{}@position-try --dsh-core-tooltip-viewport{}", J = "kalex-dsh-core-theme-styles", ee = K.scope;
function Y(e = [
	".dsh-core-root",
	".ar-root",
	".ar-settings-root"
]) {
	let t = e.join(","), n = N(A("dark").tokens), r = e.map((e) => `${e}[data-theme="light"]`).join(","), i = N(A("light").tokens), a = j();
	return `${t}{${n}}\n${r}{${i}}\n${(Array.isArray(a) ? a : []).filter((e) => e.id !== "dark" && e.id !== "light").map((t) => `${e.map((e) => `${e}[data-theme="${t.id}"]`).join(",")}{${N(t.tokens)}}`).join("\n")}\n${q}`;
}
var te = Y(), ne = /* @__PURE__ */ new Map(), X = !1;
function Z() {
	if (typeof document < "u") for (let [e, t] of ne) {
		let n = document.getElementById(e);
		n && (n.textContent = t ? `${Y()}\n${t}` : Y());
	}
}
function re(e = J, t) {
	if (typeof document > "u" || !document.head) return;
	ne.set(e, t);
	let n = document.getElementById(e);
	n || (n = document.createElement("style"), n.id = e, document.head.appendChild(n)), n.textContent = t ? `${Y()}\n${t}` : Y(), X ||= (O(Z), !0);
}
// src/components/ThemedSelect/ThemedSelect.tsx
function Q(e) {
	let t = (0, p.c)(54), { value: n, options: i, onChange: s, ariaLabel: u, disabled: d, fullWidth: f, showCheckmark: g, className: _, triggerClassName: v, menuClassName: y, optionClassName: b } = e, x = d !== void 0 && d, S = f !== void 0 && f, C = g !== void 0 && g, w = a(void 0), [T, E] = o(!1), D;
	if (t[0] !== i || t[1] !== n) {
		let e;
		t[3] === n ? e = t[4] : (e = (e) => e.value === n, t[3] = n, t[4] = e), D = i.findIndex(e), t[0] = i, t[1] = n, t[2] = D;
	} else D = t[2];
	let O = Math.max(D, 0), [k, A] = o(O), j = i[O], M, N;
	t[5] === T ? (M = t[6], N = t[7]) : (M = () => {
		if (!T || typeof document > "u") return;
		let e = (e) => {
			let t = e.target;
			w.current && t && !w.current.contains(t) && E(!1);
		};
		return document.addEventListener("mousedown", e, !0), () => {
			document.removeEventListener("mousedown", e, !0);
		};
	}, N = [T], t[5] = T, t[6] = M, t[7] = N), r(M, N);
	let P;
	t[8] === i.length ? P = t[9] : (P = (e) => {
		i.length !== 0 && A((t) => (t + e + i.length) % i.length);
	}, t[8] = i.length, t[9] = P);
	let F = P, I;
	t[10] !== k || t[11] !== x || t[12] !== F || t[13] !== s || t[14] !== T || t[15] !== i || t[16] !== O ? (I = (e) => {
		if (!(x || i.length === 0)) {
			if (e.key === "Escape") E(!1);
			else if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault(), T ? F(e.key === "ArrowDown" ? 1 : -1) : (A(O), E(!0));
			else if (e.key === "Enter") {
				if (e.preventDefault(), !T) A(O), E(!0);
				else {
					let e = i[k];
					e && !e.disabled && (s(e.value), E(!1));
				}
			}
		}
	}, t[10] = k, t[11] = x, t[12] = F, t[13] = s, t[14] = T, t[15] = i, t[16] = O, t[17] = I) : I = t[17];
	let L = I, R;
	t[18] === Symbol.for("react.memo_cache_sentinel") ? (R = (e) => {
		w.current = e ?? void 0;
	}, t[18] = R) : R = t[18];
	let z = S && "dsh-select-full", B;
	t[19] !== _ || t[20] !== z ? (B = h(ee, "dsh-select", "ar-themed-select", z, _), t[19] = _, t[20] = z, t[21] = B) : B = t[21];
	let V;
	t[22] === v ? V = t[23] : (V = h("dsh-select-trigger", "ar-themed-select-trigger", v), t[22] = v, t[23] = V);
	let H;
	t[24] !== x || t[25] !== O ? (H = () => {
		x || (A(O), E(ie));
	}, t[24] = x, t[25] = O, t[26] = H) : H = t[26];
	let U = j?.label ?? "", W;
	t[27] === U ? W = t[28] : (W = /* @__PURE__ */ c("span", {
		className: "dsh-select-label",
		children: U
	}), t[27] = U, t[28] = W);
	let G = T ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6", K;
	t[29] === G ? K = t[30] : (K = /* @__PURE__ */ c("svg", {
		width: 14,
		height: 14,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: /* @__PURE__ */ c("path", { d: G })
	}), t[29] = G, t[30] = K);
	let q;
	t[31] !== u || t[32] !== x || t[33] !== L || t[34] !== T || t[35] !== V || t[36] !== H || t[37] !== W || t[38] !== K ? (q = /* @__PURE__ */ l("button", {
		type: "button",
		"data-testid": m.Common.SelectTrigger,
		className: V,
		"aria-label": u,
		"aria-haspopup": "listbox",
		"aria-expanded": T,
		disabled: x,
		onKeyDown: L,
		onClick: H,
		children: [W, K]
	}), t[31] = u, t[32] = x, t[33] = L, t[34] = T, t[35] = V, t[36] = H, t[37] = W, t[38] = K, t[39] = q) : q = t[39];
	let J;
	t[40] !== k || t[41] !== u || t[42] !== y || t[43] !== s || t[44] !== T || t[45] !== b || t[46] !== i || t[47] !== O || t[48] !== C ? (J = T ? /* @__PURE__ */ c("div", {
		role: "listbox",
		"aria-label": u,
		"data-testid": m.Common.SelectMenu,
		className: h("dsh-select-menu", "ar-themed-select-menu", y),
		children: i.map((e, t) => {
			let n = t === O, r = t === k;
			return /* @__PURE__ */ l("button", {
				type: "button",
				role: "option",
				"data-testid": m.Common.SelectOption,
				"aria-selected": n,
				disabled: e.disabled,
				className: h("dsh-select-option", (r || n) && "active", b),
				onMouseEnter: () => A(t),
				onClick: () => {
					e.disabled || (s(e.value), E(!1));
				},
				children: [/* @__PURE__ */ c("span", { children: e.label }), C && n ? /* @__PURE__ */ c("span", {
					"aria-hidden": "true",
					children: "✓"
				}) : void 0]
			}, e.value);
		})
	}) : void 0, t[40] = k, t[41] = u, t[42] = y, t[43] = s, t[44] = T, t[45] = b, t[46] = i, t[47] = O, t[48] = C, t[49] = J) : J = t[49];
	let Y;
	return t[50] !== B || t[51] !== q || t[52] !== J ? (Y = /* @__PURE__ */ l("div", {
		ref: R,
		className: B,
		children: [q, J]
	}), t[50] = B, t[51] = q, t[52] = J, t[53] = Y) : Y = t[53], Y;
}
function ie(e) {
	return !e;
}
// src/components/Tooltip/Tooltip.tsx
function ae(e) {
	let t = (0, p.c)(54), { children: n, content: s, triggerLabel: d, theme: f, triggerMode: m, contentLabel: g, delayMs: _, className: v, triggerClassName: y, contentClassName: b, "data-testid": x } = e, S = m === void 0 ? "hover" : m, C = g === void 0 ? d : g, w = _ === void 0 ? 200 : _, T = R(f ?? "auto"), E = f ?? T, D = i(), O;
	t[0] === D ? O = t[1] : (O = D.replaceAll(":", ""), t[0] = D, t[1] = O);
	let k = `--dsh-core-tooltip-${O}`, [A, j] = o(!1), M = a(null), N = a(null), P = a(void 0), F = a(void 0), I;
	t[2] === Symbol.for("react.memo_cache_sentinel") ? (I = () => {
		P.current !== void 0 && clearTimeout(P.current), F.current !== void 0 && clearTimeout(F.current), P.current = void 0, F.current = void 0;
	}, t[2] = I) : I = t[2];
	let L = I, z;
	t[3] !== w || t[4] !== S ? (z = () => {
		S === "hover" && (L(), P.current = setTimeout(() => j(!0), Math.max(0, w)));
	}, t[3] = w, t[4] = S, t[5] = z) : z = t[5];
	let B = z, V;
	t[6] === S ? V = t[7] : (V = () => {
		S === "hover" && (P.current !== void 0 && clearTimeout(P.current), P.current = void 0, F.current !== void 0 && clearTimeout(F.current), F.current = setTimeout(() => j(!1), 120));
	}, t[6] = S, t[7] = V);
	let H = V, U, W;
	t[8] === Symbol.for("react.memo_cache_sentinel") ? (U = () => () => {
		P.current !== void 0 && clearTimeout(P.current), F.current !== void 0 && clearTimeout(F.current);
	}, W = [], t[8] = U, t[9] = W) : (U = t[8], W = t[9]), r(U, W);
	let G, K;
	t[10] !== A || t[11] !== S ? (G = () => {
		if (!A || S !== "click") return;
		let e = (e) => {
			let t = e.target;
			!(t instanceof Node) || M.current?.contains(t) || N.current?.contains(t) || j(!1);
		}, t = (e) => {
			e.key === "Escape" && j(!1);
		};
		return document.addEventListener("pointerdown", e, !0), document.addEventListener("keydown", t), () => {
			document.removeEventListener("pointerdown", e, !0), document.removeEventListener("keydown", t);
		};
	}, K = [A, S], t[10] = A, t[11] = S, t[12] = G, t[13] = K) : (G = t[12], K = t[13]), r(G, K);
	let q;
	t[14] === k ? q = t[15] : (q = { anchorName: k }, t[14] = k, t[15] = q);
	let J = q, ee;
	t[16] === k ? ee = t[17] : (ee = { positionAnchor: k }, t[16] = k, t[17] = ee);
	let Y = ee, te;
	t[18] !== s || t[19] !== b || t[20] !== C || t[21] !== A || t[22] !== Y || t[23] !== E || t[24] !== D || t[25] !== S ? (te = A && typeof document < "u" ? u(/* @__PURE__ */ c("div", {
		id: D,
		ref: N,
		className: h("dsh-core-root", "dsh-tooltip-content", b),
		"data-theme": E,
		style: Y,
		role: S === "click" ? "dialog" : "tooltip",
		...S === "click" ? { "aria-label": C } : {},
		children: s
	}), document.body) : null, t[18] = s, t[19] = b, t[20] = C, t[21] = A, t[22] = Y, t[23] = E, t[24] = D, t[25] = S, t[26] = te) : te = t[26];
	let ne = te, X;
	t[27] === v ? X = t[28] : (X = h("dsh-tooltip", v), t[27] = v, t[28] = X);
	let Z;
	t[29] === y ? Z = t[30] : (Z = h("dsh-tooltip-trigger", y), t[29] = y, t[30] = Z);
	let re = A ? D : void 0, Q;
	t[31] !== A || t[32] !== S ? (Q = S === "click" ? {
		"aria-haspopup": "dialog",
		"aria-expanded": A
	} : {}, t[31] = A, t[32] = S, t[33] = Q) : Q = t[33];
	let ie;
	t[34] === S ? ie = t[35] : (ie = () => {
		S === "hover" && (L(), j(!0));
	}, t[34] = S, t[35] = ie);
	let ae;
	t[36] === S ? ae = t[37] : (ae = S === "click" ? () => j(oe) : void 0, t[36] = S, t[37] = ae);
	let $;
	t[38] !== n || t[39] !== H || t[40] !== B || t[41] !== Z || t[42] !== re || t[43] !== Q || t[44] !== ie || t[45] !== ae || t[46] !== d ? ($ = /* @__PURE__ */ c("button", {
		type: "button",
		className: Z,
		"aria-label": d,
		"aria-describedby": re,
		...Q,
		onMouseEnter: B,
		onMouseLeave: H,
		onFocus: ie,
		onBlur: H,
		onClick: ae,
		children: n
	}), t[38] = n, t[39] = H, t[40] = B, t[41] = Z, t[42] = re, t[43] = Q, t[44] = ie, t[45] = ae, t[46] = d, t[47] = $) : $ = t[47];
	let se;
	return t[48] !== J || t[49] !== ne || t[50] !== X || t[51] !== $ || t[52] !== x ? (se = /* @__PURE__ */ l("span", {
		ref: M,
		className: X,
		"data-testid": x,
		style: J,
		children: [$, ne]
	}), t[48] = J, t[49] = ne, t[50] = X, t[51] = $, t[52] = x, t[53] = se) : se = t[53], se;
}
function oe(e) {
	return !e;
}
// src/constants/delay.ts
var $ = {
	AnimationShort: 180,
	Animation: 300,
	AutocompleteSearch: 300,
	PollingDefault: 3e3
}, se = {
	en: {
		Close: "Close",
		Save: "Save",
		Cancel: "Cancel",
		Reset: "Reset",
		Loading: "Loading...",
		InterfaceLanguage: "Interface language",
		LanguageAuto: "Automatic (DSH)",
		LanguageEnglish: "English",
		LanguageRussian: "Russian",
		ThemeAuto: "Automatic (DSH)",
		ThemeDark: "Dark",
		ThemeLight: "Light"
	},
	ru: {
		Close: "Закрыть",
		Save: "Сохранить",
		Cancel: "Отмена",
		Reset: "Сбросить",
		Loading: "Загрузка...",
		InterfaceLanguage: "Язык интерфейса",
		LanguageAuto: "Авто (DSH)",
		LanguageEnglish: "Английский",
		LanguageRussian: "Русский",
		ThemeAuto: "Авто (DSH)",
		ThemeDark: "Темная",
		ThemeLight: "Светлая"
	}
};
// src/hooks/useDebouncedValue.ts
function ce(e, t) {
	let n = (0, p.c)(4), i = t === void 0 ? $.AutocompleteSearch : t, [a, s] = o(e), c, l;
	return n[0] !== i || n[1] !== e ? (c = () => {
		let t = setTimeout(() => {
			s(e);
		}, i);
		return () => {
			clearTimeout(t);
		};
	}, l = [e, i], n[0] = i, n[1] = e, n[2] = c, n[3] = l) : (c = n[2], l = n[3]), r(c, l), a;
}
// src/hooks/useDshThemeRevision.ts
function le() {
	return s(O, D, D);
}
// src/hooks/useLocalePreference.ts
function ue(e, t) {
	return e === "ru" || e === "en" ? e : String(t || (typeof document < "u" ? document.documentElement?.lang : "") || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}
function de(e, t) {
	try {
		let n = (t ?? (typeof localStorage < "u" ? localStorage : void 0))?.getItem(e);
		return n === "ru" || n === "en" ? n : void 0;
	} catch {
		return;
	}
}
function fe(e, t, n) {
	if (t === "ru" || t === "en") try {
		(n ?? (typeof localStorage < "u" ? localStorage : void 0))?.setItem(e, t);
	} catch {}
}
// src/utils/formatMessage.ts
function pe(e, ...t) {
	return e.replace(/\{(\d+)\}/g, (e, n) => {
		let r = t[Number.parseInt(n, 10)];
		return r === void 0 ? e : String(r);
	});
}
// src/utils/hostSanitizer.ts
function me(e) {
	if (typeof e != "string") return "";
	let t = e.trim();
	if (t === "") return "";
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(t)) try {
		return new URL(t).hostname.toLowerCase();
	} catch {
		t = t.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
	}
	if (t = t.split("/")[0] ?? t, t.includes(":")) {
		let e = t.startsWith("[") ? t : `[${t}]`;
		try {
			let t = new URL(`http://${e}`).hostname;
			if (t.includes(":")) return t.toLowerCase();
		} catch {}
	}
	let n = t.indexOf(":");
	return n > 0 && !t.startsWith("[") ? t.slice(0, n).toLowerCase() : t.toLowerCase();
}
function he(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	if (!t) return null;
	try {
		let e = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(t) ? t : `https://${t}`, n = new URL(e);
		return n.host ? n.host.toLowerCase() : null;
	} catch {
		return null;
	}
}
export { g as Button, x as ChildrenLazy, H as CircularProgress, se as CoreLocalization, $ as Delay, _ as IconButton, U as LinearProgress, z as Modal, v as ProgressBar, y as Skeleton, b as Spinner, W as SwitchControl, G as Tabs, m as TestId, Q as ThemedSelect, ae as Tooltip, Y as buildCoreThemeStyles, N as buildThemeCssVariables, ee as coreStyleScopeClass, te as coreThemeStyles, h as cx, S as darkThemeTokens, L as detectHostTheme, re as ensureCoreStyles, he as extractHost, pe as formatMessage, A as getDshTheme, D as getDshThemeRevision, C as lightThemeTokens, j as listDshThemes, fe as persistLocale, de as readSavedLocale, k as registerDshTheme, ue as resolveDshLocale, me as sanitizeHostInput, O as subscribeDshThemeChanges, ce as useDebouncedValue, le as useDshThemeRevision, R as useEffectiveTheme };
