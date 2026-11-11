---
description: Do not edit files with sed -i in Git Bash: it converts CRLF to LF; use the Edit tool
paths:
  - "**/*.js"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.scss"
---

Do not edit files with `sed -i` (Git Bash) in the ORD repo; it silently converts CRLF working-copy files to LF, and git then warns "LF will be replaced by CRLF".

**Why:** working copy uses CRLF (`.editorconfig` end_of_line = crlf, autocrlf=true); user noticed mixed LF/CRLF after sed edits.

**How to apply:** use the Edit/Write tools for code edits; verify endings with `git ls-files --eol -- <files>` after bulk edits.
