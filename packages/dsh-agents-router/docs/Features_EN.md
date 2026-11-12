# Features and Architecture

## What the plugin does

`@kalex/dsh-agents-router` is a DeepSeek Harness plugin that manages loading project instructions into the agent context. Instead of loading all project rules at once, it selects only those relevant to the current task.

The plugin solves two problems:

1. **Context window bloat**: an agent working on back-end code should not read front-end rules, and vice versa.
2. **Forgetfulness**: an agent working with OpenSpec files should automatically get the rules for them.

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

The plugin estimates the instruction volume in tokens and enforces a soft budget (`tokenBudget`, default 16000). Metrics are shown in the router panel and in the "Memory" tab.

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

- `locale` - locale (`auto`, `ru`, `en`).
- `theme` - theme (`auto`, `dark`, `light`).
- `pollingIntervalMs` - polling interval (2000, 3000, 5000, 10000).
- `globalLogging` - global logging.

## Tech stack

- **TypeScript >= 7.0.2** with strict typing (no `any`, `unknown`, or `null`).
- **React 19.3** + **React Compiler** (Vite 8 + Oxc).
- **Vite 8.3.5** (`minify: 'oxc'`).
- **Vitest 3.2.0** for tests.
- **Biome** and **Oxlint** for linting and formatting.
- **Cordis** (`@deepseek-ai/cordis`) - the DSH plugin environment.
- **YAML** - parses frontmatter and area configuration.

## Architecture

Three-layer modular architecture:

- `src/shared/` - models, constants, validators, localization (no Node.js or React).
- `src/host/` - server logic: rule discovery, selection, isolation, `/agents-router` API.
- `src/client/` - React UI: settings, router panel, diagnostics, catalog, memory.

Dependencies flow only `shared -> host/client`. `host` never imports `client` or React.
