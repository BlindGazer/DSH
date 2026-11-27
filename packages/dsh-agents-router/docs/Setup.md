# Установка и команды

Требуется DSH `0.2.2-rc.5` или новее.

В DSH Desktop откройте **Плагины**, нажмите **Добавить плагин** и вставьте:

```text
github:BlindGazer/DSH#path:packages/dsh-agents-router
```

Для профиля CLI, например `web`, выполните:

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

Для установки из локальной копии выполните `pnpm install` и `pnpm build` из корня репозитория. Вместо строки `github:...` укажите абсолютный путь к каталогу `packages/dsh-agents-router`.

## Разработка

Запускайте команды из каталога пакета:

| Команда | Назначение |
| --- | --- |
| `pnpm build` | Собрать серверную и клиентскую части. |
| `pnpm build:host` / `pnpm build:client` | Собрать только серверную / клиентскую часть. |
| `pnpm test` / `pnpm test:watch` | Запустить тесты один раз / при изменениях. |
| `pnpm verify` | Проверить файлы для выпуска. |
| `pnpm check` | Собрать пакет, запустить тесты и проверить файлы для выпуска. |
