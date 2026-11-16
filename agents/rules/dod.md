---
description: definition of done
---

# Definition of Done

A task is complete only when all applicable conditions are met:

1. The requirements of the relevant OpenSpec are satisfied; when an active OpenSpec exists, its `tasks.md` items are completed.
2. The implementation is minimal and contains no unnecessary code: existing code is reused, and no new code is added unless required.
3. `pnpm fix` passes without errors.
4. `pnpm test` passes without errors.
5. `pnpm build` passes without errors.
6. Error handling is mandatory: errors must be caught at plugin boundaries, written to the console and the DSH log, and represented in the UI by an error component instead of breaking the whole application.
7. The user is informed about the result and known limitations.
