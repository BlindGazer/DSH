---
description: Enforces visual, stylistic, and interactive consistency across all UI and Web components using unified theme tokens and shared controls.
---

# UI and Design System Consistency

Adhere to a unified design system and visual language across all plugins and UI surfaces. Do not introduce one-off styles for elements with the same purpose.

## 1. Single Source of Truth (Design Tokens)
- **Color Palette:** Use predefined CSS variables and theme tokens (`--dsh-ui-*`) for backgrounds, text, borders, and accents in both light and dark themes. Do not hardcode raw hex, RGB, or HSL values inside individual components outside the root theme definition.
- **Theme Parity:** Every surface, border, and interactive state must remain legible and consistent in both light and dark themes. Never use `--dsh-ui-on-accent` (white) text on soft or neutral hover/selected backgrounds (`--dsh-ui-hover`, `--dsh-ui-info-soft`).
- **Typography and Spacing:** Use standardized font sizes, weights, line heights, control heights, and spacing from the host DSH theme.

## 2. Semantic and Functional Consistency
- **Identical Purpose = Identical Style:** Controls with the same role (buttons, icon buttons, dropdowns, badges, inputs, modals, tabs) must match DSH dimensions, borders, and spacing.
- **Interactive States:** Every interactive control must define consistent `default`, `hover`, `active`, `focus-visible`, and `disabled` states with sufficient text contrast in both themes.

## 3. Component Reusability Over Duplication
- Reuse existing themed components (`ThemedSelect`, `SwitchControl`, standard buttons and cards) instead of ad-hoc inline styles or `!important` overrides.
