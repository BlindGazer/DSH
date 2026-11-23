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

- Keep user-facing copy in plugin-owned dictionaries under `shared/constants/localizations/`. Include `en` and `ru` and use named placeholders such as `{count}` with native DSH translation. Core provides types for this integration; DSH owns the translator and preferences, and each plugin owns its own dictionaries.
- Register each dictionary in the plugin's lifecycle scope and return its disposer from `ctx.effect`. Set the namespace in the slot's `locale` option. Read the injected `t` during render; DSH refreshes mounted slots without recreating their state. For a dynamic label outside render, call the bound translator when the label is read. `locale.bind(namespace)` returns a stable function, not a React update signal.
- Format numbers and dates with `locale.getSnapshot().active`, not the preference or the language of the fallback translation. Outside a DSH-rendered slot, read a snapshot on demand; if an already-visible surface must update, subscribe and release the subscription with the owner. Do not mirror the active locale in a separate store.
- Keep `data-testid` selectors in `shared/constants/testId.ts` (`TestId.{Feature}.{Element}`).
- For complex performance patterns, load the `front-react-best-practices` skill (`/agents/front/skills/react-best-practices/SKILL.md`).

Example (DSH client entry; dictionaries are shown inline only for brevity):

```tsx
import type { DshLocalizedClientContext } from '@kalex/dsh-core';

interface ExampleContext extends DshLocalizedClientContext {
    effect(setup: () => () => void, label: string): void;
}

export function apply(ctx: ExampleContext): void {
    const namespace = 'example.counter';
    const slot = 'conversation.composer.dock';
    ctx.effect(() => ctx.locale.register(namespace, 'en', { title: 'Counter', count: 'Items: {count}' }), 'counter: en');
    ctx.effect(() => ctx.locale.register(namespace, 'ru', { title: 'Счетчик', count: 'Элементы: {count}' }), 'counter: ru');

    const translateLabel = ctx.locale.bind(namespace);
    ctx.slots.inject(slot, () => {
        return ctx.slots.register({ name: slot, id: 'example-counter', locale: namespace, label: () => translateLabel('title') }, ({ t }) => {
            const count = new Intl.NumberFormat(ctx.locale.getSnapshot().active).format(1234);
            return <span>{t('count', { count })}</span>;
        });
    });
}
```
