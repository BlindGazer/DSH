# Пример API

```ts
import { createClientLogger } from '@kalex/dsh-logger-core';

const logger = createClientLogger({
    sink: (level, message, context) => console.log(level, message, context),
});
logger.info('operation-completed', { operation: 'refresh' });
```

Пример выводит событие в консоль и ничего не пишет на диск. Чтобы передавать записи из Host-плагина в DSH logger, используйте `createHostLogger(createOptionalLogger(context, packageName))` и передайте точное имя npm-пакета.

[English](Examples_EN.md)
