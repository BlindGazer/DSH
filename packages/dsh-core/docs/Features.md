# Компоненты и темы

## Компоненты

- Кнопки: `Button`, `IconButton`, `CollectionAddButton`.
- Поля и переключатели: `TextField`, `ThemedSelect`, `Checkbox`, `SwitchControl`, `RadioCardGroup`.
- Вкладки и всплывающие элементы: `Tabs`, `Modal`, `Popover`, `Tooltip`, `Notification`.
- Загрузка и прогресс: `Skeleton`, `Spinner`, `ProgressBar`, `ChildrenLazy`, `CircularProgress`, `LinearProgress`.
- Блок с раскрываемым кодом: `CodeDisclosure`.

`Notification` остается открытым до явного закрытия. Текст можно выделить или скопировать кнопкой; если копирование через Clipboard API не сработает, компонент выделит текст для ручного копирования. Не передавайте секреты в заголовке или тексте.

## Темы

CSS-переменные `--dsh-ui-*` задают цвета, границы, тени и цвета состояний (`info`, `success`, `warning`, `danger`) для светлой, темной и пользовательских тем. Чтобы использовать общие стили, загрузите CSS темы (`ensureCoreStyles` или `buildCoreThemeStyles`) и установите `data-theme` из `useEffectiveTheme()` на корневом элементе, например `.dsh-core-root`.

## Хуки и утилиты

- `useDebouncedValue` откладывает обновление значения, пока изменения не прекратятся на заданное время.
- `useLocalePreference`, `useEffectiveTheme`, `useDshThemeRevision` дают доступ к языковой настройке, текущей теме и ее ревизии.
- `classNames` объединяет CSS-классы; `formatMessage` подставляет значения вместо `{0}`, `{1}` и других позиционных параметров.
- `sanitizeHostInput` нормализует введенный адрес узла, а `extractHost` извлекает из URL адрес, включая нестандартный порт, если он указан, или возвращает `null` при ошибке.

Пакет группирует компоненты, темы, хуки, утилиты, типы и константы; отдельного сервиса Host и точки входа плагина у него нет. Компоненты написаны на React и TypeScript, стили на Sass. Сборка использует Vite, тесты запускает Vitest.

[Примеры](Examples.md) | [English](Features_EN.md)
