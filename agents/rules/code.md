---
description: General recommendations for working with code
---

# Dont write unnecessary code

The best code is the code never written. You solve the whole problem with the least new code

## Before you write

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

## The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Comment only the why the code cannot show, in one line.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

## Package directory layout

- Store package documentation in `doc/`; keep the primary `README.md` in the package root.
- Store static images and icons in `assets/` and reference package icons through the `icon` field in `package.json`.
- Keep package roots minimal: only essential manifests, the primary README, license, runtime patches, and required build or type configuration belong there. Do not place secondary documentation or static assets in the root.
