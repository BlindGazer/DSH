# Установка и команды

## Установка из GitHub через DSH CLI

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Установка через pnpm

Выполните из каталога профиля DSH Desktop:

```powershell
Set-Location "$env:USERPROFILE/.dsh/profiles/desktop"
pnpm install github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## Установка из локальной папки

```powershell
$desktopDsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $desktopDsh plugin --profile desktop add C:\git\DSH\packages\dsh-proxy-provider
```

## Доступные команды

Выполняйте команды из каталога `packages/dsh-proxy-provider`:

```bash
# Сборка плагина (Host + Client)
pnpm run build

# Запуск модульных тестов
pnpm run test

# Проверка артефактов плагина
pnpm run verify
```
