# Setup and commands

Requires DSH `>=0.2.2-rc.5`. In DSH Desktop, add the package on the Plugins page using `github:BlindGazer/DSH#path:packages/dsh-logger` as the source.

For a CLI-managed profile, use the command below. `web` is an example profile name, not the DSH Desktop profile.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-logger
```

For local development, install dependencies, build the package, and run tests from the checkout root:

```sh
pnpm install
pnpm --filter @kalex/dsh-logger build
pnpm --filter @kalex/dsh-logger test
pnpm check
```

The package tests read build artifacts, so run `build` before `test`. To install a local build in Desktop, specify the package directory on the Plugins page. For the CLI, use the command below with the path to your checkout:

```powershell
dsh plugin --profile web add C:\git\DSH\packages\dsh-logger
```

Restart DSH if it still uses the previous version after an update.

[Settings](Examples_EN.md) | [Русский](Setup.md)
