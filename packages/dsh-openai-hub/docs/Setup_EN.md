# Installation and verification

Requires DSH `>=0.2.2-rc.5`, Node.js `>=22.19.0` for CLI installation, and a ChatGPT account with Codex access.

## From GitHub

In DSH Desktop, open the plugin manager and add `github:BlindGazer/DSH#path:packages/dsh-openai-hub`. For a separate CLI profile (for example, `web`):

```powershell
dsh plugin --profile web add github:BlindGazer/DSH#path:packages/dsh-openai-hub
```

## From a local checkout

Run from the repository root:

```powershell
pnpm install
pnpm --filter @kalex/dsh-openai-hub build
dsh plugin --profile web add C:/git/DSH/packages/dsh-openai-hub
```

For Desktop, select the built local package in the plugin manager instead of running the last command. Restart DSH if required after installation.

## Switching from the legacy OpenAI Codex plugin

Back up any profile settings you need, sign out of the old plugin, and remove it from the profile. Install OpenAI Hub and sign in again. Credentials and settings are not guaranteed to migrate. Installing or removing a plugin in one profile does not change another profile.

## Manual checks

1. In model settings, add two accounts with different labels. In the `OpenAI Hub` group, check that models appear as `<label>/<model ID>` and that each account card opens its own model list.
2. Refresh the catalog. If refresh fails, the previous catalog remains available; before the first successful fetch, the local catalog is used.
3. Enable automatic quota refresh for one account. Check that the chat status shows the quota for the account of the selected OpenAI Hub model.
4. After renaming a label, select the model again. Remove one account and check that the other account's catalog remains available. Remove the last account and check that the add-account prompt returns.

Use DSH manually to verify real sign-in. Automated tests do not require real tokens.

## Package commands

From the package directory, `pnpm run build` builds the plugin; `pnpm run build:host`, `pnpm run build:client`, and `pnpm run build:remote` build its parts separately. `pnpm run test` runs tests and `pnpm run verify` checks artifacts. `pnpm run check` builds, tests, and verifies artifacts.
