# [@kalex/dsh-workspace-manager](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License](https://img.shields.io/badge/license-isc-green)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин **DeepSeek Harness (DSH)** для подключения нескольких каталогов к рабочему пространству. Форк [keatsyh/dsh-plugin-addir](https://github.com/keatsyh/dsh-plugin-addir).

Публичные декларации `.d.ts` не генерируются: пакет устанавливается как плагин DSH, а не используется как библиотека.

## 🎯 Назначение

Позволяет подключать каталоги из разных расположений, задавать им псевдонимы и описания, а также ограничивать доступ режимом только для чтения.

В меню `...` рабочей области выберите **Новая сессия worktree**. Можно создать worktree с новой веткой от любой локальной ветки, открыть свободную локальную ветку в новом worktree или запустить сессию в существующем worktree этого репозитория. По умолчанию новые каталоги создаются в `.worktrees` внутри выбранного рабочего каталога. При создании плагин добавляет `/.worktrees/` в `.gitignore` этого каталога, если Git ещё не игнорирует `.worktrees`. Базовый путь можно изменить.

Пункт **Удалить worktree** появляется в меню основной рабочей области репозитория, когда у него есть дополнительные worktree. Выберите нужный worktree по ветке и пути. При необходимости включите слияние и удаление ветки; сама основная рабочая область не удаляется.

На стороне DSH Host нужен Git и репозиторий с первым коммитом. Незакоммиченные изменения не переносятся. Каждая операция открывает новую сессию в выбранной папке. Архивация сессии не удаляет worktree.

## 🚀 Установка из GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## 🛠 Технологический стек

| Технология | Версия / особенности        |
| ---------- | --------------------------- |
| TypeScript | >= 7.0.2, строгая типизация |
| React      | 19                          |
| Vite (Oxc) | 8                       |
| Vitest     | 5                       |

## 📸 Примеры в DSH

Как плагин выглядит и работает внутри DSH, смотрите в [Examples](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Examples.md).

- [Команды и установка](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Setup.md) | [Commands and installation](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Setup_EN.md)
- [English](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/README_EN.md)
