# Purpose

Пользовательские runtime-логи пакетов переводятся на единый dsh-logger без удаления системных механизмов и файловых функций.

# ADDED Requirements

## Requirement: Миграция runtime-пакетов

Runtime-код dsh-agents-router, dsh-proxy-provider, dsh-openai-hub и dsh-workspace-manager MUST использовать только DshLogger для пользовательских runtime-событий и plugin boundary diagnostics. Он MUST NOT использовать `console.*`, прямой `ctx.logger` или собственный runtime file logger. Build/test scripts и внутренние вызовы DSH/Cordis MUST NOT мигрировать: системный `ctx.logger` сохраняется только внутри установленного DSH/Cordis runtime. Allowlist немигрируемых системных вызовов не включает `packages/*/src/**`; grep-аудит MUST проверять только `packages/*/src/` и явно исключать `scripts/`, `test/`, `tests/`.

### Scenario: Workspace Manager
- **WHEN** workspace-manager работает с каталогами и storage
- **THEN** storage сохраняется, а доступ к dsh-logger добавляется без объявления плагина логгером

## Requirement: OpenAI Hub

OpenAI Hub MUST заменить собственное runtime-хранилище и отдельные настройки логирования на dsh-logger Config Service, сохранив безопасные диагностические события.

### Scenario: Ошибка внешнего запроса
- **WHEN** Host или Client OpenAI Hub получает ошибку провайдера
- **THEN** событие отправляется через DshLogger и не содержит секретов
