# Setup and commands

The plugin requires DSH `>=0.2.2-rc.5`. To install it in Desktop:

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-logger
```

Alternatively, run pnpm from the Desktop profile directory:

```powershell
pnpm add github:BlindGazer/DSH#path:packages/dsh-logger
```

For local development, install dependencies and build the package from the monorepo root:

```powershell
pnpm install
pnpm --filter @kalex/dsh-logger build
pnpm --filter @kalex/dsh-logger test
pnpm check
```

Then point DSH to the built package in your checkout:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-logger
```

The package tests read build artifacts, so run `build` first. Restart DSH if it is still using the previous version after an update.

[Settings](Examples_EN.md) | [Russian](Setup.md)
