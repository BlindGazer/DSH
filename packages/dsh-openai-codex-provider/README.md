# [@kalex/dsh-openai-codex-provider](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.19.0-339933)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-isc-green)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин **DeepSeek Harness (DSH)** для авторизации в OpenAI/Codex. Форк [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

## 🎯 Назначение

Позволяет использовать модели OpenAI Codex в DSH через вход по коду устройства ChatGPT. Токены хранятся в локальном Credential Store DSH, клиентскому интерфейсу передается только состояние входа без токенов.

## 🚀 Установка

```sh
dsh plugin --profile web add @kalex/dsh-openai-codex-provider
```

## 🛠 Технологический стек

| Технология | Версия / особенности        |
| ---------- | --------------------------- |
| TypeScript | >= 7.0.2, строгая типизация |
| React      | 19                          |
| undici     | 8.12.3, сетевые запросы     |
| zod        | 4.x, валидация              |
| Vite (Oxc) | 8.3.5                       |
| Vitest     | 3.2.0                       |

## 🔐 Безопасность

Токены хранятся в локальном Credential Store DSH, клиенту передается только состояние входа без токенов. Подробнее в [Security](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider/docs/Security.md).

## 📸 Примеры в DSH

Как плагин выглядит и работает внутри DSH, смотрите в [Examples](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider/docs/Examples.md).

- [Команды и установка](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider/docs/Setup.md) | [Commands and installation](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider/docs/Setup_EN.md)
- [English README](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-codex-provider/docs/README_EN.md)
