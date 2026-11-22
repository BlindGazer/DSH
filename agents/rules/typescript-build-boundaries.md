---
description: TypeScript source, declaration, and release boundaries for all packages and tools.
---

# TypeScript Build Boundaries

- Use TypeScript for repository code, including tests, tooling, and examples. Internal imports and re-exports must resolve to TypeScript source, not use JavaScript suffixes or target generated artifacts. Release manifests, artifact verification, and external runtime dependencies may reference actual JavaScript files.
- Type checking must not emit files. Only the release bundler emits runtime JavaScript. Only `dsh-core` and `dsh-logger-core` generate and publish public TypeScript declarations; the other packages are installable DSH plugins, not libraries.
- Release artifacts contain only runtime JavaScript, required styles and assets, package documentation and metadata, and the two libraries' public declarations. Do not ship TypeScript implementation sources, declaration maps, or external or inline source maps.
