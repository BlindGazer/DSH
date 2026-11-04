---
name: openspec-memory
description: Create and update openspec/changes/<change-name>/memory.md in concise agent-readable English so any agent can resume work after session interruption without re-asking the user.
---

# OpenSpec Session Memory (`memory.md`)

Use this skill whenever you create or update requirements, tasks, or implementation progress inside `openspec/changes/<change-name>/`.

## Purpose

Maintain `openspec/changes/<change-name>/memory.md` in concise, agent-readable English so that if the session is interrupted, deleted, or reaches context/rate limits, this or any other agent can read `memory.md` and continue work without asking the user repeated questions.

## Template

Read and follow the exact section structure in [memory-template.md](/agents/openspec/skills/memory/memory-template.md):

1. **Initial Command and Goal** - record the user's initial command and a 1-2 sentence goal.
2. **Clarifications and Decisions** - record every question asked (`Q: ... -> A: ...`) and key architectural or product decisions.
3. **Progress and Completed Tasks** - list completed task items (`[x] X.Y`) with a brief summary of what was verified.
4. **Current State and Open Tasks** - state the current workflow status (`planning | in-progress | blocked | ready-for-review`) and list remaining open tasks (`[ ] X.Y`) with target files and known root causes.
5. **Next Step for Resuming Agent** - write the exact next step for the next agent session.

## Rules

- Always write `memory.md` in concise English.
- Update `memory.md` after forming or revising OpenSpec artifacts, after receiving user answers to questions, and after completing each task in `tasks.md`.
- Follow [no-fancy-symbols](/agents/rules/no-fancy-symbols.md): use only ASCII punctuation (`-`, `->`, `"`, `'`, `...`).
