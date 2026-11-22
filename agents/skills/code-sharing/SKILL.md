---
name: code-sharing
description: Enforce source-based code sharing and tree-shaken, publishable bundles in this plugin monorepo. Use when sharing code between packages, changing imports or package dependencies, configuring builds, or preparing packages for external consumers.
---

# Code Sharing

## Internal consumption: source code only

- Plugins in this monorepo must consume reusable internal code directly from source files. This includes `packages/dsh-core` and every other shared or plugin package.
- Do not declare internal packages in the consuming plugin's `package.json` under `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. Using `workspace:`, `file:`, `link:`, or a registry version does not make such declarations acceptable.
- Import a focused source module through a relative path or an alias that resolves directly to that module. Configure the build, type checker, and tests to resolve aliases consistently; a TypeScript path mapping alone does not configure the bundler.
- Do not import another internal package's generated bundle or rely on its installation in `node_modules`.
- Include all required internal runtime implementation code in the consuming plugin's distributable bundle. Do not externalize internal imports or leave unresolved source aliases, workspace paths, or imports into sibling packages in emitted artifacts.
- Type-only imports may be erased from JavaScript, but published declarations must remain usable without access to monorepo sources.

## Bundle only the required code

These rules apply to all shared code: functions, classes, utilities, services, hooks, constants, schemas, UI components, and any other reusable implementation.

When `packages/dsh-x` uses code from `packages/dsh-y`, its distributable must include only the used implementation and the transitive runtime dependencies, assets, and side effects necessary for that implementation to work. Exclude all unrelated code from `dsh-y`.

- Enable tree shaking in production builds. The target is the smallest required reachable code graph, not a literal count of source files or an unverified claim of globally optimal byte size.
- Prefer focused ESM modules with static imports and exports. Extract reusable code from plugin entry points so importing shared code does not register or initialize the entire plugin.
- Avoid broad namespace access, eager registries, CommonJS boundaries, and dynamic imports that include unrelated modules. Use barrel exports only when they preserve tree shaking and do not introduce unrelated side effects.
- Keep reusable modules free of unnecessary top-level side effects. Declare `sideEffects` accurately; never mark required CSS imports, registration modules, or initialization code as side-effect-free just to reduce bundle size.
- Include required CSS, assets, workers, and lazy chunks in the published artifact and ensure their references resolve after installation. A bundle may consist of multiple output files.
- Keep host-only code out of client bundles and client-only code out of host bundles.
- Do not equate source inclusion with a shared runtime instance: bundling the same module into two plugins can create two copies of its state. Use explicit runtime services or contracts when shared identity/state is required, rather than depending on an internal package installation.

## External consumption: published packages

- Publish ready-to-use bundles for installation outside this monorepo. External consumers must not need this repository, sibling source directories, internal aliases, or a local build of our sources.
- For example, an external project using `@kalex/dsh-core` declares `@kalex/dsh-core` as a package dependency and imports its published exports. The internal dependency prohibition does not apply to external projects.
- Point package entries and `exports` at shipped build artifacts. Include required chunks, styles, assets, and plugin metadata. Only `dsh-core` and `dsh-logger-core` publish declarations for external TypeScript consumers; all other packages are installed as DSH plugins, not imported as libraries.
- Keep public exports focused so external bundlers can also tree-shake reusable code where applicable.
- The internal-code bundling requirement does not itself require bundling every third-party library. Any external third-party import must have a valid installation/runtime contract. Preserve required runtime singleton identity, such as React; do not blindly inline runtime-provided libraries.
- Do not invent host-provided externals. Verify the host's supported loading contract before relying on it; otherwise declare required third-party dependencies appropriately.

## Verification

When implementing or changing code sharing:

1. Inspect the consumer's imports, dependency declarations, source resolution, and bundler externalization rules. Remove internal package declarations and ensure reused implementation resolves to source.
2. Build the affected plugins using their production configuration. Inspect the emitted module graph or bundler report, not just the source imports.
3. Check that the used implementation and its required dependencies are included, unrelated plugin implementations and initialization are excluded, and no internal package/source imports remain unresolved.
4. Add a focused bundle regression test when changing bundling behavior. Check inclusion of required behavior and exclusion of an unrelated module; do not rely only on minified symbol names or total bundle size.
5. Inspect the packed package contents. In an isolated project outside the workspace, install the package archive and exercise its public exports or supported plugin loader without monorepo aliases or sibling sources. Verify declarations when the package exposes TypeScript types.
6. Run the repository's applicable validation commands, including `pnpm fix` and `pnpm check` for code changes. Report what was actually verified and any remaining limitations.

If a dependency cannot satisfy these rules because it requires whole-plugin initialization, shared singleton state, or unsupported runtime loading, explain the concrete conflict before introducing an exception.
