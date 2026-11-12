# Команды и использование

## Команды

Все команды выполняются из каталога `packages/dsh-core`:

```bash
# Сборка библиотеки и генерация файлов типов
pnpm run build

# Запуск модульных тестов
pnpm run test

# Запуск тестов в режиме наблюдения
pnpm run test:watch

# Проверка артефактов релиза
pnpm run verify

# Полная проверка: сборка + тесты + verify
pnpm run check
```

## Использование

Внутри монорепозитория импортируйте компоненты и утилиты из пакета:

```typescript
import { Button, ThemedSelect, SwitchControl, buildCoreThemeStyles } from '@kalex/dsh-core';
```

Для внешних проектов установите пакет и импортируйте так же:

```bash
pnpm add @kalex/dsh-core
```
