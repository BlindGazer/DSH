# Features

- `DshLogger.record(record)` accepts a `DshLogRecord` with JSON-compatible data.
- `NOOP_LOGGER` discards every record.
- `createOptionalLogger(context, packageName)` forwards records to `dshLoggerService` when it is available in the Host. Records are discarded before the connection is active and after it ends. Forwarding resumes when the service reconnects.
- `createHostLogger` and `createClientLogger` provide `debug`, `info`, `warn`, and `error`. The client `sink` still runs when there is no receiver.

The library has no Cordis, React, or Node.js dependencies and registers no service. It does not filter, sanitize, or persist records, or catch errors from the supplied sink or receiver. Storage policy and settings belong to the [logging plugin](../../dsh-logger/README.md).

[API example](Examples_EN.md) | [Russian](Features.md)
