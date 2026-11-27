# API example

```ts
import { createClientLogger } from '@kalex/dsh-logger-core';

const logger = createClientLogger({
    sink: (level, message, context) => console.log(level, message, context),
});
logger.info('operation-completed', { operation: 'refresh' });
```

This example prints the event to the console and writes nothing to disk. To forward records from a Host plugin to DSH logger, use `createHostLogger(createOptionalLogger(context, packageName))` and pass the exact npm package name.

[Russian](Examples.md)
