# `@kalex/dsh-provider-proxy` — Selective Provider Proxy Router for DeepSeek Harness

> Документация на русском языке: [README.md](<README.md>)

A full-stack plugin for **DeepSeek Harness (DSH) Desktop** that lets you create reusable proxy profiles (**HTTP**, **HTTPS** with Basic Auth, and **SOCKS5** with RFC 1928/1929 authentication) and selectively bind them to individual model providers in `Settings -> Models`. Local corporate providers set to `Direct` bypass the proxy automatically.

---

## Features

- **Reusable Proxy Profiles:** supports `HTTP`, `HTTPS` (Basic Auth), and `SOCKS5` (Username/Password Auth), plus an `Ignore SSL / TLS certificate errors` toggle for corporate SSL-inspection environments.
- **Selective Per-Provider Routing:** assign a proxy profile or `Direct (No proxy)` directly on each provider card (`Settings -> Models`) or in the `Proxy settings` routing table.
- **Two-Stage Connection Test (`Test`):** verifies TCP port reachability (5000 ms timeout) followed by an end-to-end HTTP request through the proxy to the target URL with clear `407 Proxy Authentication Required` and TLS diagnostics.
- **Export & Import (`Export` / `Import`):** export and import proxy profiles and provider bindings as JSON (`kalex-provider-proxy-settings.json`). By default, exports contain only proxy settings without credentials; when the **`Include credentials`** checkbox is enabled, the plugin prompts for an encryption password (`scrypt + AES-256-GCM`) so logins and passwords can be safely migrated to another computer.
- **Credential Protection & Plugin Isolation:** proxy credentials are encrypted at rest with `AES-256-GCM` and redacted from HTTP API responses; `globalThis.fetch` and the settings API are guarded against tampering by other plugins or terminal agents.

---

## Scenario 1. Local Installation from Source into DSH Desktop

Use this scenario when developing or installing the plugin directly from a local source folder.

### 1. Build and Test the Plugin

Navigate to your local `<path-to-kalex-dsh-provider-proxy>` directory and run:

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"
pnpm run build
pnpm test
```

### 2. Install into the DSH Desktop Profile

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-kalex-dsh-provider-proxy>"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-kalex-dsh-provider-proxy>"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/kalex-dsh-provider-proxy"
```

### 3. Enable the Plugin in DSH

1. Open **DeepSeek Harness Desktop**.
2. Open the **Plugins** tab (in the left sidebar `Plugins`, not inside `Settings`).
3. In the **Plugins** view, click the refresh icon in the top-right corner next to the **Add Plugin** button (if the plugin is not yet listed).
4. Under **Installed plugins**, find `@kalex/dsh-provider-proxy` and enable the plugin.
5. Open `Signed in to DeepSeek -> Settings -> Models` — you will see proxy controls on each provider card and the **`Proxy settings`** button below `+ Add model provider`.

---

## Scenario 2. Building a Release Package, Publishing to GitHub, and Installing

Use this scenario to build a self-contained `.tgz` package locally, publish a versioned release on GitHub, and install the plugin on any machine.

### 1. Build a `.tgz` Package Locally

From the `<path-to-kalex-dsh-provider-proxy>` root directory, run:

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"

# Compile lib/ artifacts and create kalex-dsh-provider-proxy-<version>.tgz
pnpm run build
pnpm pack
```

This generates `kalex-dsh-provider-proxy-0.1.0.tgz` in the project root (containing `lib/`, `cordis.patch.yml`, and `package.json`).

### 2. Publish a Version to GitHub (not implemented yet)

```powershell
cd "<path-to-kalex-dsh-provider-proxy>"

# 1. Optionally bump the version in package.json (e.g. 0.1.0 -> 0.2.0)
pnpm version patch --no-git-tag-version

# 2. Rebuild artifacts and create the release .tgz archive
pnpm run build
pnpm pack

# 3. Commit, tag the release, and push to GitHub
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin main --tags
```

If you have the GitHub CLI (`gh`) installed, you can publish a GitHub Release with the `.tgz` asset in one command:

```powershell
gh release create v0.1.0 ./kalex-dsh-provider-proxy-0.1.0.tgz --title "v0.1.0" --notes "Release v0.1.0"
```

*(Alternatively, upload `kalex-dsh-provider-proxy-0.1.0.tgz` manually via **Releases -> Draft a new release** in your GitHub repository).*

### 3. Install into DSH from a Downloaded Release or GitHub

#### Option A: Install from a Downloaded `.tgz` Archive (Recommended for Corporate Networks)

Download `kalex-dsh-provider-proxy-0.1.0.tgz` from your GitHub repository's **Releases** page and run:

**Windows (PowerShell):**

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-provider-proxy-0.1.0.tgz"
```

**Windows (CMD):**

```bat
pnpm install -C "%USERPROFILE%\.dsh\profiles\desktop" "<path-to-downloads>\kalex-dsh-provider-proxy-0.1.0.tgz"
```

**macOS / Linux:**

```bash
pnpm install -C "$HOME/.dsh/profiles/desktop" "/path/to/downloads/kalex-dsh-provider-proxy-0.1.0.tgz"
```

#### Option B: Install Directly from GitHub by Release Tag

```powershell
pnpm install -C "$env:USERPROFILE\.dsh\profiles\desktop" "github:<github-owner>/kalex-dsh-provider-proxy#v0.1.0"
```

After installation, follow the steps in section `3. Enable the Plugin in DSH`.

---

## Security Note on Credential Storage (v1)

In v1 (**Variant 1**), proxy `username` and `password` are never stored in plaintext inside `$DSH_HOME/kalex-provider-proxy.json` and are never returned by the HTTP API: the config file stores only an `AES-256-GCM` encrypted `cipher` payload, while the 256-bit key is stored separately at `%LOCALAPPDATA%\kalex-dsh-provider-proxy\master.key`.

**Accepted Residual Risk in v1:** Because `master.key` resides on disk under the current OS user account, a local process or agent running under the same OS user with filesystem read access to both files could theoretically decrypt the credentials. For stricter security in future versions, two stronger alternatives are documented in the specification:
- **Variant 2 (In-Memory Master Password / PIN):** derive the encryption key via `PBKDF2` / `scrypt` from a short master PIN entered once per DSH session and keep the key exclusively in DSH host process RAM (never written to disk).
- **Variant 3 (OS Credential Manager / Process-Bound RAM Storage):** store secrets in OS-level protected storage isolated from child agent processes or keep credentials ephemeral in host RAM.
