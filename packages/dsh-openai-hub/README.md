# [@kalex/dsh-openai-hub](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub)

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.19.0-339933)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Плагин DeepSeek Harness для входа в ChatGPT и использования доступных моделей OpenAI Codex без ключа OpenAI Platform API. Исходный проект: [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

## Возможности

- Несколько аккаунтов под одним статическим маршрутом DSH `openai-hub` и группой `OpenAI Hub`.
- Объединенный каталог моделей с публичными ID `<метка>/<upstreamModelId>`.
- Отдельные настройки моделей и лимитов для каждого аккаунта.
- OAuth-секреты и полный идентификатор аккаунта хранятся только в DSH Credential Store; конфигурация содержит несекретные настройки.

Задайте уникальную метку из строчных ASCII-букв, цифр и дефисов до входа. Каталог загружается из авторизованного API после входа и по запросу обновления; при сетевой ошибке сохраняется последний успешный каталог, а до первого успеха используется локальный каталог `pi-ai` с сообщением об ошибке обновления. Автообновление лимитов выключено для новых аккаунтов; подробности о периодичности и приоритетах см. в [Workflow](docs/Workflow.md).

## Установка

```sh
dsh plugin --profile web add @kalex/dsh-openai-hub
```

Переход со старого пакета требует ручного удаления и установки; автоматическая миграция credentials и настроек не гарантируется. Инструкции и ручной приемочный список: [Установка](docs/Setup.md).

## Безопасность

Токены и полный account ID не передаются клиенту и не должны попадать в конфигурацию, логи, ошибки или публичные ID моделей. См. [Security (English)](docs/Security_EN.md).

## Документация

- [Возможности (English)](docs/Features_EN.md)
- [Примеры](docs/Examples.md) | [Examples (English)](docs/Examples_EN.md)
- [Workflow and architecture](docs/Workflow.md)
- [Установка и приемка](docs/Setup.md) | [Installation and acceptance (English)](docs/Setup_EN.md)
- [README (English)](docs/README_EN.md)
