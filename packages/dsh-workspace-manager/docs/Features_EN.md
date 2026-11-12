# Features

## What the plugin does

Links multiple directories from different locations to a DSH workspace. Each directory gets an alias and description, and access can be restricted to read-only.

## Why it is needed

Lets you work with a project whose files are spread across several folders in one workspace. Helps distinguish directories by clear aliases and protects them from accidental modification.

## How it works

1. A directory is added through the workspace menu (the `...` button in the sidebar).
2. In the editor you set the path, alias, description, and the read-only flag.
3. The plugin registers the directories in the DSH workspace context.
4. Read-only directories are protected from writes.

## Directory fields

- `path` - absolute path to the directory.
- `alias` - short alias for display.
- `description` - optional description.
- `readOnly` - restrict access to read-only.

## Path checks and security

Canonical paths (`realpath`) are validated against directory traversal and symlink escapes to prevent access to unrelated files.

## Tech Stack

| Technology | Version / features     |
| ---------- | ---------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                     |
| Vite (Oxc) | 8.3.5                  |
| Vitest     | 3.2.0                  |
| Cordis     | DSH plugin environment |

## Architecture

Three-layer modular:

1. `src/shared/` - models and constants.
2. `src/host/` - directory service, access guard, path utilities.
3. `src/client/` - workspace menu and directory editor.
