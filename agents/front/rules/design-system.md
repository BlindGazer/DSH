---
paths:
  - "packages/dsh-core/src/**"
  - "packages/*/src/client/**"
description: Enforces unified DSH + Google Material 3 design system tokens, theme extensibility, and flicker-free loading states.
---

# UI and Design System Consistency (`@kalex/dsh-core`)

## 1. Single Source of Truth (`@kalex/dsh-core/theme`)

- Use CSS custom properties (`--dsh-ui-*`) defined in `@kalex/dsh-core` for all surfaces, text, borders, elevations, and semantic states (`info`, `success`, `warning`, `danger`). Never hardcode raw hex/RGB values inside feature components.
- Seamless DSH + Google Material 3 parity: plugin surfaces must blend seamlessly with the host DSH shell while providing clear interactive states (`default`, `hover`, `active`, `focus-visible`, `disabled`) and legible contrast in both `light`, `dark`, and custom registered themes.
- Allow local style overrides in plugins and components via `className`, `variant`, and scoped CSS variables without modifying shared component internals.
- CSS Modules must use locally scoped selectors. Avoid `:global` and other unscoped selectors; allow them only when required to style host-provided or shared-component DOM, with a nearby comment explaining the need and scope.

## 2. Core Theme Integration (Required)

- Every React UI root that consumes `--dsh-ui-*` tokens must resolve its active theme with `useEffectiveTheme()` from `@kalex/dsh-core` and apply the result as `data-theme={theme}`. Do not infer or hardcode `light`/`dark` in components.
- The element carrying `data-theme` must also be a Core-recognized theme root: use an existing root selector listed by `buildCoreThemeStyles()` (for example `.ar-root`, `.ar-settings-root`, or `.dsh-core-root`). Core tokens are scoped to those roots; loading Core CSS alone does not make tokens available in arbitrary plugin markup. Prefer an existing suitable root instead of adding a plugin-specific selector to Core.
- If UI is rendered inside a Core component that owns its theme root (for example `<Modal theme={theme}>`), pass the effective theme to that component and let it provide the root; avoid redundant nested theme roots unless content is rendered outside it (such as through a portal).
- Load/inject Core theme CSS with `ensureCoreStyles()` or `buildCoreThemeStyles()` using the package's established style setup. This makes token rules available; `useEffectiveTheme()` plus a recognized `data-theme` root makes them apply to the component. These are separate required steps when the component does not inherit a Core-owned theme root.

## 3. Loading States and Animations

- Never show an empty unstyled container while data loads: display `Skeleton`, `Spinner`, or `ProgressBar` from `@kalex/dsh-core` marked with `TestId.Common.Loading`.
- Use standard animation timing constants from `Delay` (`Delay.AnimationShort = 300`, `Delay.DebounceSearch = 300`) to prevent visual flicker.

## 4. Design Principles

Read this skill [design-principles](/agents/front/skills/design-principles/SKILL.md) when you need to change the visual appearance of UI components.
