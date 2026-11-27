# Components and themes

## Components

- Buttons: `Button`, `IconButton`, `CollectionAddButton`.
- Inputs and controls: `TextField`, `ThemedSelect`, `Checkbox`, `SwitchControl`, `RadioCardGroup`.
- Tabs and overlays: `Tabs`, `Modal`, `Popover`, `Tooltip`, `Notification`.
- Loading and progress: `Skeleton`, `Spinner`, `ProgressBar`, `ChildrenLazy`, `CircularProgress`, `LinearProgress`.
- Expandable code block: `CodeDisclosure`.

`Notification` stays open until dismissed. You can select the text or use the copy button; if copying through the Clipboard API fails, the component selects the text for manual copying. Keep secrets out of the title and message.

## Themes

The `--dsh-ui-*` CSS variables define colors, borders, shadows, and status colors (`info`, `success`, `warning`, `danger`) for light, dark, and custom themes. To use the shared styles, load the theme CSS (`ensureCoreStyles` or `buildCoreThemeStyles`) and set `data-theme` from `useEffectiveTheme()` on a root element such as `.dsh-core-root`.

## Hooks and utilities

- `useDebouncedValue` updates a value after changes have stopped for a given interval.
- `useLocalePreference`, `useEffectiveTheme`, and `useDshThemeRevision` provide the locale preference, current theme, and theme revision.
- `classNames` combines CSS class names; `formatMessage` replaces positional placeholders such as `{0}` and `{1}`.
- `sanitizeHostInput` normalizes a host address entered by the user. `extractHost` extracts the host and any non-default port from a URL or returns `null` on failure.

The package groups components, themes, hooks, utilities, types, and constants; it has no Host service or plugin entry point. Components use React and TypeScript with Sass styles. Vite builds the library, and Vitest runs the tests.

[Examples](Examples_EN.md) | [Русский](Features.md)
