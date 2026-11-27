# Features and Architecture

## What the plugin does

The DeepSeek Harness plugin loads project instructions according to configured rules. For example, you can assign React rules to `src/front/` and OpenSpec rules to `openspec/`.

## How it works

1. When an agent is created, the plugin binds the session to the project root (`cwd`).
2. It scans the project and discovers rules (`.md`) and skills (`SKILL.md`) in responsibility areas.
3. It resolves areas from `agents/dsh/agents-router.json` (paths and keywords).
4. Based on the active files and the session's working set, it selects relevant rules and skills.
5. It loads them into the agent's system prompt as separate contexts (`areas` and `rules`).

## Responsibility areas

Areas are defined in `agents/dsh/agents-router.json`. Each area has paths and keywords:

```json
{
  "areas": {
    "front": {
      "path": "src/front/",
      "keywords": ["front", "javascript", "react"]
    },
    "front/admin": {
      "path": "src/front/admin/"
    },
    "back": {
      "path": ["src/api/", "src/core/"],
      "enabled": true
    }
  }
}
```

Rules and skills of an area activate when the agent works with files under the given paths or mentions the keywords in the task. Areas can be nested (`front` and `front/admin`).

## Rule activation modes

- `always` - the rule always applies.
- `glob` - the rule applies by a glob pattern from the frontmatter (`glob`, `globs`, `path`, `paths`, `alwaysApply`).
- `agent-requested` - the rule is loaded on agent request.
- `manual` - the rule is enabled manually.

## Soft token budget

The plugin estimates instruction size and reports when it exceeds `tokenBudget` (32,000 tokens by default). This budget does not limit which instructions are loaded.

## Instruction isolation

- Redirects root instruction files (`AGENTS.md` and others) into the `agents/` structure.
- Redirects instruction directories (`.cursor`, `.claude`) into `agents/`.

## Diagnostics

- The diagnostics tab shows which rules are active, where they came from, and why.
- For any file, you can run path diagnostics to see which rules apply.

## Audit log

The plugin keeps a log of routing events: session initialization, prompt assembly, working set changes. The log can be viewed and cleared in the UI.

## Project settings

Managed in the plugin settings (Plugins page):

- `instructionsRoot` - instructions root (`agents`).
- `discoveryMode` - discovery mode (`strict`, `fallback`, `merge`).
- `rulesFolder` - rules folder (`rules`).
- `skillsFolder` - skills folder (`skills`).
- `mainFile` - main instruction file (`agents.md`).
- `tokenBudget` - soft token budget.
- `projectLogging` - project logging.
- `redirectRootInstructionFiles` - redirect root instruction files.
- `redirectInstructionDirectories` - redirect instruction directories.
- `logCategories` - log categories (events, workset, rules diff, preflight).

## Global settings

The interface language follows the DSH setting.

- `theme` - theme (`auto`, `dark`, `light`).
- `pollingIntervalMs` - polling interval (2000, 3000, 5000, 10000).
- `globalLogging` - global logging.

## Tech stack

The host runs in Cordis. The interface uses React, builds use Vite, and tests use Vitest. The `yaml` library reads rule metadata.

## Architecture

Three-layer modular architecture:

- `src/shared/` - models, constants, validators, localization (no Node.js or React).
- `src/host/` - server logic: rule discovery, selection, isolation, `/agents-router` API.
- `src/client/` - React UI: settings, router panel, diagnostics, catalog, memory.

Both `host` and `client` use modules from `shared`. The host does not import client code or React.
