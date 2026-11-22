---
name: vitest-best-practices
description: Comprehensive Vitest testing patterns covering test structure, AAA, parameterized tests, assertions, mocks, test doubles, error handling, async testing, and performance. Use when writing, reviewing, or refactoring Vitest tests, or when the user mentions testing, TDD, coverage, mocking, assertions, or test files (*.test.ts, *.spec.ts).
compatibility: Requires the Vitest testing framework
---

## When to apply

Use this skill in these situations:

### File patterns

- Creating test files for TypeScript or JavaScript modules
- Reviewing existing Vitest suites

### User intent

- The user mentions Vitest, testing, TDD, BDD, unit tests, or integration tests
- The user asks to write tests, add coverage, fix failing tests, or refactor tests
- The user discusses mocks, stubs, assertions, test performance, or test organization

### Code context

- Files importing `describe`, `test`, `expect`, or `vi` from `vitest`
- Setup and teardown code: `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- Mock and spy implementations using `vi.mock()`, `vi.spyOn()`, or `vi.fn()`
- Assertion chains such as `expect(...).toEqual()`, `.toBe()`, or `.toThrow()`

### Common tasks

- Write test cases for existing functionality
- Refactor tests for clarity or performance
- Debug flaky or failing tests
- Improve coverage or maintainability
- Review test code for best practices

## Do not use this skill when

- Writing end-to-end tests with Playwright or Cypress
- The task is purely implementation code, not tests

## Coverage

This skill covers:

1. Test organization: file placement, naming, and grouping
2. AAA pattern: Arrange, Act, Assert
3. Parameterized tests: `test.each()` for variations
4. Error handling: exceptions, edge cases, and fault injection
5. Assertions: strict assertions such as `toEqual`, `toStrictEqual`, and `toThrow`
6. Test doubles: fakes, stubs, mocks, and spies
7. Async testing: promises, async/await, timers, and concurrent tests
8. Performance: fast tests, efficient operations, and cleanup
9. Vitest features: coverage, watch mode, benchmarking, type testing, and setup files
10. Snapshot testing: when and how to use snapshots

## How to use

This skill uses progressive disclosure to minimize context:

### 1. Start with the overview

Read [AGENTS.md](AGENTS.md) for a concise overview of all rules.

### 2. Load specific rules as needed

When a relevant pattern is identified, load its reference file:

**Core patterns:**
- [organization.md](references/organization.md)
- [aaa-pattern.md](references/aaa-pattern.md)
- [parameterized-tests.md](references/parameterized-tests.md)
- [error-handling.md](references/error-handling.md)
- [assertions.md](references/assertions.md)
- [test-doubles.md](references/test-doubles.md)

**Advanced topics:**
- [async-testing.md](references/async-testing.md)
- [performance.md](references/performance.md)
- [vitest-features.md](references/vitest-features.md)
- [snapshot-testing.md](references/snapshot-testing.md)

### 3. Apply the pattern

Each reference file contains:
- Incorrect examples showing the anti-pattern
- Correct examples showing the preferred implementation
- Why the pattern matters

## Quick example

This skill transforms unclear tests into clear, maintainable tests:

**Before (unclear):**
```ts
test('product test', () => {
  const p = new ProductService().add({ name: 'Widget' });
  expect(p.status).toBe('pendingApproval');
});
```

**After:**
```ts
describe('ProductService', () => {
  describe('Add new product', () => {
    test('has status "pending approval" when no price is specified', () => {
      // Arrange
      const productService = new ProductService();

      // Act
      const newProduct = productService.add({ name: 'Widget' });

      // Assert
      expect(newProduct.status).toEqual('pendingApproval');
    });
  });
});
```

## Key principles

- Clarity over cleverness: tests should be instantly understandable
- Flat structure: keep `describe` nesting to at most two levels
- One assertion per concept: focus each test on one behavior
- Strict assertions: prefer structural equality for objects; use `toBe` for primitive identity and exact reference checks, and `toStrictEqual` when needed
- Minimal mocking: use real implementations when practical
- Fast execution: keep tests quick through efficient setup and teardown
