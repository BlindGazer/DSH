# Пример API

```ts
import { createHostLogger, NOOP_LOGGER } from '@kalex/dsh-logger-core';

const logger = createHostLogger(NOOP_LOGGER);
logger.info('operation-completed', { operation: 'refresh' });
```

В примере запись отбрасывается. В Host-плагине вместо `NOOP_LOGGER` можно передать результат `createOptionalLogger(context, packageName)`, указав точное имя npm-пакета. Библиотека не добавляет интерфейс DSH.

[English](Examples_EN.md)
