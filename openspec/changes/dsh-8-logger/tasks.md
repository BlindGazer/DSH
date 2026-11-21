# Задачи

## 1. Спецификация и контракты

- [ ] 1.1 Создать и проверить proposal, design, четыре delta specs (`global-plugin-logger`, `structured-plugin-logging`, `logger-management-ui`, `runtime-logging-migration`), memory и .openspec.yaml; проверка: список файлов содержит все артефакты, а заголовки delta specs равны `Purpose`, `ADDED Requirements`, `Requirement`, `Scenario`.
- [ ] 1.2 Определить публичный контракт `DshLogger.record(record): void`, JSON domain, default level, optional source и no-op; проверка: TypeScript-тесты принимают минимальную запись и отвергают неверный level.
- [ ] 1.3 Зафиксировать границу системного `ctx.logger` DSH/Cordis и allowlist миграции; проверка: grep только по `packages/*/src/**` не находит `console.*`, прямой `ctx.logger` и локальные runtime file logger, а `scripts/`, `test/` и `tests/` исключены.

## 2. Глобальный logger plugin и конфигурация

- [ ] 2.1 Реализовать глобальный Host/Client logger Service с no-op при отсутствии и активацией уже выданного scoped logger после загрузки; проверка: Host/Client tests подтверждают packageName из context, отсутствие записи без Service, запись после загрузки без повторной инициализации пакета и возврат выданных logger в no-op после выгрузки.
- [ ] 2.2 Реализовать одну Config Service-секцию через configEditor с `enabled: false` и `maxFileBytes: 10 MiB` по умолчанию, глобальными и package policies; проверка: schema tests проверяют типы, запрет `null` и неизвестных полей, приоритет global -> package, атомарное сохранение без изменения предыдущей конфигурации при ошибке или конфликте и удаление неактивного override.
- [ ] 2.3 Реализовать default path `<resolved DSH profile>/@kalex/dsh-logs`, пользовательский абсолютный path и подтверждаемую очистку старого каталога; проверка: tests проверяют default, custom, traversal/symlink rejection, unknown-file preservation, совместную регистрацию Host и Client одного packageName, повторную регистрацию того же context, валидность packageName по правилам DSH и cancel confirmation.

## 3. Безопасная запись и UI

- [ ] 3.1 Реализовать базовый и декларативный sanitizer keys/paths, JSON-сериализацию и лимиты: depth 8, string 4096, data 64 KiB; проверка: tests проверяют маркеры `[BigInt]`, `[Circular]`, `[Truncated]`, Error и секреты.
- [ ] 3.2 Реализовать один JSONL-файл на packageName без подпапок, общий Host/Client source и последовательную append-запись; проверка: tests проверяют имя файла по packageName, source override, совместную запись Host/Client и concurrent append.
- [ ] 3.3 Реализовать global maxFileBytes и package override с минимумом 1024, детерминированное усечение oversized record по полю `data`, общий lock-файл и удаление старых записей crash-safe; проверка: rotation tests проверяют усечение до размера всего JSONL-файла, порядок записей, таймаут lock, stale lock, временный файл и восстановление.
- [ ] 3.4 Реализовать Client Context/Provider/hook и UI глобальных и package-specific настроек; проверка: React tests проверяют no-op, active/inactive policies и обязательное предупреждение/подтверждение path change.

## 4. Миграция пакетов

- [ ] 4.1 Перевести runtime-логи dsh-openai-hub на dsh-logger и удалить его отдельное runtime-хранилище логирования; проверка: host/client integration tests и отсутствие локального logger import.
- [ ] 4.2 Перевести runtime-логи dsh-agents-router и dsh-proxy-provider с plugin console/ctx.logger на dsh-logger; проверка: package tests и grep allowlist.
- [ ] 4.3 Добавить доступ к dsh-logger в dsh-workspace-manager без удаления или изменения его файлового storage; проверка: существующие storage tests и новый logger integration test.
- [ ] 4.4 Выполнить grep-аудит plugin runtime; проверка: команда поиска по `packages/*/src/` возвращает только разрешенные DshLogger calls, а `scripts/`, `test/`, `tests/` не учитываются.

## 5. Проверки и завершение

- [ ] 5.1 Добавить unit/integration проверки контрактов, Config Service, sanitizer, paths, files, rotation, no-op, Host/Client и migration regression; проверка: targeted Vitest commands завершаются с нулевым кодом.
- [ ] 5.2 Выполнить `pnpm fix`, `pnpm check`, `pnpm test`, `pnpm build`; проверка: каждая команда завершается с нулевым кодом, root test запускается отдельно от recursive package tests.
- [ ] 5.3 Провести самостоятельное и параллельное ревью; проверка: review report не содержит критических замечаний, memory.md обновлен, а реализованные пункты закрыты и закоммичены по правилам OpenSpec.
