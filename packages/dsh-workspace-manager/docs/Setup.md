# Установка и команды

## Требования

- Node.js и pnpm (для сборки из исходников).
- Установленный DSH Desktop (профиль `desktop`), версия >= 0.2.2-rc.1.

## Установка из GitHub через DSH CLI

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## Установка через pnpm

Выполните из каталога профиля DSH Desktop:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-workspace-manager
```

## Установка из локальной папки (рекомендуется для разработки)

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-workspace-manager
```

## Доступные команды

Выполняйте команды из каталога `packages/dsh-workspace-manager`:

```bash
# Сборка плагина (Host + Client)
pnpm run build

# Сборка только клиентской части
pnpm run build:client

# Сборка только серверной части
pnpm run build:host

# Запуск модульных тестов
pnpm run test

# Проверка типов
pnpm run typecheck

# Проверка клиентского бандла
pnpm run verify

# Полная проверка: сборка + тесты + verify
pnpm run check
```
