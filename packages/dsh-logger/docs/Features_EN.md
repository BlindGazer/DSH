# Features

The plugin writes structured records to a separate JSONL file for each participating package. If a new record would put the file over its size limit, the plugin drops the oldest records.

- `shared`: settings schemas and data masking rules.
- `host`: the Cordis service `dshLoggerService`, settings storage through Config Editor, filtering, and writing to disk.
- `client`: a React panel for global settings and per-package overrides.

From your plugin's Host code, call `createOptionalLogger(context, packageName)` from `@kalex/dsh-logger-core`. Pass the exact npm package name. The package registers even when logging is off. If it connects after you open the settings panel, refresh the list.

[Examples](Examples_EN.md) | [Русский](Features.md)
