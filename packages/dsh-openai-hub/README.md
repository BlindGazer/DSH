# [@kalex/dsh-openai-hub](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![Node.js >=22.19.0](https://img.shields.io/badge/Node.js-%3E%3D22.19.0-147D73)](https://nodejs.org/) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license MIT](https://img.shields.io/badge/license-MIT-568814)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-openai-hub/LICENSE)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин DeepSeek Harness (DSH) для входа в аккаунты ChatGPT и использования доступных им моделей OpenAI Codex без ключа OpenAI Platform API. Модели всех аккаунтов собраны в группе `OpenAI Hub`; настройки и лимиты ведутся отдельно для каждого аккаунта. Основан на [gooosie/dsh-openai-codex-auth](https://github.com/gooosie/dsh-openai-codex-auth).

## Установка

**DSH Desktop:** откройте **Плагины**, нажмите **Добавить плагин** и вставьте: `github:BlindGazer/DSH#path:packages/dsh-openai-hub`.

**Терминал:** вместо `web` укажите имя своего профиля CLI. Профилем `desktop` управляет приложение.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-openai-hub
```

Стек: TypeScript, React, Cordis, pi-ai, Vite и Vitest.

[Примеры в DSH](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/docs/Examples.md) | [Возможности](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/docs/Features.md) | [Установка и проверка](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/docs/Setup.md) | [Безопасность](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/docs/Security.md) | [English](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/docs/README_EN.md)
