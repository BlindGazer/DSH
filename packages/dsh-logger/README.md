# [@kalex/dsh-logger](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-logger)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин DeepSeek Harness (DSH), который пишет журналы подключенных пакетов в отдельные файлы JSONL. Из настроек DSH можно задать каталог, уровень записи и лимит размера. По умолчанию запись выключена.

## Установка

**DSH Desktop:** откройте **Плагины**, нажмите **Добавить плагин** и вставьте: `github:BlindGazer/DSH#path:packages/dsh-logger`.

**Терминал:** вместо `web` укажите имя своего профиля CLI. Профилем `desktop` управляет приложение.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-logger
```

Стек: TypeScript, Cordis, React, Vite и Vitest. Для подключения своего пакета используйте `@kalex/dsh-logger-core`.

[Установка](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/docs/Setup.md) | [Возможности](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/docs/Features.md) | [Пример настройки](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/docs/Examples.md) | [Безопасность](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/docs/Security.md) | [English](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/docs/README_EN.md)
