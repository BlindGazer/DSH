# [@kalex/dsh-logger](../README.md)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](../../../LICENSE.md)

> [GitHub BlindGazer/DSH](../../../README.md)

A DeepSeek Harness (DSH) plugin that writes logs for participating packages to separate JSONL files. Set the directory, log level, and size limit in DSH settings. Logging is off by default.

## Installation

**DSH Desktop:** open **Plugins**, select **Add plugin**, and paste: `github:BlindGazer/DSH#path:packages/dsh-logger`.

**Terminal:** replace `web` with your CLI profile name. The Desktop app manages the `desktop` profile.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-logger
```

Stack: TypeScript, Cordis, React, Vite, and Vitest. To connect your own package, use `@kalex/dsh-logger-core`.

[Setup](Setup_EN.md) | [Features](Features_EN.md) | [Settings example](Examples_EN.md) | [Security](Security_EN.md) | [Русский](../README.md)
