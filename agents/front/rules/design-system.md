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

## 2. Loading States and Animations

- Never show an empty unstyled container while data loads: display `Skeleton`, `Spinner`, or `ProgressBar` from `@kalex/dsh-core` marked with `TestId.Common.Loading`.
- Use standard animation timing constants from `Delay` (`Delay.AnimationShort = 300`, `Delay.DebounceSearch = 300`) to prevent visual flicker.

## 3. Design Principles

Read this skill [design-principles](/agents/front/skills/design-principles/SKILL.md) when you need to change the visual appearance of UI components.
