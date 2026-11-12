# Examples in DSH

The plugin does not ship screenshots, so examples are described as text.

## Model settings

Open the DSH model settings and select OpenAI Codex. A sign-in interface, a sign-in button, and a selector of available models appear.

## Sign in

1. Press the sign-in button in the OpenAI Codex settings.
2. Follow the shown verification link.
3. Enter the device code and finish the ChatGPT authorization.

After sign-in, the settings show the available models and data about usage, limits, reset time, credits, and reset cards.

## Network route

The settings allow choosing the `host` route (DSH network route) or `system` (manual Windows system HTTP/HTTPS proxies). Changing the route applies to subsequent requests.

## Agent commands

The agent can call `codex_login`, `codex_status`, and `codex_logout` to manage sign-in from the AI chat.
