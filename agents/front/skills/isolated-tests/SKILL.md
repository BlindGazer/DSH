---
name: isolated-tests
description: Isolated React component unit tests with Vitest and React Testing Library.
compatibility: Requires Vitest and React Testing Library
---

# Isolated React component tests

## Scope

Test one component's rendered output and response to controlled inputs. Keep unit tests independent of the real Redux/store, router, context providers, app hooks, browser APIs, module singletons, and child components.

- Mock state and router hooks with controlled values.
- Stub children whose behavior is outside the test; test each child separately.
- Keep simple UI primitives real when they render without integration infrastructure. Do not test library internals.
- Do not add a provider, store, or router only to render a unit component. Mark true integration tests explicitly.
- Assert user-visible DOM behavior with specific roles, labels, or expected text. Mocks are inputs, not the subject.

## Shared module registry (`isolate: false`)

Apply this protocol only when the Vitest config uses `isolate: false` or the file deliberately shares a module registry for mocked component dependencies. Utility tests without module mocks are independent of this protocol.

1. Before importing the component, call `vi.doMock` inside each test for every local hook, router module, child, or other app boundary it imports.
2. Remove the component's static import and `await import()` it after mocks are installed.
3. Render and assert user-visible behavior.
4. Track only mocks registered by the test file. In `afterEach`, `vi.doUnmock` those paths and call `vi.resetModules()`.
5. Restore mounts, fake timers, spies, listeners, subscriptions, browser globals, stores, and singleton state in `afterEach` or `finally`.

Do not unmock setup-file or global mocks unless the test owns them. `vi.resetAllMocks()` and `mockReset` reset functions, not module registrations. Do not use `afterAll` for per-test cleanup. Every test that imports a component affected by local module mocks must dynamically import it after cleanup; document a verified exception.

Use the exact module specifier used by the component, including aliases. Return the correct default or named export shape. For partial mocks, preserve other exports with `importOriginal` or `importActual` when supported.

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

const hookPath = 'hooks/common/useExample';
const childPath = 'components/common/Child';
const localMocks = [hookPath, childPath];

afterEach(() => {
  cleanup();
  for (const path of localMocks) vi.doUnmock(path);
  vi.resetModules();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('renders the controlled state', async () => {
  vi.doMock(hookPath, () => ({ default: () => ({ enabled: true }) }));
  vi.doMock(childPath, () => ({ default: () => <span role="status">Disabled</span> }));
  const { default: ExampleComponent } = await import('./ExampleComponent');
  render(<ExampleComponent />);
  expect(screen.getByRole('status', { name: 'Disabled' })).toBeVisible();
});
```

## Isolation, reuse, and performance

- Test one behavior per case. Use `test.each` for variations instead of duplicate tests.
- Use Arrange, Act, Assert with typed, minimal, immutable, independent fixtures. Use a typed factory or builder and fresh fixtures per test; never share mutable fixture state.
- Prefer focused fakes or stubs over broad mocks. Limit stubs to the tested contract; do not copy real child logic.
- Mock network, external services, filesystem, real waits, and polling. Use fake timers for time-based behavior.
- Unit and component files should finish under 1s; target under 100ms. Integration and e2e suites are exempt only when explicitly marked and documented. Measure with the configured Vitest reporter; report slow files with cold-start time separated from test time, cause, and fix.

## Verification

- Run the targeted test and then the full suite after changes.
- A test is not fixed until the full suite passes; type checking or a targeted run alone is insufficient.
- Use the repository's test-language convention consistently. Distinguish startup or tooling failures from test failures; never report a test as passing if it did not run.
