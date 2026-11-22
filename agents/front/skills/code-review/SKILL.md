---
name: code-review
description: Review DSH client changes for the design system, styles, React components, tests, and builds; produce a fix list for another agent.
---

# Frontend code review

Use this skill when reviewing changes in `packages/**` and related tests.

## Required checks

1. Read the diff and every affected file before drawing conclusions.
2. Check the rules in:
   - `agents/front/skills/design-principles/SKILL.md`;
   - `agents/front/rules/design-system.md`;
   - `agents/rules/typescript-architecture.md`;
   - `agents/rules/dod.md`.
3. Check styles:
   - colors, surfaces, borders, focus, and states use DSH tokens;
   - fonts use existing typography or DSH CSS variables;
   - check changed files, including TS helpers and JSX, for styles authored outside SCSS; verify each exception against design-system section 1;
   - inspect `:global` and other unscoped selectors in SCSS Modules against the same section; a feature prefix alone does not make a selector local;
   - no duplicated rules or new visual primitives replacing `@kalex/dsh-core` components;
   - no overflow, unjustified fixed widths, or narrow-panel issues;
   - light, dark, and localized variants are checked.
4. Check React and TypeScript:
   - no violation of the `shared -> host/client` layers;
   - no `any`, `unknown`, TypeScript suppression, or input mutation; `null` is allowed only for React, DOM, Vitest, and external contracts with boundary validation;
   - components preserve keyboard operation, visible labels, native semantics and functionality, and `:focus-visible`;
   - screenreader support is out of scope: do not require screenreader-only names, roles, or informational ARIA; preserve host contracts and functional attribute consumers as specified in the design-principles skill;
   - computations do not cause unnecessary rerenders or duplicate logic.
5. Check tests for new states: empty, error, wide, and narrow variants, keyboard/focus behavior, and localization. Migrate selectors without losing behavioral assertions.
6. For a final review of code or configuration changes, always run:
   - `pnpm fix`;
   - `pnpm check`;
   - `pnpm test`;
   - `pnpm build`.
   Run `pnpm check` additionally when type or build diagnostics are needed. Any error blocks a positive verdict; state separately whether it is a diff regression or an environment issue.

## Result format

First give a brief verdict: `ready`, `changes needed`, or `blocked`.

Then provide a list:

- `[critical]` a violation that breaks build, keyboard usability, security, or behavior;
- `[major]` a rule violation or significant regression;
- `[minor]` an improvement without a significant regression;
- `[note]` an observation or unconfirmed assumption.

For each item, give the file, line range, rule, evidence, and a specific fix. Do not edit files unless the user explicitly asks. Do not expose secrets or copy sensitive values from logs.

## Additional files

For a complete review, also consider:

- `agents/rules/code.md` - minimality and no unnecessary code;
- `agents/rules/files-encoding.md` - UTF-8 without BOM and LF;
- `agents/rules/private.md` - secrets and sensitive data;
- `agents/front/rules/common.md` and `agents/front/rules/tests.md`;
- `agents/front/skills/react-best-practices/SKILL.md` for React performance;
- `agents/front/skills/vitest-best-practices/SKILL.md` and `agents/front/skills/isolated-tests/SKILL.md` for tests.

If a recommended file is missing, mark it as a recommendation, not an error.
