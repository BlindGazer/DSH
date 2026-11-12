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

For external projects, install the package and import the same way:

```bash
pnpm add @kalex/dsh-core
```
