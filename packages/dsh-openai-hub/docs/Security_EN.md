# Security

## Account credentials

- OAuth tokens and the full account identifier are stored only in DSH Credential Store. Plugin configuration stores non-secret account settings, including labels, auth method, model preferences, and quota-refresh preference.
- Credential references are derived from the auth method and a short hash. The OpenSpec logical form is `openai-hub-<authMethod>-<8-hex-hash(accountId)>`; the SDK-compatible internal key uses underscores, e.g. `openai_hub_device_code_<8hex>` or `openai_hub_browser_oauth_<8hex>`.
- The Client receives a state snapshot, not tokens or full account IDs. Do not put credential material or full account IDs in model IDs, logs, errors, configuration, or user-visible diagnostics.
- Account login, refresh, and deletion must not allow stale operations to restore removed credentials or account state.
- OAuth confirmation links must be validated before opening; unexpected URLs and raw exception details must not be exposed to the user or agent tools.
- Automated tests use synthetic credentials and OAuth/network replacements. Real authorization is a manual user acceptance step.

## Catalog and quota data

- Catalog and quota requests use the account's protected credential. Error reporting must not include authorization headers, tokens, full account IDs, or raw credential-bearing responses.
- A catalog failure retains the last successful catalog; before the first success, the local `pi-ai` catalog is used with a visible refresh error.
- Missing or unavailable usage fields are not equivalent to zero.

## Network routing

- OpenAI Hub uses DSH's configured network route. It does not provide a proxy mode selector, modify global `fetch`, or own a proxy transport. Avoid claims that it reads system proxy settings.
