# Предложение

## Зачем

Пользовательские runtime-логи пакетов DSH сейчас используют разные механизмы. Это мешает единой настройке, безопасной санитизации, ограничению размера и диагностике.

## Что изменится

- Добавить глобальный плагин dsh-logger с Host Service, Client Service и единой Config Service-секцией.
- Оставить публичным API пакетов только `DshLogger.record(record): void`.
- Определять имя пакета из DSH plugin context, а не передавать его в каждой записи.
- Добавить базовую санитизацию и дополнительные декларативные правила `keys` и `paths`.
- Писать один JSONL-файл на пакет без подпапок, общий для Host и Client.
- Добавить ротацию с удалением самых старых записей.
- Перевести пользовательские runtime-логи пакетов на dsh-logger.
- Сохранить внутренний системный `ctx.logger` DSH/Cordis и файловое хранилище dsh-workspace-manager.

## Возможности

### Новые возможности

- `global-plugin-logger`: единый плагин, сервисы, конфигурация и файловое хранение.
- `structured-plugin-logging`: запись, сериализация, санитизация и ротация.
- `logger-management-ui`: управление глобальными и пакетными правилами.

### Изменённые возможности

- `openai-hub`: пользовательские runtime-логи переходят на dsh-logger.
- `dsh-agents-router` и `dsh-proxy-provider`: пользовательские runtime-логи переходят на dsh-logger.
- `workspace-manager`: плагин сохраняется и получает доступ к dsh-logger; файловое хранилище не меняется.

## Влияние

Затрагиваются packages/dsh-logger, dsh-agents-router, dsh-proxy-provider, dsh-openai-hub и dsh-workspace-manager, конфигурация, Client/Host bootstrap, тесты и документация. Build/test scripts и внутренний runtime DSH/Cordis не мигрируются.
