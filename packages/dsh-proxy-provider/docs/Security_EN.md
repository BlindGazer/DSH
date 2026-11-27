# Security

The saved proxy configuration encrypts usernames and passwords with AES-256-GCM. Each encryption uses a random 12-byte initialization vector. The key is stored in `%LOCALAPPDATA%/kalex-dsh-proxy-provider/master.key`; if `LOCALAPPDATA` is unset, the plugin uses `AppData/Local` under the home directory. Do not share the key with the configuration.

The client settings snapshot contains a masked username and a flag indicating whether credentials exist, not their original values. To transfer credentials, export them with a separate password; a regular export omits them.

`ignoreSslErrors` disables certificate validation for HTTPS servers reached through the profile and, for HTTPS proxies, for the proxy itself. Leave it off to keep TLS certificate validation enabled.
