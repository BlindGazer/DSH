# Установка и команды

## Установка из GitHub через DSH CLI

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Установка через pnpm

Выполните из каталога профиля DSH Desktop:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-agents-router
```

## Установка из локальной папки

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add C:\git\DSH\packages\dsh-agents-router
```

## Доступные команды

Выполняйте команды из каталога `packages/dsh-agents-router`:

```bash
# Сборка плагина (Host + Client)
pnpm run build

# Сборка только клиентской части (Vite)
pnpm run build:client

# Сборка только серверной части (Vite)
pnpm run build:host

# Запуск модульных тестов (Vitest)
pnpm run test

# Запуск тестов в режиме отслеживания изменений
pnpm run test:watch

# Полная проверка: сборка + тесты + верификация артефактов
pnpm run check

# Проверка готовности артефактов к релизу в DSH
pnpm run verify
```

## Требования

- Node.js и pnpm.
- Версия DSH не ниже `0.2.2-rc.1` (см. `engines.dsh` в `package.json`).
