# [@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A **DeepSeek Harness (DSH)** plugin that selects and loads only the project rules, skills, and instructions relevant to the current task into the agent context.

## Purpose

Prevents context overload: instead of all project rules, the agent receives only those relevant to the active files and the session's working set. Supports responsibility areas (front, back, openspec), a soft token budget, and instruction isolation.

## Install from GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Tech Stack

TypeScript, React 19 + React Compiler, Vite 8 (Oxc), Vitest, Cordis, YAML. See [Features](Features_EN.md) for details.

## Examples in DSH

See how the plugin looks and works inside DSH in [Examples](Examples_EN.md).

- [Commands and installation](Setup_EN.md) | [Команды и установка](Setup.md)
- [Русский README](../README.md)
