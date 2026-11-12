# [@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин **DeepSeek Harness (DSH)**, который подбирает и подгружает в контекст агента только те правила, навыки и инструкции проекта, которые относятся к текущей задаче.

## Назначение

Устраняет перегрузку контекста: вместо всех правил проекта агент получает только релевантные для активных файлов и рабочего набора сессии. Поддерживает зоны ответственности (front, back, openspec), мягкий бюджет токенов и изоляцию инструкций.

## Установка из GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Технологический стек

TypeScript, React 19 + React Compiler, Vite 8 (Oxc), Vitest, Cordis, YAML. Подробнее в [Features](docs/Features.md).

## Примеры в DSH

Как плагин выглядит и работает внутри DSH, смотрите в [Examples](docs/Examples.md).

- [Команды и установка](docs/Setup.md) | [Commands and installation](docs/Setup_EN.md)
- [English README](docs/README_EN.md)
