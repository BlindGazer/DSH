# Settings in DSH

1. Open the "DSH logger" section in DSH settings.
2. Enable logging. Set a minimum level, directory, and file size limit if needed, then save the settings.
3. To set a different level or limit for a package, open its settings. The list shows registered packages and packages with saved settings, not all installed plugins.
4. When changing directories, review which files will be deleted from the old directory. Back up any logs you need before confirming.

By default, files are stored in the `dsh-logger` subdirectory of the profile directory. For example, `@kalex/dsh-agents-router` writes to `@kalex-dsh-agents-router.jsonl`.

[Русский](Examples.md)
