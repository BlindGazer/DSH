# Installation and commands

Requires DSH `0.2.2-rc.5` or later.

In DSH Desktop, open **Plugins**, select **Add plugin**, and paste:

```text
github:BlindGazer/DSH#path:packages/dsh-agents-router
```

For a CLI-managed profile such as `web`, run:

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

To install from a local checkout, run `pnpm install` and `pnpm build` at the repository root. Use the absolute path to `packages/dsh-agents-router` instead of the `github:...` reference.

## Development

Run these commands from the package directory:

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build the host and client. |
| `pnpm build:host` / `pnpm build:client` | Build only the host or client. |
| `pnpm test` / `pnpm test:watch` | Run tests once or on file changes. |
| `pnpm verify` | Check release artifacts. |
| `pnpm check` | Build the package, run tests, and check release artifacts. |
