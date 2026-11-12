# Security

## Credential encryption

Proxy username and password are encrypted with AES-256-GCM using a 256-bit master key. Each encryption uses a unique initialization vector (12 bytes).

## Master key

The master key is generated automatically on first use and stored at `%LOCALAPPDATA%\kalex-dsh-proxy-provider\master.key` with `0600` permissions.

## Credentials are not exposed

The client interface receives only sanitized data: a username mask and a flag indicating whether a password is set. Plain passwords are never sent to client state or logs.

## Ignoring SSL errors

The `ignoreSslErrors` option disables certificate verification for the proxy. Use it deliberately: it reduces TLS connection security.
