---
name: use-memory
description: Create and maintain a session memory log in agents/dsh/memory/{DSH_SESSION_ID}_memory.md in concise agent-readable English so work can resume after interruption without re-asking the user.
---

# Session Memory (`use-memory`)

Use this skill to maintain a persistent session journal in `agents/dsh/memory/{unique_session_id}_memory.md` during non-OpenSpec work or when the user asks to track session memory.

## How to Resolve `{unique_session_id}` in DSH

1. In DSH, the current session identifier is exposed to PowerShell via the `$env:DSH_SESSION_ID` environment variable (for example, `session-6c9b6eb5-7079-4312-a195-80360f1f9d9c`).
2. Read it once with the `pwsh` tool:
   ```powershell
   $env:DSH_SESSION_ID
   ```
3. Store the session memory file at:
   ```text
   agents/dsh/memory/{DSH_SESSION_ID}_memory.md
   ```
   Use the built-in `write` and `edit` tools to create and update this file.

## Template

Read and follow the exact section structure in [memory-template.md](/agents/skills/use-memory/memory-template.md):

1. **Initial Command and Goal** - record `<DSH_SESSION_ID>`, the user's initial command, and a 1-2 sentence goal.
2. **Clarifications and Decisions** - record every question asked (`Q: ... -> A: ...`) and key technical decisions.
3. **Progress and Completed Steps** - list completed steps (`[x]`) with modified files and verification results.
4. **Current State and Remaining Work** - state the current status (`in-progress | blocked | ready-for-review | completed`) and remaining steps (`[ ]`).
5. **Next Step for Resuming Agent** - write the exact next action so that this or another agent can continue without asking the user repeated questions.

## Rules

- Always write the memory file in concise, agent-readable English.
- Update the file after receiving user answers to questions, after making key decisions, and after completing each major step.
- Follow [no-fancy-symbols](/agents/rules/no-fancy-symbols.md): use only ASCII punctuation (`-`, `->`, `"`, `'`, `...`).
