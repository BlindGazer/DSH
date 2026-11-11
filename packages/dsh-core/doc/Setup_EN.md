# Commands and Usage

Run all commands from the `packages/dsh-core` directory.

```bash
# Build the library and generate type declarations
pnpm run build

# Run unit tests
pnpm run test

# Verify release artifacts
pnpm run verify
```

## Usage

Within the monorepo, import components and utilities from the package:

```typescript
import { Button, ThemedSelect, SwitchControl, buildCoreThemeStyles } from '@kalex/dsh-core';
```
