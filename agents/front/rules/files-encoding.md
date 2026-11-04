---
description: "Do not edit files with `sed -i` in Git Bash: it converts CRLF to LF; use the Edit tool"
---

Do not edit files with `sed -i` (Git Bash) in the ORD repo; it silently converts CRLF working-copy files to LF, and git then warns "LF will be replaced by CRLF". Also `grep -c $'\r$'` in Git Bash is unreliable for checking line endings — use `git ls-files --eol`.

**Why:** working copy uses CRLF (`.editorconfig` end_of_line = crlf, autocrlf=true); user noticed mixed LF/CRLF after my sed edits.

**How to apply:** use the Edit/Write tools for code edits; verify endings with `git ls-files --eol -- <files>` after bulk edits.
