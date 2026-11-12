# Аудит переноса

## Источник

- Каталог: `D:\GIT\DSH\dsh-openai-codex-auth` (только чтение).
- Ревизия: `22afaab6c9f80677a755bc4f3abe5e9b551bc0a7`.
- Локальные изменения до переноса: `lib/client.js` и `test/usage-client.test.mjs` изменены; переносить именно их текущее содержимое. В ходе аудита источник не изменялся.
- Пакет: `dsh-openai-codex-auth` версии `0.6.4`, Node.js `>=22.19.0`, зависимости `undici`, `zod`, DSH/Cordis и pi-ai. Источник является JavaScript-пакетом; отдельных каталогов TypeScript исходников нет.

## Файловая карта

- Host: `lib/index.js` связывает службы, OAuth, провайдер, инструменты и настройки; `lib/provider.js` адаптирует pi-ai и поток модели; `lib/remote-service.js` реализует серверную службу Typed Remote; `lib/remote.js` объявляет контракт Typed Remote; `lib/usage.js` получает и очищает сведения об использовании; `lib/reset-credits.js` реализует запросы карточек и безопасный повтор; `lib/proxy-manager.js` переключает сетевые маршруты с учетом выполняющихся запросов; `lib/system-proxy.js` обнаруживает и использует ручной системный прокси Windows; `lib/system-proxy-worker.js` изолирует сетевой контекст OAuth.
- Client: `lib/client.js` - собранная клиентская реализация, не использовать как исходную архитектурную единицу; выделить интерфейс в React-модули и хуки.
- Host-тесты: `test/bundle.test.mjs`, `test/provider-temperature.test.mjs`, `test/provider.test.mjs`, `test/proxy-manager.test.mjs`, `test/remote.test.mjs`, `test/reset-credits.test.mjs`, `test/system-proxy.test.mjs`, `test/usage-transport.test.mjs`, `test/usage.test.mjs`.
- Client и модельные тесты: `test/client-refresh.test.mjs`, `test/date-locale.test.mjs`, `test/image-input.test.mjs`, `test/model-settings.test.mjs`, `test/reset-ui.test.mjs`, `test/usage-client.test.mjs`.
- Документы: `README.md`, `README.zh-CN.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/reset-credits-contract.md`, изображения в `docs/assets/`.
- Интеграция загрузчика: `cordis.patch.yml` объявляет bundle id `openai-codex-auth` и пакетное имя `dsh-openai-codex-auth`.
- Манифест: `package.json`; lock/workspace файлы `pnpm-lock.yaml`, `pnpm-workspace.yaml`; лицензия `LICENSE`; CI `.github/workflows/ci.yml`; исключения `.gitignore`; git атрибуты `.gitattributes`.
- Исключения из переноса: `.git`, `node_modules`, lock-файл источника, скрипты CI, локальные/собранные зависимости и секреты. Переносить опубликованный `lib` только как карту поведения, не как целевой артефакт; не переносить готовый `lib/client.js` в клиентскую реализацию.
- Важно для публикации: исходный `package.json` whitelist включает `README.zh-CN.md`, но не `README.md`; в новом пакете whitelist должен включать актуальный README.

## Совместимость и API DSH

- Отдельные идентификаторы: npm-пакет `dsh-openai-codex-auth`; bundle `openai-codex-auth`; модельный маршрут `openai-codex`; служба Typed Remote `openai-codex-auth`; namespace `openaiCodex`; OAuth credential ref `PI_OAUTH_OPENAI_CODEX`; настройки `proxyMode`, `disabledModels`, `modelSettings`; tools `codex_login`, `codex_status`, `codex_logout`; reset retry state `dsh-openai-codex-auth.pending-reset` в sessionStorage.
- Host Inspect: `credentials` предоставляет `readRecord`, сериализованный `modifyRecord`, `deleteRecord`; `llm` - `registerAdapter`, `listModels`, маршруты и метаданные; `tools` - `register`, `get`, `definitions`. Client Inspect: `locale` предоставляет двуязычную регистрацию и `bind`.
- Общий пакет `@kalex/dsh-core` экспортирует Button, IconButton, Modal, SwitchControl, Tabs, ThemedSelect, Loader primitives, хуки, локализацию, тестовые идентификаторы и тему. Проверенные токены темы доступны для фонов, границ, текста, бренда и состояний и имеют светлые/темные значения.
- Нельзя активировать одновременно встроенный DSH маршрут `openai-codex` и переносимый адаптер: будет конфликт регистрации. Windows системный прокси поддерживает только ручной HTTP/HTTPS; PAC/автообнаружение не должны приводить к прямому fallback. Использование и списание reset-карточек используют приватный backend API; реальное списание не проверялось.

## Рабочее дерево монорепозитория

До реализации были незакоммиченные изменения в `packages/dsh-agents-router/package.json`, `packages/dsh-core/package.json`, `packages/dsh-core/scripts/verify-release.mjs`, `packages/dsh-proxy-provider/package.json`, `packages/dsh-workspace-manager/package.json` и `pnpm-lock.yaml`. Их не изменять и не включать в task-коммиты без необходимости для этой миграции.
