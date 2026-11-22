---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
description: Rules for Vitest unit and component tests across packages.
---

# Testing Rules (Vitest)

- Place `{TestedFile}.test.ts` (or `.test.tsx`) next to the tested file or in the package `test/` suite.
- Structure tests with concise behavior-focused descriptions: `describe('TestedModule (short description)')` -> `describe('methodName')` -> `test('scenario')`.
- Type all test fixtures and mock factories strictly with project interfaces; do not use `any`, `unknown`, or `object`.
- Put shared test factories in `utils/tests/mocks`.
- Load the `front-vitest-best-practices` skill (`/agents/front/skills/vitest-best-practices/SKILL.md`) when designing complex test suites.
