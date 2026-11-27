# Features

## Linked directories

Open the directory editor from the workspace menu. For each directory, enter an absolute path on the DSH Host, an alias, and an optional description. Enable read-only access if needed.

Access checks use canonical paths, including symbolic link targets. The plugin rejects writes through DSH file tools to a directory marked as read-only. This setting does not change filesystem permissions.

## Git worktrees

Choose **New worktree session** from the `...` menu. You can create a branch from a local or remote-tracking branch, use a free local branch or create one tracking an origin branch with no local counterpart, or select an existing worktree from the same repository. The original session stays unchanged, and uncommitted changes are not copied.

By default, the plugin creates worktrees under `.worktrees` in the workspace directory. You can change the base path. When creating a worktree in the default location, the plugin adds `/.worktrees/` to `.gitignore` if Git does not already ignore that directory.

**Delete worktree** is available in the main workspace menu when additional worktrees exist. Select a worktree by branch and path. You can also request a branch merge and deletion in the dialog. Archiving a session does not remove its worktree. Move important ignored files elsewhere before deletion: they do not block removal and may be lost.

## VS Code

If **Open in VS Code** is enabled in the plugin settings, the action is available in the workspace menu. VS Code opens on the DSH Host, so install it on that machine.

## Stack and structure

- `src/shared/`: TypeScript models and constants.
- `src/host/`: Cordis plugin, directory management, path checks, and Git operations.
- `src/client/`: React menus and dialogs. Vite builds the package and Vitest runs the tests.
