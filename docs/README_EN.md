# DeepSeek Harness (DSH) Monorepo: Plugins and Shared Core Library

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH) [![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-8-4B32C3)](https://vite.dev/) [![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-agents-router/package.json)

> [Russian](../README.md)

A collection of plugins for **DeepSeek Harness (DSH)**, built as independent packages with a unified architecture, strict typing, and a shared UI framework.

## Installation

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-openai-hub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-logger
```

---

## Packages in the Monorepo

| Package                                                                       | Description and Purpose                                                                                                                                                                                                                                                                                         | Link                                                                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **[@kalex/dsh-core](../packages/dsh-core)**                                   | **Shared design system and utilities library.** Prevents duplicated code across plugins and provides responsive UI components (ThemedSelect, SwitchControl, Modal, Tabs, Button, Loader), DSH themes (dark, light, and custom), host sanitization, message formatting, and locale persistence.                  | [Details](../packages/dsh-core/docs/README_EN.md)                       |
| **[@kalex/dsh-proxy-provider](../packages/dsh-proxy-provider)**               | **Selective proxy routing for LLM providers.** Helps work around network restrictions and API blocks for providers such as OpenAI, Anthropic, DeepSeek, OpenRouter, and others. Configure individual HTTP/HTTPS/SOCKS5 proxies per provider, encrypt credentials with AES-256-GCM, and test connection latency. | [Details](../packages/dsh-proxy-provider/docs/README_EN.md)        |
| **[@kalex/dsh-agents-router](../packages/dsh-agents-router)**                 | **Intelligent router for agent rules and skills.** Reduces context window bloat and prevents LLMs from receiving irrelevant instructions. Dynamically loads only rules that match the session's active working set, provides a soft token budget, and isolates instructions.                                    | [Details](../packages/dsh-agents-router/docs/README_EN.md)         |
| **[@kalex/dsh-workspace-manager](../packages/dsh-workspace-manager)**         | **Workspace directory manager.** Links multiple folders from different locations, supports aliases and descriptions, and can restrict access to read-only.                                                                                                                                                      | [Details](../packages/dsh-workspace-manager/docs/README_EN.md)     |
| **[@kalex/dsh-openai-hub](../packages/dsh-openai-hub)** | **OpenAI Hub: multiple ChatGPT accounts.** One model route, authenticated catalog with local fallback, isolated account settings and selected-model limits. Tokens stay in DSH Credential Store.                                                                   | [Details](../packages/dsh-openai-hub/docs/README_EN.md) |
| **@kalex/dsh-logger** | Centralized logging and settings for participating plugins. | [Details](../packages/dsh-logger/docs/README_EN.md) |
| **@kalex/dsh-logger-core** | Dependency-free logging contracts and adapters. | [Details](../packages/dsh-logger-core/docs/README_EN.md) |

---

## Documentation and package types

See the [documentation standard](DOCUMENTATION_SPEC.md). Each package has a short Russian README and detailed Russian and English documentation. DSH shows the short README for installable plugins.

Inside the monorepo, packages consume TypeScript source. Only `dsh-core` and `dsh-logger-core` ship public `.d.ts` files because external projects can import these libraries. The other five packages are installed as DSH plugins and do not generate declarations.

## Tech Stack

- **TypeScript >= 7.0.2** with strict typing
- **React 18 and 19**, including **React Compiler** (`@vitejs/plugin-react`).
- **Vite 8** with modern **Oxc** (`minify: 'oxc'`).
- **Vitest 5** for unit tests with native ESM and TypeScript support.
- **Biome 2** and **Oxlint 1** for fast code linting and formatting.

---

## Available Commands

Run all commands from the repository root using `pnpm`:

```bash
# Install monorepo dependencies
pnpm install

# Build all packages with Vite 8
pnpm run build

# Run tests in all packages with Vitest
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Check TypeScript types across all projects
pnpm run typecheck

# Check types, file encoding, and lint rules
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

# Install the dsh-workspace-manager plugin from GitHub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

### Option 2: Install from GitHub using pnpm

```powershell
pnpm add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
pnpm add github:BlindGazer/DSH#path:packages/dsh-agents-router
pnpm add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

### Option 3: Install from a local repository folder (recommended for development)

Open **PowerShell** and run:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-workspace-manager
```

## Architecture Principles

Plugins separate shared, host, and client modules:

1. `src/shared/`: Environment-independent models, constants, validators, and localization.
2. `src/host/`: Server-side and Node.js logic (APIs, file services, encryption, and dispatch). It does not import client modules or React.
3. `src/client/`: React client UI organized into features (`app/`, `features/`, `utils/`, `theme/`).
