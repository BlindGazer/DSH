# API example

```ts
import { createHostLogger, NOOP_LOGGER } from '@kalex/dsh-logger-core';

const logger = createHostLogger(NOOP_LOGGER);
logger.info('operation-completed', { operation: 'refresh' });
```

This example discards the record. In a Host plugin, replace `NOOP_LOGGER` with the result of `createOptionalLogger(context, packageName)` and pass the exact npm package name. The library does not add a DSH interface.

[Russian](Examples.md)
