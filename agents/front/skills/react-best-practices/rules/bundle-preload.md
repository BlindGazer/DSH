---
title: Preload Based on User Intent
impact: MEDIUM
impactDescription: reduces perceived latency
tags: bundle, preload, user-intent, hover, lazyWithPreload
---

## Preload Based on User Intent

Preload heavy lazy components before they're needed to reduce perceived latency. In this project use `lazyWithPreload` from `utils/components/lazyWithPreload` instead of `React.lazy` for components that should be preloaded.

How `lazyWithPreload` works:

- It returns a component with a `preload()` method. `preload()` starts the import once and returns the same promise on repeated calls, so it is safe to call it from several handlers.
- The component picks what to render at mount. If `preload()` has already finished, it renders the loaded component directly, without suspending and without showing the `Suspense` fallback. If not, it falls back to `React.lazy`, so a `Suspense` boundary above it is still required.
- A bare `import('./Drawer')` call does not give this effect: `React.lazy` still suspends on first render and the fallback flashes.

**Declare at module level, next to other shared lazy components** (see `components/common/floating.ts`):

```ts
import lazyWithPreload from 'utils/components/lazyWithPreload';

const Drawer = lazyWithPreload(() => import('@ord/components/components/floating/Drawer/Drawer'));
```

Calling `lazyWithPreload` inside a component creates a new component type on every render and resets its preload state.

**Incorrect (preload with a bare import, fallback still flashes):**

```tsx
function PlatformAddButton({ onClick }: PlatformAddButtonProps) {
    const handlePreload = () => {
        import('@ord/components/components/floating/Drawer/Drawer');
    };

    return (
        <Button onMouseEnter={handlePreload} onFocus={handlePreload} onClick={onClick}>
            {PlatformLocalization.Modify.Add}
        </Button>
    );
}
```

**Correct (preload on hover/focus through the component itself):**

```tsx
import { Drawer } from 'components/common/floating';

function PlatformAddButton({ onClick }: PlatformAddButtonProps) {
    const handlePreload = () => {
        Drawer.preload();
    };

    return (
        <Button onMouseEnter={handlePreload} onFocus={handlePreload} onClick={onClick}>
            {PlatformLocalization.Modify.Add}
        </Button>
    );
}
```

**Correct (background preload after the first screen is rendered):**

Components that are very likely to be needed soon are preloaded in an effect of a dedicated preloader component (see `components/layouts/GuestLayout/GuestComponentsPreloader.tsx`). Components needed for the first screen are preloaded immediately; secondary ones are deferred with `setTimeout` so they do not compete with the first screen for the network.

```tsx
export default function GuestComponentsPreloader() {
    useEffect(() => {
        Container.preload();
        FormContainer.preload();

        setTimeout(() => {
            Dialog.preload();
            Drawer.preload();
        });
    }, []);

    return undefined;
}
```

Do not call `preload()` during render: it is a side effect. Call it in event handlers or effects.
