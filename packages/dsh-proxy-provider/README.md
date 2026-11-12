# [@kalex/dsh-proxy-provider](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider)

[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![undici](https://img.shields.io/badge/undici-8.12.3-3B7FE4)](https://undici.nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-proxy-provider/package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Плагин **DeepSeek Harness (DSH)**, который управляет сетевыми запросами (проксирует) выбранных провайдеров моделей через заданные прокси.

## 🎯 Назначение

Позволяет настраивать выборочную маршрутизацию запросов провайдеров через HTTP, HTTPS и SOCKS5 прокси, сохраняя прямое подключение для остальных запросов. Также позволяет выбирать разные прокси-серверы для разных провайдеров моделей.

## 🚀 Установка из GitHub

```powershell
dsh plugin --profile desktop add github:BlindGazer/DSH#path:packages/dsh-proxy-provider
```

## 🛠 Технологический стек

| Технология | Версия / особенности        |
| ---------- | --------------------------- |
| TypeScript | >= 7.0.2, строгая типизация |
| React      | 19                          |
| undici     | 8.12.3, сетевые запросы     |
| Vite (Oxc) | 8.3.5                       |
| Vitest     | 3.2.0                       |

## 🔐 Безопасность

Учетные данные прокси (логин и пароль) шифруются алгоритмом AES-256-GCM с локальным мастер-ключом. Подробнее в [Security](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Security.md).

## 📸 Примеры в DSH

Как плагин выглядит и работает внутри DSH, смотрите в [Examples](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Examples.md).

- [Команды и установка](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Setup.md) | [Commands and installation](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/Setup_EN.md)
- [English README](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-proxy-provider/docs/README_EN.md)
