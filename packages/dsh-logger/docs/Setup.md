# Установка и команды

Требуется DSH `>=0.2.2-rc.5`. В DSH Desktop добавьте пакет на странице "Плагины" по источнику `github:BlindGazer/DSH#path:packages/dsh-logger`.

Для профиля под управлением CLI выполните команду ниже. `web` здесь пример имени профиля, а не профиль DSH Desktop.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-logger
```

Для локальной разработки установите зависимости, соберите пакет и запустите тесты из корня клона:

```sh
pnpm install
pnpm --filter @kalex/dsh-logger build
pnpm --filter @kalex/dsh-logger test
pnpm check
```

Тесты пакета читают файлы сборки, поэтому `build` выполняется до `test`. Чтобы установить локальную сборку, в Desktop укажите каталог пакета на странице "Плагины". Для CLI используйте команду ниже, подставив путь к своему клону:

```powershell
dsh plugin --profile web add C:\git\DSH\packages\dsh-logger
```

Если после обновления DSH продолжает использовать прежнюю версию, перезапустите его.

[Настройки](Examples.md) | [English](Setup_EN.md)
