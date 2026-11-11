# Команды и использование

Все команды выполняются из каталога `packages/dsh-core`.

```bash
# Сборка библиотеки и генерация файлов типов
pnpm run build

# Запуск модульных тестов
pnpm run test

# Проверка артефактов релиза
pnpm run verify
```

## Использование

Внутри монорепозитория импортируйте компоненты и утилиты из пакета:

```typescript
import { Button, ThemedSelect, SwitchControl, buildCoreThemeStyles } from '@kalex/dsh-core';
```
