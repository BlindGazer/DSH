# [@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License](https://img.shields.io/badge/license-ISC-green)](../package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A **DeepSeek Harness (DSH)** plugin that selects and loads only the project rules, skills, and instructions relevant to the current task into the agent context.

## 🎯 Purpose

Prevents context overload: instead of all project rules, the agent receives only those relevant to the active files and the session's working set. Supports responsibility areas (front, back, openspec), a soft token budget, and instruction isolation.

## 🚀 Install from GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## 🛠 Tech Stack

| Technology             | Version / features      |
| ---------------------- | ----------------------- |
| TypeScript             | >= 7.0.2, strict typing |
| React + React Compiler | 19.3                    |
| Vite (Oxc)             | 8.3.5                   |
| Vitest                 | 3.2.0                   |

## 📸 Examples in DSH

See how the plugin looks and works inside DSH in [Examples](Examples_EN.md).

- [Commands and installation](Setup_EN.md) | [Команды и установка](Setup.md)
- [Русский README](../README.md)
