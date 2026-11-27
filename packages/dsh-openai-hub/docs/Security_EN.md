# Security

OAuth tokens and full account identifiers are stored in DSH Credential Store, not in plugin settings. Settings contain the label, sign-in method, reference to the stored record, and model and quota-refresh preferences. The client does not receive tokens or full account identifiers.

Paste the OAuth callback URL only into the sign-in dialog if prompted. Do not share that URL or tokens in chat, logs, or error reports. Catalog and quota requests use the relevant account credentials on the Host.

The plugin uses DSH's network route. It does not provide a proxy switch or change global `fetch`.
