# Purpose

UI logger plugin позволяет управлять единой Config Service-конфигурацией и политиками активных и неактивных пакетов.

# ADDED Requirements

## Requirement: Управление настройками

UI MUST изменять глобальные enabled, level, path, maxFileBytes и необязательный sanitizer, а также package policies с enabled, optional level, optional maxFileBytes и optional sanitizer. Все изменения MUST сохраняться только в Config Service dsh-logger через configEditor.

### Scenario: Переопределение пакета
- **WHEN** пользователь изменяет policy packageName
- **THEN** изменяется только logger Config Service, а Config Service пакета не меняется

## Requirement: Client Context

Client MUST предоставлять scoped DshLogger через DSH Client Service и React Context/Provider. Компоненты MUST получать logger через hook и MUST NOT использовать window logger или props-цепочку. При отсутствии Client Service MUST использоваться no-op.

### Scenario: Действие интерфейса
- **WHEN** компонент вызывает logger hook и записывает событие
- **THEN** запись отправляется без знания destination и packageName

## Requirement: Безопасная смена пути

UI MUST показывать предупреждение, старый абсолютный путь, количество контролируемых и неизвестных объектов и требовать явного подтверждения перед сохранением нового path. Отмена MUST сохранять прежний path и файлы. Подтверждение MUST выполнять очистку только по правилам Host.

### Scenario: Отмена смены пути
- **WHEN** пользователь отклоняет предупреждение
- **THEN** Config Service, старый каталог и policies остаются без изменений
