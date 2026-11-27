# Features

## Accounts and sign-in

Add an account in Settings -> Models. Before starting OAuth, enter a unique label of 1 to 32 characters. Start with a lowercase ASCII letter and use only lowercase ASCII letters, digits, or hyphens for the remaining characters. The label can be changed on the account card. Browser OAuth and device-code sign-in are available. If the browser sign-in dialog asks for a callback URL, paste the full redirected URL into that dialog only.

## Combined model catalog

OpenAI Hub registers a single static provider route, `openai-hub`, grouped as `OpenAI Hub`. After login and on manual refresh, the plugin loads the authenticated API catalog and combines models from all configured accounts. Model IDs/names use `<accountLabel>/<upstreamModelId>`. A request uses the matching account's credentials and sends the original model ID to the API. If catalog loading fails, the last successful catalog is retained; until the first success the bundled local `pi-ai` catalog is used and the refresh error is shown.

Each account has its own information block and model modal. Renaming a label rebuilds that account's public model IDs; old history references are stale and history is not rewritten.

## Quota display and refresh

Quota is shown for the selected OpenAI Hub model/account only, and hidden for another provider or stale selection. Automatic quota refresh is persisted separately per account and disabled by default. When enabled, polling normally runs every five minutes. For the account/model selected in chat, polling runs every minute if the nearest applicable remaining quota is below 25%. Applicable window priority is hourly, then five-hour, then daily. Polling pauses while the DSH page is hidden and runs once when it becomes visible again.

## Account removal

Removing an account clears its own Credential Store record, configuration, and models without rewriting conversation history. Removing the last account returns to the initial add-account state.

## Network and structure

The plugin uses DSH's network route and does not configure a proxy itself.

- `src/shared/`: TypeScript account models, Host communication schemas, and localization.
- `src/host/`: Cordis plugin, OAuth, model catalog, quotas, and pi-ai adapter.
- `src/client/`: React settings and quota indicator. Vite builds the package and Vitest runs the tests.

See the [workflow](Workflow.md) and [manual checks](Setup_EN.md).
