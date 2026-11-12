# Features

## What it provides

A shared design system, UI components, themes, hooks, and utilities for DSH plugins so plugins do not duplicate common logic and look consistent.

## Components

- `Button`, `IconButton` - buttons and icon buttons.
- `ThemedSelect` - themed dropdown select.
- `SwitchControl` - switch control.
- `Tabs` - tabs.
- `Modal` - modal window.
- `Skeleton`, `Spinner`, `ProgressBar`, `ChildrenLazy` - loading states.

## Themes

Unified CSS variables `--dsh-ui-*` for surfaces, text, borders, elevations, and semantic states (`info`, `success`, `warning`, `danger`). Support for light, dark, and custom themes. The `buildCoreThemeStyles` function generates theme styles.

## Hooks

- `useDebouncedValue` - debounced value.
- `useLocalePreference` - locale preference.
- `useEffectiveTheme` - effective (current) theme.
- `useDshThemeRevision` - DSH theme revision.

## Utilities

- `classNames` - class merging.
- `formatMessage` - localization string formatting with `{0}`, `{1}` substitution.
- `hostSanitizer` - sanitizing host-provided data.

## Models and constants

- `SelectOption`, `ThemePalette`, `DshContext` - shared types.
- `Delay` - standard animation and debounce timings.
- `CoreLocalization` localization with `ru` and `en` support.

## Tech Stack

| Technology | Version / features     |
| ---------- | ---------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                     |
| Vite (Oxc) | 8.3.5                  |
| Vitest     | 3.2.0                  |

## Architecture

The package does not depend on specific plugins: components, hooks, themes, utilities, and models are isolated and reused by any DSH plugin.
