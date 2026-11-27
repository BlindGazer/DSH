# Плагины и библиотеки для DeepSeek Harness

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

[English](https://github.com/BlindGazer/DSH/blob/main/docs/README_EN.md)

В репозитории пять плагинов для DeepSeek Harness (DSH) и две библиотеки. Для установки плагинов требуется DSH `0.2.2-rc.5` или новее.

## Пакеты

| Пакет                                                                                                                | Что делает                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-agents-router/README.md)         | Подключает правила и навыки проекта по настройкам маршрутизации, путям файлов и ключевым словам.                                                |
| [@kalex/dsh-proxy-provider](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-proxy-provider/README.md)       | Настраивает HTTP-, HTTPS- или SOCKS5-прокси отдельно для каждого провайдера моделей и проверяет соединение.                                     |
| [@kalex/dsh-workspace-manager](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-workspace-manager/README.md) | Подключает дополнительные каталоги к рабочей области, в том числе в режиме только для чтения. Создаёт, открывает и удаляет рабочие деревья Git. |
| [@kalex/dsh-openai-hub](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-openai-hub/README.md)               | Подключает аккаунты ChatGPT для доступа к моделям Codex, настраивает список моделей и показывает лимиты аккаунтов.                              |
| [@kalex/dsh-logger](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/README.md)                       | Настраивает и собирает логи плагинов, подключённых через `dsh-logger-core`.                                                                     |
| [@kalex/dsh-core](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-core/README.md)                           | Библиотека компонентов React, тем и средств локализации.                                                                                        |
| [@kalex/dsh-logger-core](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger-core/README.md)             | Библиотека типов и адаптеров для логирования.                                                                                                   |

## Установка

В DSH Desktop откройте **Плагины**, нажмите **Добавить плагин** и вставьте одну из строк:

![Добавление плагина в DSH Desktop](https://github.com/user-attachments/assets/fe3f5650-f18e-43dc-a613-dc05d3b38c5a)

```text
github:BlindGazer/DSH#path:packages/dsh-agents-router
github:BlindGazer/DSH#path:packages/dsh-proxy-provider
github:BlindGazer/DSH#path:packages/dsh-workspace-manager
github:BlindGazer/DSH#path:packages/dsh-openai-hub
github:BlindGazer/DSH#path:packages/dsh-logger
```

Для профиля, которым управляет CLI, используйте `dsh plugin`. В примере `web` - имя профиля:

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

Профиль `desktop` управляется приложением: не передавайте его в `dsh plugin`. Чтобы установить плагин из локальной копии репозитория, сначала выполните `pnpm install` и `pnpm build` из корня. Затем укажите абсолютный путь к каталогу пакета вместо строки `github:...`, например `C:\git\DSH\packages\dsh-proxy-provider`.

## Разработка

Запускайте команды из корня репозитория:

| Команда           | Назначение                                                  |
| ----------------- | ----------------------------------------------------------- |
| `pnpm install`    | Установить зависимости.                                     |
| `pnpm build`      | Собрать пакеты.                                             |
| `pnpm test`       | Запустить тесты.                                            |
| `pnpm test:watch` | Перезапускать тесты при изменениях.                         |
| `pnpm typecheck`  | Проверить типы.                                             |
| `pnpm check`      | Проверить типы, кодировку и правила линтера.                |
| `pnpm fix`        | Отформатировать код и применить автоматические исправления. |
| `pnpm verify`     | Проверить состав и структуру файлов для выпуска.            |

Внутри репозитория пакеты используют TypeScript-исходники. Только библиотеки `dsh-core` и `dsh-logger-core` публикуют декларации `.d.ts` для внешних проектов. Плагины устанавливаются в DSH, а не импортируются как библиотеки.

README каждого пакета ведёт к инструкциям и примерам на русском и английском. См. [правила оформления документации](https://github.com/BlindGazer/DSH/blob/main/docs/DOCUMENTATION_SPEC.md).
