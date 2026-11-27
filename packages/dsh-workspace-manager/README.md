# [@kalex/dsh-workspace-manager](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин DeepSeek Harness (DSH) для работы с несколькими каталогами и Git worktree. Подключенным каталогам можно задать псевдонимы, описания и режим только для чтения. Из меню рабочего пространства можно создать сессию в отдельном worktree, не переключая ветку в основном каталоге. Основан на [keatsyh/dsh-plugin-addir](https://github.com/keatsyh/dsh-plugin-addir).

## Установка

**DSH Desktop:** откройте **Плагины**, нажмите **Добавить плагин** и вставьте: `github:BlindGazer/DSH#path:packages/dsh-workspace-manager`.

**Терминал:** вместо `web` укажите имя своего профиля CLI. Профилем `desktop` управляет приложение.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

Стек: TypeScript, React, Cordis, Git, Vite и Vitest.

[Примеры в DSH](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Examples.md) | [Возможности](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Features.md) | [Установка и команды](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Setup.md) | [English](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/docs/Readme_EN.md)
