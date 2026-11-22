# runtime-logging-migration Specification

## Purpose
TBD - created by archiving change dsh-8-logger. Update Purpose after archive.

## Requirements

### Requirement: Исходниковое переиспользование без циклов

Потребители dsh-core, dsh-workspace-manager, dsh-agents-router, dsh-proxy-provider и dsh-openai-hub MUST использовать для логирования только контракт и минимальные адаптеры dsh-logger-core, если им требуется логирование. Они MUST NOT импортировать реализацию dsh-logger. Сам dsh-logger MUST переиспользовать контракт dsh-logger-core и необходимые компоненты dsh-core из исходников. Все проекты MUST NOT объявлять внутренние пакеты в dependencies, devDependencies, peerDependencies или optionalDependencies. Сборка, проверка типов и тесты MUST одинаково разрешать aliases в исходники без предварительной сборки или установки внутренних пакетов.

#### Scenario: Сборка без артефактов соседнего пакета
- **WHEN** у внутренних библиотек отсутствуют собранные файлы
- **THEN** потребитель собирается и проверяет типы непосредственно по исходникам

### Requirement: Самодостаточные результаты сборки

Публикуемые результаты MUST включать необходимый внутренний код, ресурсы и побочные эффекты, исключать неиспользуемую реализацию и сохранять только разрешенные внешние зависимости среды. Они MUST NOT содержать неразрешенные внутренние импорты, ссылки на соседние проекты или исходниковые aliases, включая декларации типов. Клиентский граф MUST NOT содержать файловый Host-код; Host-граф MUST NOT включать UI из-за общего входа логгера. Проверка MUST исследовать граф production-сборки и архив пакета, выполнять публичные экспорты и проверять опубликованные декларации вне монорепозитория.

#### Scenario: Плагин использует только запись события
- **WHEN** собирается пакет-потребитель логирования
- **THEN** в его графе нет UI, конфигурации, санитизации и файлового движка dsh-logger, а нужный адаптер контракта включен в собственный результат

### Requirement: Миграция runtime-пакетов

Runtime-код dsh-agents-router, dsh-proxy-provider, dsh-openai-hub и dsh-workspace-manager MUST использовать только DshLogger для пользовательских runtime-событий и plugin boundary diagnostics. Он MUST NOT использовать `console.*`, прямой `ctx.logger` или собственный runtime file logger. Build/test scripts и внутренние вызовы DSH/Cordis MUST NOT мигрировать: системный `ctx.logger` сохраняется только внутри установленного DSH/Cordis runtime. Allowlist немигрируемых системных вызовов не включает `packages/*/src/**`; grep-аудит MUST проверять только `packages/*/src/` и явно исключать `scripts/`, `test/`, `tests/`.

#### Scenario: Workspace Manager
- **WHEN** workspace-manager работает с каталогами и storage
- **THEN** storage сохраняется, а доступ к dsh-logger добавляется без объявления плагина логгером

### Requirement: OpenAI Hub

OpenAI Hub MUST заменить собственное runtime-хранилище и отдельные настройки логирования на dsh-logger Config Service, сохранив безопасные диагностические события.

#### Scenario: Ошибка внешнего запроса
- **WHEN** Host или Client OpenAI Hub получает ошибку провайдера
- **THEN** событие отправляется через DshLogger и не содержит секретов
