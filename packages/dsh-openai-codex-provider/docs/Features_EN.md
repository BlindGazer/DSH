# Features

## Sign in via ChatGPT

1. Open the DSH model settings and select OpenAI Codex.
2. Press the sign-in button and follow the shown verification link.
3. Enter the device code and finish the ChatGPT authorization.

## Models

Select the available models in the DSH selector. In the settings you can change display names, order, and enabled state; at least one model must stay enabled.

## Usage, credits, and reset cards

The settings show available data about usage, limits, reset time, credits, and reset cards. If the service limits a response or part of the data is unavailable, the interface reports it separately instead of replacing a missing value with zero.

Applying a reset card requires separate confirmation and may spend a credit for the whole account. If the result is unknown, repeat only the same operation from the interface. Do not start a new charge with another request until the original result is known. Reset card and reset data depend on an undocumented service interface and may change.

## Network route

Two route modes are available:

- `host` (default): use the DSH network route.
- `system`: use manual Windows system HTTP/HTTPS proxy settings for sign-in, token refresh, usage data, and model requests.

System mode does not support PAC, auto-detection, SOCKS-only, or proxy addresses with a login or password. If a suitable manual HTTPS proxy is unavailable, the request fails instead of falling back to a direct connection. Changing this setting does not control the external OAuth page. Already running requests finish through the original route.

## Agent commands

The agent can call `codex_login`, `codex_status`, and `codex_logout`.

## Origin

The package was moved from the `dsh-openai-codex-auth` project by `gooosie`, original package version `0.6.4`. The new installable package name does not change the required Cordis and storage internal identifiers.

## Tech Stack

| Technology | Version / features     |
| ---------- | ---------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                     |
| undici     | 8.12.3, networking     |
| zod        | 4.x, validation        |
| Vite (Oxc) | 8.3.5                  |
| Vitest     | 3.2.0                  |
| Cordis     | DSH plugin environment |
