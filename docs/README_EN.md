# Plugins and libraries for DeepSeek Harness

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](../LICENSE.md)

[Русский](../README.md)

This repository contains five plugins and two libraries for DeepSeek Harness (DSH). The plugins require DSH `0.2.2-rc.5` or later.

## Packages

| Package | What it does |
| --- | --- |
| [@kalex/dsh-agents-router](../packages/dsh-agents-router/docs/README_EN.md) | Loads project rules and skills based on routing settings, file paths, and keywords. |
| [@kalex/dsh-proxy-provider](../packages/dsh-proxy-provider/docs/README_EN.md) | Configures an HTTP, HTTPS, or SOCKS5 proxy per model provider and tests the connection. |
| [@kalex/dsh-workspace-manager](../packages/dsh-workspace-manager/docs/Readme_EN.md) | Links additional directories to a workspace, with optional read-only access. Creates, opens, and removes Git worktrees. |
| [@kalex/dsh-openai-hub](../packages/dsh-openai-hub/docs/README_EN.md) | Connects ChatGPT accounts to use Codex models, controls which models are listed, and shows account limits. |
| [@kalex/dsh-logger](../packages/dsh-logger/docs/README_EN.md) | Configures and collects logs from plugins that use `dsh-logger-core`. |
| [@kalex/dsh-core](../packages/dsh-core/docs/README_EN.md) | Library of React components, themes, and localization utilities. |
| [@kalex/dsh-logger-core](../packages/dsh-logger-core/docs/README_EN.md) | Logging types and adapters. |

## Installation

In DSH Desktop, open **Plugins**, select **Add plugin**, and paste one of these package references:

![Adding a plugin in DSH Desktop](https://github.com/user-attachments/assets/fe3f5650-f18e-43dc-a613-dc05d3b38c5a)

```text
github:BlindGazer/DSH#path:packages/dsh-agents-router
github:BlindGazer/DSH#path:packages/dsh-proxy-provider
github:BlindGazer/DSH#path:packages/dsh-workspace-manager
github:BlindGazer/DSH#path:packages/dsh-openai-hub
github:BlindGazer/DSH#path:packages/dsh-logger
```

For a CLI-managed profile, use `dsh plugin`. In this example, `web` is the profile name:

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

The Desktop app manages the `desktop` profile; do not pass it to `dsh plugin`. To install from a local checkout, first run `pnpm install` and `pnpm build` from the repository root. Then use the absolute path to the package directory instead of the `github:...` reference, for example `C:\git\DSH\packages\dsh-proxy-provider`.

## Development

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies. |
| `pnpm build` | Build the packages. |
| `pnpm test` | Run tests. |
| `pnpm test:watch` | Rerun tests when files change. |
| `pnpm typecheck` | Check types. |
| `pnpm check` | Check types, file encoding, and lint rules. |
| `pnpm fix` | Format code and apply automatic fixes. |
| `pnpm verify` | Check the contents and layout of release artifacts. |

Packages use TypeScript source within the repository. Only the libraries `dsh-core` and `dsh-logger-core` publish `.d.ts` declarations for external projects. Install the other packages as DSH plugins rather than importing them as libraries.

Each package README links to instructions and examples in Russian and English. See the [documentation standard](DOCUMENTATION_SPEC.md).
