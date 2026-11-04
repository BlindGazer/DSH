---
name: commit
description: Commit changes to git using the standard one-line message format "{номер задачи} Краткое описание в одну строку". Use when completing a task item or when asked to commit.
---

# Git Commit Format

Use this skill when committing changes to git (either on explicit user request or immediately after completing, verifying, and checking off `- [x]` a task item in OpenSpec `tasks.md`).

## Message Format

Write a single-line commit message in the format:

```text
{changes number} {task number} Short description in one line
```

- `{changes number}` - change identifier (for example, `dpp-1`, `dar-1`).
- `{task number}` - task (for example, `dpp-1 1.1`, `dar-1 2.1`, or the task code provided by the user).
- `Short description in one line` - concise summary of what was changed, in English, on a short single line (for example, `dpp-1 1.1 model provider layout changed`).

## Rules

- Stage only the files belonging to the completed task or requested change (`git status --short` before committing).
- Never stage or commit secrets, keys, tokens, or `**/appsettings.Development.json`.
- Do not bypass git hooks (`--no-verify` is forbidden) and do not `push`, `amend`, or `force push` unless the user explicitly asked for it.
- Follow [no-fancy-symbols](/agents/rules/no-fancy-symbols.md) in commit messages (use `-`, `->`, `"`, `'`, `...`).
