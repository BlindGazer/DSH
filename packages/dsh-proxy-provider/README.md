# [@kalex/dsh-proxy-provider](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider)

[![DSH >=0.2.2-rc.5](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.5-4B32C3)](https://github.com/deepseek-ai/deepseek-harness) [![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![undici 8.13.1](https://img.shields.io/badge/undici-8.13.1-B93868)](https://undici.nodejs.org/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](https://github.com/BlindGazer/DSH/blob/main/LICENSE.md)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин DeepSeek Harness (DSH) для подключения провайдеров моделей через прокси. В настройках моделей можно создать профили HTTP, HTTPS или SOCKS5, проверить соединение и назначить профиль провайдеру. Маршрут определяется адресом назначения, а не провайдером. Разные порты одного хоста могут иметь разные маршруты.

## Установка

**DSH Desktop:** откройте **Плагины**, нажмите **Добавить плагин** и вставьте: `github:BlindGazer/DSH#path:packages/dsh-proxy-provider`.

**Терминал:** вместо `web` укажите имя своего профиля CLI. Профилем `desktop` управляет приложение.

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

Стек: TypeScript, React, Cordis, undici, Vite и Vitest.

[Примеры в DSH](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Examples.md) | [Возможности](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Features.md) | [Установка и команды](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Setup.md) | [Безопасность](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Security.md) | [English](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/README_EN.md)
