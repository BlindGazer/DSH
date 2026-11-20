# Features

## Accounts and sign-in

Add an account in Settings -> Models. Enter its unique lowercase ASCII label before starting OAuth, then complete the supported ChatGPT sign-in flow. The label can be changed in that account's information block.

## Combined model catalog

OpenAI Hub registers a single static provider route, `openai-hub`, grouped as `OpenAI Hub`. After login and on manual refresh, the plugin loads the authenticated API catalog and combines models from all configured accounts. Model IDs/names use `<accountLabel>/<upstreamModelId>`. Requests resolve the account credential and send the original upstream model ID. If catalog loading fails, the last successful catalog is retained; until the first success the bundled local `pi-ai` catalog is used and the refresh error is shown.

Each account has its own information block and model modal. Renaming a label rebuilds that account's public model IDs; old history references are stale and history is not rewritten.

## Quota display and refresh

Quota is shown for the selected OpenAI Hub model/account only, and hidden for another provider or stale selection. Automatic quota refresh is persisted separately per account and disabled by default. When enabled, polling normally runs every five minutes. For the account/model selected in chat, polling runs every minute if the nearest applicable remaining quota is below 25%. Applicable window priority is hourly, then five-hour, then daily. Polling pauses while the DSH page is hidden and runs once when it becomes visible again.

## Account removal

Removing an account clears its own Credential Store record, configuration, and models without rewriting conversation history. Removing the last account returns to the initial add-account state.

## Network and limitations

Networking uses DSH's configured route. The plugin has no proxy-mode selector or plugin-owned proxy mechanism. Automated verification uses synthetic OAuth/network data; complete real-account acceptance manually using [Setup](Setup_EN.md).
