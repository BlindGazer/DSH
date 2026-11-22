# [@kalex/dsh-core](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core)

[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-core/package.json)

> [GitHub BlindGazer/DSH](https://github.com/BlindGazer/DSH)

Общая библиотека дизайн-системы, UI-компонентов и утилит для плагинов **DeepSeek Harness (DSH)**.

Сборка выпускает декларации `.d.ts`, чтобы внешние TypeScript-проекты могли использовать библиотеку без исходников монорепозитория.

## 🎯 Назначение

Предоставляет общие компоненты интерфейса, темы и служебные функции, чтобы плагины DSH использовали единый внешний вид и не дублировали базовую логику.

## 📦 Компоненты

`Button`, `IconButton`, `ThemedSelect`, `SwitchControl`, `Tabs`, `Modal`, `Tooltip`, `CircularProgress`, `LinearProgress`, `Skeleton`, `Spinner`, `ProgressBar`, `ChildrenLazy`. Подробнее в [Features](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/docs/Features.md).

### Notification

`Notification` показывает постоянное всплывающее сообщение с `severity` (`error`, `warning`, `info`, `success`), `title`, `message`, `onClose`, `copyLabel`, `closeLabel`. Текст доступен для выделения; кнопка копирования использует Clipboard API, при отказе выделяет текст для ручного копирования. Сообщение закрывается только явно и использует активную тему Core. Вызывающий компонент отвечает за безопасный текст без секретов.

## 🛠 Технологический стек

| Технология | Версия / особенности        |
| ---------- | --------------------------- |
| TypeScript | >= 7.0.2, строгая типизация |
| React      | 19                          |
| Vite (Oxc) | 8                       |
| Vitest     | 5                       |

## 🚀 Установка

Для внешнего проекта соберите библиотеку и установите архив по инструкции ниже.

- [Примеры компонентов](https://github.com/BlindGazer/DSH/blob/main/packages/dsh-core/docs/Examples.md)
- [Команды и использование](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/docs/Setup.md) | [Commands and usage](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/docs/Setup_EN.md)
- [English](https://github.com/BlindGazer/DSH/tree/main/packages/dsh-core/docs/README_EN.md)
