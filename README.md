# DeepSeek Harness (DSH) Monorepo: Плагины и Общая Библиотека

> [English](./doc//README_EN.md)

Набор плагинов для **DeepSeek Harness (DSH)** на основе автономных пакетов с единой архитектурой, строгой системой типов и общим UI-фреймворком.

## Установка

```powershell
# Установка плагина dsh-proxy-provider из локальной папки
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider

# Установка плагина dsh-agents-router из локальной папки
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

---

## 📦 Проекты в монорепозитории

| Пакет                                                          | Описание и решаемые задачи                                                                                                                                                                                                                                                                                                                   | Ссылка                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **[@kalex/dsh-core](./packages/dsh-core)**                     | **Общая библиотека дизайн-системы и утилит.** Решает проблему дублирования кода между плагинами, предоставляет адаптивные UI-компоненты (ThemedSelect, SwitchControl, Modal, Tabs, Button, Loader), палитры тем DSH (тёмная/светлая/кастомные), утилиты санитизации хостов, форматирования сообщений и сохранения локали.                    | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/README.md)           |
| **[@kalex/dsh-proxy-provider](./packages/dsh-proxy-provider)** | **Плагин выборочного проксирования провайдеров LLM.** Решает проблему сетевых ограничений и блокировок API провайдеров (OpenAI, Anthropic, DeepSeek, OpenRouter и др.). Позволяет настраивать индивидуальные HTTP/HTTPS/SOCKS5 прокси для каждого провайдера, шифровать учетные данные (AES-256-GCM) и тестировать задержку соединения.      | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/README.md) |
| **[@kalex/dsh-agents-router](./packages/dsh-agents-router)**   | **Интеллектуальный маршрутизатор правил и навыков агентов.** Решает проблему раздувания контекста (context window bloat) и перегрузки LLM лишними инструкциями. Динамически подгружает в контекст только те правила, которые соответствуют текущему рабочему набору файлов сессии, обеспечивает мягкий бюджет токенов и изоляцию инструкций. | [Подробнее](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-agents-router/README.md)  |

---

## 🛠 Технологический стек

- **TypeScript >= 7.0.2** со строгой типизацией
- **React 19.3.1** включая **React Compiler** (`@vitejs/plugin-react` c `compiler: true`).
- **Vite 8.3.5** на базе современного **Oxc** (`minify: 'oxc'`).
- **Vitest 3.2.0** для быстрого запуска модульных тестов с нативной поддержкой ESM и TypeScript.
- **Biome 2.6.5** и **Oxlint 1.91.0** для молниеносного линтинга и форматирования кода.

---

## ⚡ Доступные команды

Все команды выполняются из корня репозитория через `pnpm`:

```bash
# Установка зависимостей монорепозитория
pnpm install

# Сборка всех пакетов (dsh-core, dsh-proxy-provider, dsh-agents-router) через Vite 8
pnpm run build

# Запуск тестов во всех пакетах через Vitest
pnpm run test

# Запуск тестов в режиме отслеживания изменений
pnpm run test:watch

# Проверка типов TypeScript во всех проектах
pnpm run typecheck

# Статическая проверка архитектурных границ, кодировки и отсутствия any/unknown
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
# Установка плагина dsh-proxy-provider из локальной папки
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider

# Установка плагина dsh-agents-router из локальной папки
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

### Вариант 2: Установка из GitHub через pnpm

```powershell
pnpm install github:BlindGazer/DSH#path:packages/dsh-proxy-provider
pnpm install github:BlindGazer/DSH#path:packages/dsh-agents-router
```

### Вариант 3: Установка из локальной папки репозитория (рекомендуется для разработки)

Откройте **PowerShell** и выполните:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
```

## 🏛 Архитектурные принципы

Все проекты придерживаются трехслойной модульной архитектуры:

1. `src/shared/`: Не зависящие от среды модели, константы, валидаторы и локализация.
2. `src/host/`: Серверная/Node.js логика (API, файловые сервисы, шифрование, диспетчеризация). Не импортирует клиентские модули или React.
3. `src/client/`: Клиентский интерфейс React с разделением на фичи (`app/`, `features/`, `utils/`, `theme/`).
