# [@kalex/dsh-proxy-provider](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider)

[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![undici](https://img.shields.io/badge/undici-8.12.3-3B7FE4)](https://undici.nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green)](../package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A **DeepSeek Harness (DSH)** plugin that routes selected LLM provider requests through configured proxies.

## 🎯 Purpose

Enables selective routing of provider requests through HTTP, HTTPS, and SOCKS5 proxies while keeping other requests direct. It also lets you assign different proxy servers to different model providers.

## 🚀 Install from GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## 🛠 Tech Stack

| Technology | Version / features      |
| ---------- | ----------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                      |
| undici     | 8.12.3, networking      |
| Vite (Oxc) | 8.3.5                   |
| Vitest     | 3.2.0                   |
| Cordis     | DSH plugin environment  |

## 🔐 Security

Proxy credentials (username and password) are encrypted with AES-256-GCM using a local master key. See [Security](Security.md).

## 📸 Examples in DSH

See how the plugin looks and works inside DSH in [Examples](Examples.md).

- [Commands and installation](Setup_EN.md) | [Команды и установка](Setup.md)
- [Русский README](../README.md)
