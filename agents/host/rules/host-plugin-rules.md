---
paths:
  - "packages/*/src/host/**"
  - "packages/*/src/shared/**"
  - "packages/*/scripts/**"
  - "scripts/**"
description: Rules for Node.js / Cordis host plugin services, security boundaries, and release verification.
---

# Host Plugin Architecture Rules (Node.js / Cordis)

- **Environment Isolation:** `src/host/` and `src/shared/` must never import React, DOM globals, or `src/client/` modules.
- **Dependency Inversion:** define service contracts as TypeScript interfaces in `src/shared/models/` or `src/host/models/`; inject external dependencies (file system, fetch/undici dispatcher, storage, clock) through constructor or factory options for deterministic testing.
- **Immutability with DSH Host:** never mutate frozen tool execution arguments (`exec.arguments`) or host context objects; return replacement objects.
- **Path & Credential Safety:** validate canonical paths (`realpath`) against directory traversal or symlink escapes, and never expose raw proxy credentials in client state snapshots or logs.
