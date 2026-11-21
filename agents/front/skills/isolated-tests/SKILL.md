---
name: isolated-tests
description: >-
  Write isolated React component unit tests in Mts.WebApp.ClientApp and
  Mts.WebApp.Components, especially with Vitest mocks and isolate: false.
compatibility: Requires Vitest and React Testing Library
---

# Isolated React Component Tests

## Scope

Test one component's rendered output and response to controlled inputs. Keep unit tests isolated from the app's real Redux store, router, child components, and business hooks.

- Replace state-providing hooks with functions returning controlled values.
- Stub child components whose behavior is outside the test. Test each child separately.
- Keep simple platform primitives real when they do not cross an integration boundary (for example, MUI `IconButton` or `CircularProgress` when checking basic accessible DOM). Do not test library internals.
- Do not add a `Provider`, store, or router just to render the component. Mock app hooks/boundaries. If the component itself is an integration boundary, use a clearly named integration test.

Assert user-visible DOM behavior, not mock calls, whenever possible. Mocks provide controlled inputs; they are not the subject of the test.

## `isolate: false`: Mock and import order

ORD frontend tests use `isolate: false`, so test files may share a module registry. Do not use file-level `vi.mock` for local scenarios: it registers a module mock that can affect other tests.

Use `vi.doMock` inside each test before dynamically importing the component. Remove its static import: static imports load dependencies before mocks are installed.

```tsx
import { afterEach, test, vi } from "vitest";

const useExamplePath = "hooks/common/useExample";
const childPath = "components/common/Child";

afterEach(() => clean());

test("Renders the controlled state", async () => {
  setup();

  await renderComponent();

  // some expect conditions
});

const renderComponent = async () => {
  const { default: ExampleComponent } = await import("./ExampleComponent");
  return render(<ExampleComponent />);
};

function setup() {
  const useExample = vi.fn().mockReturnValue({ enabled: true });
  vi.doMock(useExamplePath, () => ({ default: useExample }));
  vi.doMock(childPath, () => ({ default: () => <span>Stub</span> }));
}

function clean() {
  vi.doUnmock(useExamplePath);
  vi.doUnmock(childPath);
  vi.resetModules();
}
```

Order:

1. Mock app hooks and child modules with `vi.doMock`.
2. Then `await import('./TestedComponent')`.
3. Render and assert user-visible behavior.
4. In `afterEach`, call `vi.doUnmock` for every mock and `vi.resetModules()`.

Use the same module path as the component's import specifier, including Vite aliases. For a default export, return `{ default: ... }`; for a named export, return its named property.

`vi.doUnmock` removes a mock registration; `vi.resetModules()` clears the module cache for later dynamic imports. Both are required. `vi.resetAllMocks()` and `mockReset` reset functions, not module registrations. Do not use `afterAll` for per-test cleanup.

Every test in the file, including tests without mocks, must dynamically import the component after prior-test cleanup. Otherwise, an earlier imported component may retain stale dependencies. If a file needs a different isolation approach due to Vitest behavior, explain why in the test and first verify the suite with `isolate: false`.

## Stubs

Keep stubs limited to the contract the test needs. For example, a `Tooltip` stub may render `children` and display `title`; do not copy the real tooltip logic. If a child's content is irrelevant, use a stable, simple element.

Do not automatically mock React or MUI primitives. Isolate app dependencies whose behavior belongs to their own tests; keep real libraries when they allow rendering without a provider or substantial infrastructure.

## Verification

- Write test names and comments in English.
- When possible, run the targeted Vitest test and lint fix on the changed test file after editing.
- Distinguish failures before tests start (for example, sandbox `spawn EPERM`) from test failures; never report tests as passing if they did not run.
