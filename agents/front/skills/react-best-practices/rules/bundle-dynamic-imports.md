---
title: Dynamic Imports for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, react-lazy
---

## Dynamic Imports for Heavy Components

Use `React.lazy` with `Suspense` to lazy-load large components not needed on initial render.

**Incorrect (Monaco bundles with main chunk ~300KB):**

```tsx
import { MonacoEditor } from './monaco-editor'

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />
}
```

**Correct (Monaco loads on demand):**

```tsx
import { lazy, Suspense } from 'react'

const MonacoEditor = lazy(() => import('./monaco-editor').then(m => ({ default: m.MonacoEditor })))

// Static fallback is hoisted to module level (see rendering-hoist-jsx)
const editorFallback = <Skeleton />

function CodePanel({ code }: { code: string }) {
  return (
    <Suspense fallback={editorFallback}>
      <MonacoEditor value={code} />
    </Suspense>
  )
}
```

Keep `lazy()` and static `fallback` JSX at module level. Calling `lazy()` inside a component creates a new component type on every render, which remounts the subtree and reloads state. Do not wrap a static fallback in `useMemo`: it adds a hook call and dependency check on every render for a value that never changes.
