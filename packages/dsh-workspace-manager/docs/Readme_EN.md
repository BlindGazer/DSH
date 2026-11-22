# [@kalex/dsh-workspace-manager](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License](https://img.shields.io/badge/license-isc-green)](../../../LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

A plugin for **DeepSeek Harness (DSH)** that links multiple directories to a workspace. Forked from [keatsyh/dsh-plugin-addir](https://github.com/keatsyh/dsh-plugin-addir).

No public `.d.ts` files are generated: this package is installed as a DSH plugin, not used as a library.

## 🎯 Purpose

Link folders from different locations, give them aliases and descriptions, and optionally restrict access to read-only.

Select **New worktree session** from a workspace's `...` menu. Create a new branch from any local branch, check out a free local branch in a new worktree, or start a session in an existing worktree of the same repository. New folders default to `.worktrees` inside the selected workspace directory. When creating a worktree there, the plugin adds `/.worktrees/` to that workspace directory's `.gitignore` if Git does not already ignore it. The base path is editable.

Git and a repository with at least one commit are required on the DSH Host. Uncommitted changes stay in the source checkout. The resulting session is always new. Archiving it does not delete the worktree.

## 🚀 Install from GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## 🛠 Tech Stack

| Technology | Version / features      |
| ---------- | ----------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                      |
| Vite (Oxc) | 8                   |
| Vitest     | 5                   |
| Cordis     | DSH plugin environment  |

## 📸 Examples in DSH

See how the plugin looks and works inside DSH in [Examples](Examples_EN.md).

- [Commands and installation](Setup_EN.md) | [Команды и установка](Setup.md)
- [Русский README](../README.md)
