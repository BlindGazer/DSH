import { Suspense as e, useEffect as t, useRef as n, useState as r, useSyncExternalStore as i } from "react";
import { jsx as a, jsxs as o } from "react/jsx-runtime";
// \0rolldown/runtime.js
var s = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), c = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}), l = (/* @__PURE__ */ s(((e, t) => {
	var n = Object.create, r = Object.defineProperty, i = Object.getOwnPropertyDescriptor, a = Object.getOwnPropertyNames, o = Object.getPrototypeOf, s = Object.prototype.hasOwnProperty, l = (e, t) => {
		for (var n in t) r(e, n, {
			get: t[n],
			enumerable: !0
		});
	}, u = (e, t, n, o) => {
		if (t && typeof t == "object" || typeof t == "function") for (let c of a(t)) !s.call(e, c) && c !== n && r(e, c, {
			get: () => t[c],
			enumerable: !(o = i(t, c)) || o.enumerable
		});
		return e;
	}, d = (e, t, i) => (i = e == null ? {} : n(o(e)), u(t || !e || !e.__esModule ? r(i, "default", {
		value: e,
		enumerable: !0
	}) : i, e)), f = (e) => u(r({}, "__esModule", { value: !0 }), e), p = {};
	l(p, {
		$dispatcherGuard: () => T,
		$makeReadOnly: () => D,
		$reset: () => E,
		$structuralCheck: () => P,
		c: () => b,
		clearRenderCounterRegistry: () => k,
		renderCounterRegistry: () => O,
		useRenderCounter: () => M
	}), t.exports = f(p);
	var m = d(c("react")), { useRef: h, useEffect: g, isValidElement: _ } = m, v = m.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ?? m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, y = Symbol.for("react.memo_cache_sentinel"), b = typeof m.__COMPILER_RUNTIME?.c == "function" ? m.__COMPILER_RUNTIME.c : function(e) {
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
})))(), u = { Common: {
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
function d(...e) {
	return e.filter((e) => typeof e == "string" && e.trim().length > 0).join(" ");
}
// src/components/Button/Button.tsx
function f(e) {
	let t = (0, l.c)(13), { children: n, onClick: r, variant: i, size: o, disabled: s, title: c, ariaLabel: f, className: p, type: m } = e, h = i === void 0 ? "secondary" : i, g = o === void 0 ? "md" : o, _ = s !== void 0 && s, v = m === void 0 ? "button" : m, y = h === "primary" && "dsh-btn-primary", b = h === "danger" && "dsh-btn-danger", x = g === "sm" && "dsh-btn-sm ar-btn-sm", S;
	t[0] !== p || t[1] !== y || t[2] !== b || t[3] !== x ? (S = d("dsh-btn", y, b, x, p), t[0] = p, t[1] = y, t[2] = b, t[3] = x, t[4] = S) : S = t[4];
	let C;
	return t[5] !== f || t[6] !== n || t[7] !== _ || t[8] !== r || t[9] !== S || t[10] !== c || t[11] !== v ? (C = /* @__PURE__ */ a("button", {
		type: v,
		"data-testid": u.Common.Button,
		disabled: _,
		title: c,
		"aria-label": f,
		onClick: r,
		className: S,
		children: n
	}), t[5] = f, t[6] = n, t[7] = _, t[8] = r, t[9] = S, t[10] = c, t[11] = v, t[12] = C) : C = t[12], C;
}
// src/components/Button/IconButton.tsx
function p(e) {
	let t = (0, l.c)(9), { children: n, ariaLabel: r, title: i, onClick: o, disabled: s, className: c } = e, f = s !== void 0 && s, p = i ?? r, m;
	t[0] === c ? m = t[1] : (m = d("dsh-icon-btn", c), t[0] = c, t[1] = m);
	let h;
	return t[2] !== r || t[3] !== n || t[4] !== f || t[5] !== o || t[6] !== p || t[7] !== m ? (h = /* @__PURE__ */ a("button", {
		type: "button",
		"data-testid": u.Common.IconButton,
		"aria-label": r,
		title: p,
		disabled: f,
		onClick: o,
		className: m,
		children: n
	}), t[2] = r, t[3] = n, t[4] = f, t[5] = o, t[6] = p, t[7] = m, t[8] = h) : h = t[8], h;
}
// src/components/Loader/ProgressBar.tsx
function m(e) {
	let t = (0, l.c)(5), { label: n, className: r } = e, i = n === void 0 ? "Loading..." : n, o;
	t[0] === r ? o = t[1] : (o = d("dsh-progress-bar", r), t[0] = r, t[1] = o);
	let s;
	return t[2] !== i || t[3] !== o ? (s = /* @__PURE__ */ a("div", {
		role: "progressbar",
		"aria-label": i,
		"data-testid": u.Common.Loading,
		className: o
	}), t[2] = i, t[3] = o, t[4] = s) : s = t[4], s;
}
// src/components/Loader/Skeleton.tsx
function h(e) {
	let t = (0, l.c)(9), { width: n, height: r, markLoadingRoot: i, className: o } = e, s = n === void 0 ? "100%" : n, c = r === void 0 ? 32 : r, f = i === void 0 || i ? u.Common.Loading : void 0, p;
	t[0] !== c || t[1] !== s ? (p = {
		width: s,
		height: c
	}, t[0] = c, t[1] = s, t[2] = p) : p = t[2];
	let m;
	t[3] === o ? m = t[4] : (m = d("dsh-skeleton", o), t[3] = o, t[4] = m);
	let h;
	return t[5] !== f || t[6] !== p || t[7] !== m ? (h = /* @__PURE__ */ a("div", {
		"aria-busy": "true",
		"data-testid": f,
		style: p,
		className: m
	}), t[5] = f, t[6] = p, t[7] = m, t[8] = h) : h = t[8], h;
}
// src/components/Loader/Spinner.tsx
function g(e) {
	let t = (0, l.c)(6), { label: n, markLoadingRoot: r, className: i } = e, o = n === void 0 ? "Loading..." : n, s = r === void 0 || r ? u.Common.Loading : void 0, c;
	t[0] === i ? c = t[1] : (c = d("dsh-spinner", i), t[0] = i, t[1] = c);
	let f;
	return t[2] !== o || t[3] !== s || t[4] !== c ? (f = /* @__PURE__ */ a("span", {
		role: "status",
		"aria-label": o,
		"data-testid": s,
		className: c
	}), t[2] = o, t[3] = s, t[4] = c, t[5] = f) : f = t[5], f;
}
// src/components/Loader/ChildrenLazy.tsx
function _(t) {
	let n = (0, l.c)(6), { variant: r, loader: i, children: o } = t, s = r === void 0 ? "spinner" : r, c;
	n[0] !== i || n[1] !== s ? (c = i === void 0 ? a(s === "progress" ? m : s === "skeleton" ? h : g, {}) : i, n[0] = i, n[1] = s, n[2] = c) : c = n[2];
	let u = c, d;
	return n[3] !== o || n[4] !== u ? (d = /* @__PURE__ */ a(e, {
		fallback: u,
		children: o
	}), n[3] = o, n[4] = u, n[5] = d) : d = n[5], d;
}
// src/components/Modal/Modal.tsx
function v(e) {
	let r = (0, l.c)(27), { open: i, onClose: s, title: c, headerExtra: f, closeLabel: p, theme: m, backdropClassName: h, cardClassName: g, children: _ } = e, v = p === void 0 ? "Close" : p, b = n(void 0), x = n(s), S, C;
	r[0] === s ? (S = r[1], C = r[2]) : (S = () => {
		x.current = s;
	}, C = [s], r[0] = s, r[1] = S, r[2] = C), t(S, C);
	let w, T;
	if (r[3] === i ? (w = r[4], T = r[5]) : (w = () => {
		if (!i || typeof document > "u") return;
		let e = document.activeElement, t = b.current, n = () => Array.from(t?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])") ?? []).filter(y), r = (e) => {
			if (e.key === "Escape") {
				x.current();
				return;
			}
			if (e.key !== "Tab" || !t) return;
			let r = n(), i = r[0], a = r.at(-1);
			!i || !a ? (e.preventDefault(), t.focus()) : e.shiftKey && (document.activeElement === i || !t.contains(document.activeElement)) ? (e.preventDefault(), a.focus()) : e.shiftKey || document.activeElement !== a && t.contains(document.activeElement) || (e.preventDefault(), i.focus());
		};
		return n()[0]?.focus(), document.addEventListener("keydown", r), () => {
			document.removeEventListener("keydown", r), e instanceof HTMLElement && e.isConnected && e.focus();
		};
	}, T = [i], r[3] = i, r[4] = w, r[5] = T), t(w, T), !i) return;
	let E;
	r[6] === h ? E = r[7] : (E = d("dsh-modal-backdrop", "ar-modal", "kpp-modal-backdrop", h), r[6] = h, r[7] = E);
	let D;
	r[8] === s ? D = r[9] : (D = /* @__PURE__ */ a("button", {
		type: "button",
		className: "dsh-modal-backdrop-control",
		"aria-hidden": "true",
		tabIndex: -1,
		onClick: s
	}), r[8] = s, r[9] = D);
	let O;
	r[10] === Symbol.for("react.memo_cache_sentinel") ? (O = (e) => {
		b.current = e ?? void 0;
	}, r[10] = O) : O = r[10];
	let k;
	r[11] === g ? k = r[12] : (k = d("dsh-modal-card", "ar-modal-card", "kpp-modal", g), r[11] = g, r[12] = k);
	let A;
	r[13] !== v || r[14] !== f || r[15] !== s || r[16] !== c ? (A = c !== void 0 || f !== void 0 ? /* @__PURE__ */ o("div", {
		className: "dsh-modal-header kpp-modal-header",
		children: [/* @__PURE__ */ a("div", {
			className: "dsh-modal-title kpp-modal-title",
			children: c
		}), /* @__PURE__ */ o("div", {
			className: "dsh-modal-actions ar-settings-header-right",
			children: [f, /* @__PURE__ */ a("button", {
				type: "button",
				"data-testid": u.Common.ModalClose,
				className: "dsh-btn dsh-btn-sm kpp-btn kpp-btn-ghost",
				"aria-label": v,
				onClick: s,
				children: v
			})]
		})]
	}) : void 0, r[13] = v, r[14] = f, r[15] = s, r[16] = c, r[17] = A) : A = r[17];
	let j;
	r[18] !== _ || r[19] !== A || r[20] !== k ? (j = /* @__PURE__ */ o("div", {
		ref: O,
		role: "dialog",
		"aria-modal": "true",
		tabIndex: -1,
		"data-testid": u.Common.ModalCard,
		className: k,
		children: [A, _]
	}), r[18] = _, r[19] = A, r[20] = k, r[21] = j) : j = r[21];
	let M;
	return r[22] !== j || r[23] !== E || r[24] !== D || r[25] !== m ? (M = /* @__PURE__ */ o("div", {
		"data-theme": m,
		"data-testid": u.Common.ModalBackdrop,
		className: E,
		children: [D, j]
	}), r[22] = j, r[23] = E, r[24] = D, r[25] = m, r[26] = M) : M = r[26], M;
}
function y(e) {
	return !e.hasAttribute("hidden") && e.getAttribute("aria-hidden") !== "true";
}
// src/components/SwitchControl/SwitchControl.tsx
function b(e) {
	let t = (0, l.c)(14), { checked: n, onChange: r, disabled: i, labelledBy: o, ariaLabel: s, className: c } = e, f = i !== void 0 && i, p;
	t[0] === c ? p = t[1] : (p = d("dsh-switch", "ar-settings-switch", c), t[0] = c, t[1] = p);
	let m;
	t[2] !== n || t[3] !== f || t[4] !== r ? (m = () => {
		f || r(!n);
	}, t[2] = n, t[3] = f, t[4] = r, t[5] = m) : m = t[5];
	let h;
	t[6] === Symbol.for("react.memo_cache_sentinel") ? (h = /* @__PURE__ */ a("span", {}), t[6] = h) : h = t[6];
	let g;
	return t[7] !== s || t[8] !== n || t[9] !== f || t[10] !== o || t[11] !== p || t[12] !== m ? (g = /* @__PURE__ */ a("button", {
		type: "button",
		role: "switch",
		"data-testid": u.Common.Switch,
		"aria-labelledby": o,
		"aria-label": s,
		"aria-checked": n,
		disabled: f,
		className: p,
		onClick: m,
		children: h
	}), t[7] = s, t[8] = n, t[9] = f, t[10] = o, t[11] = p, t[12] = m, t[13] = g) : g = t[13], g;
}
// src/components/Tabs/Tabs.tsx
function x(e) {
	let t = (0, l.c)(15), { items: n, activeValue: r, onChange: i, ariaLabel: o, className: s, tabClassName: c } = e, f;
	t[0] === s ? f = t[1] : (f = d("dsh-tabs", "ar-tabs", s), t[0] = s, t[1] = f);
	let p;
	if (t[2] !== r || t[3] !== n || t[4] !== i || t[5] !== c) {
		let e;
		t[7] !== r || t[8] !== i || t[9] !== c ? (e = (e) => {
			let t = e.value === r;
			return /* @__PURE__ */ a("button", {
				type: "button",
				role: "tab",
				"data-testid": u.Common.TabButton,
				"aria-selected": t,
				disabled: e.disabled,
				className: d("dsh-tab", "ar-tab", t && "active", c),
				onClick: () => {
					!e.disabled && e.value !== r && i(e.value);
				},
				children: e.label
			}, e.value);
		}, t[7] = r, t[8] = i, t[9] = c, t[10] = e) : e = t[10], p = n.map(e), t[2] = r, t[3] = n, t[4] = i, t[5] = c, t[6] = p;
	} else p = t[6];
	let m;
	return t[11] !== o || t[12] !== f || t[13] !== p ? (m = /* @__PURE__ */ a("div", {
		role: "tablist",
		"aria-label": o,
		"data-testid": u.Common.TabsList,
		className: f,
		children: p
	}), t[11] = o, t[12] = f, t[13] = p, t[14] = m) : m = t[14], m;
}
var S = {
	scope: "_scope_n5uq3_1",
	"dsh-pulse": "_dsh-pulse_n5uq3_1",
	"dsh-spin": "_dsh-spin_n5uq3_348"
}, C = "._scope_n5uq3_1{--dsh-style-scope:1}.dsh-select,.ar-themed-select,.kpp-dropdown{flex:0 220px;width:220px;min-width:0;max-width:100%;position:relative}.dsh-select-full,.kpp-dropdown-full{flex:auto;width:100%}.dsh-select-trigger,.ar-themed-select-trigger,.kpp-dropdown-trigger{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:100%;height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;text-align:left;cursor:pointer;border-radius:6px;justify-content:space-between;align-items:center;gap:8px;padding:0 10px;font-size:12px;transition:background-color .15s,border-color .15s,box-shadow .15s;display:flex}.dsh-select-trigger:hover:not(:disabled),.ar-themed-select-trigger:hover:not(:disabled),.kpp-dropdown-trigger:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-select-trigger:focus-visible,.ar-themed-select-trigger:focus-visible,.kpp-dropdown-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-select-trigger:disabled,.ar-themed-select-trigger:disabled,.kpp-dropdown-trigger:disabled{opacity:.55;cursor:not-allowed}.dsh-select-label,.ar-themed-select-trigger span:first-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dsh-select-menu,.ar-themed-select-menu,.kpp-dropdown-menu{z-index:30;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);max-height:220px;box-shadow:var(--dsh-ui-shadow-elevated);border-radius:8px;padding:4px;position:absolute;top:calc(100% + 4px);left:0;right:0;overflow:auto}.dsh-select-option,.ar-themed-select-menu button,.kpp-dropdown-item{width:100%;min-height:30px;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:12px;transition:background-color .12s;display:flex;color:var(--dsh-ui-text)!important}.dsh-select-option:hover,.dsh-select-option.active,.ar-themed-select-menu button:hover,.ar-themed-select-menu button.active,.kpp-dropdown-item:hover,.kpp-dropdown-item-active{background:var(--dsh-ui-hover);color:var(--dsh-ui-text)!important}.dsh-switch,.ar-settings-switch{background:var(--dsh-ui-switch-off);cursor:pointer;border:0;border-radius:999px;align-items:center;width:36px;height:20px;padding:2px;transition:background-color .16s;display:inline-flex;position:relative}.dsh-switch[aria-checked=true],.ar-settings-switch[aria-checked=true]{background:var(--dsh-ui-switch-on)}.dsh-switch:disabled,.ar-settings-switch:disabled{opacity:.5;cursor:not-allowed}.dsh-switch span,.ar-settings-switch span{background:var(--dsh-ui-switch-thumb-off);border-radius:50%;width:16px;height:16px;transition:transform .16s,background-color .16s;display:block}.dsh-switch[aria-checked=true] span,.ar-settings-switch[aria-checked=true] span{background:var(--dsh-ui-switch-thumb-on);transform:translate(16px)}.dsh-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);height:32px;min-height:32px;color:var(--dsh-ui-text);font:inherit;white-space:nowrap;cursor:pointer;border-radius:6px;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,border-color .15s;display:inline-flex}.dsh-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-btn:disabled{opacity:.55;cursor:not-allowed}.dsh-btn-primary{background:var(--dsh-ui-primary-bg);color:var(--dsh-ui-primary-fg);border-color:#0000}.dsh-btn-danger{color:var(--dsh-ui-danger);border-color:var(--dsh-ui-danger-soft);background:var(--dsh-ui-danger-soft)}.dsh-btn-sm{height:28px;min-height:28px;padding:0 10px;font-size:11px}.dsh-icon-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:32px;min-width:32px;height:32px;min-height:32px;color:var(--dsh-ui-text);cursor:pointer;border-radius:6px;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:background-color .15s;display:inline-flex}.dsh-icon-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-tabs{border:1px solid var(--dsh-ui-border);background:var(--dsh-ui-elevated);border-radius:8px;align-items:center;gap:4px;width:fit-content;max-width:100%;padding:3px;display:inline-flex}.dsh-tab{height:28px;color:var(--dsh-ui-muted);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #0000;border-radius:6px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:inline-flex}.dsh-tab.active{background:var(--dsh-ui-surface);color:var(--dsh-ui-text);border-color:var(--dsh-ui-border-strong)}.dsh-modal-backdrop{z-index:1000;background:var(--dsh-ui-backdrop);place-items:center;padding:16px;display:grid;position:fixed;inset:0;overflow:auto}.dsh-modal-backdrop-control{background:0 0;border:0;width:100%;height:100%;padding:0;position:absolute;inset:0}.dsh-modal-card{z-index:1;background:var(--dsh-ui-bg-modal);width:min(760px,100%);max-height:calc(100dvh - 32px);color:var(--dsh-ui-text);border:1px solid var(--dsh-ui-border-strong);box-shadow:var(--dsh-ui-shadow-elevated);border-radius:10px;position:relative;overflow:auto}.dsh-modal-header{border-bottom:1px solid var(--dsh-ui-border);justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;display:flex}.dsh-modal-title{overflow-wrap:anywhere;flex:auto;min-width:0;font-size:18px;font-weight:600;line-height:24px}.dsh-modal-actions{flex:none;align-items:center;gap:8px;display:flex}input[type=checkbox]{appearance:none;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);cursor:pointer;border-radius:3px;flex:none;place-content:center;width:16px;height:16px;margin:0;display:inline-grid}input[type=checkbox]:after{border:solid var(--dsh-ui-on-accent);content:\"\";border-width:0 2px 2px 0;width:4px;height:8px;transform:rotate(45deg)scale(0)}input[type=checkbox]:checked{border-color:var(--dsh-ui-accent);background:var(--dsh-ui-accent)}input[type=checkbox]:checked:after{transform:rotate(45deg)scale(1)}input[type=checkbox]:focus-visible{outline:2px solid var(--dsh-ui-focus-ring);outline-offset:2px}input[type=checkbox]:disabled{opacity:.55;cursor:not-allowed}@keyframes _dsh-pulse_n5uq3_1{0%,to{opacity:.55}50%{opacity:.9}}@keyframes _dsh-spin_n5uq3_348{to{transform:rotate(360deg)}}.dsh-skeleton{background:var(--dsh-ui-elevated);border-radius:6px;animation:1.4s ease-in-out infinite dsh-pulse;display:block}.dsh-spinner{border:2px solid var(--dsh-ui-border-strong);border-top-color:var(--dsh-ui-accent);border-radius:50%;width:14px;height:14px;animation:.75s linear infinite dsh-spin;display:inline-block}.dsh-progress-bar{background:var(--dsh-ui-elevated);border-radius:999px;width:100%;height:3px;position:relative;overflow:hidden}.dsh-progress-bar:after{content:\"\";background:var(--dsh-ui-accent);animation:1.1s ease-in-out infinite dsh-pulse;position:absolute;inset:0}", w = {
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
}, T = {
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
}, E = /* @__PURE__ */ new Map([["dark", {
	id: "dark",
	baseMode: "dark",
	tokens: w
}], ["light", {
	id: "light",
	baseMode: "light",
	tokens: T
}]]), D = /* @__PURE__ */ new Set(), O = 0;
function k() {
	return O;
}
function A(e) {
	return D.add(e), () => {
		D.delete(e);
	};
}
function j(e) {
	E.set(e.id, e), O += 1, D.forEach((e) => {
		e();
	});
}
function M(e) {
	return E.get(e) ?? {
		id: "dark",
		baseMode: "dark",
		tokens: w
	};
}
function N() {
	return [...E.values()];
}
var P = [
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
function F(e, t) {
	let n = t ? {
		...e,
		...t
	} : e;
	return P.map(([e, t]) => `${t}:${n[e]}`).join(";");
}
// src/theme/styles.ts
var I = "kalex-dsh-core-theme-styles", L = S.scope;
function R(e = [
	".dsh-core-root",
	".ar-root",
	".ar-settings-root",
	".kpp-root",
	".kpp-card-bar",
	".kpp-footer-row",
	".kpp-modal-backdrop",
	".kpp-locale-settings"
]) {
	return `${e.join(",")}{${F(M("dark").tokens)}}\n${e.map((e) => `${e}[data-theme="light"]`).join(",")}{${F(M("light").tokens)}}\n${N().filter((e) => e.id !== "dark" && e.id !== "light").map((t) => `${e.map((e) => `${e}[data-theme="${t.id}"]`).join(",")}{${F(t.tokens)}}`).join("\n")}\n${C}`;
}
var z = R(), B = /* @__PURE__ */ new Map(), V = !1;
function H() {
	if (typeof document < "u") for (let [e, t] of B) {
		let n = document.getElementById(e);
		n && (n.textContent = t ? `${R()}\n${t}` : R());
	}
}
function U(e = I, t) {
	if (typeof document > "u" || !document.head) return;
	B.set(e, t);
	let n = document.getElementById(e);
	n || (n = document.createElement("style"), n.id = e, document.head.appendChild(n)), n.textContent = t ? `${R()}\n${t}` : R(), V ||= (A(H), !0);
}
// src/components/ThemedSelect/ThemedSelect.tsx
function W(e) {
	let i = (0, l.c)(54), { value: s, options: c, onChange: f, ariaLabel: p, disabled: m, fullWidth: h, showCheckmark: g, className: _, triggerClassName: v, menuClassName: y, optionClassName: b } = e, x = m !== void 0 && m, S = h !== void 0 && h, C = g !== void 0 && g, w = n(void 0), [T, E] = r(!1), D;
	if (i[0] !== c || i[1] !== s) {
		let e;
		i[3] === s ? e = i[4] : (e = (e) => e.value === s, i[3] = s, i[4] = e), D = c.findIndex(e), i[0] = c, i[1] = s, i[2] = D;
	} else D = i[2];
	let O = Math.max(D, 0), [k, A] = r(O), j = c[O], M, N;
	i[5] === T ? (M = i[6], N = i[7]) : (M = () => {
		if (!T || typeof document > "u") return;
		let e = (e) => {
			let t = e.target;
			w.current && t && !w.current.contains(t) && E(!1);
		};
		return document.addEventListener("mousedown", e, !0), () => {
			document.removeEventListener("mousedown", e, !0);
		};
	}, N = [T], i[5] = T, i[6] = M, i[7] = N), t(M, N);
	let P;
	i[8] === c.length ? P = i[9] : (P = (e) => {
		c.length !== 0 && A((t) => (t + e + c.length) % c.length);
	}, i[8] = c.length, i[9] = P);
	let F = P, I;
	i[10] !== k || i[11] !== x || i[12] !== F || i[13] !== f || i[14] !== T || i[15] !== c || i[16] !== O ? (I = (e) => {
		if (!(x || c.length === 0)) {
			if (e.key === "Escape") E(!1);
			else if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault(), T ? F(e.key === "ArrowDown" ? 1 : -1) : (A(O), E(!0));
			else if (e.key === "Enter") {
				if (e.preventDefault(), !T) A(O), E(!0);
				else {
					let e = c[k];
					e && !e.disabled && (f(e.value), E(!1));
				}
			}
		}
	}, i[10] = k, i[11] = x, i[12] = F, i[13] = f, i[14] = T, i[15] = c, i[16] = O, i[17] = I) : I = i[17];
	let R = I, z;
	i[18] === Symbol.for("react.memo_cache_sentinel") ? (z = (e) => {
		w.current = e ?? void 0;
	}, i[18] = z) : z = i[18];
	let B = S && "dsh-select-full kpp-dropdown-full", V;
	i[19] !== _ || i[20] !== B ? (V = d(L, "dsh-select", "ar-themed-select", "kpp-dropdown", B, _), i[19] = _, i[20] = B, i[21] = V) : V = i[21];
	let H;
	i[22] === v ? H = i[23] : (H = d("dsh-select-trigger", "ar-themed-select-trigger", "kpp-dropdown-trigger", v), i[22] = v, i[23] = H);
	let U;
	i[24] !== x || i[25] !== O ? (U = () => {
		x || (A(O), E(G));
	}, i[24] = x, i[25] = O, i[26] = U) : U = i[26];
	let W = j?.label ?? "", K;
	i[27] === W ? K = i[28] : (K = /* @__PURE__ */ a("span", {
		className: "dsh-select-label",
		children: W
	}), i[27] = W, i[28] = K);
	let q = T ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6", J;
	i[29] === q ? J = i[30] : (J = /* @__PURE__ */ a("svg", {
		width: 14,
		height: 14,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: /* @__PURE__ */ a("path", { d: q })
	}), i[29] = q, i[30] = J);
	let Y;
	i[31] !== p || i[32] !== x || i[33] !== R || i[34] !== T || i[35] !== H || i[36] !== U || i[37] !== K || i[38] !== J ? (Y = /* @__PURE__ */ o("button", {
		type: "button",
		"data-testid": u.Common.SelectTrigger,
		className: H,
		"aria-label": p,
		"aria-haspopup": "listbox",
		"aria-expanded": T,
		disabled: x,
		onKeyDown: R,
		onClick: U,
		children: [K, J]
	}), i[31] = p, i[32] = x, i[33] = R, i[34] = T, i[35] = H, i[36] = U, i[37] = K, i[38] = J, i[39] = Y) : Y = i[39];
	let X;
	i[40] !== k || i[41] !== p || i[42] !== y || i[43] !== f || i[44] !== T || i[45] !== b || i[46] !== c || i[47] !== O || i[48] !== C ? (X = T ? /* @__PURE__ */ a("div", {
		role: "listbox",
		"aria-label": p,
		"data-testid": u.Common.SelectMenu,
		className: d("dsh-select-menu", "ar-themed-select-menu", "kpp-dropdown-menu", y),
		children: c.map((e, t) => {
			let n = t === O, r = t === k;
			return /* @__PURE__ */ o("button", {
				type: "button",
				role: "option",
				"data-testid": u.Common.SelectOption,
				"aria-selected": n,
				disabled: e.disabled,
				className: d("dsh-select-option", "kpp-dropdown-item", (r || n) && "active kpp-dropdown-item-active", b),
				onMouseEnter: () => A(t),
				onClick: () => {
					e.disabled || (f(e.value), E(!1));
				},
				children: [/* @__PURE__ */ a("span", { children: e.label }), C && n ? /* @__PURE__ */ a("span", {
					"aria-hidden": "true",
					children: "✓"
				}) : void 0]
			}, e.value);
		})
	}) : void 0, i[40] = k, i[41] = p, i[42] = y, i[43] = f, i[44] = T, i[45] = b, i[46] = c, i[47] = O, i[48] = C, i[49] = X) : X = i[49];
	let Z;
	return i[50] !== V || i[51] !== Y || i[52] !== X ? (Z = /* @__PURE__ */ o("div", {
		ref: z,
		className: V,
		children: [Y, X]
	}), i[50] = V, i[51] = Y, i[52] = X, i[53] = Z) : Z = i[53], Z;
}
function G(e) {
	return !e;
}
// src/constants/delay.ts
var K = {
	AnimationShort: 180,
	Animation: 300,
	AutocompleteSearch: 300,
	PollingDefault: 3e3
}, q = {
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
function J(e, n) {
	let i = (0, l.c)(4), a = n === void 0 ? K.AutocompleteSearch : n, [o, s] = r(e), c, u;
	return i[0] !== a || i[1] !== e ? (c = () => {
		let t = setTimeout(() => {
			s(e);
		}, a);
		return () => {
			clearTimeout(t);
		};
	}, u = [e, a], i[0] = a, i[1] = e, i[2] = c, i[3] = u) : (c = i[2], u = i[3]), t(c, u), o;
}
// src/hooks/useDshThemeRevision.ts
function Y() {
	return i(A, k, k);
}
// src/hooks/useEffectiveTheme.ts
var X = ".dsh-core-root, .ar-root, .ar-settings-root, .kpp-root, .kpp-card-bar, .kpp-footer-row, .kpp-modal-backdrop, .kpp-locale-settings";
function Z(e) {
	let t = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(e);
	if (t?.[1] && t[2] && t[3]) return {
		r: Number(t[1]),
		g: Number(t[2]),
		b: Number(t[3]),
		a: t[4] === void 0 ? 1 : Number(t[4])
	};
}
function Q({ r: e, g: t, b: n }) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function $(e, t = X) {
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
			let t = Z(getComputedStyle(e).backgroundColor);
			if (t && t.a > .2) return Q(t) > 140 ? "light" : "dark";
		}
		if (document.body) {
			let e = Z(getComputedStyle(document.body).color);
			if (e) return Q(e) < 100 ? "light" : "dark";
		}
	}
	return typeof window < "u" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}
function ee(e, n) {
	let i = (0, l.c)(8), a = e === void 0 ? "auto" : e, o;
	i[0] === a ? o = i[1] : (o = a !== "auto" && a.trim() !== "" ? M(a).id : void 0, i[0] = a, i[1] = o);
	let s = o, c;
	i[2] === s ? c = i[3] : (c = () => s ?? $(), i[2] = s, i[3] = c);
	let [u, d] = r(c), f, p;
	return i[4] !== s || i[5] !== n ? (f = () => {
		if (s) return;
		let e = () => {
			d($(n?.current ?? void 0));
		}, t = typeof MutationObserver > "u" ? void 0 : new MutationObserver(e);
		if (typeof document < "u") for (let e of [document.documentElement, document.body].filter(Boolean)) t?.observe(e, {
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
			t?.disconnect(), r?.removeEventListener?.("change", e);
		};
	}, p = [s, n], i[4] = s, i[5] = n, i[6] = f, i[7] = p) : (f = i[6], p = i[7]), t(f, p), s ?? u;
}
// src/hooks/useLocalePreference.ts
function te(e, t) {
	return e === "ru" || e === "en" ? e : String(t || (typeof document < "u" ? document.documentElement?.lang : "") || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}
function ne(e, t) {
	try {
		let n = (t ?? (typeof localStorage < "u" ? localStorage : void 0))?.getItem(e);
		return n === "ru" || n === "en" ? n : void 0;
	} catch {
		return;
	}
}
function re(e, t, n) {
	if (t === "ru" || t === "en") try {
		(n ?? (typeof localStorage < "u" ? localStorage : void 0))?.setItem(e, t);
	} catch {}
}
// src/utils/formatMessage.ts
function ie(e, ...t) {
	return e.replace(/\{(\d+)\}/g, (e, n) => {
		let r = t[Number.parseInt(n, 10)];
		return r === void 0 ? e : String(r);
	});
}
// src/utils/hostSanitizer.ts
function ae(e) {
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
function oe(e) {
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
export { f as Button, _ as ChildrenLazy, q as CoreLocalization, K as Delay, p as IconButton, v as Modal, m as ProgressBar, h as Skeleton, g as Spinner, b as SwitchControl, x as Tabs, u as TestId, W as ThemedSelect, R as buildCoreThemeStyles, F as buildThemeCssVariables, L as coreStyleScopeClass, z as coreThemeStyles, d as cx, w as darkThemeTokens, $ as detectHostTheme, U as ensureCoreStyles, oe as extractHost, ie as formatMessage, M as getDshTheme, k as getDshThemeRevision, T as lightThemeTokens, N as listDshThemes, re as persistLocale, ne as readSavedLocale, j as registerDshTheme, te as resolveDshLocale, ae as sanitizeHostInput, A as subscribeDshThemeChanges, J as useDebouncedValue, Y as useDshThemeRevision, ee as useEffectiveTheme };
