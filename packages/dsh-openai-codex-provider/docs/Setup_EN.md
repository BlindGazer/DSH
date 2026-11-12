# Installation and Commands

## Requirements

- DeepSeek Harness `>=0.2.2-rc.1` and compatible host dependencies from `package.json`.
- Node.js `>=22.19.0` for CLI installation.
- A ChatGPT account with Codex access and device-code sign-in support.

Use only one implementation of the `openai-codex` route. Registering another provider for this route at the same time, including the built-in DSH implementation, may cause a conflict and prevent plugin activation.

## Install or update

For the Web profile run:

```sh
dsh plugin --profile web add @kalex/dsh-openai-codex-provider
```

Restart DSH after an update if the installed version requires it. For a separate desktop profile, use the plugin manager or CLI shipped with this app version.

## Build from source

```sh
# Build the plugin (Host + Client)
pnpm run build

# Build only the client part
pnpm run build:client

# Build only the host part
pnpm run build:host

# Build the remote part
pnpm run build:remote

# Run unit tests
pnpm run test

# Verify plugin artifacts
pnpm run verify

# Full check: build + tests + verify
pnpm run check
```

## Removal

First sign out of the account in the OpenAI Codex settings to remove local credentials, then remove the package from the Web profile:

```sh
dsh plugin --profile web remove @kalex/dsh-openai-codex-provider
```

For a desktop profile, remove it via the corresponding manager or app CLI. Removing from Web does not remove a separate desktop copy.
