# Features

The plugin stores structured records in one JSONL file per participating package. It removes the oldest records when the file reaches its limit.

- `shared`: settings schemas and sanitization rules.
- `host`: Cordis service `dshLoggerService`, Config Editor integration, filtering, and disk writes.
- `client`: React settings panel for global and per-package options.

In Host code, use `createOptionalLogger(context, packageName)` from `@kalex/dsh-logger-core`. Pass the exact npm package name. Registration works while recording is off; refresh the list if a package joined after you opened the panel. Inside the monorepo, the alias resolves to the library sources, not an installed copy.

[Examples](Examples_EN.md) | [Russian](Features.md)
