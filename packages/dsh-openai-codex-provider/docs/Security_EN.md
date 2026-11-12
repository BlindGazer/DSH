# Security

## OAuth and credentials

- The host stores the ChatGPT account JSON in the local Credential Store reference `PI_OAUTH_OPENAI_CODEX`. This preserves the sign-in of existing installations.
- Sign-in, refresh, and sign-out use one change queue. Sign-out invalidates an in-progress sign-in and pending state snapshots, then removes the reference; a stale operation must not restore the account.
- The client receives only a state snapshot. The access token, refresh token, and account identifier fields are not part of the Typed Remote contract.
- The OAuth confirmation link is accepted only over HTTPS with the `auth.openai.com` host. Unexpected URLs and exception details are not passed to the user or the agent tool.
- Tests use fake credentials and OAuth/DSH service replacements. Real authorization is not run.

## Network routes

- The DSH mode uses the network function provided by the platform. The system proxy mode reads the current user's manual HTTP/HTTPS WinINET settings.
- PAC, auto-detection, SOCKS, non-HTTPS proxies, and invalid values are rejected. On error the request fails, and a direct connection is not used as a fallback route.
- Each request and OAuth operation holds a lease on the selected route. After switching, the old transport is closed only after all operations started through it finish.
- The plugin does not change the global `fetch` or process network settings. Logins and passwords found in the proxy value are rejected and do not enter the state snapshot.

## Reset cards

- Applying a card requires confirmation, a valid card identifier, and a UUID v4 idempotency key.
- Before sending a spending request, the host re-checks the selected card availability. The server sends the same key and card identifier on a manual retry of an unknown result.
- The plugin does not create a new request automatically after an unknown result. Do not repeat the action with a new key until the previous request state is known.
- The available card identifier and its expiry enter the client snapshot for user selection. OAuth data and the idempotency key do not enter the snapshot.
