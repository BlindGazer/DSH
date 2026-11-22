# Установка и команды

Плагин требует DSH `>=0.2.2-rc.5`. Для Desktop установите пакет одним из способов:

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-logger
```

Альтернатива через pnpm из каталога профиля Desktop:

```powershell
pnpm add github:BlindGazer/DSH#path:packages/dsh-logger
```

Для локальной разработки сначала установите зависимости и соберите пакет из корня монорепозитория:

```powershell
pnpm install
pnpm --filter @kalex/dsh-logger build
pnpm --filter @kalex/dsh-logger test
pnpm check
```

Затем подключите собранный пакет, подставив путь к своему клону:

```powershell
dsh plugin --profile desktop add C:\git\DSH\packages\dsh-logger
```

Тест пакета читает артефакты сборки, поэтому сначала выполните `build`. После обновления уже загруженного плагина может понадобиться перезапуск DSH.

[Настройки](Examples.md) | [English](Setup_EN.md)
