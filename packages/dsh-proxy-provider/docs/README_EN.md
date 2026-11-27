# [@kalex/dsh-proxy-provider](..)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![undici 8.13.1](https://img.shields.io/badge/undici-8.13.1-B93868)](https://undici.nodejs.org/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](../../../LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A DeepSeek Harness (DSH) plugin for connecting model providers through proxies. In model settings, you can create HTTP, HTTPS, or SOCKS5 profiles, test the connection, and assign a profile to a provider. Routes are based on destination addresses, not providers. Different ports on the same host can use different routes.

## Installation

**DSH Desktop:** open **Plugins**, select **Add plugin**, and paste: `github:BlindGazer/DSH#path:packages/dsh-proxy-provider`.

**Terminal:** replace `web` with your CLI profile name. The Desktop app manages the `desktop` profile.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

Stack: TypeScript, React, Cordis, undici, Vite, and Vitest.

[Examples in DSH](Examples_EN.md) | [Features](Features_EN.md) | [Installation and commands](Setup_EN.md) | [Security](Security_EN.md) | [Русский](../README.md)
