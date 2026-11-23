import { c as e } from "react-compiler-runtime";
import { Fragment as t, Suspense as n, createElement as r, useEffect as i, useId as a, useRef as o, useState as s, useSyncExternalStore as c } from "react";
import { createPortal as l } from "react-dom";
import { Fragment as u, jsx as d, jsxs as f } from "react/jsx-runtime";
// src/constants/testId.ts
var p = { Common: {
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
function m(...e) {
	return e.filter((e) => typeof e == "string" && e.trim().length > 0).join(" ");
}
// src/components/Tooltip/input-modality.ts
var h = "data-input-modality", g = !1;
typeof window < "u" && (window.addEventListener("pointerdown", () => {
	g = !0, document.documentElement.setAttribute(h, "pointer");
}, !0), window.addEventListener("keydown", (e) => {
	g = !1, e.isComposing || document.documentElement.setAttribute(h, "keyboard");
}, !0));
function _() {
	return g;
}
// src/components/Tooltip/tooltip-placement.ts
var v = {
	right: "left",
	left: "right",
	top: "bottom",
	bottom: "top"
};
function y(e) {
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
		v[e.side],
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
// src/components/Tooltip/Tooltip.tsx
function b(t) {
	let n = e(54), { children: r, content: a, triggerMode: c, delayMs: u, className: p, triggerClassName: h, contentClassName: g, triggerElement: v, side: b, align: x, portal: S, "data-testid": C } = t, w = c === void 0 ? "hover" : c, T = u === void 0 ? 0 : u, E = b === void 0 ? "right" : b, D = x === void 0 ? "center" : x, O = S === void 0 || S, k = o(void 0), A = o(void 0), [j, M] = s(), [N, P] = s(void 0), F = o(void 0), ee;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (ee = () => {
		F.current !== void 0 && clearTimeout(F.current), F.current = void 0;
	}, n[0] = ee) : ee = n[0];
	let I = ee, L;
	n[1] === Symbol.for("react.memo_cache_sentinel") ? (L = () => {
		k.current && (P({
			anchor: k.current.getBoundingClientRect(),
			width: 0,
			height: 0
		}), M(k.current.closest("[data-theme]:not(html)") ?? document.body));
	}, n[1] = L) : L = n[1];
	let R = L, z;
	n[2] === Symbol.for("react.memo_cache_sentinel") ? (z = () => {
		I(), M(void 0), P(void 0);
	}, n[2] = z) : z = n[2];
	let B = z, V;
	n[3] === T ? V = n[4] : (V = () => {
		I(), T <= 0 ? R() : F.current = setTimeout(R, T);
	}, n[3] = T, n[4] = V);
	let H = V, U, W;
	n[5] === Symbol.for("react.memo_cache_sentinel") ? (U = () => {
		let e = F;
		return () => {
			e.current !== void 0 && clearTimeout(e.current), e.current = void 0;
		};
	}, W = [], n[5] = U, n[6] = W) : (U = n[5], W = n[6]), i(U, W);
	let G, K;
	n[7] === j ? (G = n[8], K = n[9]) : (G = () => {
		if (!j || !A.current) return;
		let e = () => {
			if (k.current && A.current) {
				let e = A.current.getBoundingClientRect();
				P({
					anchor: k.current.getBoundingClientRect(),
					width: e.width,
					height: e.height
				});
			}
		}, t = typeof ResizeObserver > "u" ? void 0 : new ResizeObserver(e);
		return t?.observe(A.current), window.addEventListener("resize", e), e(), () => {
			t?.disconnect(), window.removeEventListener("resize", e);
		};
	}, K = [j], n[7] = j, n[8] = G, n[9] = K), i(G, K);
	let q;
	n[10] !== D || n[11] !== N || n[12] !== E ? (q = N && N.width > 0 ? y({
		anchor: N.anchor,
		width: N.width,
		height: N.height,
		viewportWidth: window.innerWidth,
		viewportHeight: window.innerHeight,
		side: E,
		align: D,
		gap: 8
	}) : void 0, n[10] = D, n[11] = N, n[12] = E, n[13] = q) : q = n[13];
	let te = q, J;
	n[14] !== H || n[15] !== w ? (J = (e) => {
		w === "hover" && e.pointerType !== "touch" && H();
	}, n[14] = H, n[15] = w, n[16] = J) : J = n[16];
	let Y;
	n[17] === w ? Y = n[18] : (Y = () => {
		w === "hover" && B();
	}, n[17] = w, n[18] = Y);
	let ne;
	n[19] !== H || n[20] !== w ? (ne = () => {
		w === "hover" && !_() && H();
	}, n[19] = H, n[20] = w, n[21] = ne) : ne = n[21];
	let X;
	n[22] !== j || n[23] !== w ? (X = w === "click" ? () => {
		j ? B() : R();
	} : B, n[22] = j, n[23] = w, n[24] = X) : X = n[24];
	let re;
	n[25] !== J || n[26] !== Y || n[27] !== ne || n[28] !== X ? (re = {
		onPointerEnter: J,
		onPointerLeave: Y,
		onFocus: ne,
		onBlur: B,
		onClick: X
	}, n[25] = J, n[26] = Y, n[27] = ne, n[28] = X, n[29] = re) : re = n[29];
	let ie = re, ae;
	n[30] !== r || n[31] !== h || n[32] !== v || n[33] !== w || n[34] !== ie ? (ae = v === "span" || w === "click" ? /* @__PURE__ */ d("span", {
		...ie,
		children: r
	}) : /* @__PURE__ */ d("button", {
		type: "button",
		className: m("dsh-tooltip-trigger", h),
		...ie,
		children: r
	}), n[30] = r, n[31] = h, n[32] = v, n[33] = w, n[34] = ie, n[35] = ae) : ae = n[35];
	let oe = ae, se;
	n[36] !== a || n[37] !== g || n[38] !== O || n[39] !== j || n[40] !== te ? (se = j ? /* @__PURE__ */ d("span", {
		ref: (e) => {
			A.current = e ?? void 0;
		},
		className: m("dsh-tooltip-content", O === "body" ? "dsh-core-root" : void 0, g),
		"data-theme": O === "body" ? j.getAttribute("data-theme") ?? void 0 : void 0,
		style: {
			left: te?.left ?? 0,
			top: te?.top ?? 0,
			visibility: te ? "visible" : "hidden"
		},
		children: a
	}) : void 0, n[36] = a, n[37] = g, n[38] = O, n[39] = j, n[40] = te, n[41] = se) : se = n[41];
	let ce = se, le;
	n[42] === Symbol.for("react.memo_cache_sentinel") ? (le = (e) => {
		k.current = e ?? void 0;
	}, n[42] = le) : le = n[42];
	let Z;
	n[43] === p ? Z = n[44] : (Z = m("dsh-tooltip", p), n[43] = p, n[44] = Z);
	let Q;
	n[45] !== ce || n[46] !== O || n[47] !== j ? (Q = O && j ? l(ce, O === "body" ? document.body : j) : ce, n[45] = ce, n[46] = O, n[47] = j, n[48] = Q) : Q = n[48];
	let $;
	return n[49] !== Z || n[50] !== Q || n[51] !== C || n[52] !== oe ? ($ = /* @__PURE__ */ f("span", {
		ref: le,
		className: Z,
		"data-testid": C,
		children: [oe, Q]
	}), n[49] = Z, n[50] = Q, n[51] = C, n[52] = oe, n[53] = $) : $ = n[53], $;
}
// src/components/Button/Button.tsx
function x(t) {
	let n = e(14), { children: r, onClick: i, variant: a, size: o, disabled: s, tooltip: c, className: l, type: u } = t, f = a === void 0 ? "secondary" : a, h = o === void 0 ? "md" : o, g = s !== void 0 && s, _ = u === void 0 ? "button" : u, v = f === "primary" && "dsh-btn-primary", y = f === "danger" && "dsh-btn-danger", x = (h === "sm" || h === "small") && "dsh-btn-sm ar-btn-sm", S;
	n[0] !== l || n[1] !== v || n[2] !== y || n[3] !== x ? (S = m("dsh-btn", v, y, x, l), n[0] = l, n[1] = v, n[2] = y, n[3] = x, n[4] = S) : S = n[4];
	let C;
	n[5] !== r || n[6] !== g || n[7] !== i || n[8] !== S || n[9] !== _ ? (C = /* @__PURE__ */ d("button", {
		type: _,
		"data-testid": p.Common.Button,
		disabled: g,
		onClick: i,
		className: S,
		children: r
	}), n[5] = r, n[6] = g, n[7] = i, n[8] = S, n[9] = _, n[10] = C) : C = n[10];
	let w = C, T;
	return n[11] !== w || n[12] !== c ? (T = c ? /* @__PURE__ */ d(b, {
		content: c,
		triggerElement: "span",
		side: "top",
		children: w
	}) : w, n[11] = w, n[12] = c, n[13] = T) : T = n[13], T;
}
// src/components/Button/CollectionAddButton.tsx
function S(t) {
	let n = e(13), r, i, a;
	n[0] === t ? (r = n[1], i = n[2], a = n[3]) : ({children: r, className: i, ...a} = t, n[0] = t, n[1] = r, n[2] = i, n[3] = a);
	let o;
	n[4] === i ? o = n[5] : (o = m("dsh-collection-add-btn", i), n[4] = i, n[5] = o);
	let s;
	n[6] === Symbol.for("react.memo_cache_sentinel") ? (s = /* @__PURE__ */ d("svg", {
		className: "dsh-collection-add-icon",
		width: "14",
		height: "14",
		viewBox: "0 0 14 14",
		focusable: "false",
		children: /* @__PURE__ */ d("path", {
			d: "M7 2v10M2 7h10",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.25"
		})
	}), n[6] = s) : s = n[6];
	let c;
	n[7] === r ? c = n[8] : (c = /* @__PURE__ */ d("span", { children: r }), n[7] = r, n[8] = c);
	let l;
	return n[9] !== a || n[10] !== o || n[11] !== c ? (l = /* @__PURE__ */ f(x, {
		...a,
		className: o,
		children: [s, c]
	}), n[9] = a, n[10] = o, n[11] = c, n[12] = l) : l = n[12], l;
}
// src/components/Button/IconButton.tsx
function C(t) {
	let n = e(14), { children: r, size: i, variant: a, tooltip: o, onClick: s, disabled: c, className: l } = t, u = i === void 0 ? "standard" : i, f = c !== void 0 && c, h = u === "small" && "dsh-icon-btn-sm", g = a !== void 0 && "dsh-icon-btn-flat", _ = a === "danger" && "dsh-icon-btn-danger", v;
	n[0] !== l || n[1] !== h || n[2] !== g || n[3] !== _ ? (v = m("dsh-icon-btn", h, g, _, l), n[0] = l, n[1] = h, n[2] = g, n[3] = _, n[4] = v) : v = n[4];
	let y;
	n[5] !== r || n[6] !== f || n[7] !== s || n[8] !== v || n[9] !== o ? (y = /* @__PURE__ */ d("button", {
		type: "button",
		"data-testid": p.Common.IconButton,
		"aria-label": o,
		disabled: f,
		onClick: s,
		className: v,
		children: r
	}), n[5] = r, n[6] = f, n[7] = s, n[8] = v, n[9] = o, n[10] = y) : y = n[10];
	let x = y, S;
	return n[11] !== x || n[12] !== o ? (S = o ? /* @__PURE__ */ d(b, {
		content: o,
		triggerElement: "span",
		side: "top",
		children: x
	}) : x, n[11] = x, n[12] = o, n[13] = S) : S = n[13], S;
}
// src/components/Checkbox/Checkbox.tsx
function w(t) {
	let n = e(10), { checked: r, onChange: i, disabled: a, id: o, className: s } = t, c = a !== void 0 && a, l;
	n[0] === i ? l = n[1] : (l = (e) => {
		i(e.currentTarget.checked);
	}, n[0] = i, n[1] = l);
	let u = l, f;
	n[2] === s ? f = n[3] : (f = m("dsh-checkbox", s), n[2] = s, n[3] = f);
	let h;
	return n[4] !== r || n[5] !== c || n[6] !== u || n[7] !== o || n[8] !== f ? (h = /* @__PURE__ */ d("input", {
		type: "checkbox",
		className: f,
		"data-testid": p.Common.Checkbox,
		checked: r,
		disabled: c,
		id: o,
		onChange: u
	}), n[4] = r, n[5] = c, n[6] = u, n[7] = o, n[8] = f, n[9] = h) : h = n[9], h;
}
// src/components/CodeDisclosure/CodeDisclosure.tsx
function T(t) {
	let n = e(8), { code: r, children: i, label: a } = t, o = a === void 0 ? "Показать пример кода" : a, s;
	n[0] === o ? s = n[1] : (s = /* @__PURE__ */ d("summary", { children: o }), n[0] = o, n[1] = s);
	let c;
	n[2] === r ? c = n[3] : (c = /* @__PURE__ */ d("pre", { children: /* @__PURE__ */ d("code", { children: r }) }), n[2] = r, n[3] = c);
	let l;
	return n[4] !== i || n[5] !== s || n[6] !== c ? (l = /* @__PURE__ */ f("details", {
		className: "dsh-code-disclosure",
		children: [
			s,
			i,
			c
		]
	}), n[4] = i, n[5] = s, n[6] = c, n[7] = l) : l = n[7], l;
}
// src/components/icons/CloseIcon.tsx
function E(t) {
	let n = e(3), { size: r } = t, i = r === void 0 ? 16 : r, a;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (a = /* @__PURE__ */ d("path", { d: "M6 6l12 12M18 6 6 18" }), n[0] = a) : a = n[0];
	let o;
	return n[1] === i ? o = n[2] : (o = /* @__PURE__ */ d("svg", {
		width: i,
		height: i,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		children: a
	}), n[1] = i, n[2] = o), o;
}
// src/components/icons/InfoIcon.tsx
function D(t) {
	let n = e(6), { width: r, height: i } = t, a = r === void 0 ? 16 : r, o = i === void 0 ? 16 : i, s, c, l;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (s = /* @__PURE__ */ d("circle", {
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
	}), n[0] = s, n[1] = c, n[2] = l) : (s = n[0], c = n[1], l = n[2]);
	let u;
	return n[3] !== o || n[4] !== a ? (u = /* @__PURE__ */ f("svg", {
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		width: a,
		height: o,
		viewBox: "0 0 24 24",
		children: [
			s,
			c,
			l
		]
	}), n[3] = o, n[4] = a, n[5] = u) : u = n[5], u;
}
// src/components/icons/RefreshIcon.tsx
function O(t) {
	let n = e(3), { size: r } = t, i = r === void 0 ? 16 : r, a;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (a = /* @__PURE__ */ d("path", { d: "M20 4v5h-5M20 9a8.5 8.5 0 1 0 0 6" }), n[0] = a) : a = n[0];
	let o;
	return n[1] === i ? o = n[2] : (o = /* @__PURE__ */ d("svg", {
		width: i,
		height: i,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.8",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		focusable: "false",
		children: a
	}), n[1] = i, n[2] = o), o;
}
// src/components/icons/SettingsIcon.tsx
function k(t) {
	let n = e(4), { width: r, height: i } = t, a = r === void 0 ? 16 : r, o = i === void 0 ? 16 : i, s;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (s = /* @__PURE__ */ d("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.21l-2.39.96a7.2 7.2 0 0 0-1.62-.92l-.36-2.57a.5.5 0 0 0-.47-.41h-3.84a.5.5 0 0 0-.47.41L9.26 5.38a7.2 7.2 0 0 0-1.62.92l-2.39-.96a.5.5 0 0 0-.59.21L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.21.37.29.59.21l2.39-.96c.5.38 1.03.69 1.62.92l.36 2.57a.5.5 0 0 0 .47.41h3.84a.5.5 0 0 0 .47-.41l.36-2.57a7.2 7.2 0 0 0 1.62-.92l2.39.96a.5.5 0 0 0 .59-.21l1.92-3.32a.5.5 0 0 0-.12-.61l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" }), n[0] = s) : s = n[0];
	let c;
	return n[1] !== o || n[2] !== a ? (c = /* @__PURE__ */ d("svg", {
		width: a,
		height: o,
		viewBox: "0 0 24 24",
		fill: "currentColor",
		children: s
	}), n[1] = o, n[2] = a, n[3] = c) : c = n[3], c;
}
// src/components/icons/TrashIcon.tsx
function A(t) {
	let n = e(7), { size: r } = t, i = r === void 0 ? 14 : r, a, o, s, c, l;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (a = /* @__PURE__ */ d("path", { d: "M1.28149 3.88831H14.7187" }), o = /* @__PURE__ */ d("path", { d: "M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833" }), s = /* @__PURE__ */ d("path", { d: "M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831" }), c = /* @__PURE__ */ d("path", { d: "M6.44946 6.98926V11.1238" }), l = /* @__PURE__ */ d("path", { d: "M9.55054 6.98926V11.1238" }), n[0] = a, n[1] = o, n[2] = s, n[3] = c, n[4] = l) : (a = n[0], o = n[1], s = n[2], c = n[3], l = n[4]);
	let u;
	return n[5] === i ? u = n[6] : (u = /* @__PURE__ */ f("svg", {
		width: i,
		height: i,
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1",
		focusable: "false",
		children: [
			a,
			o,
			s,
			c,
			l
		]
	}), n[5] = i, n[6] = u), u;
}
// src/components/Loader/ProgressBar.tsx
function j(t) {
	let n = e(4), { className: r } = t, i;
	n[0] === r ? i = n[1] : (i = m("dsh-progress-bar", r), n[0] = r, n[1] = i);
	let a;
	return n[2] === i ? a = n[3] : (a = /* @__PURE__ */ d("div", {
		"data-testid": p.Common.Loading,
		className: i
	}), n[2] = i, n[3] = a), a;
}
// src/components/Loader/Skeleton.tsx
function M(t) {
	let n = e(9), { width: r, height: i, markLoadingRoot: a, className: o } = t, s = r === void 0 ? "100%" : r, c = i === void 0 ? 32 : i, l = a === void 0 || a ? p.Common.Loading : void 0, u;
	n[0] !== c || n[1] !== s ? (u = {
		width: s,
		height: c
	}, n[0] = c, n[1] = s, n[2] = u) : u = n[2];
	let f;
	n[3] === o ? f = n[4] : (f = m("dsh-skeleton", o), n[3] = o, n[4] = f);
	let h;
	return n[5] !== l || n[6] !== u || n[7] !== f ? (h = /* @__PURE__ */ d("div", {
		"data-testid": l,
		style: u,
		className: f
	}), n[5] = l, n[6] = u, n[7] = f, n[8] = h) : h = n[8], h;
}
// src/components/Loader/Spinner.tsx
function N(t) {
	let n = e(7), { size: r, markLoadingRoot: i, className: a } = t, o = r === void 0 ? "standard" : r, s = i === void 0 || i ? p.Common.Loading : void 0, c = o === "small" && "dsh-spinner-sm", l;
	n[0] !== a || n[1] !== c ? (l = m("dsh-spinner", c, a), n[0] = a, n[1] = c, n[2] = l) : l = n[2];
	let u;
	return n[3] !== o || n[4] !== s || n[5] !== l ? (u = /* @__PURE__ */ d("span", {
		"data-testid": s,
		className: l,
		"data-size": o
	}), n[3] = o, n[4] = s, n[5] = l, n[6] = u) : u = n[6], u;
}
// src/components/Loader/ChildrenLazy.tsx
function P(t) {
	let r = e(6), { variant: i, loader: a, children: o } = t, s = i === void 0 ? "spinner" : i, c;
	r[0] !== a || r[1] !== s ? (c = a === void 0 ? d(s === "progress" ? j : s === "skeleton" ? M : N, {}) : a, r[0] = a, r[1] = s, r[2] = c) : c = r[2];
	let l = c, u;
	return r[3] !== o || r[4] !== l ? (u = /* @__PURE__ */ d(n, {
		fallback: l,
		children: o
	}), r[3] = o, r[4] = l, r[5] = u) : u = r[5], u;
}
// src/components/Modal/Modal.tsx
function F(n) {
	let a = e(33), { open: s, onClose: c, title: l, headerExtra: u, footer: h, description: g, closeLabel: _, backdropClassName: v, cardClassName: y, children: x } = n, S = _ === void 0 ? "Close" : _, C = o(void 0), w = o(c), T, D;
	a[0] === c ? (T = a[1], D = a[2]) : (T = () => {
		w.current = c;
	}, D = [c], a[0] = c, a[1] = T, a[2] = D), i(T, D);
	let O, k;
	if (a[3] === s ? (O = a[4], k = a[5]) : (O = () => {
		if (!s || typeof document > "u") return;
		let e = document.activeElement, t = C.current, n = () => Array.from(t?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])") ?? []).filter(ee), r = (e) => {
			if (e.key === "Escape") {
				w.current();
				return;
			}
			if (e.key !== "Tab" || !t) return;
			let r = n(), i = r[0], a = r.at(-1);
			!i || !a ? (e.preventDefault(), t.focus()) : e.shiftKey && (document.activeElement === i || !t.contains(document.activeElement)) ? (e.preventDefault(), a.focus()) : e.shiftKey || document.activeElement !== a && t.contains(document.activeElement) || (e.preventDefault(), i.focus());
		};
		return n()[0]?.focus(), document.addEventListener("keydown", r), () => {
			document.removeEventListener("keydown", r), e instanceof HTMLElement && e.isConnected && e.focus();
		};
	}, k = [s], a[3] = s, a[4] = O, a[5] = k), i(O, k), !s) {
		let e;
		return a[6] === Symbol.for("react.memo_cache_sentinel") ? (e = r(t), a[6] = e) : e = a[6], e;
	}
	let A;
	a[7] === v ? A = a[8] : (A = m("dsh-modal-backdrop", "ar-modal", v), a[7] = v, a[8] = A);
	let j;
	a[9] === c ? j = a[10] : (j = /* @__PURE__ */ d("button", {
		type: "button",
		className: "dsh-modal-backdrop-control",
		tabIndex: -1,
		onClick: c
	}), a[9] = c, a[10] = j);
	let M;
	a[11] === Symbol.for("react.memo_cache_sentinel") ? (M = (e) => {
		C.current = e ?? void 0;
	}, a[11] = M) : M = a[11];
	let N;
	a[12] === y ? N = a[13] : (N = m("dsh-modal-card", "ar-modal-card", y), a[12] = y, a[13] = N);
	let P;
	a[14] !== S || a[15] !== u || a[16] !== c || a[17] !== l ? (P = l !== void 0 || u !== void 0 ? /* @__PURE__ */ f("div", {
		className: "dsh-modal-header",
		children: [/* @__PURE__ */ d("div", {
			className: "dsh-modal-title",
			children: l
		}), /* @__PURE__ */ f("div", {
			className: "dsh-modal-actions ar-settings-header-right",
			children: [u, /* @__PURE__ */ d(b, {
				content: S,
				triggerElement: "span",
				side: "bottom",
				children: /* @__PURE__ */ d("button", {
					type: "button",
					"data-testid": p.Common.ModalClose,
					className: "dsh-modal-close",
					"aria-label": S,
					onClick: c,
					children: /* @__PURE__ */ d(E, { size: 16 })
				})
			})]
		})]
	}) : void 0, a[14] = S, a[15] = u, a[16] = c, a[17] = l, a[18] = P) : P = a[18];
	let F;
	a[19] === x ? F = a[20] : (F = /* @__PURE__ */ d("div", {
		className: "dsh-modal-body",
		children: x
	}), a[19] = x, a[20] = F);
	let I;
	a[21] === h ? I = a[22] : (I = h === void 0 ? void 0 : /* @__PURE__ */ d("div", {
		className: "dsh-modal-footer",
		children: h
	}), a[21] = h, a[22] = I);
	let L;
	a[23] !== g || a[24] !== P || a[25] !== F || a[26] !== I || a[27] !== N ? (L = /* @__PURE__ */ f("div", {
		ref: M,
		tabIndex: -1,
		"data-testid": p.Common.ModalCard,
		className: N,
		children: [
			P,
			g,
			F,
			I
		]
	}), a[23] = g, a[24] = P, a[25] = F, a[26] = I, a[27] = N, a[28] = L) : L = a[28];
	let R;
	return a[29] !== L || a[30] !== A || a[31] !== j ? (R = /* @__PURE__ */ f("div", {
		"data-testid": p.Common.ModalBackdrop,
		className: A,
		children: [j, L]
	}), a[29] = L, a[30] = A, a[31] = j, a[32] = R) : R = a[32], R;
}
function ee(e) {
	return !e.hasAttribute("hidden") && e.getAttribute("aria-hidden") !== "true";
}
var I = { scope: "_scope_1x3hb_2" }, L = "._scope_1x3hb_2{--dsh-style-scope:1}.dsh-notification{z-index:10000;border:1px solid var(--dsh-ui-info);background:var(--dsh-ui-surface);width:min(440px,100vw - 32px);max-height:calc(100dvh - 40px);color:var(--dsh-ui-info);box-shadow:var(--dsh-ui-shadow-elevated);overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;border-left-width:4px;border-radius:12px;padding:20px;position:fixed;bottom:20px;right:20px;overflow:auto}.dsh-notification[data-severity=error]{color:var(--dsh-ui-danger);border-color:var(--dsh-ui-danger)}.dsh-notification[data-severity=warning]{color:var(--dsh-ui-warning);border-color:var(--dsh-ui-warning)}.dsh-notification[data-severity=success]{color:var(--dsh-ui-success);border-color:var(--dsh-ui-success)}.dsh-notification-text p{white-space:pre-wrap;margin:12px 0}.dsh-notification-actions{flex-wrap:wrap;justify-content:flex-end;gap:8px;display:flex}.dsh-select,.ar-themed-select{flex:0 220px;width:220px;min-width:0;max-width:100%;position:relative}.dsh-select-full{flex:auto;width:100%}.dsh-select-trigger,.ar-themed-select-trigger{font:inherit;font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:100%;height:32px;min-height:32px;color:var(--dsh-ui-text);text-align:left;cursor:pointer;border-radius:6px;justify-content:space-between;align-items:center;gap:10px;padding:0 10px;font-size:14px;transition:background-color .15s,border-color .15s,box-shadow .15s;display:flex}.dsh-select-sm .dsh-select-trigger,.dsh-select-sm .ar-themed-select-trigger{height:28px;min-height:28px;font-size:12px}.dsh-select-trigger:hover:not(:disabled),.ar-themed-select-trigger:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-select-trigger:focus-visible,.ar-themed-select-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-select-trigger:disabled,.ar-themed-select-trigger:disabled{opacity:.55;cursor:not-allowed}.dsh-select-label,.ar-themed-select-trigger span:first-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dsh-select-menu,.ar-themed-select-menu{z-index:30;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);max-height:220px;box-shadow:var(--dsh-ui-shadow-elevated);border-radius:8px;padding:4px;position:absolute;top:calc(100% + 4px);left:0;right:0;overflow:auto}.dsh-select-search{box-sizing:border-box;width:100%;min-width:0;position:sticky;top:0}.dsh-select-option,.ar-themed-select-menu button{width:100%;min-height:30px;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:14px;transition:background-color .12s;display:flex;color:var(--dsh-ui-text)!important}.dsh-select-option:hover,.dsh-select-option.active,.ar-themed-select-menu button:hover,.ar-themed-select-menu button.active{background:var(--dsh-ui-hover);color:var(--dsh-ui-text)!important}.dsh-switch,.ar-settings-switch{background:var(--dsh-ui-switch-off);cursor:pointer;border:0;border-radius:999px;align-items:center;width:36px;height:20px;padding:2px;transition:background-color .16s;display:inline-flex;position:relative}.dsh-switch[data-checked=true],.ar-settings-switch[data-checked=true]{background:var(--dsh-ui-switch-on)}.dsh-switch:disabled,.ar-settings-switch:disabled{opacity:.5;cursor:not-allowed}.dsh-switch span,.ar-settings-switch span{background:var(--dsh-ui-switch-thumb-off);border-radius:50%;width:16px;height:16px;transition:transform .16s,background-color .16s;display:block}.dsh-switch[data-checked=true] span,.ar-settings-switch[data-checked=true] span{background:var(--dsh-ui-switch-thumb-on);transform:translate(16px)}.dsh-input{box-sizing:border-box;width:100%;min-width:0;height:32px;font:inherit;font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);color:var(--dsh-ui-text);border-radius:6px;padding:0 10px;font-size:14px;transition:border-color .15s,box-shadow .15s,background-color .15s}.dsh-input-sm{height:28px;font-size:12px}.dsh-icon-btn-sm{width:28px;height:28px;font-size:12px}.dsh-spinner-sm{width:14px;height:14px}.dsh-code-disclosure{margin:12px 0;font-size:13px}.dsh-code-disclosure summary{cursor:pointer;color:var(--dsh-ui-muted)}.dsh-code-disclosure pre{border-radius:var(--dsw-radius-sm);background:var(--dsh-ui-elevated);font:12px/1.5 var(--ds-font-family-code);white-space:pre-wrap;margin:8px 0 0;padding:10px;overflow:auto}.dsh-input:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-input:focus-visible{box-shadow:0 0 0 2px var(--dsh-ui-focus-ring);outline:none}.dsh-input:disabled{opacity:.55;cursor:not-allowed}.dsh-text-field-validation{width:100%;min-width:0;display:block}.dsh-field-error{color:var(--dsh-ui-danger);overflow-wrap:anywhere;margin-block-start:4px;font-size:12px;line-height:1.4;display:block}.dsh-input[data-invalid=true],.dsh-select-trigger[data-invalid=true]{border-color:var(--dsh-ui-danger)}.dsh-checkbox,.dsh-core-root input[type=checkbox]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}.dsh-checkbox:focus-visible,.dsh-core-root input[type=checkbox]:focus-visible{outline:2px solid var(--dsh-ui-accent);outline-offset:2px}.dsh-checkbox:disabled,.dsh-core-root input[type=checkbox]:disabled{cursor:not-allowed;opacity:.55}.dsh-btn{font-family:var(--dsw-font-family);border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);height:32px;min-height:32px;color:var(--dsh-ui-text);white-space:nowrap;cursor:pointer;border-radius:6px;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,border-color .15s;display:inline-flex}.dsh-btn:hover:not(:disabled){background:var(--dsh-ui-hover)}.dsh-btn:disabled{opacity:.55;cursor:not-allowed}.dsh-btn-primary{background:var(--dsh-ui-primary-bg);color:var(--dsh-ui-primary-fg);border-color:#0000}.dsh-btn-primary:hover:not(:disabled){background:color-mix(in srgb, var(--dsh-ui-primary-bg) 90%, var(--dsh-ui-primary-fg));color:var(--dsh-ui-primary-fg)}.dsh-btn-danger{color:var(--dsh-ui-danger);border-color:var(--dsh-ui-danger-soft);background:var(--dsh-ui-danger-soft)}.dsh-btn-sm{height:28px;min-height:28px;padding:0 10px;font-size:11px}.dsh-btn.dsh-collection-add-btn{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l3,var(--dsh-ui-border-strong));border-radius:var(--dsw-radius-lg,12px);width:100%;min-width:0;height:auto;min-height:44px;color:var(--dsw-alias-label-primary,var(--dsh-ui-text));font:inherit;white-space:normal;overflow-wrap:anywhere;background:0 0;flex:1 1 0;gap:6px;padding:10px 14px;font-size:14px;font-weight:400;line-height:22px}.dsh-collection-add-icon{flex:none}.dsh-collection-add-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsh-ui-hover))}.dsh-collection-add-btn:active:not(:disabled){background:var(--dsh-ui-active)}.dsh-collection-add-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsh-ui-focus-ring));outline-offset:2px}.dsh-collection-add-btn:disabled{opacity:.4;cursor:default}.dsh-icon-btn{border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-elevated);width:32px;min-width:32px;height:32px;min-height:32px;color:var(--dsh-ui-text);cursor:pointer;border-radius:6px;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:background-color .15s;display:inline-flex}.dsh-icon-btn:hover:not(:disabled):where(:not(.dsh-icon-btn-flat)){background:var(--dsh-ui-hover)}.dsh-icon-btn-flat{box-sizing:border-box;border-radius:var(--dsw-radius-sm,6px);color:var(--dsw-alias-label-tertiary,var(--dsh-ui-tertiary));background:0 0;border:none}.dsh-icon-btn-flat.dsh-icon-btn-sm{width:28px;min-width:28px;height:28px;min-height:28px}.dsh-icon-btn-flat:disabled{opacity:.4;cursor:default}.dsh-icon-btn-flat:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsh-ui-focus-ring));outline-offset:2px}@media (hover:hover){.dsh-icon-btn-flat:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsh-ui-hover));color:var(--dsw-alias-label-primary,var(--dsh-ui-text))}.dsh-icon-btn-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsh-ui-danger-soft));color:var(--dsw-alias-state-error-primary,var(--dsh-ui-danger))}}.dsh-icon-btn-flat:active:not(:disabled){background:var(--dsh-ui-active)}.dsh-icon-btn-danger:active:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsh-ui-danger-soft));color:var(--dsw-alias-state-error-primary,var(--dsh-ui-danger))}.dsh-tabs{border:1px solid var(--dsh-ui-border);background:var(--dsh-ui-elevated);border-radius:8px;align-items:center;gap:4px;width:fit-content;max-width:100%;padding:3px;display:inline-flex}.dsh-radio-card-group{box-sizing:border-box;width:100%;min-width:0;color:var(--dsh-ui-text);border:0;margin:0;padding:0}.dsh-radio-card-legend{overflow-wrap:anywhere;max-width:100%;margin-bottom:10px;padding:0}.dsh-radio-card-options{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px;min-width:0;display:grid}.dsh-radio-card{box-sizing:border-box;border:1px solid var(--dsh-ui-border-strong);background:var(--dsh-ui-surface);min-width:0;min-height:44px;color:var(--dsh-ui-text);cursor:pointer;border-radius:10px;align-items:flex-start;gap:10px;padding:14px;display:flex}.dsh-radio-card:hover:not(:has(input:disabled)){background:var(--dsh-ui-hover)}.dsh-radio-card:has(input:checked){border-color:var(--dsh-ui-accent);box-shadow:inset 0 0 0 1px var(--dsh-ui-accent);background:var(--dsh-ui-elevated)}.dsh-radio-card:has(input:focus-visible){outline:2px solid var(--dsh-ui-focus-ring);outline-offset:2px}.dsh-radio-card:has(input:disabled){opacity:.55;cursor:not-allowed}.dsh-radio-card input{width:16px;height:16px;accent-color:var(--dsh-ui-accent);cursor:inherit;flex:none;margin:2px 0 0}.dsh-radio-card-content{overflow-wrap:anywhere;gap:6px;min-width:0;display:grid}.dsh-radio-card-title{font-weight:600}.dsh-radio-card-description{color:var(--dsh-ui-muted);line-height:1.5}.dsh-tab{height:28px;color:var(--dsh-ui-muted);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #0000;border-radius:6px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:inline-flex}.dsh-tab.active{background:var(--dsh-ui-surface);color:var(--dsh-ui-text);border-color:var(--dsh-ui-border-strong)}.dsh-modal-backdrop{z-index:1000;background:var(--dsh-ui-backdrop);place-items:center;padding:16px;display:grid;position:fixed;inset:0;overflow:auto}.dsh-modal-backdrop-control{background:0 0;border:0;width:100%;height:100%;padding:0;position:absolute;inset:0}.dsh-modal-card{z-index:1;background:var(--dsh-ui-bg-modal);width:min(760px,100%);max-height:calc(100dvh - 32px);color:var(--dsh-ui-text);border:1px solid var(--dsh-ui-border-strong);box-shadow:var(--dsh-ui-shadow-elevated);border-radius:10px;position:relative;overflow:auto}.dsh-modal-header{border-bottom:1px solid var(--dsh-ui-border);justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;display:flex}.dsh-modal-close{width:28px;height:28px;color:var(--dsh-ui-text);cursor:pointer;background:0 0;border:0;border-radius:50%;place-items:center;padding:0;font-size:22px;line-height:1;display:inline-grid}.dsh-modal-close:hover{background:var(--dsh-ui-hover)}.dsh-modal-body{padding:16px}.dsh-modal-footer{border-top:1px solid var(--dsh-ui-border);justify-content:flex-end;gap:8px;padding:12px 16px;display:flex}.dsh-modal-title{overflow-wrap:anywhere;flex:auto;min-width:0;font-size:18px;font-weight:600;line-height:24px}.dsh-modal-actions{flex:none;align-items:center;gap:8px;display:flex}@keyframes dsh-pulse{0%,to{opacity:.55}50%{opacity:.9}}@keyframes dsh-spin{to{transform:rotate(360deg)}}.dsh-skeleton{background:var(--dsh-ui-elevated);border-radius:6px;animation:1.4s ease-in-out infinite dsh-pulse;display:block}.dsh-spinner{box-sizing:border-box;border:2px solid var(--dsw-alias-border-l2,var(--dsh-ui-border-strong));border-top-color:var(--dsw-alias-label-tertiary,var(--dsh-ui-muted));corner-shape:round;border-radius:50%;flex-shrink:0;width:20px;height:20px;animation:.8s linear infinite dsh-spin;display:inline-block}.dsh-progress-bar{background:var(--dsh-ui-elevated);border-radius:999px;width:100%;height:3px;position:relative;overflow:hidden}.dsh-progress-bar:after{content:\"\";background:var(--dsh-ui-accent);animation:1.1s ease-in-out infinite dsh-pulse;position:absolute;inset:0}.dsh-linear-progress{background:var(--dsw-alias-border-l3);border-radius:999px;width:100%;height:6px;position:relative;overflow:hidden}.dsh-linear-progress[data-size=small]{height:4px}.dsh-linear-progress:before{content:\"\";width:var(--dsh-progress-value,0%);border-radius:inherit;background:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));transition:width .16s;position:absolute;inset:0 auto 0 0}.dsh-circular-progress{flex:none;display:block;overflow:visible}.dsh-circular-progress-track{fill:none;stroke:var(--dsw-alias-border-l3)}.dsh-circular-progress-fill{fill:none;stroke:var(--dsh-progress-color,var(--dsw-alias-label-tertiary));stroke-linecap:round}.dsh-tooltip{flex:none;align-items:center;display:inline-flex}.dsh-tooltip-trigger{appearance:none;border-radius:var(--dsw-radius-sm);color:inherit;font:inherit;text-align:inherit;cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;margin:0;padding:0;display:inline-flex}.dsh-popover{align-items:center;display:inline-flex}.dsh-popover-trigger{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;padding:0;display:inline-flex}.dsh-tooltip-trigger:focus-visible,.dsh-popover-trigger:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill);outline-offset:2px}.dsh-tooltip-content,.dsh-popover-content{font-family:var(--dsw-font-family);z-index:1100;box-sizing:border-box;max-height:calc(100dvh - 12px - max(12px, var(--dsh-frame-overlay-top,12px)));border:0;min-height:0;margin:0;line-height:20px;position:fixed;overflow:auto}.dsh-tooltip-content{border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg,var(--dsh-ui-text));--dsh-tooltip-surface:var(--dsw-specific-menu);--dsh-tooltip-radius:var(--dsw-radius-lg);width:max-content;max-width:min(50vw,100vw - 24px);color:var(--dsw-alias-tooltip-label,var(--dsh-ui-bg-modal));cursor:default;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;padding:3px 7px;font-size:13px;line-height:20px}.dsh-popover-content{border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,var(--dsh-ui-bg-modal));width:min(264px,100vw - 24px);-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,none);backdrop-filter:var(--dsw-menu-backdrop-filter,none);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,var(--dsh-ui-border));box-shadow:var(--dsw-elevation-prominent,var(--dsh-ui-shadow-elevated));color:var(--dsw-alias-label-secondary,var(--dsh-ui-muted));overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;position-area:none;top:max(12px, var(--dsh-frame-overlay-top,12px));bottom:max(12px, anchor(top) + 8px);left:max(12px, anchor(left));position-try-fallbacks:--dsh-core-popover-window, --dsh-core-popover-opposite, --dsh-core-popover-wide-opposite, --dsh-core-popover-tall, --dsh-core-popover-viewport;place-self:end start;height:fit-content;padding:12px;font-size:12px;right:12px}@position-try --dsh-core-popover-window{}@position-try --dsh-core-popover-opposite{}@position-try --dsh-core-popover-wide-opposite{}@position-try --dsh-core-popover-tall{}@position-try --dsh-core-popover-viewport{}", R = {
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
}, z = {
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
}, B = /* @__PURE__ */ new Map([["dark", {
	id: "dark",
	baseMode: "dark",
	tokens: R
}], ["light", {
	id: "light",
	baseMode: "light",
	tokens: z
}]]), V = /* @__PURE__ */ new Set(), H = 0;
function U() {
	return H;
}
function W(e) {
	return V.add(e), () => {
		V.delete(e);
	};
}
function G(e) {
	B.set(e.id, e), H += 1, V.forEach((e) => {
		e();
	});
}
function K(e) {
	return B.get(e) ?? {
		id: "dark",
		baseMode: "dark",
		tokens: R
	};
}
function q() {
	return [...B.values()];
}
var te = [
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
function J(e, t) {
	let n = t ? {
		...e,
		...t
	} : e;
	return te.map(([e, t]) => `${t}:${n[e]}`).join(";");
}
// src/theme/styles.ts
var Y = "kalex-dsh-core-theme-styles", ne = I.scope;
function X(e = [
	".dsh-core-root",
	".ar-root",
	".ar-settings-root"
]) {
	let t = e.join(","), n = J(K("dark").tokens), r = e.map((e) => `${e}[data-theme="light"]`).join(","), i = J(K("light").tokens), a = q();
	return `${t}{${n}}\n${r}{${i}}\n${(Array.isArray(a) ? a : []).filter((e) => e.id !== "dark" && e.id !== "light").map((t) => `${e.map((e) => `${e}[data-theme="${t.id}"]`).join(",")}{${J(t.tokens)}}`).join("\n")}\n${L}`;
}
var re = X(), ie = /* @__PURE__ */ new Map(), ae = !1;
function oe() {
	if (typeof document < "u") for (let [e, t] of ie) {
		let n = document.getElementById(e);
		n && (n.textContent = t ? `${X()}\n${t}` : X());
	}
}
function se(e = Y, t) {
	if (typeof document > "u" || !document.head) return;
	ie.set(e, t);
	let n = document.getElementById(e);
	n || (n = document.createElement("style"), n.id = e, document.head.appendChild(n)), n.textContent = t ? `${X()}\n${t}` : X(), ae ||= (W(oe), !0);
}
// src/components/Notification/useNotificationCopy.ts
function ce(t) {
	let n = e(3), r = o(null), i;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (i = () => {
		let e = r.current;
		if (!e) return;
		let t = document.createRange();
		t.selectNodeContents(e);
		let n = window.getSelection();
		n?.removeAllRanges(), n?.addRange(t);
	}, n[0] = i) : i = n[0];
	let a = i, s;
	return n[1] === t ? s = n[2] : (s = {
		copy: () => {
			navigator.clipboard ? navigator.clipboard.writeText(t).catch(a) : a();
		},
		textRef: r
	}, n[1] = t, n[2] = s), s;
}
// src/components/Notification/Notification.tsx
function le(t) {
	let n = e(13), { severity: r, title: i, message: a, onClose: o, copyLabel: c, closeLabel: p } = t, [m, h] = s(null), { copy: g, textRef: _ } = ce(`${i}\n${a}`), v;
	n[0] === Symbol.for("react.memo_cache_sentinel") ? (v = /* @__PURE__ */ d("span", {
		ref: h,
		hidden: !0
	}), n[0] = v) : v = n[0];
	let y;
	n[1] !== m || n[2] !== p || n[3] !== g || n[4] !== c || n[5] !== a || n[6] !== o || n[7] !== r || n[8] !== _ || n[9] !== i ? (y = m && l(/* @__PURE__ */ f("aside", {
		className: `${ne} dsh-notification`,
		"data-severity": r,
		children: [/* @__PURE__ */ f("div", {
			ref: _,
			className: "dsh-notification-text",
			children: [/* @__PURE__ */ d("strong", { children: i }), /* @__PURE__ */ d("p", { children: a })]
		}), /* @__PURE__ */ f("div", {
			className: "dsh-notification-actions",
			children: [/* @__PURE__ */ d(x, {
				onClick: g,
				children: c
			}), /* @__PURE__ */ d(x, {
				onClick: o,
				children: p
			})]
		})]
	}), m.closest("[data-theme]:not(html)") ?? m.ownerDocument.body), n[1] = m, n[2] = p, n[3] = g, n[4] = c, n[5] = a, n[6] = o, n[7] = r, n[8] = _, n[9] = i, n[10] = y) : y = n[10];
	let b;
	return n[11] === y ? b = n[12] : (b = /* @__PURE__ */ f(u, { children: [v, y] }), n[11] = y, n[12] = b), b;
}
// src/components/Popover/Popover.tsx
function Z(t) {
	let n = e(26), { children: c, content: u, triggerClassName: p, contentClassName: h, triggerElement: g } = t, _ = a(), v;
	n[0] === _ ? v = n[1] : (v = _.replaceAll(":", ""), n[0] = _, n[1] = v);
	let y = `--dsh-core-popover-${v}`, [b, x] = s(), S = o(null), C = o(null), w, T;
	n[2] === b ? (w = n[3], T = n[4]) : (w = () => {
		if (!b) return;
		let e = (e) => {
			let t = e.target;
			!(t instanceof Node) || S.current?.contains(t) || C.current?.contains(t) || x(void 0);
		}, t = (e) => {
			e.key === "Escape" && x(void 0);
		};
		return document.addEventListener("pointerdown", e, !0), document.addEventListener("keydown", t), () => {
			document.removeEventListener("pointerdown", e, !0), document.removeEventListener("keydown", t);
		};
	}, T = [b], n[2] = b, n[3] = w, n[4] = T), i(w, T);
	let E;
	n[5] === y ? E = n[6] : (E = { positionAnchor: y }, n[5] = y, n[6] = E);
	let D = E, O;
	n[7] !== u || n[8] !== h || n[9] !== D || n[10] !== _ || n[11] !== b ? (O = b ? l(/* @__PURE__ */ d("div", {
		ref: C,
		id: _,
		role: "dialog",
		className: m("dsh-popover-content", h),
		style: D,
		children: u
	}), b) : void 0, n[7] = u, n[8] = h, n[9] = D, n[10] = _, n[11] = b, n[12] = O) : O = n[12];
	let k = O, A;
	n[13] === b ? A = n[14] : (A = (e) => x(b ? void 0 : e.currentTarget.closest("[data-theme]:not(html)") ?? document.body), n[13] = b, n[14] = A);
	let j;
	if (n[15] !== c || n[16] !== A || n[17] !== p || n[18] !== g) {
		let e = { onClick: A };
		j = g === void 0 ? r("button", {
			type: "button",
			className: m("dsh-popover-trigger", p),
			...e
		}, c) : r(g, {
			className: m("dsh-popover-trigger", p),
			...e
		}, c), n[15] = c, n[16] = A, n[17] = p, n[18] = g, n[19] = j;
	} else j = n[19];
	let M = j, N;
	n[20] === y ? N = n[21] : (N = { anchorName: y }, n[20] = y, n[21] = N);
	let P = N, F;
	return n[22] !== k || n[23] !== P || n[24] !== M ? (F = /* @__PURE__ */ f("span", {
		ref: S,
		className: "dsh-popover",
		style: P,
		children: [M, k]
	}), n[22] = k, n[23] = P, n[24] = M, n[25] = F) : F = n[25], F;
}
// src/components/Progress/progressOptions.ts
function Q(e) {
	return !e || e === "default" ? "var(--dsw-alias-label-tertiary)" : e === "accent" ? "var(--dsw-alias-button-info-fill)" : e;
}
// src/components/Progress/CircularProgress.tsx
function $(t) {
	let n = e(26), { value: r, size: i, color: a, className: o } = t, s = i === void 0 ? "standard" : i, c = a === void 0 ? "default" : a, l;
	n[0] === r ? l = n[1] : (l = Number.isFinite(r) ? Math.min(100, Math.max(0, r)) : 0, n[0] = r, n[1] = l);
	let u = l, p = s === "small" ? 14 : 20, h = p / 2, g = s === "small" ? 2 : 2.5, _ = s === "small" ? 5.5 : h - g / 2, v = 2 * Math.PI * _, y;
	n[2] === o ? y = n[3] : (y = m("dsh-circular-progress", o), n[2] = o, n[3] = y);
	let b = `0 0 ${p} ${p}`, x;
	n[4] === c ? x = n[5] : (x = Q(c), n[4] = c, n[5] = x);
	let S;
	n[6] === x ? S = n[7] : (S = { "--dsh-progress-color": x }, n[6] = x, n[7] = S);
	let C = S, w;
	n[8] !== h || n[9] !== _ || n[10] !== g ? (w = /* @__PURE__ */ d("circle", {
		className: "dsh-circular-progress-track",
		cx: h,
		cy: h,
		r: _,
		strokeWidth: g
	}), n[8] = h, n[9] = _, n[10] = g, n[11] = w) : w = n[11];
	let T = `${v * u / 100} ${v}`, E = `rotate(-90 ${h} ${h})`, D;
	n[12] !== h || n[13] !== _ || n[14] !== g || n[15] !== T || n[16] !== E ? (D = /* @__PURE__ */ d("circle", {
		className: "dsh-circular-progress-fill",
		cx: h,
		cy: h,
		r: _,
		strokeWidth: g,
		strokeDasharray: T,
		transform: E
	}), n[12] = h, n[13] = _, n[14] = g, n[15] = T, n[16] = E, n[17] = D) : D = n[17];
	let O;
	return n[18] !== p || n[19] !== s || n[20] !== D || n[21] !== y || n[22] !== b || n[23] !== C || n[24] !== w ? (O = /* @__PURE__ */ f("svg", {
		className: y,
		"data-size": s,
		viewBox: b,
		width: p,
		height: p,
		style: C,
		children: [w, D]
	}), n[18] = p, n[19] = s, n[20] = D, n[21] = y, n[22] = b, n[23] = C, n[24] = w, n[25] = O) : O = n[25], O;
}
// src/components/Progress/LinearProgress.tsx
function ue(t) {
	let n = e(13), { value: r, size: i, color: a, className: o } = t, s = i === void 0 ? "standard" : i, c = a === void 0 ? "accent" : a, l;
	n[0] === r ? l = n[1] : (l = Number.isFinite(r) ? Math.min(100, Math.max(0, r)) : 0, n[0] = r, n[1] = l);
	let u = l, f;
	n[2] === o ? f = n[3] : (f = m("dsh-linear-progress", o), n[2] = o, n[3] = f);
	let p = `${u}%`, h;
	n[4] === c ? h = n[5] : (h = Q(c), n[4] = c, n[5] = h);
	let g;
	n[6] !== p || n[7] !== h ? (g = {
		"--dsh-progress-value": p,
		"--dsh-progress-color": h
	}, n[6] = p, n[7] = h, n[8] = g) : g = n[8];
	let _ = g, v;
	return n[9] !== s || n[10] !== f || n[11] !== _ ? (v = /* @__PURE__ */ d("div", {
		className: f,
		"data-size": s,
		style: _
	}), n[9] = s, n[10] = f, n[11] = _, n[12] = v) : v = n[12], v;
}
// src/components/RadioCardGroup/RadioCardGroup.tsx
function de(t) {
	let n = e(20), { name: r, label: i, value: a, options: o, onChange: s, disabled: c, className: l } = t, u = c !== void 0 && c, p;
	n[0] === l ? p = n[1] : (p = m("dsh-radio-card-group", l), n[0] = l, n[1] = p);
	let h;
	n[2] === i ? h = n[3] : (h = /* @__PURE__ */ d("legend", {
		className: "dsh-radio-card-legend",
		children: i
	}), n[2] = i, n[3] = h);
	let g;
	if (n[4] !== r || n[5] !== s || n[6] !== o || n[7] !== a) {
		let e;
		n[9] !== r || n[10] !== s || n[11] !== a ? (e = (e) => /* @__PURE__ */ f("label", {
			className: "dsh-radio-card",
			children: [/* @__PURE__ */ d("input", {
				type: "radio",
				name: r,
				value: e.value,
				checked: a === e.value,
				onChange: () => s(e.value)
			}), /* @__PURE__ */ f("span", {
				className: "dsh-radio-card-content",
				children: [/* @__PURE__ */ d("span", {
					className: "dsh-radio-card-title",
					children: e.label
				}), /* @__PURE__ */ d("span", {
					className: "dsh-radio-card-description",
					id: `${r}-${e.value}-description`,
					children: e.description
				})]
			})]
		}, e.value), n[9] = r, n[10] = s, n[11] = a, n[12] = e) : e = n[12], g = o.map(e), n[4] = r, n[5] = s, n[6] = o, n[7] = a, n[8] = g;
	} else g = n[8];
	let _;
	n[13] === g ? _ = n[14] : (_ = /* @__PURE__ */ d("div", {
		className: "dsh-radio-card-options",
		children: g
	}), n[13] = g, n[14] = _);
	let v;
	return n[15] !== u || n[16] !== p || n[17] !== h || n[18] !== _ ? (v = /* @__PURE__ */ f("fieldset", {
		className: p,
		disabled: u,
		children: [h, _]
	}), n[15] = u, n[16] = p, n[17] = h, n[18] = _, n[19] = v) : v = n[19], v;
}
// src/components/SwitchControl/SwitchControl.tsx
function fe(t) {
	let n = e(12), { checked: r, onChange: i, disabled: a, className: o } = t, s = a !== void 0 && a, c;
	n[0] === o ? c = n[1] : (c = m("dsh-switch", "ar-settings-switch", o), n[0] = o, n[1] = c);
	let l;
	n[2] !== r || n[3] !== s || n[4] !== i ? (l = () => {
		s || i(!r);
	}, n[2] = r, n[3] = s, n[4] = i, n[5] = l) : l = n[5];
	let u;
	n[6] === Symbol.for("react.memo_cache_sentinel") ? (u = /* @__PURE__ */ d("span", {}), n[6] = u) : u = n[6];
	let f;
	return n[7] !== r || n[8] !== s || n[9] !== c || n[10] !== l ? (f = /* @__PURE__ */ d("button", {
		type: "button",
		"data-testid": p.Common.Switch,
		"data-checked": r,
		disabled: s,
		className: c,
		onClick: l,
		children: u
	}), n[7] = r, n[8] = s, n[9] = c, n[10] = l, n[11] = f) : f = n[11], f;
}
// src/components/Tabs/Tabs.tsx
function pe(t) {
	let n = e(14), { items: r, activeValue: i, onChange: a, className: o, tabClassName: s } = t, c;
	n[0] === o ? c = n[1] : (c = m("dsh-tabs", "ar-tabs", o), n[0] = o, n[1] = c);
	let l;
	if (n[2] !== i || n[3] !== r || n[4] !== a || n[5] !== s) {
		let e;
		n[7] !== i || n[8] !== a || n[9] !== s ? (e = (e) => {
			let t = e.value === i;
			return /* @__PURE__ */ d("button", {
				type: "button",
				"data-testid": p.Common.TabButton,
				disabled: e.disabled,
				className: m("dsh-tab", "ar-tab", t && "active", s),
				onClick: () => {
					!e.disabled && e.value !== i && a(e.value);
				},
				children: e.label
			}, e.value);
		}, n[7] = i, n[8] = a, n[9] = s, n[10] = e) : e = n[10], l = r.map(e), n[2] = i, n[3] = r, n[4] = a, n[5] = s, n[6] = l;
	} else l = n[6];
	let u;
	return n[11] !== c || n[12] !== l ? (u = /* @__PURE__ */ d("div", {
		"data-testid": p.Common.TabsList,
		className: c,
		children: l
	}), n[11] = c, n[12] = l, n[13] = u) : u = n[13], u;
}
// src/components/FieldError/FieldError.tsx
function me(t) {
	let n = e(2), { error: r } = t, i;
	return n[0] === r ? i = n[1] : (i = r ? /* @__PURE__ */ d("span", {
		className: "dsh-field-error",
		children: r
	}) : null, n[0] = r, n[1] = i), i;
}
// src/components/TextField/TextField.tsx
function he(t) {
	let n = e(22), { value: r, size: i, onChange: a, placeholder: o, disabled: s, type: c, className: l, id: u, maxLength: p, autoComplete: h, spellCheck: g, error: _ } = t, v = i === void 0 ? "standard" : i, y = s !== void 0 && s, b = c === void 0 ? "text" : c, x;
	n[0] === a ? x = n[1] : (x = (e) => a(e.currentTarget.value), n[0] = a, n[1] = x);
	let S = x, C = v === "small" && "dsh-input-sm", w;
	n[2] !== l || n[3] !== C ? (w = m("dsh-input", C, l), n[2] = l, n[3] = C, n[4] = w) : w = n[4];
	let T = _ ? !0 : void 0, E;
	n[5] !== h || n[6] !== y || n[7] !== S || n[8] !== u || n[9] !== p || n[10] !== o || n[11] !== v || n[12] !== g || n[13] !== w || n[14] !== T || n[15] !== b || n[16] !== r ? (E = /* @__PURE__ */ d("input", {
		type: b,
		className: w,
		"data-size": v,
		"data-invalid": T,
		value: r,
		onChange: S,
		placeholder: o,
		disabled: y,
		id: u,
		maxLength: p,
		autoComplete: h,
		spellCheck: g
	}), n[5] = h, n[6] = y, n[7] = S, n[8] = u, n[9] = p, n[10] = o, n[11] = v, n[12] = g, n[13] = w, n[14] = T, n[15] = b, n[16] = r, n[17] = E) : E = n[17];
	let D = E, O;
	return n[18] !== _ || n[19] !== D || n[20] !== t ? (O = Object.hasOwn(t, "error") ? /* @__PURE__ */ f("span", {
		className: "dsh-text-field-validation",
		children: [D, /* @__PURE__ */ d(me, { error: _ })]
	}) : D, n[18] = _, n[19] = D, n[20] = t, n[21] = O) : O = n[21], O;
}
// src/components/ThemedSelect/ThemedSelect.tsx
function ge(t) {
	let n = e(80), { value: r, size: a, options: c, onChange: l, disabled: u, fullWidth: h, showCheckmark: g, className: _, triggerClassName: v, menuClassName: y, optionClassName: b, id: x, error: S, search: C } = t, w = a === void 0 ? "standard" : a, T = u !== void 0 && u, E = h !== void 0 && h, D = g !== void 0 && g, O = o(void 0), k = o(null), A = o(null), j = o(!1), M = o(null), [N, P] = s(!1), [F, ee] = s(""), I;
	if (n[0] !== c || n[1] !== F || n[2] !== C) {
		let e = F.trim().toLowerCase();
		I = C && e ? c.filter((t) => !t.disabled && t.label.toLowerCase().includes(e)) : c, n[0] = c, n[1] = F, n[2] = C, n[3] = I;
	} else I = n[3];
	let L = I, R;
	if (n[4] !== c || n[5] !== r) {
		let e;
		n[7] === r ? e = n[8] : (e = (e) => e.value === r, n[7] = r, n[8] = e), R = c.findIndex(e), n[4] = c, n[5] = r, n[6] = R;
	} else R = n[6];
	let z = Math.max(R, 0), [B, V] = s(z), H = c[z], U, W;
	n[9] === N ? (U = n[10], W = n[11]) : (U = () => {
		if (!N || typeof document > "u") return;
		let e = (e) => {
			let t = e.target;
			O.current && t && !O.current.contains(t) && P(!1);
		};
		return document.addEventListener("mousedown", e, !0), () => {
			document.removeEventListener("mousedown", e, !0);
		};
	}, W = [N], n[9] = N, n[10] = U, n[11] = W), i(U, W);
	let G = C !== void 0, K, q;
	n[12] !== N || n[13] !== G ? (q = () => {
		if (!N || !G) return;
		M.current?.focus();
		let e = (e) => {
			e.target instanceof Node && !O.current?.contains(e.target) && P(!1);
		};
		return document.addEventListener("focusin", e), () => document.removeEventListener("focusin", e);
	}, K = [N, G], n[12] = N, n[13] = G, n[14] = K, n[15] = q) : (K = n[14], q = n[15]), i(q, K);
	let te, J;
	n[16] !== B || n[17] !== N || n[18] !== G ? (te = () => {
		if (!j.current || !N) return;
		j.current = !1;
		let e = A.current, t = e?.children.item(B + +!!G);
		if (!(t instanceof HTMLElement) || e === null) return;
		let n = t.getBoundingClientRect(), r = e.getBoundingClientRect(), i = M.current?.getBoundingClientRect().bottom ?? r.top;
		n.top < i && (e.scrollTop += n.top - i), n.bottom > r.bottom && (e.scrollTop += n.bottom - r.bottom);
	}, J = [
		B,
		N,
		G
	], n[16] = B, n[17] = N, n[18] = G, n[19] = te, n[20] = J) : (te = n[19], J = n[20]), i(te, J);
	let Y;
	n[21] === N ? Y = n[22] : (Y = (e) => {
		N && e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), P(!1), k.current?.focus());
	}, n[21] = N, n[22] = Y);
	let X = Y, re;
	n[23] === L ? re = n[24] : (re = (e) => {
		let t = L.length;
		t !== 0 && V((n) => {
			for (let r = 1; r <= t; r++) {
				let i = (n + e * r + t) % t;
				if (!L[i]?.disabled) return i;
			}
			return n;
		});
	}, n[23] = L, n[24] = re);
	let ie = re, ae;
	n[25] !== B || n[26] !== T || n[27] !== X || n[28] !== ie || n[29] !== l || n[30] !== N || n[31] !== c.length || n[32] !== z || n[33] !== L ? (ae = (e) => {
		if (!(T || c.length === 0)) {
			if (e.key === "Escape") X(e);
			else if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault(), j.current = !0, N ? ie(e.key === "ArrowDown" ? 1 : -1) : (ee(""), V(z), P(!0));
			else if (e.key === "Enter") {
				if (e.preventDefault(), !N) j.current = !0, ee(""), V(z), P(!0);
				else {
					let e = L[B];
					e && !e.disabled && (l(e.value), P(!1), k.current?.focus());
				}
			}
		}
	}, n[25] = B, n[26] = T, n[27] = X, n[28] = ie, n[29] = l, n[30] = N, n[31] = c.length, n[32] = z, n[33] = L, n[34] = ae) : ae = n[34];
	let oe = ae, se;
	n[35] === Symbol.for("react.memo_cache_sentinel") ? (se = (e) => {
		O.current = e ?? void 0;
	}, n[35] = se) : se = n[35];
	let ce = w === "small" && "dsh-select-sm", le = E && "dsh-select-full", Z;
	n[36] !== _ || n[37] !== ce || n[38] !== le ? (Z = m(ne, "dsh-select", "ar-themed-select", ce, le, _), n[36] = _, n[37] = ce, n[38] = le, n[39] = Z) : Z = n[39];
	let Q = S ? !0 : void 0, $;
	n[40] === v ? $ = n[41] : ($ = m("dsh-select-trigger", "ar-themed-select-trigger", v), n[40] = v, n[41] = $);
	let ue;
	n[42] !== T || n[43] !== z ? (ue = () => {
		T || (ee(""), V(z), P(_e));
	}, n[42] = T, n[43] = z, n[44] = ue) : ue = n[44];
	let de = H?.label ?? "", fe;
	n[45] === de ? fe = n[46] : (fe = /* @__PURE__ */ d("span", {
		className: "dsh-select-label",
		children: de
	}), n[45] = de, n[46] = fe);
	let pe = N ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6", he;
	n[47] === pe ? he = n[48] : (he = /* @__PURE__ */ d("svg", {
		width: 14,
		height: 14,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ d("path", { d: pe })
	}), n[47] = pe, n[48] = he);
	let ge;
	n[49] !== T || n[50] !== oe || n[51] !== x || n[52] !== Q || n[53] !== $ || n[54] !== ue || n[55] !== fe || n[56] !== he ? (ge = /* @__PURE__ */ f("button", {
		ref: k,
		type: "button",
		id: x,
		"data-invalid": Q,
		"data-testid": p.Common.SelectTrigger,
		className: $,
		disabled: T,
		onKeyDown: oe,
		onClick: ue,
		children: [fe, he]
	}), n[49] = T, n[50] = oe, n[51] = x, n[52] = Q, n[53] = $, n[54] = ue, n[55] = fe, n[56] = he, n[57] = ge) : ge = n[57];
	let ve;
	n[58] !== B || n[59] !== T || n[60] !== X || n[61] !== oe || n[62] !== y || n[63] !== l || n[64] !== N || n[65] !== b || n[66] !== F || n[67] !== C || n[68] !== H?.value || n[69] !== D || n[70] !== L ? (ve = N ? /* @__PURE__ */ f("div", {
		ref: A,
		"data-testid": p.Common.SelectMenu,
		className: m("dsh-select-menu", "ar-themed-select-menu", y),
		children: [
			C ? /* @__PURE__ */ d("input", {
				ref: M,
				className: "dsh-input dsh-select-search",
				placeholder: C.placeholder,
				value: F,
				disabled: T,
				onKeyDown: oe,
				onChange: (e) => {
					ee(e.currentTarget.value), V(0), A.current && (A.current.scrollTop = 0);
				}
			}) : null,
			L.length === 0 && C ? /* @__PURE__ */ d("div", { children: C.emptyText }) : null,
			L.map((e, t) => {
				let n = e.value === H?.value, r = t === B;
				return /* @__PURE__ */ f("button", {
					type: "button",
					"data-testid": p.Common.SelectOption,
					disabled: e.disabled,
					className: m("dsh-select-option", (r || n) && "active", b),
					onKeyDown: X,
					onMouseEnter: () => V(t),
					onClick: () => {
						e.disabled || (l(e.value), P(!1));
					},
					children: [/* @__PURE__ */ d("span", { children: e.label }), D && n ? /* @__PURE__ */ d("span", { children: "✓" }) : void 0]
				}, e.value);
			})
		]
	}) : void 0, n[58] = B, n[59] = T, n[60] = X, n[61] = oe, n[62] = y, n[63] = l, n[64] = N, n[65] = b, n[66] = F, n[67] = C, n[68] = H?.value, n[69] = D, n[70] = L, n[71] = ve) : ve = n[71];
	let ye;
	n[72] === S ? ye = n[73] : (ye = /* @__PURE__ */ d(me, { error: S }), n[72] = S, n[73] = ye);
	let be;
	return n[74] !== w || n[75] !== Z || n[76] !== ge || n[77] !== ve || n[78] !== ye ? (be = /* @__PURE__ */ f("div", {
		ref: se,
		className: Z,
		"data-size": w,
		children: [
			ge,
			ve,
			ye
		]
	}), n[74] = w, n[75] = Z, n[76] = ge, n[77] = ve, n[78] = ye, n[79] = be) : be = n[79], be;
}
function _e(e) {
	return !e;
}
// src/constants/delay.ts
var ve = {
	AnimationShort: 180,
	Animation: 300,
	AutocompleteSearch: 300,
	PollingDefault: 3e3
}, ye = {
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
function be(t, n) {
	let r = e(4), a = n === void 0 ? ve.AutocompleteSearch : n, [o, c] = s(t), l, u;
	return r[0] !== a || r[1] !== t ? (l = () => {
		let e = setTimeout(() => {
			c(t);
		}, a);
		return () => {
			clearTimeout(e);
		};
	}, u = [t, a], r[0] = a, r[1] = t, r[2] = l, r[3] = u) : (l = r[2], u = r[3]), i(l, u), o;
}
// src/hooks/useDshThemeRevision.ts
function xe() {
	return c(W, U, U);
}
// src/hooks/useEffectiveTheme.ts
var Se = ".dsh-core-root, .ar-root, .ar-settings-root";
function Ce(e) {
	let t = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(e);
	if (t?.[1] && t[2] && t[3]) return {
		r: Number(t[1]),
		g: Number(t[2]),
		b: Number(t[3]),
		a: t[4] === void 0 ? 1 : Number(t[4])
	};
}
function we({ r: e, g: t, b: n }) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function Te(e, t = Se) {
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
			let t = Ce(getComputedStyle(e).backgroundColor);
			if (t && t.a > .2) return we(t) > 140 ? "light" : "dark";
		}
		if (document.body) {
			let e = Ce(getComputedStyle(document.body).color);
			if (e) return we(e) < 100 ? "light" : "dark";
		}
	}
	return typeof window < "u" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}
function Ee(t, n) {
	let r = e(8), a = t === void 0 ? "auto" : t, o;
	r[0] === a ? o = r[1] : (o = a !== "auto" && a.trim() !== "" ? K(a).id : void 0, r[0] = a, r[1] = o);
	let c = o, l;
	r[2] === c ? l = r[3] : (l = () => c ?? Te(), r[2] = c, r[3] = l);
	let [u, d] = s(l), f, p;
	return r[4] !== c || r[5] !== n ? (f = () => {
		if (c) return;
		let e = () => {
			d(Te(n?.current ?? void 0));
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
	}, p = [c, n], r[4] = c, r[5] = n, r[6] = f, r[7] = p) : (f = r[6], p = r[7]), i(f, p), c ?? u;
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
export { x as Button, w as Checkbox, P as ChildrenLazy, $ as CircularProgress, E as CloseIcon, T as CodeDisclosure, S as CollectionAddButton, ye as CoreLocalization, ve as Delay, C as IconButton, D as InfoIcon, ue as LinearProgress, F as Modal, le as Notification, Z as Popover, j as ProgressBar, de as RadioCardGroup, O as RefreshIcon, k as SettingsIcon, M as Skeleton, N as Spinner, fe as SwitchControl, pe as Tabs, p as TestId, he as TextField, ge as ThemedSelect, b as Tooltip, A as TrashIcon, X as buildCoreThemeStyles, J as buildThemeCssVariables, ne as coreStyleScopeClass, re as coreThemeStyles, m as cx, R as darkThemeTokens, Te as detectHostTheme, se as ensureCoreStyles, Me as extractHost, Ae as formatMessage, K as getDshTheme, U as getDshThemeRevision, z as lightThemeTokens, q as listDshThemes, ke as persistLocale, Oe as readSavedLocale, G as registerDshTheme, De as resolveDshLocale, je as sanitizeHostInput, W as subscribeDshThemeChanges, be as useDebouncedValue, xe as useDshThemeRevision, Ee as useEffectiveTheme };
