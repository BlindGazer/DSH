# `@kalex/dsh-provider-proxy` — Селективный прокси-роутер провайдеров для DeepSeek Harness

> English documentation: [README_EN.md](<README_EN.md>)

Плагин для **DeepSeek Harness (DSH) Desktop**, позволяющий создавать переиспользуемые профили прокси-серверов (**HTTP**, **HTTPS** с Basic Auth и **SOCKS5** с авторизацией RFC 1928/1929) и селективно привязывать их к отдельным провайдерам моделей на вкладке `Settings -> Models`. Локальные корпоративные провайдеры со статусом `Direct` продолжают работать напрямую в обход прокси.

---

## Возможности

- **Гибкие профили прокси:** поддержка `HTTP`, `HTTPS` (Basic Auth) и `SOCKS5` (Username/Password Auth), флаг `Ignore SSL / TLS certificate errors` для корпоративных сетей с SSL-инспектированием.
- **Селективная маршрутизация по провайдерам:** выбор профиля прокси или `Direct (No proxy)` прямо на карточке каждого провайдера (`Settings -> Models`) и в сводной таблице `Proxy settings`.
- **Двухэтапная диагностика (`Test`):** проверка TCP-доступности порта прокси (таймаут 5000 мс) + тестовый HTTP-запрос через прокси к целевому URL с диагностикой `407 Proxy Authentication Required` и ошибок сертификатов.
- **Экспорт и Импорт (`Export` / `Import`):** выгрузка и загрузка профилей и привязок провайдеров в JSON (`kalex-provider-proxy-settings.json`). По умолчанию экспортируются только настройки прокси без учетных данных; при включении галочки **`Include credentials`** плагин запрашивает пароль шифрования (`scrypt + AES-256-GCM`), позволяя безопасно перенести логины и пароли на другой компьютер.
- **Защита учетных данных и изоляция:** логин и пароль шифруются на диске алгоритмом `AES-256-GCM` и не передаются в открытом виде через HTTP API, а перехватчик `globalThis.fetch` и эндпоинты настроек защищены от отключения сторонними плагинами или агентами.

---

## Сценарий 1. Установка локально из исходников в DSH Desktop

Используйте этот сценарий при разработке или локальной установке плагина из папки исходного кода.

### 1. Сборка и проверка плагина

Перейдите в папку с исходниками плагина `<path-to-kalex-dsh-provider-proxy>` и выполните:

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"
pnpm run build
pnpm test
```

### 2. Установка в профиль DSH Desktop

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-kalex-dsh-provider-proxy>"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-kalex-dsh-provider-proxy>"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/kalex-dsh-provider-proxy"
```

### 3. Включение плагина в DSH

1. Откройте **DeepSeek Harness Desktop**
2. Откройте вкладку **Plugins** (слева в панели `Plugins` не в `Settings`)
3. В окне **Plugins** нажмите иконку обновления сверху справа, рядом с кнопкой **Add Plugin** (если плагина нет в списке)
4. В **Installed plugins** найдите `@kalex/dsh-provider-proxy` и включите плагин.
5. Откройте `Signed in to DeepSeek -> Settings -> Models` — на карточках провайдеров и под кнопкой `+ Add model provider` появится управление **`Proxy settings`**.

---

## Сценарий 2. Создание релизного пакета, публикация в GitHub и установка

Используйте этот сценарий, чтобы собрать самодостаточный архив `.tgz`, опубликовать версию в GitHub (GitHub Releases / Git tag) и устанавливать плагин на других машинах без клонирования репозитория.

### 1. Создание пакета `.tgz` локально

В корне проекта `<path-to-kalex-dsh-provider-proxy>` выполните:

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"

# Сборка артефактов lib/ и упаковка в архив kalex-dsh-provider-proxy-<version>.tgz
pnpm run build
pnpm pack
```

В корне папки появится файл вида `kalex-dsh-provider-proxy-0.1.0.tgz` (включающий скомпилированную папку `lib/`, `cordis.patch.yml` и `package.json`).

### 2. Публикация версии в GitHub (пока не реализовано)

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"

# 1. При необходимости обновите версию в package.json (например, 0.1.0 -> 0.2.0)
pnpm version patch --no-git-tag-version

# 2. Пересоберите артефакты и создайте релизный архив .tgz
pnpm run build
pnpm pack

# 3. Зафиксируйте изменения, создайте git-тег и отправьте в GitHub
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin main --tags
```

Если у вас установлен GitHub CLI (`gh`), вы можете сразу создать GitHub Release с прикрепленным `.tgz`-пакетом одной командой:

```powershell
gh release create v0.1.0 ./kalex-dsh-provider-proxy-0.1.0.tgz --title "v0.1.0" --notes "Release v0.1.0"
```

*(Либо загрузите созданный файл `kalex-dsh-provider-proxy-0.1.0.tgz` вручную на странице **Releases -> Draft a new release** вашего репозитория в GitHub).*

### 3. Установка плагина в DSH из скачанного `.tgz` или напрямую из GitHub

#### Вариант А: Установка из скачанного из GitHub Releases файла `.tgz` (рекомендуется для корпоративных сетей)

Скачайте файл `kalex-dsh-provider-proxy-0.1.0.tgz` со страницы **Releases** вашего репозитория и выполните:

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-provider-proxy-0.1.0.tgz"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-provider-proxy-0.1.0.tgz"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/downloads/kalex-dsh-provider-proxy-0.1.0.tgz"
```

#### Вариант Б: Прямая установка из GitHub-репозитория по тегу версии

Если в репозитории закоммичена папка `lib/` (или настроен `prepack`), установить конкретную версию из GitHub можно напрямую:

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "github:<github-owner>/kalex-dsh-provider-proxy#v0.1.0"
```

После установки выполните шаги из секции `3. Включение плагина в DSH`
---

## Примечание по безопасности хранения учетных данных (v1)

В первой версии плагина (**Вариант 1**) логин и пароль прокси никогда не сохраняются в открытом виде в `$DSH_HOME/kalex-provider-proxy.json` и не возвращаются через HTTP API: в файле хранится только зашифрованный блок `AES-256-GCM` (`cipher`), а 256-битный ключ хранится отдельно в `%LOCALAPPDATA%\kalex-dsh-provider-proxy\master.key`.

**Осознанно принятый в v1 риск:** поскольку файл ключа находится на диске с правами текущего пользователя ОС, локальный процесс или агент, запущенный от имени того же пользователя и читающий оба файла, теоретически может расшифровать учетные данные. Для повышения уровня защиты в следующих версиях рекомендуется использовать:
- **Вариант 2 (Мастер-пароль / PIN в памяти процесса DSH):** генерация ключа через `PBKDF2` / `scrypt` из короткого пароля при старте сессии DSH с хранением ключа исключительно в оперативной памяти (RAM) без записи на диск.
- **Вариант 3 (Системное хранилище ОС / хранение только в RAM с привязкой к процессу):** использование защищенного хранилища ОС (Windows Credential Manager / DPAPI с изоляцией от дочерних процессов) либо ввод учетных данных только на время жизни процесса.
