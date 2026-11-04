# `@kalex/dsh-agents-router` - Project-Aware Rules and Skills Router for DeepSeek Harness

> Документация на русском языке: [README.md](<README.md>)

A V1 plugin for **DeepSeek Harness (DSH)** that routes project rules based on active workset paths and registers project skills through the native DSH Skills API. The plugin does not run a separate agent loop and never writes state into your project repository or the DSH installation directory.

> Target runtime: DSH `0.2.2-rc.1` and newer.
>
> Requirements updated on 2026-11-02: strict Agent Skills format, standard metadata, Claude-style `paths`, directory matching without a trailing `/` in `path`, and local link warnings. The normative specification is in [docs/AGENTS-ROUTER-REQUIREMENTS.md](<docs/AGENTS-ROUTER-REQUIREMENTS.md>). In V1, `allowed-tools` is preserved as metadata only without altering DSH permissions.

---

## Scenario 1. Local Installation from Source into DSH Desktop

Use this scenario when developing or installing the plugin directly from a local source folder.

### 1. Build and Test the Plugin

Navigate to your local `<path-to-dsh-agents-router>` directory and run:

```powershell
cd "<path-to-dsh-agents-router>"
pnpm install --registry=https://registry.npmjs.org
pnpm run build
pnpm test
```

> Important: `pnpm run build` is required before loading the plugin in DSH because it compiles `src/client/index.jsx` into `lib/client.js` via `esbuild` (`lib/` is ignored by `.gitignore`).

### 2. Install into the DSH Desktop Profile

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-dsh-agents-router>"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-dsh-agents-router>"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/dsh-agents-router"
```

### 3. Enable the Plugin in DSH

1. Open **DeepSeek Harness Desktop**.
2. Open the **Plugins** tab (in the left sidebar `Plugins`, not inside `Settings`).
3. In the **Plugins** view, click the refresh icon in the top-right corner next to the **Add Plugin** button (if the plugin is not yet listed).
4. Under **Installed plugins**, find `@kalex/dsh-agents-router` and enable the plugin.
5. Open any chat session - you will see the **`Agents Router`** tab in the conversation view header.

---

## Scenario 2. Building a Release Package, Publishing to GitHub, and Installing

Use this scenario to build a self-contained `.tgz` package locally, publish a versioned release on GitHub, and install the plugin on any machine.

### 1. Build a `.tgz` Package Locally

From the `<path-to-dsh-agents-router>` root directory, run:

```powershell
cd "<path-to-dsh-agents-router>"

# Compile lib/client.js and create kalex-dsh-agents-router-<version>.tgz
pnpm run build
pnpm pack
```

This generates `kalex-dsh-agents-router-1.0.0.tgz` in the project root (containing `src/`, compiled `lib/client.js`, `cordis.patch.yml`, and `package.json`).

### 2. Publish a Version to GitHub

```powershell
cd "<path-to-dsh-agents-router>"

# 1. Optionally bump the version in package.json (e.g. 1.0.0 -> 1.0.1)
pnpm version patch --no-git-tag-version

# 2. Rebuild the client bundle and create the release .tgz archive
pnpm run build
pnpm pack

# 3. Commit, tag the release, and push to GitHub
git add .
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main --tags
```

If you have the GitHub CLI (`gh`) installed, you can publish a GitHub Release with the `.tgz` asset in one command:

```powershell
gh release create v1.0.0 ./kalex-dsh-agents-router-1.0.0.tgz --title "v1.0.0" --notes "Release v1.0.0"
```

*(Alternatively, upload `kalex-dsh-agents-router-1.0.0.tgz` manually via **Releases -> Draft a new release** in your GitHub repository).*

### 3. Install into DSH from a Downloaded Release or GitHub

#### Option A: Install from a Downloaded `.tgz` Archive (Recommended for Corporate Networks)

Download `kalex-dsh-agents-router-1.0.0.tgz` from your GitHub repository's **Releases** page and run:

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-agents-router-1.0.0.tgz"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-agents-router-1.0.0.tgz"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/downloads/kalex-dsh-agents-router-1.0.0.tgz"
```

#### Option B: Install Directly from GitHub by Release Tag

If `lib/` is committed in the repository (or `prepack` is configured), you can install a specific version directly from GitHub:

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "github:<github-owner>/dsh-agents-router#v1.0.0"
```

After installation, follow the steps in section `3. Enable the Plugin in DSH`.

---

## Project Binding and Settings

The project root is bound from `agent.session.header.cwd` when a session is created. Switching projects within the same session is not supported - open a new session with the desired project root. The bound root is displayed in the **Agents Router** conversation tab.

Settings are stored per canonical project root and can be configured in the **Agents Router** tab:

| Setting | Default Value |
| --- | --- |
| Instructions root (relative to project) | `agents` |
| Rules folder | `rules` |
| Skills folder | `skills` |
| Main rules file | `agents.md` |
| Soft budget | 16,000 tokens |

Rules and skills are read from the configured project folders; settings JSON, session worksets, and diagnostic logs are stored outside the project under `$DSH_HOME/agents-router/`. The plugin never creates or modifies files inside your project. Area configuration is read from `{instructionsRoot}/dsh/agents-router.json` (for example, `agents/dsh/agents-router.json`).

### Example `agents/dsh/agents-router.json`

```json
{
  "areas": {
    "front": {
      "path": "src/front/",
      "keywords": ["front", "react"]
    },
    "front/admin": {
      "path": "src/front/admin/"
    },
    "back": {
      "path": ["src/api/", "src/core/"],
      "enabled": false
    }
  }
}
```

Areas are declared explicitly; every parent segment must also be declared. `keywords` are search hints and do not activate rules. `path` accepts a string or an array of strings (OR), a folder with a trailing `/`, an exact path, and basic `*`, `?`, `**` globs; matching is case-insensitive and relative to the project root.

### Rules

`agents.md` is the main rule file for its corresponding scope (global or area). All Markdown files in `{rulesFolder}` are discovered recursively. Frontmatter is optional; supported fields are `path`, `paths` (alias of `path`), `description`, and `enabled`. Links to other rules remain plain text and are not traversed recursively; rules matching multiple active paths are injected once.

```md
---
path: ["*.ts", "*.tsx"]
description: TypeScript changes
enabled: true
---
Preserve public interfaces and add tests for behavioral changes.
```

Global rules without `path` are always active for the project session; filtered and area rules are activated by the session workset. Child areas inherit parent area rules. Diagnosing a path does not add it to the workset.

### Skills

Format: `{skillsFolder}/<skill-folder>/SKILL.md` in the instructions root or any enabled area. Skills are registered through the native DSH Skills API; the full skill body is loaded only when invoked. Command names derive from the folder name: `/review`, `/front-review`, `/front-admin-review`. A non-empty `description` is required; standard DSH fields (`name`, `whenToUse`, `metadata`, `disable-model-invocation`, `user-invocable`, `enabled`) are supported. Conflicts with built-in/other skills or duplicate names disable the conflicting skill with a diagnostic warning instead of auto-renaming.

## Usage

1. Open a new DSH session rooted at your project directory.
2. In the **Agents Router** conversation tab, verify the bound project root and settings; save custom settings before working with project files if needed.
3. Use **Add / Release** to manage workset paths manually. Built-in file read/write tools add accessed project paths automatically before execution; `glob` and `grep` search results do not bulk-populate the workset.
4. Click **Inspect** to diagnose which rules apply to a path without modifying the workset. Click **Refresh** to rescan project rules and update the native Skills catalog.
5. **Reset workset** is available only when the agent is truly idle (no running step or queued messages). It clears active paths and recalculates instructions without erasing chat history or rolling back files.

Before running opaque terminal commands or scripts, the agent can declare target paths via the `agents_router_paths(paths)` tool.

## Coverage Matrix

| Tool | Path Extraction | V1 Behavior / Boundaries |
| --- | --- | --- |
| `read`, `read_image` | `file_path` | Single path; all known file calls in an assistant batch are preflighted before execution |
| `write` | `file_path` | Single target path, including new files |
| `edit` | `file_path` | Single target path |
| `str_replace_editor` | `path` | Single path for supported editor commands |
| `glob`, `grep` | none | Search only; matched files are not added to the workset automatically |
| Terminal, scripts, other tools | no universal parser | Advisory path declarations via `agents_router_paths(paths)` only |

## Diagnostics, History, and Token Budget

The tab displays rule selection reasons, discovery diagnostics, areas, skills, tool coverage, and character/token metrics. Token estimation uses a rough script-aware character heuristic rather than a provider-specific tokenizer; exceeding the soft budget displays a warning without blocking requests.

## Development and Build

Requires Node.js `>=18` and pnpm `11.28.5` (pinned in `package.json`). From the repository root:

```powershell
pnpm install --registry=https://registry.npmjs.org
pnpm test
pnpm build
```

`pnpm test` runs the test suite in a single process. `pnpm build` bundles the browser client into `lib/client.js` using esbuild. The server entry is `src/index.js` (registered via [`cordis.patch.yml`](<cordis.patch.yml>)), and the Web UI entry is exported as `./client`.

Demo project: [`examples/demo-project/README.md`](<examples/demo-project/README.md>). V1/V2 requirements: [`docs/AGENTS-ROUTER-REQUIREMENTS.md`](<docs/AGENTS-ROUTER-REQUIREMENTS.md>).
