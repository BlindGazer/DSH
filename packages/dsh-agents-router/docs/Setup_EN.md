# Installation and Commands

## Install from GitHub using the DSH CLI

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Install using pnpm

Run from the DSH Desktop profile directory:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Install from a local folder

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
```

## Available Commands

Run commands from the `packages/dsh-agents-router` directory:

```bash
# Build the plugin (Host + Client)
pnpm run build

# Build only the client part (Vite)
pnpm run build:client

# Build only the host part (Vite)
pnpm run build:host

# Run unit tests (Vitest)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Full check: build + tests + artifact verification
pnpm run check

# Verify release readiness of artifacts for DSH
pnpm run verify
```

## Requirements

- Node.js and pnpm.
- DSH version `0.2.2-rc.1` or newer (see `engines.dsh` in `package.json`).
