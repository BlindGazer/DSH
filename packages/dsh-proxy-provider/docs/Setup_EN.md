# Installation and commands

Requires DSH `>=0.2.2-rc.5`. Building from source requires Node.js and pnpm.

## From GitHub

In DSH Desktop, open the plugin manager and add `github:BlindGazer/DSH#path:packages/dsh-proxy-provider`. For a separate CLI profile (for example, `web`):

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## From a local checkout

Install dependencies and build the package from the repository root:

```powershell
pnpm install
pnpm --filter @kalex/dsh-proxy-provider build
dsh plugin --profile web add C:/git/DSH/packages/dsh-proxy-provider
```

For Desktop, select the built local package in the plugin manager instead of running the last command.

## Package commands

From the package directory, `pnpm run build` builds Host and Client; `pnpm run build:host` and `pnpm run build:client` build them separately. `pnpm run test` runs tests, `pnpm run test:watch` watches for changes, and `pnpm run verify` checks artifacts. `pnpm run check` builds, tests, and verifies artifacts.
