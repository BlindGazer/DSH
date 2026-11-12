# [@kalex/dsh-openai-codex-provider](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.19.0-339933)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-isc-green)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A **DeepSeek Harness (DSH)** plugin to sign in with ChatGPT and use OpenAI Codex models without an OpenAI Platform API key. Forked from [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

## 🎯 Purpose

Lets you use OpenAI Codex models in DSH via ChatGPT device-code sign-in. Tokens are stored in the local DSH Credential Store; the client interface receives only the sign-in state without tokens.

## 🚀 Install

```sh
dsh plugin --profile web add @kalex/dsh-openai-codex-provider
```

## 🛠 Tech Stack

| Technology | Version / features      |
| ---------- | ----------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                      |
| undici     | 8.12.3, networking      |
| zod        | 4.x, validation         |
| Vite (Oxc) | 8.3.5                   |
| Vitest     | 3.2.0                   |

## 🔐 Security

Tokens are stored in the local DSH Credential Store; the client receives only the sign-in state without tokens. See [Security](Security_EN.md).

## 📸 Examples in DSH

See how the plugin looks and works inside DSH in [Examples](Examples_EN.md).

- [Commands and installation](Setup_EN.md) | [Команды и установка](Setup.md)
- [Русский README](../README.md)
