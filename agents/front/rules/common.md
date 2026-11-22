---
paths:
  - "packages/dsh-core/src/**"
  - "packages/*/src/client/**"
description: React 19.3+, Vite 8 with the Oxc React Compiler, component decomposition, and localization rules.
---

# React and Frontend Architecture Rules

## 1. Component and Hook Separation

- Use functional components only. Keep one component per file (`{Component}.tsx`), named after its export.
- Component `.tsx` files contain JSX markup, prop wiring, and the `{Component}Props` interface only.
- Extract state, polling, timers, and API calls into feature hooks: `features/{feature}/hooks/use{Feature}{Purpose}.ts`.
- Reuse shared primitives from `@kalex/dsh-core` directly via source imports do not create custom components if there is core component.

## 2. React 19.3 and React Compiler (Vite 8 + Oxc)

- Client bundles compile with `@vitejs/plugin-react` (`react({ compiler: true })`) powered by Oxc and `build.minify: 'oxc'`. Do not use Babel.
- Rely on the React Compiler for automatic memoization by default. Manual `memo`, `useMemo`, or `useCallback` is allowed when explicit reference stability is required; always set `displayName` on `memo` components.
- Keep render functions pure and props/state immutable to prevent React Compiler bailouts (verified by Oxlint).

## 3. Localization and Test IDs

- Do not hardcode user-facing static strings in components or hooks. Move them to `shared/constants/localizations/{Feature}Localization.ts` (support `en` and `ru` with `{0}`, `{1}` interpolation).
- Keep `data-testid` selectors in `shared/constants/testId.ts` (`TestId.{Feature}.{Element}`).
- For complex performance patterns, load the `front-react-best-practices` skill (`/agents/front/skills/react-best-practices/SKILL.md`).
