# Установка и команды

Требуется DSH `>=0.2.2-rc.5`. Для сборки из исходников нужны Node.js и pnpm. Для операций с worktree на машине DSH Host нужен Git и репозиторий с хотя бы одним коммитом.

## Из GitHub

В DSH Desktop откройте менеджер плагинов и добавьте источник `github:BlindGazer/DSH#path:packages/dsh-workspace-manager`. Для отдельного CLI-профиля (например, `web`):

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## Из локальной копии

Из корня репозитория установите зависимости и соберите пакет:

```powershell
pnpm install
pnpm --filter @kalex/dsh-workspace-manager build
dsh plugin --profile web add C:/git/DSH/packages/dsh-workspace-manager
```

Для Desktop выберите собранный локальный пакет в менеджере плагинов вместо последней команды.

## Команды пакета

Из каталога пакета: `pnpm run build` собирает Host и Client, `pnpm run build:host` и `pnpm run build:client` собирают их по отдельности. `pnpm run test` запускает тесты, `pnpm run typecheck` проверяет типы, `pnpm run verify` проверяет клиентский бандл. `pnpm run check` выполняет сборку, тесты и проверку бандла.
