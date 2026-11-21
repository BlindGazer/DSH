# Дизайн

## Контекст

DSH предоставляет Host Config Service, configEditor, Cordis Services и Client Services. Встроенный `ctx.logger` является системным механизмом DSH/Cordis. Изменение касается только пользовательских runtime-логов пакетов.

## Цели / нецели

**Цели:**

- единый глобальный logger plugin и единая конфигурация;
- только `DshLogger.record(record): void` как публичный API пакетов;
- no-op при отсутствии logger Service;
- безопасная JSON-сериализация, базовая и дополнительная санитизация;
- один файл JSONL на пакет, общий для Host и Client;
- управление путем, уровнями, лимитами и правилами через Config Service/UI;
- миграция runtime-логов пакетов без удаления workspace storage.

**Нецели:**

- удаление системного `ctx.logger` DSH/Cordis;
- миграция build/test scripts и внутренних логов DSH;
- удаление dsh-workspace-manager или его файлового storage;
- хранение секретов в Config Service или логах.

## Решения

`DshLogRecord` содержит обязательный `event` и необязательные `level`, `source`, `phase`, `operation`, `data`. Уровень по умолчанию `info`. packageName добавляется scoped logger из plugin context. source добавляется Host/Client runtime, если это применимо.

Единая Config Service-секция dsh-logger хранит enabled (по умолчанию false), level, path, maxFileBytes (по умолчанию 10 MiB), необязательный глобальный sanitizer и map plugins[packageName] с optional overrides. Глобальный sanitizer и sanitizer package policy содержат необязательные keys и paths. Правила только усиливают удаление.

Путь по умолчанию: resolved DSH profile + `@kalex/dsh-logs`, пользователь может указать абсолютный путь. Один файл пакета находится в корне каталога; `/` в packageName заменяется на `-`. При лимите удаляются самые старые записи. Смена пути требует подтверждения и очищает только контролируемые logger-объекты в старой папке.

Пакеты получают logger из DSH Host/Client context. React-компоненты используют Client Context/hook, а не window и не props-цепочку. Отсутствующий Service сразу дает no-op; после загрузки logger plugin тот же scoped logger начинает записывать последующие события без повторной инициализации пакета. При выгрузке plugin выданные scoped logger возвращаются в no-op.

## Риски / компромиссы

- список неактивных policies хранится в одной Config Service map;
- общий файл Host/Client требует последовательной записи;
- произвольный пользовательский путь может содержать чужие файлы;
- текущий черновой API dsh-logger заменяется на согласованный record-контракт.
