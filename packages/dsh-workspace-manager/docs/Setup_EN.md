# Installation and commands

Requires DSH `>=0.2.2-rc.5`. Building from source requires Node.js and pnpm. Worktree operations require Git on the DSH Host and a repository with at least one commit.

## From GitHub

In DSH Desktop, open the plugin manager and add `github:BlindGazer/DSH#path:packages/dsh-workspace-manager`. For a separate CLI profile (for example, `web`):

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## From a local checkout

Install dependencies and build the package from the repository root:

```powershell
pnpm install
pnpm --filter @kalex/dsh-workspace-manager build
dsh plugin --profile web add C:/git/DSH/packages/dsh-workspace-manager
```

For Desktop, select the built local package in the plugin manager instead of running the last command.

## Package commands

From the package directory, `pnpm run build` builds Host and Client; `pnpm run build:host` and `pnpm run build:client` build them separately. `pnpm run test` runs tests, `pnpm run typecheck` checks types, and `pnpm run verify` checks the client bundle. `pnpm run check` builds, tests, and verifies the bundle.
