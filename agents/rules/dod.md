---
description: definition of done
---

# Definition of Done

A code or configuration change is complete only when all applicable conditions are met:

1. The requirements of the relevant OpenSpec are satisfied; when an active OpenSpec exists, its `tasks.md` items are completed.
2. The implementation is minimal and contains no unnecessary code: existing code is reused, and no new code is added unless required.
3. A final reviewer MUST run `pnpm fix`, `pnpm test`, and `pnpm build` for the whole repository.
4. Every command MUST pass across every package; any failure blocks a positive final verdict.
5. Documentation, planning, and analysis tasks do not require these commands unless they change code or configuration.
6. Runtime plugin errors MUST be caught at plugin boundaries, written to the console and DSH log, and represented in the UI by an error component instead of breaking the application.
7. The user is informed about the result and known limitations.
