# DeepSeek Harness (DSH) Monorepo: Plugins and Shared Core Library

A collection of plugins for **DeepSeek Harness (DSH)**, built as independent packages with a unified architecture, strict typing, and a shared UI framework.

## Installation

```powershell
# Install the dsh-proxy-provider plugin from GitHub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider

# Install the dsh-agents-router plugin from GitHub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

---

## Packages in the Monorepo

| Package                                                        | Description and Purpose                                                                                                                                                                                                                                                                                         | Link                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **[@kalex/dsh-core](./packages/dsh-core)**                     | **Shared design system and utilities library.** Prevents duplicated code across plugins and provides responsive UI components (ThemedSelect, SwitchControl, Modal, Tabs, Button, Loader), DSH themes (dark, light, and custom), host sanitization, message formatting, and locale persistence.                  | [Details](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/README_EN.md)           |
| **[@kalex/dsh-proxy-provider](./packages/dsh-proxy-provider)** | **Selective proxy routing for LLM providers.** Helps work around network restrictions and API blocks for providers such as OpenAI, Anthropic, DeepSeek, OpenRouter, and others. Configure individual HTTP/HTTPS/SOCKS5 proxies per provider, encrypt credentials with AES-256-GCM, and test connection latency. | [Details](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/README_EN.md) |
| **[@kalex/dsh-agents-router](./packages/dsh-agents-router)**   | **Intelligent router for agent rules and skills.** Reduces context window bloat and prevents LLMs from receiving irrelevant instructions. Dynamically loads only rules that match the session's active working set, provides a soft token budget, and isolates instructions.                                    | [Details](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/README_EN.md)  |

---

## Tech Stack

- **TypeScript >= 7.0.2** with strict typing
- **React 19.3.1**, including **React Compiler** (`@vitejs/plugin-react` with `compiler: true`).
- **Vite 8.3.5** with modern **Oxc** (`minify: 'oxc'`).
- **Vitest 3.2.0** for unit tests with native ESM and TypeScript support.
- **Biome 2.6.5** and **Oxlint 1.91.0** for fast code linting and formatting.

---

## Available Commands

Run all commands from the repository root using `pnpm`:

```bash
# Install monorepo dependencies
pnpm install

# Build all packages (dsh-core, dsh-proxy-provider, dsh-agents-router) with Vite 8
pnpm run build

# Run tests in all packages with Vitest
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Check TypeScript types across all projects
pnpm run typecheck

# Statically check architecture boundaries, encoding, and absence of any/unknown
pnpm run check

# Automatically format and fix code (Biome, Oxlint, UTF-8 LF)
pnpm run fix

# Verify release readiness of artifacts for DSH (Cordis patch, manifests, and builds)
pnpm run verify
```

---

## Installing Plugins in DSH Desktop Profile

The commands below assume that `dsh` is available globally, or you can always specify its full path:

```powershell
$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd
```

Run `pnpm` commands from the following directory:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
```

---

Use the `dsh` CLI or `pnpm` to install plugins into the **DSH Desktop** profile.

### Option 1: Install from GitHub using the DSH CLI

```powershell
# Install the dsh-proxy-provider plugin from GitHub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider

# Install the dsh-agents-router plugin from GitHub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

### Option 2: Install from GitHub using pnpm

```powershell
pnpm install github:BlindGazer/DSH#path:packages/dsh-proxy-provider
pnpm install github:BlindGazer/DSH#path:packages/dsh-agents-router
```

### Option 3: Install from a local repository folder (recommended for development)

Open **PowerShell** and run:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
```

## Architecture Principles

All packages follow a three-layer modular architecture:

1. `src/shared/`: Environment-independent models, constants, validators, and localization.
2. `src/host/`: Server-side and Node.js logic (APIs, file services, encryption, and dispatch). It does not import client modules or React.
3. `src/client/`: React client UI organized into features (`app/`, `features/`, `utils/`, `theme/`).
