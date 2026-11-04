---
description: Forbid reading or changing appsettings.Development.json anywhere in the repository, do not expore secrets in logs/tests/examples
---

- Do not read, show or change `**/appsettings.Development.json`: the file may contain local secrets. Change configuration in `appsettings.json`, a template, or another allowed file without real keys, tokens or connection strings.
- Do not expose secrets or credentials in logs, tests, or examples
