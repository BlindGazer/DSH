---
name: design-principles
description: Standardized DSH frontend design and layout practices for styles, containers, typography, responsive behavior, accessibility, and visual verification. Use when building or reviewing UI, CSS, layout, or visual components.
---

# DSH Frontend Design Principles

Use this skill for frontend UI work in DSH plugins and `dsh-core`. Follow the existing component and design-system rules as well; this document standardizes visual and layout decisions rather than replacing implementation conventions.

## Design foundations

- Prefer DSH theme tokens (`--dsh-ui-*`) for surfaces, text, borders, focus, semantic states, and elevation. Do not hardcode color values in feature styles.
- Keep styling scoped to the component or feature. Avoid broad selectors that can affect host UI or other plugins.
- MUST use existing shared DSH components and patterns from `@kalex/dsh-core` before adding a new visual primitive. If a component is missing or insufficient, extend the existing one in `@kalex/dsh-core` rather than creating a custom implementation.
- Preserve readable contrast and recognizable interaction states in light, dark, and registered custom themes.

## Containers and overflow

- A child must never visually escape its containing card, panel, dialog, or viewport. A container must never exceed the available viewport width.
- For grid and flex children that contain variable or user-provided content, set `min-width: 0` on the shrinkable child and use `minmax(0, 1fr)` for flexible grid tracks.
- Constrain long paths, identifiers, and unbroken strings with `overflow-wrap: anywhere` or a deliberate single-line ellipsis. Provide the full value through a title, accessible label, or a copy action when truncating it.
- Apply `max-width: 100%` to wide UI regions. Allow a region to scroll internally only when that is the intended interaction; do not rely on page-level horizontal overflow to hide a broken layout.
- In flex rows, give essential labels and controls stable sizing. Let descriptions and secondary metadata shrink before filenames, paths, or primary actions.
- For action rows, allow wrapping or stack controls at narrow widths. Controls must remain inside their card and usable without horizontal scrolling.
- Dialogs must fit within viewport width and height, with internal scrolling for long content.
- Avoid fixed widths where content or viewport size can vary. Use responsive constraints and test narrow widths.

## Typography and hierarchy

- Use inherited DSH typography for body copy and controls. Define explicit size or weight only to establish a clear hierarchy.
- Keep body text comfortable to scan; use smaller text only for secondary metadata, captions, and compact labels, not essential instructions.
- Use a consistent hierarchy: page/section title, body or primary value, then muted secondary description. Avoid competing emphasis.
- For a row containing a file path and description, preserve the path first. Truncate or hide the description before truncating the path; preserve badges and controls as separate non-shrinking elements.
- Use monospace for code, paths, and machine identifiers, not for ordinary prose.
- Long content must wrap or scroll within its own intended region and must not widen its ancestor.

## Interaction and accessibility

- Use semantic elements and native controls where practical. Every control needs an accessible name and correct disabled/expanded/selected state.
- Provide visible `:focus-visible` treatment using the theme accent token. Do not remove keyboard focus outlines without an equivalent.
- Hover must not be the only way to discover or use an action. Ensure adequate hit areas and preserve keyboard operation.
- Use status and alert semantics for notices, warnings, and errors. Put the affected file or resource path next to its diagnostic message when available.
- Do not hide host-level controls through broad global selectors. Change host chrome only through a supported DSH extension point or an explicitly scoped and verified integration.

## Responsive layout

- Design for the actual available plugin panel width, not only a full desktop window.
- Use responsive grid tracks and breakpoints to collapse columns before content becomes clipped. At narrow widths, stack content and allow control rows to wrap.
- Verify long localized labels, long filenames, large counts, empty states, and error states at narrow and wide sizes.
- Keep vertical content scrollable without trapping or disabling the host's expected scrolling behavior.

## Verification checklist

- Inspect the parent chain for `min-width`, grid track sizing, and overflow constraints when any child escapes a card.
- Check the smallest supported panel width, a typical desktop width, and a long unbroken path.
- Confirm there is no page-level horizontal overflow and no child painting outside its visible container.
- Check light and dark themes, focus, hover, disabled controls, and localized text.
- Run the frontend tests and the repository's `pnpm fix` and `pnpm check` workflows when applicable.
