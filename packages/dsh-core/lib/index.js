import { Fragment as e, Suspense as t, cloneElement as n, createElement as r, isValidElement as i, useCallback as a, useEffect as o, useId as s, useRef as c, useState as l, useSyncExternalStore as u } from "react";
import { jsx as d, jsxs as f } from "react/jsx-runtime";
import { createPortal as p } from "react-dom";
// \0rolldown/runtime.js
var m = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), h = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}), g = (/* @__PURE__ */ m(((e, t) => {
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
	}) : i, e)), d = (e) => l(r({}, "__esModule", { value: !0 }), e), f = {};
	c(f, {
		$dispatcherGuard: () => T,
		$makeReadOnly: () => D,
		$reset: () => E,
		$structuralCheck: () => P,
		c: () => b,
		clearRenderCounterRegistry: () => k,
		renderCounterRegistry: () => O,
		useRenderCounter: () => M
	}), t.exports = d(f);
	var p = u(h("react")), { useRef: m, useEffect: g, isValidElement: _ } = p, v = p.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ?? p.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, y = Symbol.for("react.memo_cache_sentinel"), b = typeof p.__COMPILER_RUNTIME?.c == "function" ? p.__COMPILER_RUNTIME.c : function(e) {
		return p.useMemo(() => {
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
		let t = m(null);
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
})))(), _ = { Common: {
	Loading: "dsh-common-loading",
	SelectTrigger: "dsh-select-trigger",
	SelectMenu: "dsh-select-menu",
	SelectOption: "dsh-select-option",
	Switch: "dsh-switch-control",
	Button: "dsh-button",
	Checkbox: "dsh-checkbox",
	IconButton: "dsh-icon-button",
	ModalBackdrop: "dsh-modal-backdrop",
	ModalCard: "dsh-modal-card",
	ModalClose: "dsh-modal-close",
	TabsList: "dsh-tabs-list",
	TabButton: "dsh-tab-button"
} };
// src/utils/classNames.ts
function v(...e) {
	return e.filter((e) => typeof e == "string" && e.trim().length > 0).join(" ");
}
// src/components/Button/Button.tsx
function y(e) {
	let t = (0, g.c)(13), { children: n, onClick: r, variant: i, size: a, disabled: o, title: s, ariaLabel: c, className: l, type: u } = e, f = i === void 0 ? "secondary" : i, p = a === void 0 ? "md" : a, m = o !== void 0 && o, h = u === void 0 ? "button" : u, y = f === "primary" && "dsh-btn-primary", b = f === "danger" && "dsh-btn-danger", x = (p === "sm" || p === "small") && "dsh-btn-sm ar-btn-sm", S;
	t[0] !== l || t[1] !== y || t[2] !== b || t[3] !== x ? (S = v("dsh-btn", y, b, x, l), t[0] = l, t[1] = y, t[2] = b, t[3] = x, t[4] = S) : S = t[4];
	let C;
	return t[5] !== c || t[6] !== n || t[7] !== m || t[8] !== r || t[9] !== S || t[10] !== s || t[11] !== h ? (C = /* @__PURE__ */ d("button", {
		type: h,
		"data-testid": _.Common.Button,
		disabled: m,
		title: s,
		"aria-label": c,
		onClick: r,
		className: S,
		children: n
	}), t[5] = c, t[6] = n, t[7] = m, t[8] = r, t[9] = S, t[10] = s, t[11] = h, t[12] = C) : C = t[12], C;
}
// src/components/Button/CollectionAddButton.tsx
function b(e) {
	let t = (0, g.c)(13), n, r, i;
	t[0] === e ? (n = t[1], r = t[2], i = t[3]) : ({children: n, className: r, ...i} = e, t[0] = e, t[1] = n, t[2] = r, t[3] = i);
	let a;
	t[4] === r ? a = t[5] : (a = v("dsh-collection-add-btn", r), t[4] = r, t[5] = a);
	let o;
	t[6] === Symbol.for("react.memo_cache_sentinel") ? (o = /* @__PURE__ */ d("svg", {
		className: "dsh-collection-add-icon",
		width: "14",
		height: "14",
		viewBox: "0 0 14 14",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ d("path", {
			d: "M7 2v10M2 7h10",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.25"
		})
	}), t[6] = o) : o = t[6];
	let s;
	t[7] === n ? s = t[8] : (s = /* @__PURE__ */ d("span", { children: n }), t[7] = n, t[8] = s);
	let c;
	return t[9] !== i || t[10] !== a || t[11] !== s ? (c = /* @__PURE__ */ f(y, {
		...i,
		className: a,
		children: [o, s]
	}), t[9] = i, t[10] = a, t[11] = s, t[12] = c) : c = t[12], c;
}
// src/components/Button/IconButton.tsx
function x(e) {
	let t = (0, g.c)(10), { children: n, ariaLabel: r, size: i, title: a, onClick: o, disabled: s, className: c } = e, l = i === void 0 ? "standard" : i, u = s !== void 0 && s, f = a ?? r, p = l === "small" && "dsh-icon-btn-sm", m;
	t[0] !== c || t[1] !== p ? (m = v("dsh-icon-btn", p, c), t[0] = c, t[1] = p, t[2] = m) : m = t[2];
	let h;
	return t[3] !== r || t[4] !== n || t[5] !== u || t[6] !== o || t[7] !== f || t[8] !== m ? (h = /* @__PURE__ */ d("button", {
		type: "button",
		"data-testid": _.Common.IconButton,
		"aria-label": r,
		title: f,
		disabled: u,
		onClick: o,
		className: m,
		children: n
	}), t[3] = r, t[4] = n, t[5] = u, t[6] = o, t[7] = f, t[8] = m, t[9] = h) : h = t[9], h;
}
// src/components/Checkbox/Checkbox.tsx
function S(e) {
	let t = (0, g.c)(10), { checked: n, onChange: r, disabled: i, ariaLabel: a, className: o } = e, s = i !== void 0 && i, c;
	t[0] === r ? c = t[1] : (c = (e) => {
		r(e.currentTarget.checked);
	}, t[0] = r, t[1] = c);
	let l = c, u;
	t[2] === o ? u = t[3] : (u = v("dsh-checkbox", o), t[2] = o, t[3] = u);
	let f;
	return t[4] !== a || t[5] !== n || t[6] !== s || t[7] !== l || t[8] !== u ? (f = /* @__PURE__ */ d("input", {
		type: "checkbox",
		className: u,
		"data-testid": _.Common.Checkbox,
		checked: n,
		disabled: s,
		"aria-label": a,
		onChange: l
	}), t[4] = a, t[5] = n, t[6] = s, t[7] = l, t[8] = u, t[9] = f) : f = t[9], f;
}
// src/components/CodeDisclosure/CodeDisclosure.tsx
function C(e) {
	let t = (0, g.c)(8), { code: n, children: r, label: i } = e, a = i === void 0 ? "Показать пример кода" : i, o;
	t[0] === a ? o = t[1] : (o = /* @__PURE__ */ d("summary", { children: a }), t[0] = a, t[1] = o);
	let s;
	t[2] === n ? s = t[3] : (s = /* @__PURE__ */ d("pre", { children: /* @__PURE__ */ d("code", { children: n }) }), t[2] = n, t[3] = s);
	let c;
	return t[4] !== r || t[5] !== o || t[6] !== s ? (c = /* @__PURE__ */ f("details", {
		className: "dsh-code-disclosure",
		children: [
			o,
			r,
			s
		]
	}), t[4] = r, t[5] = o, t[6] = s, t[7] = c) : c = t[7], c;
}
// src/components/icons/InfoIcon.tsx
function w(e) {
	let t = (0, g.c)(7), { width: n, height: r } = e, i = n === void 0 ? 16 : n, a = r === void 0 ? 16 : r, o, s, c, l;
	t[0] === Symbol.for("react.memo_cache_sentinel") ? (o = /* @__PURE__ */ d("title", { children: "Информация" }), s = /* @__PURE__ */ d("circle", {
		cx: "12",
		cy: "12",
		r: "9"
	}), c = /* @__PURE__ */ d("path", {
		d: "M12 10v6",
		strokeLinecap: "round"
	}), l = /* @__PURE__ */ d("circle", {
		cx: "12",
		cy: "7",
		r: "1",
		fill: "currentColor",
		stroke: "none"
	}), t[0] = o, t[1] = s, t[2] = c, t[3] = l) : (o = t[0], s = t[1], c = t[2], l = t[3]);
	let u;
	return t[4] !== a || t[5] !== i ? (u = /* @__PURE__ */ f("svg", {
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		width: i,
		height: a,
		viewBox: "0 0 24 24",
		role: "img",
		"aria-label": "Информация",
		children: [
			o,
			s,
			c,
			l
		]
	}), t[4] = a, t[5] = i, t[6] = u) : u = t[6], u;
}
// src/components/icons/SettingsIcon.tsx
function T(e) {
	let t = (0, g.c)(4), { width: n, height: r } = e, i = n === void 0 ? 16 : n, a = r === void 0 ? 16 : r, o;
	t[0] === Symbol.for("react.memo_cache_sentinel") ? (o = /* @__PURE__ */ d("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.21l-2.39.96a7.2 7.2 0 0 0-1.62-.92l-.36-2.57a.5.5 0 0 0-.47-.41h-3.84a.5.5 0 0 0-.47.41L9.26 5.38a7.2 7.2 0 0 0-1.62.92l-2.39-.96a.5.5 0 0 0-.59.21L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.21.37.29.59.21l2.39-.96c.5.38 1.03.69 1.62.92l.36 2.57a.5.5 0 0 0 .47.41h3.84a.5.5 0 0 0 .47-.41l.36-2.57a7.2 7.2 0 0 0 1.62-.92l2.39.96a.5.5 0 0 0 .59-.21l1.92-3.32a.5.5 0 0 0-.12-.61l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" }), t[0] = o) : o = t[0];
	let s;
	return t[1] !== a || t[2] !== i ? (s = /* @__PURE__ */ d("svg", {
		width: i,
		height: a,
		viewBox: "0 0 24 24",
		fill: "currentColor",
		"aria-hidden": "true",
		children: o
	}), t[1] = a, t[2] = i, t[3] = s) : s = t[3], s;
}
// src/components/icons/CloseIcon.tsx
function E(e) {
	let t = (0, g.c)(3), { size: n } = e, r = n === void 0 ? 16 : n, i;
	t[0] === Symbol.for("react.memo_cache_sentinel") ? (i = /* @__PURE__ */ d("path", { d: "M6 6l12 12M18 6 6 18" }), t[0] = i) : i = t[0];
	let a;
	return t[1] === r ? a = t[2] : (a = /* @__PURE__ */ d("svg", {
		width: r,
		height: r,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: i
	}), t[1] = r, t[2] = a), a;
}
// src/components/Loader/ProgressBar.tsx
function D(e) {
	let t = (0, g.c)(5), { label: n, className: r } = e, i = n === void 0 ? "Loading..." : n, a;
	t[0] === r ? a = t[1] : (a = v("dsh-progress-bar", r), t[0] = r, t[1] = a);
	let o;
	return t[2] !== i || t[3] !== a ? (o = /* @__PURE__ */ d("div", {
		role: "progressbar",
		"aria-label": i,
		"data-testid": _.Common.Loading,
		className: a
	}), t[2] = i, t[3] = a, t[4] = o) : o = t[4], o;
}
// src/components/Loader/Skeleton.tsx
function O(e) {
	let t = (0, g.c)(9), { width: n, height: r, markLoadingRoot: i, className: a } = e, o = n === void 0 ? "100%" : n, s = r === void 0 ? 32 : r, c = i === void 0 || i ? _.Common.Loading : void 0, l;
	t[0] !== s || t[1] !== o ? (l = {
		width: o,
		height: s
	}, t[0] = s, t[1] = o, t[2] = l) : l = t[2];
	let u;
	t[3] === a ? u = t[4] : (u = v("dsh-skeleton", a), t[3] = a, t[4] = u);
	let f;
	return t[5] !== c || t[6] !== l || t[7] !== u ? (f = /* @__PURE__ */ d("div", {
		"aria-busy": "true",
		"data-testid": c,
		style: l,
		className: u
	}), t[5] = c, t[6] = l, t[7] = u, t[8] = f) : f = t[8], f;
}
// src/components/Loader/Spinner.tsx
function k(e) {
	let t = (0, g.c)(8), { label: n, size: r, markLoadingRoot: i, className: a } = e, o = n === void 0 ? "Loading..." : n, s = r === void 0 ? "standard" : r, c = i === void 0 || i ? _.Common.Loading : void 0, l = s === "small" && "dsh-spinner-sm", u;
	t[0] !== a || t[1] !== l ? (u = v("dsh-spinner", l, a), t[0] = a, t[1] = l, t[2] = u) : u = t[2];
	let f;
	return t[3] !== o || t[4] !== s || t[5] !== c || t[6] !== u ? (f = /* @__PURE__ */ d("span", {
		role: "status",
		"aria-label": o,
		"data-testid": c,
		className: u,
		"data-size": s
	}), t[3] = o, t[4] = s, t[5] = c, t[6] = u, t[7] = f) : f = t[7], f;
}
// src/components/Loader/ChildrenLazy.tsx
function A(e) {
	let n = (0, g.c)(6), { variant: r, loader: i, children: a } = e, o = r === void 0 ? "spinner" : r, s;
	n[0] !== i || n[1] !== o ? (s = i === void 0 ? d(o === "progress" ? D : o === "skeleton" ? O : k, {}) : i, n[0] = i, n[1] = o, n[2] = s) : s = n[2];
	let c = s, l;
	return n[3] !== a || n[4] !== c ? (l = /* @__PURE__ */ d(t, {
		fallback: c,
		children: a
	}), n[3] = a, n[4] = c, n[5] = l) : l = n[5], l;
}
// src/theme/palettes.ts
var j = {
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
}, M = {
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
}, N = /* @__PURE__ */ new Map([["dark", {
	id: "dark",
	baseMode: "dark",
	tokens: j
}], ["light", {
	id: "light",
	baseMode: "light",
	tokens: M
}]]), P = /* @__PURE__ */ new Set(), F = 0;
function I() {
	return F;
}
function L(e) {
	return P.add(e), () => {
		P.delete(e);
	};
}
function R(e) {
	N.set(e.id, e), F += 1, P.forEach((e) => {
		e();
	});
}
function z(e) {
	return N.get(e) ?? {
		id: "dark",
		baseMode: "dark",
		tokens: j
	};
}
function B() {
	return [...N.values()];
}
var V = [
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
function H(e, t) {
	let n = t ? {
		...e,
		...t
	} : e;
	return V.map(([e, t]) => `${t}:${n[e]}`).join(";");
}
// src/hooks/useEffectiveTheme.ts
var U = ".dsh-core-root, .ar-root, .ar-settings-root";
function W(e) {
	let t = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(e);
	if (t?.[1] && t[2] && t[3]) return {
		r: Number(t[1]),
		g: Number(t[2]),
		b: Number(t[3]),
		a: t[4] === void 0 ? 1 : Number(t[4])
	};
}
function G({ r: e, g: t, b: n }) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function K(e, t = U) {
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
			let t = W(getComputedStyle(e).backgroundColor);
			if (t && t.a > .2) return G(t) > 140 ? "light" : "dark";
		}
		if (document.body) {
			let e = W(getComputedStyle(document.body).color);
			if (e) return G(e) < 100 ? "light" : "dark";
		}
	}
	return typeof window < "u" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}
function q(e, t) {
	let n = (0, g.c)(8), r = e === void 0 ? "auto" : e, i;
	n[0] === r ? i = n[1] : (i = r !== "auto" && r.trim() !== "" ? z(r).id : void 0, n[0] = r, n[1] = i);
	let a = i, s;
	n[2] === a ? s = n[3] : (s = () => a ?? K(), n[2] = a, n[3] = s);
	let [c, u] = l(s), d, f;
	return n[4] !== a || n[5] !== t ? (d = () => {
		if (a) return;
		let e = () => {
			u(K(t?.current ?? void 0));
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
	}, f = [a, t], n[4] = a, n[5] = t, n[6] = d, n[7] = f) : (d = n[6], f = n[7]), o(d, f), a ?? c;
}
// src/components/Modal/Modal.tsx
function J(t) {
	let n = (0, g.c)(34), { open: i, onClose: a, title: s, headerExtra: l, footer: u, description: p, closeLabel: m, theme: h, backdropClassName: y, cardClassName: b, children: x } = t, S = m === void 0 ? "Close" : m, C = q(h ?? "auto"), w = c(void 0), T = c(a), D, O;
	n[0] === a ? (D = n[1], O = n[2]) : (D = () => {
		T.current = a;
	}, O = [a], n[0] = a, n[1] = D, n[2] = O), o(D, O);
	let k, A;
	if (n[3] === i ? (k = n[4], A = n[5]) : (k = () => {
		if (!i || typeof document > "u") return;
		let e = document.activeElement, t = w.current, n = () => Array.from(t?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])") ?? []).filter(Y), r = (e) => {
			if (e.key === "Escape") {
				T.current();
				return;
			}
			if (e.key !== "Tab" || !t) return;
			let r = n(), i = r[0], a = r.at(-1);
			!i || !a ? (e.preventDefault(), t.focus()) : e.shiftKey && (document.activeElement === i || !t.contains(document.activeElement)) ? (e.preventDefault(), a.focus()) : e.shiftKey || document.activeElement !== a && t.contains(document.activeElement) || (e.preventDefault(), i.focus());
		};
		return n()[0]?.focus(), document.addEventListener("keydown", r), () => {
			document.removeEventListener("keydown", r), e instanceof HTMLElement && e.isConnected && e.focus();
		};
	}, A = [i], n[3] = i, n[4] = k, n[5] = A), o(k, A), !i) {
		let t;
		return n[6] === Symbol.for("react.memo_cache_sentinel") ? (t = r(e), n[6] = t) : t = n[6], t;
	}
	let j;
	n[7] === y ? j = n[8] : (j = v("dsh-modal-backdrop", "ar-modal", y), n[7] = y, n[8] = j);
	let M;
	n[9] === a ? M = n[10] : (M = /* @__PURE__ */ d("button", {
		type: "button",
		className: "dsh-modal-backdrop-control",
		"aria-hidden": "true",
		tabIndex: -1,
		onClick: a
	}), n[9] = a, n[10] = M);
	let N;
	n[11] === Symbol.for("react.memo_cache_sentinel") ? (N = (e) => {
		w.current = e ?? void 0;
	}, n[11] = N) : N = n[11];
	let P;
	n[12] === b ? P = n[13] : (P = v("dsh-modal-card", "ar-modal-card", b), n[12] = b, n[13] = P);
	let F;
	n[14] !== S || n[15] !== l || n[16] !== a || n[17] !== s ? (F = s !== void 0 || l !== void 0 ? /* @__PURE__ */ f("div", {
		className: "dsh-modal-header",
		children: [/* @__PURE__ */ d("div", {
			className: "dsh-modal-title",
			children: s
		}), /* @__PURE__ */ f("div", {
			className: "dsh-modal-actions ar-settings-header-right",
			children: [l, /* @__PURE__ */ d("button", {
				type: "button",
				"data-testid": _.Common.ModalClose,
				className: "dsh-modal-close",
				"aria-label": S,
				onClick: a,
				children: /* @__PURE__ */ d(E, { size: 16 })
			})]
		})]
	}) : void 0, n[14] = S, n[15] = l, n[16] = a, n[17] = s, n[18] = F) : F = n[18];
	let I;
	n[19] === x ? I = n[20] : (I = /* @__PURE__ */ d("div", {
		className: "dsh-modal-body",
		children: x
	}), n[19] = x, n[20] = I);
	let L;
	n[21] === u ? L = n[22] : (L = u === void 0 ? void 0 : /* @__PURE__ */ d("div", {
		className: "dsh-modal-footer",
		children: u
	}), n[21] = u, n[22] = L);
	let R;
	n[23] !== p || n[24] !== F || n[25] !== I || n[26] !== L || n[27] !== P ? (R = /* @__PURE__ */ f("div", {
		ref: N,
		role: "dialog",
		"aria-modal": "true",
		tabIndex: -1,
		"data-testid": _.Common.ModalCard,
		className: P,
		children: [
			F,
			p,
			I,
			L
		]
	}), n[23] = p, n[24] = F, n[25] = I, n[26] = L, n[27] = P, n[28] = R) : R = n[28];
	let z;
	return n[29] !== C || n[30] !== R || n[31] !== j || n[32] !== M ? (z = /* @__PURE__ */ f("div", {
		"data-theme": C,
		"data-testid": _.Common.ModalBackdrop,
		className: j,
		children: [M, R]
	}), n[29] = C, n[30] = R, n[31] = j, n[32] = M, n[33] = z) : z = n[33], z;
}
function Y(e) {
	return !e.hasAttribute("hidden") && e.getAttribute("aria-hidden") !== "true";
}
// src/components/Popover/Popover.tsx
function X(e) {
	let t = (0, g.c)(29), { children: a, content: u, triggerLabel: m, theme: h, contentLabel: _, triggerClassName: y, contentClassName: b, triggerElement: x } = e, S = _ === void 0 ? m : _, C = q(h ?? "auto"), w = h ?? C, T = s(), E;
	t[0] === T ? E = t[1] : (E = T.replaceAll(":", ""), t[0] = T, t[1] = E);
	let D = `--dsh-core-popover-${E}`, [O, k] = l(!1), A = c(null), j = c(null), M, N;
	t[2] === O ? (M = t[3], N = t[4]) : (M = () => {
		if (!O) return;
		let e = (e) => {
			let t = e.target;
			!(t instanceof Node) || A.current?.contains(t) || j.current?.contains(t) || k(!1);
		}, t = (e) => {
			e.key === "Escape" && k(!1);
		};
		return document.addEventListener("pointerdown", e, !0), document.addEventListener("keydown", t), () => {
			document.removeEventListener("pointerdown", e, !0), document.removeEventListener("keydown", t);
		};
	}, N = [O], t[2] = O, t[3] = M, t[4] = N), o(M, N);
	let P;
	t[5] === D ? P = t[6] : (P = { positionAnchor: D }, t[5] = D, t[6] = P);
	let F = P, I;
	t[7] !== u || t[8] !== b || t[9] !== S || t[10] !== O || t[11] !== F || t[12] !== w || t[13] !== T ? (I = O && typeof document < "u" ? p(/* @__PURE__ */ d("div", {
		ref: j,
		id: T,
		className: v("dsh-core-root", "dsh-popover-content", b),
		"data-theme": w,
		style: F,
		role: "dialog",
		"aria-label": S,
		children: u
	}), document.body) : void 0, t[7] = u, t[8] = b, t[9] = S, t[10] = O, t[11] = F, t[12] = w, t[13] = T, t[14] = I) : I = t[14];
	let L = I, R = O ? T : void 0, z;
	t[15] === Symbol.for("react.memo_cache_sentinel") ? (z = () => k(Z), t[15] = z) : z = t[15];
	let B;
	if (t[16] !== a || t[17] !== O || t[18] !== R || t[19] !== y || t[20] !== x || t[21] !== m) {
		let e = {
			"aria-label": m,
			"aria-describedby": R,
			"aria-haspopup": "dialog",
			"aria-expanded": O,
			onClick: z
		};
		B = x === void 0 ? r("button", {
			type: "button",
			className: v("dsh-popover-trigger", y),
			...e
		}, a) : i(a) ? n(a, {
			...e,
			className: y === void 0 ? void 0 : v("dsh-popover-trigger", y)
		}) : r(x, {
			className: v("dsh-popover-trigger", y),
			...e
		}, a), t[16] = a, t[17] = O, t[18] = R, t[19] = y, t[20] = x, t[21] = m, t[22] = B;
	} else B = t[22];
	let V = B, H;
	t[23] === D ? H = t[24] : (H = { anchorName: D }, t[23] = D, t[24] = H);
	let U = H, W;
	return t[25] !== L || t[26] !== U || t[27] !== V ? (W = /* @__PURE__ */ f("span", {
		ref: A,
		className: "dsh-popover",
		style: U,
		children: [V, L]
	}), t[25] = L, t[26] = U, t[27] = V, t[28] = W) : W = t[28], W;
}
function Z(e) {
	return !e;
}
// src/components/Progress/progressOptions.ts
function Q(e) {
	return !e || e === "default" ? "var(--dsw-alias-label-tertiary)" : e === "accent" ? "var(--dsw-alias-button-info-fill)" : e;
}
// src/components/Progress/CircularProgress.tsx
function ee(e) {
	let t = (0, g.c)(31), { value: n, label: r, size: i, color: a, className: o, title: s } = e, c = i === void 0 ? "standard" : i, l = a === void 0 ? "default" : a, u;
	t[0] === n ? u = t[1] : (u = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, t[0] = n, t[1] = u);
	let p = u, m = c === "small" ? 14 : 20, h = m / 2, _ = c === "small" ? 2 : 2.5, y = c === "small" ? 5.5 : h - _ / 2, b = 2 * Math.PI * y, x;
	t[2] === o ? x = t[3] : (x = v("dsh-circular-progress", o), t[2] = o, t[3] = x);
	let S = `0 0 ${m} ${m}`, C;
	t[4] === l ? C = t[5] : (C = Q(l), t[4] = l, t[5] = C);
	let w;
	t[6] === C ? w = t[7] : (w = { "--dsh-progress-color": C }, t[6] = C, t[7] = w);
	let T = w, E = s ?? r, D;
	t[8] === E ? D = t[9] : (D = /* @__PURE__ */ d("title", { children: E }), t[8] = E, t[9] = D);
	let O;
	t[10] !== h || t[11] !== y || t[12] !== _ ? (O = /* @__PURE__ */ d("circle", {
		className: "dsh-circular-progress-track",
		cx: h,
		cy: h,
		r: y,
		strokeWidth: _
	}), t[10] = h, t[11] = y, t[12] = _, t[13] = O) : O = t[13];
	let k = `${b * p / 100} ${b}`, A = `rotate(-90 ${h} ${h})`, j;
	t[14] !== h || t[15] !== y || t[16] !== _ || t[17] !== k || t[18] !== A ? (j = /* @__PURE__ */ d("circle", {
		className: "dsh-circular-progress-fill",
		cx: h,
		cy: h,
		r: y,
		strokeWidth: _,
		strokeDasharray: k,
		transform: A
	}), t[14] = h, t[15] = y, t[16] = _, t[17] = k, t[18] = A, t[19] = j) : j = t[19];
	let M;
	return t[20] !== p || t[21] !== m || t[22] !== r || t[23] !== c || t[24] !== D || t[25] !== O || t[26] !== j || t[27] !== x || t[28] !== S || t[29] !== T ? (M = /* @__PURE__ */ f("svg", {
		className: x,
		"data-size": c,
		viewBox: S,
		width: m,
		height: m,
		role: "progressbar",
		"aria-label": r,
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-valuenow": p,
		style: T,
		children: [
			D,
			O,
			j
		]
	}), t[20] = p, t[21] = m, t[22] = r, t[23] = c, t[24] = D, t[25] = O, t[26] = j, t[27] = x, t[28] = S, t[29] = T, t[30] = M) : M = t[30], M;
}
// src/components/Progress/LinearProgress.tsx
function te(e) {
	let t = (0, g.c)(16), { value: n, label: r, size: i, color: a, className: o, title: s } = e, c = i === void 0 ? "standard" : i, l = a === void 0 ? "accent" : a, u;
	t[0] === n ? u = t[1] : (u = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, t[0] = n, t[1] = u);
	let f = u, p;
	t[2] === o ? p = t[3] : (p = v("dsh-linear-progress", o), t[2] = o, t[3] = p);
	let m = `${f}%`, h;
	t[4] === l ? h = t[5] : (h = Q(l), t[4] = l, t[5] = h);
	let _;
	t[6] !== m || t[7] !== h ? (_ = {
		"--dsh-progress-value": m,
		"--dsh-progress-color": h
	}, t[6] = m, t[7] = h, t[8] = _) : _ = t[8];
	let y = _, b;
	return t[9] !== f || t[10] !== r || t[11] !== c || t[12] !== p || t[13] !== y || t[14] !== s ? (b = /* @__PURE__ */ d("div", {
		className: p,
		"data-size": c,
		role: "progressbar",
		"aria-label": r,
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-valuenow": f,
		title: s,
		style: y
	}), t[9] = f, t[10] = r, t[11] = c, t[12] = p, t[13] = y, t[14] = s, t[15] = b) : b = t[15], b;
}
// src/components/RadioCardGroup/RadioCardGroup.tsx
function ne(e) {
	let t = (0, g.c)(20), { name: n, label: r, value: i, options: a, onChange: o, disabled: s, className: c } = e, l = s !== void 0 && s, u;
	t[0] === c ? u = t[1] : (u = v("dsh-radio-card-group", c), t[0] = c, t[1] = u);
	let p;
	t[2] === r ? p = t[3] : (p = /* @__PURE__ */ d("legend", {
		className: "dsh-radio-card-legend",
		children: r
	}), t[2] = r, t[3] = p);
	let m;
	if (t[4] !== n || t[5] !== o || t[6] !== a || t[7] !== i) {
		let e;
		t[9] !== n || t[10] !== o || t[11] !== i ? (e = (e) => /* @__PURE__ */ f("label", {
			className: "dsh-radio-card",
			children: [/* @__PURE__ */ d("input", {
				type: "radio",
				name: n,
				value: e.value,
				checked: i === e.value,
				"aria-label": e.label,
				"aria-describedby": `${n}-${e.value}-description`,
				onChange: () => o(e.value)
			}), /* @__PURE__ */ f("span", {
				className: "dsh-radio-card-content",
				children: [/* @__PURE__ */ d("span", {
					className: "dsh-radio-card-title",
					children: e.label
				}), /* @__PURE__ */ d("span", {
					className: "dsh-radio-card-description",
					id: `${n}-${e.value}-description`,
					children: e.description
				})]
			})]
		}, e.value), t[9] = n, t[10] = o, t[11] = i, t[12] = e) : e = t[12], m = a.map(e), t[4] = n, t[5] = o, t[6] = a, t[7] = i, t[8] = m;
	} else m = t[8];
	let h;
	t[13] === m ? h = t[14] : (h = /* @__PURE__ */ d("div", {
		className: "dsh-radio-card-options",
		children: m
	}), t[13] = m, t[14] = h);
	let _;
	return t[15] !== l || t[16] !== u || t[17] !== p || t[18] !== h ? (_ = /* @__PURE__ */ f("fieldset", {
		className: u,
		disabled: l,
		children: [p, h]
	}), t[15] = l, t[16] = u, t[17] = p, t[18] = h, t[19] = _) : _ = t[19], _;
}
// src/components/SwitchControl/SwitchControl.tsx
function re(e) {
	let t = (0, g.c)(14), { checked: n, onChange: r, disabled: i, labelledBy: a, ariaLabel: o, className: s } = e, c = i !== void 0 && i, l;
	t[0] === s ? l = t[1] : (l = v("dsh-switch", "ar-settings-switch", s), t[0] = s, t[1] = l);
	let u;
	t[2] !== n || t[3] !== c || t[4] !== r ? (u = () => {
		c || r(!n);
	}, t[2] = n, t[3] = c, t[4] = r, t[5] = u) : u = t[5];
	let f;
	t[6] === Symbol.for("react.memo_cache_sentinel") ? (f = /* @__PURE__ */ d("span", {}), t[6] = f) : f = t[6];
	let p;
	return t[7] !== o || t[8] !== n || t[9] !== c || t[10] !== a || t[11] !== l || t[12] !== u ? (p = /* @__PURE__ */ d("button", {
		type: "button",
		role: "switch",
		"data-testid": _.Common.Switch,
		"aria-labelledby": a,
		"aria-label": o,
		"aria-checked": n,
		disabled: c,
		className: l,
		onClick: u,
		children: f
	}), t[7] = o, t[8] = n, t[9] = c, t[10] = a, t[11] = l, t[12] = u, t[13] = p) : p = t[13], p;
}
// src/components/Tabs/Tabs.tsx
function ie(e) {
	let t = (0, g.c)(15), { items: n, activeValue: r, onChange: i, ariaLabel: a, className: o, tabClassName: s } = e, c;
	t[0] === o ? c = t[1] : (c = v("dsh-tabs", "ar-tabs", o), t[0] = o, t[1] = c);
	let l;
	if (t[2] !== r || t[3] !== n || t[4] !== i || t[5] !== s) {
		let e;
		t[7] !== r || t[8] !== i || t[9] !== s ? (e = (e) => {
			let t = e.value === r;
			return /* @__PURE__ */ d("button", {
				type: "button",
				role: "tab",
				"data-testid": _.Common.TabButton,
				"aria-selected": t,
				disabled: e.disabled,
				className: v("dsh-tab", "ar-tab", t && "active", s),
				onClick: () => {
					!e.disabled && e.value !== r && i(e.value);
				},
				children: e.label
			}, e.value);
		}, t[7] = r, t[8] = i, t[9] = s, t[10] = e) : e = t[10], l = n.map(e), t[2] = r, t[3] = n, t[4] = i, t[5] = s, t[6] = l;
	} else l = t[6];
	let u;
	return t[11] !== a || t[12] !== c || t[13] !== l ? (u = /* @__PURE__ */ d("div", {
		role: "tablist",
		"aria-label": a,
		"data-testid": _.Common.TabsList,
		className: c,
		children: l
	}), t[11] = a, t[12] = c, t[13] = l, t[14] = u) : u = t[14], u;
}
// src/components/TextField/TextField.tsx
function ae(e) {
	let t = (0, g.c)(18), { value: n, size: r, onChange: i, placeholder: a, disabled: o, ariaLabel: s, type: c, className: l, id: u, maxLength: f, autoComplete: p, spellCheck: m } = e, h = r === void 0 ? "standard" : r, _ = o !== void 0 && o, y = c === void 0 ? "text" : c, b;
	t[0] === i ? b = t[1] : (b = (e) => i(e.currentTarget.value), t[0] = i, t[1] = b);
	let x = b, S = h === "small" && "dsh-input-sm", C;
	t[2] !== l || t[3] !== S ? (C = v("dsh-input", S, l), t[2] = l, t[3] = S, t[4] = C) : C = t[4];
	let w;
	return t[5] !== s || t[6] !== p || t[7] !== _ || t[8] !== x || t[9] !== u || t[10] !== f || t[11] !== a || t[12] !== h || t[13] !== m || t[14] !== C || t[15] !== y || t[16] !== n ? (w = /* @__PURE__ */ d("input", {
		type: y,
		className: C,
		"data-size": h,
		value: n,
		onChange: x,
		placeholder: a,
		disabled: _,
		"aria-label": s,
		id: u,
		maxLength: f,
		autoComplete: p,
		spellCheck: m
	}), t[5] = s, t[6] = p, t[7] = _, t[8] = x, t[9] = u, t[10] = f, t[11] = a, t[12] = h, t[13] = m, t[14] = C, t[15] = y, t[16] = n, t[17] = w) : w = t[17], w;
}
var oe = { scope: "_scope_107dc_2" }, se = "._scope_107dc_2{--dsh-style-scope:1}.dsh-select,.ar-themed-select{flex:0 220px;width:220px;min-width:0;max-width:100%;position:relative}.dsh-select-full{flex:auto;width:100%}.dsh-select-trigger,.ar-themed-select-trigger{font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:100%;height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;text-align:left;cursor:pointer;border-radius:6px;justify-content:space-between;align-items:center;gap:10px;padding:0 10px;font-size:14px;transition:background-color .15s,border-color .15s,box-shadow .15s;display:flex}.dsh-select-sm .dsh-select-trigger,.dsh-select-sm .ar-themed-select-trigger{height:28px;min-height:28px;font-size:12px}.dsh-select-trigger:hover:not(:disabled),.ar-themed-select-trigger:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-select-trigger:focus-visible,.ar-themed-select-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-select-trigger:disabled,.ar-themed-select-trigger:disabled{opacity:.55;cursor:not-allowed}.dsh-select-label,.ar-themed-select-trigger span:first-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dsh-select-menu,.ar-themed-select-menu{z-index:30;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);max-height:220px;box-shadow:var(--dsh-ui-shadow-elevated);border-radius:8px;padding:4px;position:absolute;top:calc(100% + 4px);left:0;right:0;overflow:auto}.dsh-select-option,.ar-themed-select-menu button{width:100%;min-height:30px;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:14px;transition:background-color .12s;display:flex;color:var(--dsh-ui-text)!important}.dsh-select-option:hover,.dsh-select-option.active,.ar-themed-select-menu button:hover,.ar-themed-select-menu button.active{background:var(--dsh-ui-hover);color:var(--dsh-ui-text)!important}.dsh-switch,.ar-settings-switch{background:var(--dsh-ui-switch-off);cursor:pointer;border:0;border-radius:999px;align-items:center;width:36px;height:20px;padding:2px;transition:background-color .16s;display:inline-flex;position:relative}.dsh-switch[aria-checked=true],.ar-settings-switch[aria-checked=true]{background:var(--dsh-ui-switch-on)}.dsh-switch:disabled,.ar-settings-switch:disabled{opacity:.5;cursor:not-allowed}.dsh-switch span,.ar-settings-switch span{background:var(--dsh-ui-switch-thumb-off);border-radius:50%;width:16px;height:16px;transition:transform .16s,background-color .16s;display:block}.dsh-switch[aria-checked=true] span,.ar-settings-switch[aria-checked=true] span{background:var(--dsh-ui-switch-thumb-on);transform:translate(16px)}.dsh-input{box-sizing:border-box;width:100%;min-width:0;height:32px;font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);color:var(--dsh-ui-text);font-size:14px;font:inherit;border-radius:6px;padding:0 10px;transition:border-color .15s,box-shadow .15s,background-color .15s}.dsh-input-sm{height:28px;font-size:12px}.dsh-icon-btn-sm{width:28px;height:28px;font-size:12px}.dsh-spinner-sm{width:14px;height:14px}.dsh-code-disclosure{margin:12px 0;font-size:13px}.dsh-code-disclosure summary{cursor:pointer;color:var(--dsh-ui-muted)}.dsh-code-disclosure pre{border-radius:var(--dsw-radius-sm);background:var(--dsh-ui-elevated);font:12px/1.5 var(--ds-font-family-code);white-space:pre-wrap;margin:8px 0 0;padding:10px;overflow:auto}.dsh-input:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-input:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-input:disabled{opacity:.55;cursor:not-allowed}.dsh-checkbox,.dsh-core-root input[type=checkbox]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}.dsh-checkbox:focus-visible,.dsh-core-root input[type=checkbox]:focus-visible{outline:2px solid var(--dsh-ui-accent);outline-offset:2px}.dsh-checkbox:disabled,.dsh-core-root input[type=checkbox]:disabled{cursor:not-allowed;opacity:.55}.dsh-btn{font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;white-space:nowrap;cursor:pointer;border-radius:6px;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,border-color .15s;display:inline-flex}.dsh-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-btn:disabled{opacity:.55;cursor:not-allowed}.dsh-btn-primary{background:var(--dsh-ui-primary-bg);color:var(--dsh-ui-primary-fg);border-color:#0000}.dsh-btn-primary:hover:not(:disabled){background:color-mix(in srgb, var(--dsh-ui-primary-bg) 90%, var(--dsh-ui-primary-fg));color:var(--dsh-ui-primary-fg)}.dsh-btn-danger{color:var(--dsh-ui-danger);border-color:var(--dsh-ui-danger-soft);background:var(--dsh-ui-danger-soft)}.dsh-btn-sm{height:28px;min-height:28px;padding:0 10px;font-size:11px}.dsh-btn.dsh-collection-add-btn{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l3,var(--dsh-ui-border-strong));border-radius:var(--dsw-radius-lg,12px);width:100%;min-width:0;height:auto;min-height:44px;color:var(--dsw-alias-label-primary,var(--dsh-ui-text));font:inherit;white-space:normal;overflow-wrap:anywhere;background:0 0;flex:1 1 0;gap:6px;padding:10px 14px;font-size:14px;font-weight:400;line-height:22px}.dsh-collection-add-icon{flex:none}.dsh-collection-add-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsh-ui-hover))}.dsh-collection-add-btn:active:not(:disabled){background:var(--dsh-ui-active)}.dsh-collection-add-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsh-ui-focus-ring));outline-offset:2px}.dsh-collection-add-btn:disabled{opacity:.4;cursor:default}.dsh-icon-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:32px;min-width:32px;height:32px;min-height:32px;color:var(--dsh-ui-text);cursor:pointer;border-radius:6px;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:background-color .15s;display:inline-flex}.dsh-icon-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-tabs{border:1px solid var(--dsh-ui-border);background:var(--dsh-ui-elevated);border-radius:8px;align-items:center;gap:4px;width:fit-content;max-width:100%;padding:3px;display:inline-flex}.dsh-radio-card-group{box-sizing:border-box;width:100%;min-width:0;color:var(--dsh-ui-text);border:0;margin:0;padding:0}.dsh-radio-card-legend{overflow-wrap:anywhere;max-width:100%;margin-bottom:10px;padding:0}.dsh-radio-card-options{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px;min-width:0;display:grid}.dsh-radio-card{box-sizing:border-box;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);min-width:0;min-height:44px;color:var(--dsh-ui-text);cursor:pointer;border-radius:10px;align-items:flex-start;gap:10px;padding:14px;display:flex}.dsh-radio-card:hover:not(:has(input:disabled)){background:var(--dsh-ui-hover)}.dsh-radio-card:has(input:checked){border-color:var(--dsh-ui-accent);box-shadow:inset 0 0 0 1px var(--dsh-ui-accent);background:var(--dsh-ui-elevated)}.dsh-radio-card:has(input:focus-visible){outline:2px solid var(--dsh-ui-focus-ring);outline-offset:2px}.dsh-radio-card:has(input:disabled){opacity:.55;cursor:not-allowed}.dsh-radio-card input{width:16px;height:16px;accent-color:var(--dsh-ui-accent);cursor:inherit;flex:none;margin:2px 0 0}.dsh-radio-card-content{overflow-wrap:anywhere;gap:6px;min-width:0;display:grid}.dsh-radio-card-title{font-weight:600}.dsh-radio-card-description{color:var(--dsh-ui-muted);line-height:1.5}.dsh-tab{height:28px;color:var(--dsh-ui-muted);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #0000;border-radius:6px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:inline-flex}.dsh-tab.active{background:var(--dsh-ui-surface);color:var(--dsh-ui-text);border-color:var(--dsh-ui-border-strong)}.dsh-modal-backdrop{z-index:1000;background:var(--dsh-ui-backdrop);place-items:center;padding:16px;display:grid;position:fixed;inset:0;overflow:auto}.dsh-modal-backdrop-control{background:0 0;border:0;width:100%;height:100%;padding:0;position:absolute;inset:0}.dsh-modal-card{z-index:1;background:var(--dsh-ui-bg-modal);width:min(760px,100%);max-height:calc(100dvh - 32px);color:var(--dsh-ui-text);border:1px solid var(--dsh-ui-border-strong);box-shadow:var(--dsh-ui-shadow-elevated);border-radius:10px;position:relative;overflow:auto}.dsh-modal-header{border-bottom:1px solid var(--dsh-ui-border);justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;display:flex}.dsh-modal-close{width:28px;height:28px;color:var(--dsh-ui-text);cursor:pointer;background:0 0;border:0;border-radius:50%;place-items:center;padding:0;font-size:22px;line-height:1;display:inline-grid}.dsh-modal-close:hover{background:var(--dsh-ui-hover)}.dsh-modal-body{padding:16px}.dsh-modal-footer{border-top:1px solid var(--dsh-ui-border);justify-content:flex-end;gap:8px;padding:12px 16px;display:flex}.dsh-modal-title{overflow-wrap:anywhere;flex:auto;min-width:0;font-size:18px;font-weight:600;line-height:24px}.dsh-modal-actions{flex:none;align-items:center;gap:8px;display:flex}@keyframes dsh-pulse{0%,to{opacity:.55}50%{opacity:.9}}@keyframes dsh-spin{to{transform:rotate(360deg)}}.dsh-skeleton{background:var(--dsh-ui-elevated);border-radius:6px;animation:1.4s ease-in-out infinite dsh-pulse;display:block}.dsh-spinner{box-sizing:border-box;border:2px solid var(--dsw-alias-border-l2,var(--dsh-ui-border-strong));border-top-color:var(--dsw-alias-label-tertiary,var(--dsh-ui-muted));corner-shape:round;border-radius:50%;flex-shrink:0;width:20px;height:20px;animation:.8s linear infinite dsh-spin;display:inline-block}.dsh-progress-bar{background:var(--dsh-ui-elevated);border-radius:999px;width:100%;height:3px;position:relative;overflow:hidden}.dsh-progress-bar:after{content:\"\";background:var(--dsh-ui-accent);animation:1.1s ease-in-out infinite dsh-pulse;position:absolute;inset:0}.dsh-linear-progress{background:var(--dsw-alias-border-l3);border-radius:999px;width:100%;height:6px;position:relative;overflow:hidden}.dsh-linear-progress[data-size=small]{height:4px}.dsh-linear-progress:before{content:\"\";width:var(--dsh-progress-value,0%);border-radius:inherit;background:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));transition:width .16s;position:absolute;inset:0 auto 0 0}.dsh-circular-progress{flex:none;display:block;overflow:visible}.dsh-circular-progress-track{fill:none;stroke:var(--dsw-alias-border-l3)}.dsh-circular-progress-fill{fill:none;stroke:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));stroke-linecap:round}.dsh-tooltip{flex:none;align-items:center;display:inline-flex}.dsh-tooltip-trigger{appearance:none;border-radius:var(--dsw-radius-sm);color:inherit;font:inherit;text-align:inherit;cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;margin:0;padding:0;display:inline-flex}.dsh-popover{align-items:center;display:inline-flex}.dsh-popover-trigger{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;padding:0;display:inline-flex}.dsh-tooltip-trigger:focus-visible,.dsh-popover-trigger:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill);outline-offset:2px}.dsh-tooltip-content,.dsh-popover-content{font-family:var(--dsw-font-family);z-index:1100;box-sizing:border-box;width:max-content;max-width:calc(100vw - 24px);max-height:calc(100dvh - 12px - max(12px, var(--dsh-frame-overlay-top,12px)));border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);--dsh-tooltip-surface:var(--dsw-specific-menu);border-radius:var(--dsw-radius-lg);min-height:0;color:var(--dsw-alias-tooltip-label);cursor:default;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;position-area:none;top:max(12px, var(--dsh-frame-overlay-top,12px));bottom:max(12px, anchor(top) + 8px);left:max(12px, anchor(left));position-try-fallbacks:--dsh-core-tooltip-window, --dsh-core-tooltip-opposite, --dsh-core-tooltip-wide-opposite, --dsh-core-tooltip-tall, --dsh-core-tooltip-viewport;border:0;place-self:end start;height:fit-content;margin:0;padding:3px 7px;font-size:13px;line-height:20px;position:fixed;right:12px;overflow:auto}@position-try --dsh-core-tooltip-window{}@position-try --dsh-core-tooltip-opposite{}@position-try --dsh-core-tooltip-wide-opposite{}@position-try --dsh-core-tooltip-tall{}@position-try --dsh-core-tooltip-viewport{}", ce = "kalex-dsh-core-theme-styles", le = oe.scope;
function $(e = [
	".dsh-core-root",
	".ar-root",
	".ar-settings-root"
]) {
	let t = e.join(","), n = H(z("dark").tokens), r = e.map((e) => `${e}[data-theme="light"]`).join(","), i = H(z("light").tokens), a = B();
	return `${t}{${n}}\n${r}{${i}}\n${(Array.isArray(a) ? a : []).filter((e) => e.id !== "dark" && e.id !== "light").map((t) => `${e.map((e) => `${e}[data-theme="${t.id}"]`).join(",")}{${H(t.tokens)}}`).join("\n")}\n${se}`;
}
var ue = $(), de = /* @__PURE__ */ new Map(), fe = !1;
function pe() {
	if (typeof document < "u") for (let [e, t] of de) {
		let n = document.getElementById(e);
		n && (n.textContent = t ? `${$()}\n${t}` : $());
	}
}
function me(e = ce, t) {
	if (typeof document > "u" || !document.head) return;
	de.set(e, t);
	let n = document.getElementById(e);
	n || (n = document.createElement("style"), n.id = e, document.head.appendChild(n)), n.textContent = t ? `${$()}\n${t}` : $(), fe ||= (L(pe), !0);
}
// src/components/ThemedSelect/ThemedSelect.tsx
function he(e) {
	let t = (0, g.c)(56), { value: n, size: r, options: i, onChange: a, ariaLabel: s, disabled: u, fullWidth: p, showCheckmark: m, className: h, triggerClassName: y, menuClassName: b, optionClassName: x } = e, S = r === void 0 ? "standard" : r, C = u !== void 0 && u, w = p !== void 0 && p, T = m !== void 0 && m, E = c(void 0), [D, O] = l(!1), k;
	if (t[0] !== i || t[1] !== n) {
		let e;
		t[3] === n ? e = t[4] : (e = (e) => e.value === n, t[3] = n, t[4] = e), k = i.findIndex(e), t[0] = i, t[1] = n, t[2] = k;
	} else k = t[2];
	let A = Math.max(k, 0), [j, M] = l(A), N = i[A], P, F;
	t[5] === D ? (P = t[6], F = t[7]) : (P = () => {
		if (!D || typeof document > "u") return;
		let e = (e) => {
			let t = e.target;
			E.current && t && !E.current.contains(t) && O(!1);
		};
		return document.addEventListener("mousedown", e, !0), () => {
			document.removeEventListener("mousedown", e, !0);
		};
	}, F = [D], t[5] = D, t[6] = P, t[7] = F), o(P, F);
	let I;
	t[8] === i.length ? I = t[9] : (I = (e) => {
		i.length !== 0 && M((t) => (t + e + i.length) % i.length);
	}, t[8] = i.length, t[9] = I);
	let L = I, R;
	t[10] !== j || t[11] !== C || t[12] !== L || t[13] !== a || t[14] !== D || t[15] !== i || t[16] !== A ? (R = (e) => {
		if (!(C || i.length === 0)) {
			if (e.key === "Escape") O(!1);
			else if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault(), D ? L(e.key === "ArrowDown" ? 1 : -1) : (M(A), O(!0));
			else if (e.key === "Enter") {
				if (e.preventDefault(), !D) M(A), O(!0);
				else {
					let e = i[j];
					e && !e.disabled && (a(e.value), O(!1));
				}
			}
		}
	}, t[10] = j, t[11] = C, t[12] = L, t[13] = a, t[14] = D, t[15] = i, t[16] = A, t[17] = R) : R = t[17];
	let z = R, B;
	t[18] === Symbol.for("react.memo_cache_sentinel") ? (B = (e) => {
		E.current = e ?? void 0;
	}, t[18] = B) : B = t[18];
	let V = S === "small" && "dsh-select-sm", H = w && "dsh-select-full", U;
	t[19] !== h || t[20] !== V || t[21] !== H ? (U = v(le, "dsh-select", "ar-themed-select", V, H, h), t[19] = h, t[20] = V, t[21] = H, t[22] = U) : U = t[22];
	let W;
	t[23] === y ? W = t[24] : (W = v("dsh-select-trigger", "ar-themed-select-trigger", y), t[23] = y, t[24] = W);
	let G;
	t[25] !== C || t[26] !== A ? (G = () => {
		C || (M(A), O(ge));
	}, t[25] = C, t[26] = A, t[27] = G) : G = t[27];
	let K = N?.label ?? "", q;
	t[28] === K ? q = t[29] : (q = /* @__PURE__ */ d("span", {
		className: "dsh-select-label",
		children: K
	}), t[28] = K, t[29] = q);
	let J = D ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6", Y;
	t[30] === J ? Y = t[31] : (Y = /* @__PURE__ */ d("svg", {
		width: 14,
		height: 14,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: /* @__PURE__ */ d("path", { d: J })
	}), t[30] = J, t[31] = Y);
	let X;
	t[32] !== s || t[33] !== C || t[34] !== z || t[35] !== D || t[36] !== W || t[37] !== G || t[38] !== q || t[39] !== Y ? (X = /* @__PURE__ */ f("button", {
		type: "button",
		"data-testid": _.Common.SelectTrigger,
		className: W,
		"aria-label": s,
		"aria-haspopup": "listbox",
		"aria-expanded": D,
		disabled: C,
		onKeyDown: z,
		onClick: G,
		children: [q, Y]
	}), t[32] = s, t[33] = C, t[34] = z, t[35] = D, t[36] = W, t[37] = G, t[38] = q, t[39] = Y, t[40] = X) : X = t[40];
	let Z;
	t[41] !== j || t[42] !== s || t[43] !== b || t[44] !== a || t[45] !== D || t[46] !== x || t[47] !== i || t[48] !== A || t[49] !== T ? (Z = D ? /* @__PURE__ */ d("div", {
		role: "listbox",
		"aria-label": s,
		"data-testid": _.Common.SelectMenu,
		className: v("dsh-select-menu", "ar-themed-select-menu", b),
		children: i.map((e, t) => {
			let n = t === A, r = t === j;
			return /* @__PURE__ */ f("button", {
				type: "button",
				role: "option",
				"data-testid": _.Common.SelectOption,
				"aria-selected": n,
				disabled: e.disabled,
				className: v("dsh-select-option", (r || n) && "active", x),
				onMouseEnter: () => M(t),
				onClick: () => {
					e.disabled || (a(e.value), O(!1));
				},
				children: [/* @__PURE__ */ d("span", { children: e.label }), T && n ? /* @__PURE__ */ d("span", {
					"aria-hidden": "true",
					children: "✓"
				}) : void 0]
			}, e.value);
		})
	}) : void 0, t[41] = j, t[42] = s, t[43] = b, t[44] = a, t[45] = D, t[46] = x, t[47] = i, t[48] = A, t[49] = T, t[50] = Z) : Z = t[50];
	let Q;
	return t[51] !== S || t[52] !== U || t[53] !== X || t[54] !== Z ? (Q = /* @__PURE__ */ f("div", {
		ref: B,
		className: U,
		"data-size": S,
		children: [X, Z]
	}), t[51] = S, t[52] = U, t[53] = X, t[54] = Z, t[55] = Q) : Q = t[55], Q;
}
function ge(e) {
	return !e;
}
// src/components/Tooltip/tooltip-placement.ts
var _e = {
	right: "left",
	left: "right",
	top: "bottom",
	bottom: "top"
};
function ve(e) {
	let t = Math.min(e.width, Math.max(0, e.viewportWidth - 24)), n = Math.min(e.height, Math.max(0, e.viewportHeight - 24)), r = (n) => Math.max(12, Math.min(n, e.viewportWidth - 12 - t)), i = (t) => Math.max(12, Math.min(t, e.viewportHeight - 12 - n)), a = {
		right: {
			left: e.anchor.right + 10,
			top: i((e.anchor.top + e.anchor.bottom - n) / 2)
		},
		left: {
			left: e.anchor.left - 10 - t,
			top: i((e.anchor.top + e.anchor.bottom - n) / 2)
		},
		bottom: {
			left: r(e.align === "end" ? e.anchor.right - t : (e.anchor.left + e.anchor.right - t) / 2),
			top: e.anchor.bottom + e.gap
		},
		top: {
			left: r(e.align === "end" ? e.anchor.right - t : (e.anchor.left + e.anchor.right - t) / 2),
			top: e.anchor.top - e.gap - n
		}
	}, o = e.side === "right" || e.side === "left", s = [
		e.side,
		_e[e.side],
		...o ? ["bottom", "top"] : ["right", "left"]
	];
	for (let r of s) {
		let i = a[r];
		if (i.left >= 12 && i.top >= 12 && i.left + t <= e.viewportWidth - 12 && i.top + n <= e.viewportHeight - 12) return {
			...i,
			width: t,
			height: n,
			side: r,
			overflow: !1
		};
	}
	let c = a[e.side];
	return {
		left: r(c.left),
		top: i(c.top),
		width: t,
		height: n,
		side: e.side,
		overflow: !0
	};
}
// src/components/Tooltip/input-modality.ts
var ye = "data-input-modality", be = !1;
typeof window < "u" && (window.addEventListener("pointerdown", () => {
	be = !0, document.documentElement.setAttribute(ye, "pointer");
}, !0), window.addEventListener("keydown", (e) => {
	be = !1, e.isComposing || document.documentElement.setAttribute(ye, "keyboard");
}, !0));
function xe() {
	return be;
}
// src/components/Tooltip/Tooltip.tsx
function Se({ children: e, content: t, triggerLabel: r, theme: u, triggerMode: m = "hover", contentLabel: h = r, delayMs: g = 0, className: _, triggerClassName: y, contentClassName: b, triggerElement: x, side: S = "right", align: C = "center", portal: w = !0, "data-testid": T }) {
	let E = q(u ?? "auto"), D = s(), O = c(null), k = c(null), A = c(void 0), [j, M] = l(!1), [N, P] = l(void 0), F = a(() => {
		A.current !== void 0 && clearTimeout(A.current), A.current = void 0;
	}, []), I = a(() => {
		O.current && (P({
			anchor: O.current.getBoundingClientRect(),
			width: 0,
			height: 0
		}), M(!0));
	}, []), L = a(() => {
		F(), g <= 0 ? I() : A.current = setTimeout(I, g);
	}, [
		F,
		g,
		I
	]), R = a(() => {
		F(), M(!1), P(void 0);
	}, [F]);
	o(() => () => F(), [F]), o(() => {
		if (!j || !k.current || !N) return;
		let e = () => {
			if (!O.current || !k.current) return;
			let e = k.current.getBoundingClientRect();
			P((t) => t && {
				anchor: O.current?.getBoundingClientRect() ?? t.anchor,
				width: e.width,
				height: e.height
			});
		}, t = new ResizeObserver(e);
		return t.observe(k.current), window.addEventListener("resize", e), e(), () => {
			t.disconnect(), window.removeEventListener("resize", e);
		};
	}, [j, N]);
	let z = N && N.width > 0 ? ve({
		anchor: N.anchor,
		width: N.width,
		height: N.height,
		viewportWidth: window.innerWidth,
		viewportHeight: window.innerHeight,
		side: S,
		align: C,
		gap: 8
	}) : void 0, B = {
		"aria-label": r,
		"aria-describedby": j ? D : void 0,
		onPointerEnter: (e) => {
			m === "hover" && e.pointerType !== "touch" && L();
		},
		onPointerLeave: () => {
			m === "hover" && R();
		},
		onFocus: () => {
			m === "hover" && !xe() && L();
		},
		onBlur: R,
		onClick: m === "click" ? () => j ? R() : I() : void 0
	}, V = x === void 0 ? /* @__PURE__ */ d("button", {
		type: "button",
		className: v("dsh-tooltip-trigger", y),
		...B,
		children: e
	}) : i(e) ? n(e, {
		...B,
		className: y
	}) : /* @__PURE__ */ d("span", {
		className: v("dsh-tooltip-trigger", y),
		...B,
		children: e
	}), H = j ? /* @__PURE__ */ d("span", {
		ref: k,
		id: D,
		className: v("dsh-tooltip-content", b),
		"data-theme": u ?? E,
		role: "tooltip",
		"aria-label": h,
		style: {
			...z ? {
				left: z.left,
				top: z.top
			} : {
				left: 0,
				top: 0
			},
			visibility: z ? "visible" : "hidden"
		},
		children: t
	}) : void 0;
	return /* @__PURE__ */ f("span", {
		ref: (e) => {
			O.current = e;
		},
		className: v("dsh-tooltip", _),
		"data-testid": T,
		children: [V, w && H ? p(H, document.body) : H]
	});
}
// src/constants/delay.ts
var Ce = {
	AnimationShort: 180,
	Animation: 300,
	AutocompleteSearch: 300,
	PollingDefault: 3e3
}, we = {
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
function Te(e, t) {
	let n = (0, g.c)(4), r = t === void 0 ? Ce.AutocompleteSearch : t, [i, a] = l(e), s, c;
	return n[0] !== r || n[1] !== e ? (s = () => {
		let t = setTimeout(() => {
			a(e);
		}, r);
		return () => {
			clearTimeout(t);
		};
	}, c = [e, r], n[0] = r, n[1] = e, n[2] = s, n[3] = c) : (s = n[2], c = n[3]), o(s, c), i;
}
// src/hooks/useDshThemeRevision.ts
function Ee() {
	return u(L, I, I);
}
// src/hooks/useLocalePreference.ts
function De(e, t) {
	return e === "ru" || e === "en" ? e : String(t || (typeof document < "u" ? document.documentElement?.lang : "") || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}
function Oe(e, t) {
	try {
		let n = (t ?? (typeof localStorage < "u" ? localStorage : void 0))?.getItem(e);
		return n === "ru" || n === "en" ? n : void 0;
	} catch {
		return;
	}
}
function ke(e, t, n) {
	if (t === "ru" || t === "en") try {
		(n ?? (typeof localStorage < "u" ? localStorage : void 0))?.setItem(e, t);
	} catch {}
}
// src/utils/formatMessage.ts
function Ae(e, ...t) {
	return e.replace(/\{(\d+)\}/g, (e, n) => {
		let r = t[Number.parseInt(n, 10)];
		return r === void 0 ? e : String(r);
	});
}
// src/utils/hostSanitizer.ts
function je(e) {
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
function Me(e) {
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
export { y as Button, S as Checkbox, A as ChildrenLazy, ee as CircularProgress, E as CloseIcon, C as CodeDisclosure, b as CollectionAddButton, we as CoreLocalization, Ce as Delay, x as IconButton, w as InfoIcon, te as LinearProgress, J as Modal, X as Popover, D as ProgressBar, ne as RadioCardGroup, T as SettingsIcon, O as Skeleton, k as Spinner, re as SwitchControl, ie as Tabs, _ as TestId, ae as TextField, he as ThemedSelect, Se as Tooltip, $ as buildCoreThemeStyles, H as buildThemeCssVariables, le as coreStyleScopeClass, ue as coreThemeStyles, v as cx, j as darkThemeTokens, K as detectHostTheme, me as ensureCoreStyles, Me as extractHost, Ae as formatMessage, z as getDshTheme, I as getDshThemeRevision, M as lightThemeTokens, B as listDshThemes, ke as persistLocale, Oe as readSavedLocale, R as registerDshTheme, De as resolveDshLocale, je as sanitizeHostInput, L as subscribeDshThemeChanges, Te as useDebouncedValue, Ee as useDshThemeRevision, q as useEffectiveTheme };
