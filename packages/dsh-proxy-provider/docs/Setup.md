# Установка и команды

## Требования

- Node.js и pnpm (для сборки из исходников).
- Установленный DSH Desktop (профиль `desktop`).

## Установка из GitHub через DSH CLI

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Установка через pnpm

Выполните из каталога профиля DSH Desktop:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Установка из локальной папки (рекомендуется для разработки)

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
```

## Доступные команды

Выполняйте команды из каталога `packages/dsh-proxy-provider`:

```bash
# Сборка плагина (Host + Client)
pnpm run build

# Сборка только клиентской части
pnpm run build:client

# Сборка только серверной части
pnpm run build:host

# Запуск модульных тестов
pnpm run test

# Запуск тестов в режиме наблюдения
pnpm run test:watch

# Проверка артефактов плагина
pnpm run verify

# Полная проверка: сборка + тесты + verify
pnpm run check
```
