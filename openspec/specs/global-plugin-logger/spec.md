# global-plugin-logger Specification

## Purpose
TBD - created by archiving change dsh-8-logger. Update Purpose after archive.

## Requirements

### Requirement: Независимая библиотека контракта

Контракт записи и минимальная пустая реализация MUST находиться в отдельной библиотеке dsh-logger-core без зависимостей на другие пакеты, включая зависимости только для типов. Библиотека MUST NOT импортировать React, Cordis, Node.js API, dsh-core или dsh-logger. Настройки, санитизация, хранение, транспорт и UI MUST оставаться в реализации плагина. Импорт контракта MUST NOT регистрировать сервисы, открывать файлы или инициализировать плагин. Библиотека MUST NOT входить в публичный вход dsh-core через повторный экспорт.

#### Scenario: Независимый потребитель
- **WHEN** приложение использует только контракт и пустой logger
- **THEN** оно собирается и выполняется без компонентов Core, плагина логгера и среды DSH

#### Scenario: Несколько встроенных копий
- **WHEN** разные плагины содержат собственные копии минимальных адаптеров
- **THEN** они используют структурно совместимый контракт и переданный сервис, а не общий экземпляр внутреннего модуля или глобальный реестр

### Requirement: Единый сервис

Система MUST предоставлять глобальный logger plugin с Host Service и Client Service. Пакет MUST получать scoped logger из DSH context. Если сервис отсутствует, пакет MUST сразу получать no-op logger и продолжать работу; загрузка logger plugin MUST делать этот scoped logger рабочим для последующих записей без повторной инициализации пакета. При выгрузке logger plugin все ранее выданные scoped logger MUST быть переведены обратно в no-op и MUST NOT продолжать запись без logger Service. Системный `ctx.logger` DSH/Cordis MUST оставаться неизменным.

#### Scenario: Сервис отсутствует
- **WHEN** пакет запускается без logger plugin
- **THEN** пакет работает, а запись не сохраняется

#### Scenario: Сервис загружен
- **WHEN** Host или Client пакета получает logger из своего DSH context
- **THEN** logger добавляет packageName из context и не принимает его из записи

### Requirement: Единая Config Service

Все настройки логирования MUST храниться только в одной Config Service-секции dsh-logger и изменяться через стандартный configEditor. Значение `enabled` по умолчанию MUST быть `false`. Схема MUST валидировать `enabled: boolean`, `level: debug|info|warn|error`, абсолютный `path`, `maxFileBytes: integer >= 1024`; значение `maxFileBytes` по умолчанию MUST быть 10 MiB, необязательный `sanitizer` и `plugins: Record<packageName, policy>`. Sanitizer MUST иметь ровно поля `keys?: string[]` и `paths?: string[]`; каждый key MUST быть непустой строкой длиной не более 128 без управляющих символов, каждый path MUST быть непустой последовательностью точечных сегментов с именами ключей или неотрицательных десятичных индексов массива, без `*`, `..`, пустых сегментов и управляющих символов. Массивы MUST иметь не более 256 правил. Неизвестные поля и невалидные правила MUST отклоняться configEditor без изменения предыдущей конфигурации. Policy MUST содержать `enabled: boolean` и необязательные `level`, `maxFileBytes`, `sanitizer`. Неактивные и неизвестные packageName MUST сохраняться до явного удаления policy. Значения `null` для настроек и sanitizer MUST отклоняться; отсутствие необязательного поля означает отсутствие override. Изменение конфигурации MUST выполняться как атомарная операция configEditor: при ошибке валидации или конфликте записи предыдущая конфигурация MUST оставаться без изменений.

Логгер MUST применять встроенную базовую защиту, а дополнительные `keys` и `paths` MUST задаваться только в глобальной Config Service-секции и в package policies этой же секции. Правила MUST объединяться, дубликаты MUST удаляться, а совпадение path MUST означать удаление. `enabled=false` на глобальном уровне MUST отключать все пакеты; package `enabled=false` MUST отключать только этот пакет, а package `enabled=true` не может включить пакет при глобальном `enabled=false`. Package level и лимит MUST заменять глобальные только для соответствующего packageName. Схема Config Service MUST отклонять неизвестные поля, packageName, не соответствующий требованиям DSH, уровень и лимит; ошибка configEditor MUST оставлять предыдущую конфигурацию без изменений. Удаление policy MUST удалять только override.

#### Scenario: Неактивная policy
- **WHEN** packageName отсутствует среди загруженных пакетов, но его policy сохранена
- **THEN** UI показывает ее как неактивную и позволяет удалить override через configEditor

### Requirement: Публичный контракт

Пакеты MUST использовать только `DshLogger.record(record): void`. `event` MUST быть непустой строкой. `level` MUST быть необязательным и иметь default `info`. Допустимы только `debug`, `info`, `warn`, `error`. `source`, `phase`, `operation` и `data` MUST быть необязательными. Если запись содержит source, runtime source MUST replace it with `host` or `client`; неизвестное значение MUST быть отброшено.

#### Scenario: Минимальная запись
- **WHEN** пакет передает только event
- **THEN** logger добавляет `info`, доступный source и packageName из DSH context
