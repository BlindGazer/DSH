# Installation and Commands

## Requirements

- Node.js and pnpm (to build from source).
- Installed DSH Desktop (profile `desktop`).

## Install from GitHub using the DSH CLI

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Install using pnpm

Run from the DSH Desktop profile directory:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Install from a local folder (recommended for development)

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
```

## Available Commands

Run commands from the `packages/dsh-proxy-provider` directory:

```bash
# Build the plugin (Host + Client)
pnpm run build

# Build only the client part
pnpm run build:client

# Build only the host part
pnpm run build:host

# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Verify plugin artifacts
pnpm run verify

# Full check: build + tests + verify
pnpm run check
```
