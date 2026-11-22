# Features

- `DshLogger.record(DshLogRecord)` describes a record with JSON-compatible data.
- `NOOP_LOGGER` discards records when there is no receiver.
- `createOptionalLogger(context, packageName)` binds Host code to `dshLoggerService` when available. It discards records before binding and after scope disposal, and resumes forwarding when the service binds again.
- `createHostLogger` and `createClientLogger` provide `debug`, `info`, `warn`, and `error`. The client `sink` still runs when there is no receiver.

The library has no Cordis, React, or Node.js dependencies and registers no service. It does not filter, sanitize, or persist records, or catch errors from the supplied sink or receiver. Storage policy and settings belong to the [logging plugin](../../dsh-logger/README.md).

[API example](Examples_EN.md) | [Russian](Features.md)
