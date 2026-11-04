---
description: Rules for working with OpenSpec (spec) applies only when the user explicitly chooses the process or continues an existing change; the presence of an openspec/ folder alone does not require a change.
---

Use OpenSpec if the user has explicitly chosen this process or is continuing work on a specific change. The mere presence of an openspec/ folder does not by itself require creating or updating a change in order to modify code. The following rules apply only when working through OpenSpec:

Active changes are located in openspec/changes/, the current specifications are in openspec/specs/, and the general artifact rules are in openspec/config.yaml.

To create, explore, update, apply, sync, and archive a change, use the corresponding `openspec-*` skills in `/agents/openspec/skills/*/SKILL.md`.

Before implementing, obtain `openspec instructions apply --change <name> --json` and read all the listed `contextFiles`. Do not implement guesses or behavior that contradicts the change artifacts: update OpenSpec first.

In `tasks.md`, each task is formatted as a checkbox `- [ ] X.Y ...`, includes a way to verify it, and MUST be marked as done (`- [x]`) immediately after it has been implemented and verified. Do not leave completed tasks unchecked. Immediately after marking a task item as done, load the `commit` skill with the standard skill-loading tool and commit the changes. See [commit](/agents/skills/commit/SKILL.md).

When working on OpenSpec requirements or tasks in `openspec/changes/<change-name>/`, load the `openspec-memory` skill with the standard skill-loading tool to create and update `openspec/changes/<change-name>/memory.md`. See [memory](/agents/openspec/skills/memory/SKILL.md).

If the user asks to modify an incomplete task, ask them whether a new item should be added to tasks or an existing one should be changed.