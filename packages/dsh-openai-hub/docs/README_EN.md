# [@kalex/dsh-openai-hub](..)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![Node.js >=22.19.0](https://img.shields.io/badge/Node.js-%3E%3D22.19.0-147D73)](https://nodejs.org/) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license MIT](https://img.shields.io/badge/license-MIT-568814)](../LICENSE)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A DeepSeek Harness (DSH) plugin for signing into ChatGPT accounts and using their available OpenAI Codex models without an OpenAI Platform API key. Models from all accounts appear in the `OpenAI Hub` group; settings and quotas are separate for each account. Based on [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

## Installation

**DSH Desktop:** open **Plugins**, select **Add plugin**, and paste: `github:BlindGazer/DSH#path:packages/dsh-openai-hub`.

**Terminal:** replace `web` with your CLI profile name. The Desktop app manages the `desktop` profile.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-openai-hub
```

Stack: TypeScript, React, Cordis, pi-ai, Vite, and Vitest.

[Examples in DSH](Examples_EN.md) | [Features](Features_EN.md) | [Installation and verification](Setup_EN.md) | [Security](Security_EN.md) | [Русский](../README.md)
