# Setup and commands

In an external TypeScript project, install the built package archive. The package is not published to the public npm registry.

Inside the monorepo, the same alias resolves directly to TypeScript source. Do not declare the library as an internal package dependency. Run these commands from the checkout root:

```bash
pnpm install
pnpm --filter @kalex/dsh-logger-core build
pnpm --filter @kalex/dsh-logger-core test
pnpm check
```

After building, run `pnpm pack` from the library directory. Install the archive in the consuming project with `pnpm add <path-to-archive>`. The library has no plugin entry point and is not installed through the DSH CLI.

[API example](Examples_EN.md) | [Russian](Setup.md)
