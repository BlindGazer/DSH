# [@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH) [![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-8-4B32C3)](https://vite.dev/) [![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-agents-router/package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин **DeepSeek Harness (DSH)**, который подбирает и подгружает в контекст агента только те правила, навыки и инструкции проекта, которые относятся к текущей задаче.

## 🎯 Назначение

Устраняет перегрузку контекста: вместо всех правил проекта агент получает только релевантные для активных файлов и рабочего набора сессии. Поддерживает зоны ответственности (front, back, openspec), мягкий бюджет токенов и изоляцию инструкций.

## 🚀 Установка из GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## 🛠 Технологический стек

| Технология             | Версия / особенности        |
| ---------------------- | --------------------------- |
| TypeScript             | >= 7.0.2, строгая типизация |
| React + React Compiler | 19.3                        |
| Vite (Oxc)             | 8.3.5                       |
| Vitest                 | 3.2.0                       |

## 📸 Примеры в DSH

Как плагин выглядит и работает внутри DSH, смотрите в [Examples](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/docs/Examples.md).

- [Команды и установка](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/docs/Setup.md) | [Commands and installation](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/docs/Setup_EN.md)
- [English README](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/docs/README_EN.md)
