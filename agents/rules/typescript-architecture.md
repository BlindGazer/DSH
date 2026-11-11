---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
description: Strict TypeScript (>= 7.0.2), SOLID, naming, and layered architecture rules for all packages.
---

# TypeScript and Monorepo Architecture Rules

## 1. Layered Package Structure
Each package in `packages/*` follows a strict unidirectional dependency flow (`shared` -> `host` / `client`):
- `src/shared/` - pure models, DTO interfaces, constants, localization dictionaries, and validation helpers (no Node.js or React imports).
- `src/host/` - Node.js / Cordis plugin services, controllers, and HTTP routes (never imports from `src/client/` or React).
- `src/client/` - React UI entry (`app/`), shared package components (`components/common/`), and isolated feature modules (`features/{feature}/`).

## 2. Strict TypeScript (Zero Suppression)
- `any`, `unknown`, `null` (use `undefined` instead), non-null assertions (`!`), `as any`, and `@ts-ignore` / `@ts-expect-error` are forbidden in application and test code.
- Use `interface` for object shapes and component props; use `type` only for unions, primitives, or function signatures.
- Do not prefix interfaces with `I` or suffix with `Interface`.
- One logical model or component per file. Do not export internal helpers or types until needed by another module.
- Write JSDoc comments and code comments in Russian, explaining *why* a boundary or decision exists, not *what* the syntax does.

## 3. SOLID and Immutability
- **Single Responsibility:** one file = one responsibility. Never mix component markup, state/network hooks, and data mappers in one file.
- **Open-Closed:** extend shared components and services via props, callbacks, or interfaces rather than feature-specific branches (`if (isProxyPlugin)`).
- **Immutability:** never mutate function arguments, props, state, or frozen DSH context payloads; return new objects/arrays.
