---
paths:
  - "packages/dsh-core/src/**"
  - "packages/*/src/client/**"
description: Enforces unified DSH plus Google Material 3 design-system tokens, theme extensibility, and flicker-free loading states.
---

# UI and Design System Consistency (`@kalex/dsh-core`)

## 1. Single Source of Truth (`@kalex/dsh-core/theme`)

- Use CSS custom properties (`--dsh-ui-*`) defined in `@kalex/dsh-core` for all surfaces, text, borders, elevations, and semantic states (`info`, `success`, `warning`, `danger`). Never hardcode raw hex or RGB values inside feature components.
- Preserve DSH plus Google Material 3 parity: plugin surfaces must blend with the host DSH shell while providing clear `default`, `hover`, `active`, `focus-visible`, and `disabled` states and legible contrast in `light`, `dark`, and custom registered themes.
- Allow local style overrides in plugins and components through `className`, `variant`, and scoped CSS variables without modifying shared component internals.
- CSS Modules must use locally scoped selectors. Avoid `:global` and other unscoped selectors; allow them only when required to style host-provided or shared-component DOM, with a nearby comment explaining the need and scope.

## 2. Core Theme Integration (Required)

- Every React UI root consuming `--dsh-ui-*` tokens must resolve its active theme with `useEffectiveTheme()` from `@kalex/dsh-core` and apply it as `data-theme={theme}`. Do not infer or hardcode `light` or `dark` in components.
- The element carrying `data-theme` must also be a Core-recognized theme root: use an existing root selector listed by `buildCoreThemeStyles()` (for example `.ar-root`, `.ar-settings-root`, or `.dsh-core-root`). Core tokens are scoped to these roots; loading Core CSS alone does not make tokens available in arbitrary plugin markup. Prefer an existing suitable root instead of adding a plugin-specific selector to Core.
- Resolve the theme once per independently mounted DSH slot or application root. Descendants, including Modal, Popover, Tooltip and Notification, inherit CSS tokens: no theme props, theme detection, subscriptions, or nested palette resets. Mount overlays inside the owning theme boundary; portals must preserve the same inherited tokens.
- Load or inject Core theme CSS with `ensureCoreStyles()` or `buildCoreThemeStyles()` using the package's established style setup. This makes token rules available; `useEffectiveTheme()` plus a recognized `data-theme` root makes them apply. These are separate required steps when the component does not inherit a Core-owned theme root.

## 3. Loading States and Animations

- Never show an empty unstyled container while data loads: display `Skeleton`, `Spinner`, or `ProgressBar` from `@kalex/dsh-core`, marked with `TestId.Common.Loading`.
- Use standard animation timing constants from `Delay` (`Delay.AnimationShort = 300`, `Delay.DebounceSearch = 300`) to prevent visual flicker.

## 4. Design Principles

Read [design-principles](/agents/front/skills/design-principles/SKILL.md) when changing the visual appearance of UI components.
