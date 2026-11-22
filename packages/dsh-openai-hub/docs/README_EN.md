# [@kalex/dsh-openai-hub](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.19.0-339933)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](../LICENSE)

A DeepSeek Harness plugin for signing into ChatGPT and using available OpenAI Codex models without an OpenAI Platform API key. Based on [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

No public `.d.ts` files are generated: this package is installed as a DSH plugin, not used as a library.

## Features

- Multiple accounts behind one static DSH route, `openai-hub`, in the `OpenAI Hub` provider group.
- Combined model catalog with public IDs `<accountLabel>/<upstreamModelId>`.
- Per-account model settings and quota preferences.
- OAuth secrets and full account identifiers remain in DSH Credential Store; configuration contains non-secret settings only.

Choose a unique lowercase ASCII label (letters, digits, hyphens) before signing in. The catalog loads from the authenticated API after login and on refresh. If a request fails, the last successful catalog remains available; before the first success, the local `pi-ai` catalog is used with a refresh error indication. Automatic quota refresh is off by default. See [Workflow](Workflow.md) for cadence and priority details.

## Install

```sh
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-openai-hub
```

Moving from the legacy package requires manual removal and installation; migration of credentials and settings is not guaranteed. See [installation and acceptance](Setup_EN.md) for instructions and a manual checklist.

## Security

Tokens and full account IDs are not sent to the client and must not appear in configuration, logs, errors, or public model IDs. See [Security](Security_EN.md).

## Documentation

- [Features](Features_EN.md)
- [Examples](Examples_EN.md)
- [Workflow and architecture](Workflow.md)
- [Installation and acceptance](Setup_EN.md) | [Установка и приемка](Setup.md)
- [Русский README](../README.md)
