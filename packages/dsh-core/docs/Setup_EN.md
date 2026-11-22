# Commands and Usage

## Commands

Run all commands from the `packages/dsh-core` directory:

```bash
# Build the library and generate type declarations
pnpm run build

# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Verify release artifacts
pnpm run verify

# Full check: build + tests + verify
pnpm run check
```

## Usage

Within the monorepo, import components and utilities from the package:

```typescript
import { Button, ThemedSelect, SwitchControl, buildCoreThemeStyles } from '@kalex/dsh-core';
```

Use the same import in external projects. The package is not published to the public npm registry: run `pnpm pack` in the library directory after building it, then install the archive with `pnpm add <path-to-archive>` in the consuming project.
