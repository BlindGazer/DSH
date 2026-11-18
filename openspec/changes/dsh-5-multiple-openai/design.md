# Design

## Context

Текущий пакет регистрирует один Codex-адаптер, хранит один credential и строит модели из локального каталога. Staged-рефакторинг добавил динамическое изменение маршрута и расхождение `ServiceKey`/`ProviderRoute`. Новая схема должна сохранить один маршрут и подготовить account-oriented данные без отдельных маршрутов.

## Goals / Non-Goals

**Goals:**

- Переименовать пакет первым этапом без поддержки старого имени.
- Ввести единый `openai-hub` Remote/LLM namespace и account-oriented конфигурацию.
- Синхронизировать авторизацию, API-каталог, модели, лимиты и выбранную модель.
- Сохранить последний каталог при сетевой ошибке и использовать локальный fallback только до первого успешного API-каталога.
- Исправить независимые modal/staged баги отдельной секцией задач.

**Non-Goals:**

- Отдельные provider route или адаптеры на аккаунт.
- Независимая proxy-маршрутизация, dsh-6 и собственный системный proxy режим.
- Автоматическая миграция старого пакета.

## Decisions

### 1. First-stage package rename

Переименовать каталог, package manifest, package id, patch references, Remote type symbols, tests, documentation and generated artifacts in one controlled stage. Старый пакет не поддерживается. Сначала пользователь удаляет старый пакет и устанавливает новый.

### 2. One service and one LLM route

`ServiceKey` и `ProviderRoute` используют `openai-hub`; `RemoteNamespace` uses `openaiHub`. Host регистрирует один адаптер. OAuth не меняет маршрут. Это устраняет конфликт с bare `openai-codex` и исключает staged-регистрацию маршрута по account id.

### 3. Account records and credentials

Конфигурация содержит `accounts[]` с `accountLabel`, `authMethod`, internal credential key, auto-refresh flag and account-local model settings. `CredentialRef` is `openai-hub-<authMethod>-<8-hex-hash(accountId)>`. Full account id stays only in protected credential data. Labels are lowercase ASCII slugs with letters, digits and hyphens. Label rename changes public model ids but not the credential record.

На первом срезе разрешается один сохраненный credential, но boundary resolver обязан принимать account label и возвращать account credential. Позже второй аккаунт добавляется записью, а не новым route.

### 4. Account-addressed combined catalog

API catalog after auth/refresh is authoritative. Each upstream model is projected as `<accountLabel>/<upstreamModelId>` and sent upstream after unwrapping to `upstreamModelId`. One combined list is returned by `ProviderRoute = openai-hub`. The provider group is displayed as `OpenAI Hub`; chat model names contain only the account label and upstream id, while DSH's subagent presentation may add the provider prefix as `openai-hub/<accountLabel>/<upstreamModelId>`. The plugin must not store `openai-hub/` inside the model name. Reconciliation preserves valid user name/order/enabled settings, adds new models and removes unavailable ones. API failure preserves last successful catalog; if none exists, local `pi-ai.getModels()` is used.

### 5. Account UI and quota polling

Settings -> Models renders one block and one modal per account. The block has persisted auto-refresh disabled by default. Opening a modal refreshes that account only. Enabled polling is five minutes normally. If the selected model's nearest-reset applicable limit is below 25 percent, polling for that selected account becomes one minute. Limit priority is nearest reset: hourly, five-hour, daily, and so on.

The chat status bar shows limits only for the selected model/account of this provider. While the page is hidden, Client skips network requests and refreshes once on `visibilitychange` to visible. No undocumented DSH focus service is invented.

### 6. Deletion and history

Deleting an account removes its Credential Store records, configuration record, settings and models. Deleting the last account restores fresh-install state. History/messages are never rewritten; old model references are marked stale and require manual selection. No aliases are retained.

### 7. Independent bug-fix boundary

`Bug fixes` are tracked separately from OpenAI Hub behavior. Trace Core Modal portal/theme roots before changing selectors. Cover OpenAI Hub and workspace-manager `dsh-modal-card` backgrounds, remove credential debug logs, and audit obsolete OpenAI-only ProxyMode/system-proxy references and staged regressions. No proxy behavior is moved to shared packages.

### 8. Ссылки на спецификацию

Детальные требования capability находятся в `specs/openai-hub/spec.md`.

### 9. Delegation

Lead `mwscode/personal/336/gpt-6.1-sol` owns complex rename, Host architecture, Remote integration, catalog/credential resolver, final integration and audit. Simple isolated tasks may be delegated to `mwscode/personal/336/gpt-6-luna` with at most one parallel child. UI, modal styles, documentation and focused tests may be delegated to `openai-codex/gpt-6-luna` with at most three parallel children at medium or high reasoning. The lead reviews all changes and resolves conflicts.

## Risks / Trade-offs

- Package rename is breaking and requires manual reinstall; this is intentional to avoid legacy compatibility complexity.
- Account labels are public identifiers; validation and duplicate rejection are required.
- API catalog can be unavailable; last-successful/local fallback preserves operation but may be stale.
- Visibility API is browser-owned and may differ across clients; hidden pages skip requests and visible transition triggers refresh.
- A single route simplifies DSH integration but requires account parsing before credential resolution.

## Migration Plan

1. Rename package and all references; do not migrate old installed code.
2. Verify build and package references after rename.
3. Change route/remote/credential naming and introduce account config.
4. Implement catalog, UI, quota and status behavior.
5. Apply independent bug fixes and regression tests.
6. Run full checks and provide manual reinstall/acceptance instructions.

## Open Questions

None. Any unsupported SDK contract discovered during implementation must be reported as a concrete limitation rather than replaced with an invented DSH API.
