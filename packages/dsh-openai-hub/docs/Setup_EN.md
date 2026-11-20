# Installation and Acceptance

## Requirements

- DeepSeek Harness `>=0.2.2-rc.1` with host dependencies compatible with this package.
- Node.js `>=22.19.0` for CLI installation.
- A ChatGPT account with Codex access and a supported OAuth method.

The plugin registers exactly one LLM provider route, `openai-hub`, with provider group `OpenAI Hub`. Keep that route unique. The Remote service key is also `openai-hub` and its namespace is `openaiHub`; these are not additional provider routes.

## Install or update

For the Web profile:

```sh
dsh plugin --profile web add @kalex/dsh-openai-hub
```

Until the renamed package is published to your registry, install its built local directory from the repository root:

```powershell
dsh plugin --profile desktop add ./packages/dsh-openai-hub
```

Restart DSH if required by the installed version. Manage a separate desktop profile through its corresponding plugin manager or application CLI.

## Legacy reinstall procedure

The legacy package/configuration is not guaranteed to migrate automatically. To install the renamed package safely:

1. Back up any profile configuration you need.
2. Sign out of and uninstall the legacy OpenAI Codex plugin using its exact package identifier in the profile where it is installed.
3. Install the new package:

   ```sh
   dsh plugin --profile web add @kalex/dsh-openai-hub
   ```
4. Restart DSH if needed, open Settings -> Models, choose a unique lowercase label for each account, and sign in again.
5. Verify the catalog and quota behavior with the checklist below. Do not assume old credentials or account settings were migrated.

To remove this package from the Web profile:

```sh
dsh plugin --profile web remove @kalex/dsh-openai-hub
```

Remove a desktop installation separately through its own manager/CLI. Removing the Web profile copy does not remove a desktop copy.

## Manual acceptance checklist

- [ ] Only the `openai-hub` provider route is registered; its group is `OpenAI Hub`.
- [ ] Add two accounts with distinct lowercase ASCII labels before OAuth; both account blocks appear, each with its own model modal.
- [ ] Each model appears as `<label>/<upstreamModelId>` and chat requests use the upstream ID; renaming a label rebuilds public IDs without changing credential identity.
- [ ] Refresh the catalog. If the API is unavailable, a last successful catalog remains usable; before the first success, the local catalog is shown with an error state.
- [ ] Per-account automatic quota refresh is off for new accounts. When enabled it polls every five minutes, or every minute for a selected model with a nearest applicable remaining quota below 25%; quota window priority is hourly, five-hour, then daily.
- [ ] Hiding the DSH page pauses polling; returning to it causes one relevant refresh. Chat status shows only the selected OpenAI Hub model's account quota.
- [ ] Remove one account and confirm the other account is unchanged and existing history is not rewritten. Remove the last account and confirm the initial add-account state is restored.
- [ ] Confirm credentials and full account IDs do not appear in UI, configuration, logs, errors, or client snapshots.
- [ ] In light and dark themes, verify visible card backgrounds for every OpenAI Hub modal (models, deletion/reset confirmations) and workspace-manager (`addir-modal`). Refresh the existing DSH page after rebuilding artifacts.
- [ ] Complete Browser OAuth through its local callback on the DSH machine, or use device code for remote/headless Hosts. Never use real credentials in automated tests.

Real-account acceptance is a user action. Automated tests should use synthetic OAuth/network data only.

## Build from source

```sh
pnpm run build
pnpm run build:client
pnpm run build:host
pnpm run build:remote
pnpm run test
pnpm run verify
pnpm run check
```
