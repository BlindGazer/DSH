# [@kalex/dsh-core](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core)

[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License](https://img.shields.io/badge/license-ISC-green)](../package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Shared design system, UI components, and utilities for **DeepSeek Harness (DSH)** plugins.

The build generates `.d.ts` files so external TypeScript projects can use the library without the monorepo sources.

## 🎯 Purpose

Provides shared interface components, themes, and utilities so DSH plugins can maintain a consistent appearance and avoid duplicating common logic.

## 📦 Components

`Button`, `IconButton`, `ThemedSelect`, `SwitchControl`, `Tabs`, `Modal`, `Skeleton`, `Spinner`, `ProgressBar`, `ChildrenLazy`. See [Features](Features_EN.md).

## 🛠 Tech Stack

| Technology | Version / features      |
| ---------- | ----------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                      |
| Vite (Oxc) | 8                   |
| Vitest     | 5                   |

## 🚀 Install

To use the library in an external project, build it and install its archive as described below.

- [Component examples](Examples_EN.md)
- [Commands and usage](Setup_EN.md) | [Команды и использование](Setup.md)
- [Русский README](../README.md)
