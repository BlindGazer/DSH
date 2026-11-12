# Installation and commands

## Install from GitHub using the DSH CLI

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## Install using pnpm

Run from the DSH Desktop profile directory:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## Install from a local folder

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add C:\git\DSH\packages\dsh-workspace-manager
```

## Available commands

Run commands from the `packages/dsh-workspace-manager` directory:

```bash
# Build the plugin (Host + Client)
pnpm run build

# Run unit tests
pnpm run test

# Verify plugin artifacts
pnpm run verify
```
