# dsh-8-logger memory

- User approved one global dsh-logger Config Service containing global and per-package policies; logging is disabled by default (`enabled: false`).
- Public package API is only `DshLogger.record(record): void`; packageName comes from DSH plugin context and is not in records.
- event is required; level defaults to info; source is optional and is added by Host/Client runtime when applicable.
- Default directory is the resolved DSH profile `@kalex/dsh-logs`, shown to users as `~/.dsh/@kalex/dsh-logs`; custom absolute path is allowed.
- One JSONL file per package at directory root; Host and Client share it; slash in packageName becomes hyphen.
- Base sanitizer is always active; global and package Config Service policies add declarative keys and paths only. packageName comes from the DSH plugin context or manifest and is not user-configured.
- Rotate by deleting oldest records; path changes require confirmation and remove controlled old logs without deleting Config Service policies.
- Plugin runtime must not call console logging, direct ctx.logger, or local runtime loggers. Preserve DSH/Cordis internal ctx.logger, build/test scripts, and workspace-manager storage.
- dsh-workspace-manager remains installed and gains access to dsh-logger without becoming a logger plugin.
