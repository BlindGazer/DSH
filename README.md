# DeepSeek Harness (DSH) Monorepo: Плагины и Общая Библиотека

[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2-4B32C3)](https://github.com/BlindGazer/DSH) [![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-8-4B32C3)](https://vite.dev/) [![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-agents-router/package.json)

> [English](https://github.com/BlindGazer/DSH/blob/main/docs/README_EN.md)

Набор плагинов для **DeepSeek Harness (DSH)** на основе автономных пакетов с единой архитектурой, строгой системой типов и общим UI-фреймворком.

## Установка

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-openai-hub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-logger
```

---

## 📦 Проекты в монорепозитории

| Пакет                                                                        | Описание и решаемые задачи                                                                                                                                                                                                                                                                                                                   | Ссылка                                                                                                |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **[@kalex/dsh-core](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-core/README.md)**                                   | **Общая библиотека дизайн-системы и утилит.** Решает проблему дублирования кода между плагинами, предоставляет адаптивные UI-компоненты (ThemedSelect, SwitchControl, Modal, Tabs, Button, Loader), палитры тем DSH (тёмная/светлая/кастомные), утилиты санитизации хостов, форматирования сообщений и сохранения локали.                    | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/README.md)                  |
| **[@kalex/dsh-proxy-provider](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-proxy-provider/README.md)**               | **Плагин выборочного проксирования провайдеров LLM.** Решает проблему сетевых ограничений и блокировок API провайдеров (OpenAI, Anthropic, DeepSeek, OpenRouter и др.). Позволяет настраивать индивидуальные HTTP/HTTPS/SOCKS5 прокси для каждого провайдера, шифровать учетные данные (AES-256-GCM) и тестировать задержку соединения.      | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/README.md)        |
| **[@kalex/dsh-agents-router](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-agents-router/README.md)**                 | **Интеллектуальный маршрутизатор правил и навыков агентов.** Решает проблему раздувания контекста (context window bloat) и перегрузки LLM лишними инструкциями. Динамически подгружает в контекст только те правила, которые соответствуют текущему рабочему набору файлов сессии, обеспечивает мягкий бюджет токенов и изоляцию инструкций. | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/README.md)         |
| **[@kalex/dsh-workspace-manager](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-workspace-manager/README.md)**         | **Управление каталогами рабочего пространства.** Подключает несколько каталогов из разных расположений, позволяет задавать псевдонимы и описания, а также ограничивать доступ режимом только для чтения.                                                                                                                                     | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-workspace-manager/README.md)     |
| **[@kalex/dsh-openai-hub](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-openai-hub/README.md)** | **OpenAI Hub: несколько аккаунтов ChatGPT.** Единый маршрут моделей, авторизованный каталог с локальным fallback, изолированные настройки аккаунтов и лимиты выбранной модели. Токены хранятся только в Credential Store DSH.                                                                             | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-openai-hub/README.md) |
| **@kalex/dsh-logger** | Плагин централизованной записи и настройки логов подключенных плагинов. | [Подробнее](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger/README.md) |
| **@kalex/dsh-logger-core** | Библиотека интерфейсов логирования и адаптеров без зависимостей. | [Подробнее](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-logger-core/README.md) |

---

## 📚 Документация

Стандарт документации для всех пакетов описан в [docs/DOCUMENTATION_SPEC.md](https://github.com/BlindGazer/DSH/blob/main/docs/DOCUMENTATION_SPEC.md).

Каждый пакет содержит:

- `README.md` - краткое описание пакета. У плагинов оно отображается в настройках DSH.
- `docs/` - установка, команды, возможности и примеры на русском и английском. Раздел безопасности есть там, где он нужен.

Внутри монорепозитория пакеты используют TypeScript-исходники. Только `dsh-core` и `dsh-logger-core` включают публичные декларации `.d.ts` в свои архивы: они предназначены для импорта во внешних проектах. Остальные пять пакетов устанавливаются как плагины DSH и не выпускают декларации.

---

## 🛠 Технологический стек

- **TypeScript >= 7.0.2** со строгой типизацией
- **React 18 и 19** включая **React Compiler** (`@vitejs/plugin-react`).
- **Vite 8** на базе современного **Oxc** (`minify: 'oxc'`).
- **Vitest 5** для быстрого запуска модульных тестов с нативной поддержкой ESM и TypeScript.
- **Biome 2** и **Oxlint 1** для молниеносного линтинга и форматирования кода.

---

## ⚡ Доступные команды

Все команды выполняются из корня репозитория через `pnpm`:

```bash
# Установка зависимостей монорепозитория
pnpm install

# Сборка всех пакетов через Vite 8
pnpm run build

# Запуск тестов во всех пакетах через Vitest
pnpm run test

# Запуск тестов в режиме отслеживания изменений
pnpm run test:watch

# Проверка типов TypeScript во всех проектах
pnpm run typecheck

# Проверка типов, кодировки и правил линтера
pnpm run check

# Автоматическое форматирование и исправление кода (Biome, Oxlint, UTF-8 LF)
pnpm run fix

# Проверка готовности артефактов к релизу в DSH (Cordis patch, манифесты, сборки)
pnpm run verify
```

---

## 🚀 Установка плагинов в DSH Desktop Profile

Команды ниже учитывают, что у вас `dsh` настроен в глобальной области видимости, или можете всегда указывать его полный путь

```powershell
$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd
```

команды `pnpm` должны выполняться из следующего каталога

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
```

---

Для установки плагинов в профиль **DSH Desktop** используйте CLI `dsh` или `pnpm`.

### Вариант 1: Установка из GitHub через DSH CLI

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-openai-hub
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-logger
```

### Вариант 2: Установка из GitHub через pnpm

```powershell
pnpm add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
pnpm add github:BlindGazer/DSH#path:packages/dsh-agents-router
pnpm add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
pnpm add github:BlindGazer/DSH#path:packages/dsh-openai-hub
```

### Вариант 3: Установка из локальной папки репозитория (рекомендуется для разработки)

Откройте **PowerShell** и выполните:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-workspace-manager
```

## 🏛 Архитектурные принципы

Плагины разделяют код на общие, серверные и клиентские модули:

1. `src/shared/`: Не зависящие от среды модели, константы, валидаторы и локализация.
2. `src/host/`: Серверная/Node.js логика (API, файловые сервисы, шифрование, диспетчеризация). Не импортирует клиентские модули или React.
3. `src/client/`: Клиентский интерфейс React с разделением на фичи (`app/`, `features/`, `utils/`, `theme/`).
   тест
