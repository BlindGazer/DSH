# Features

## Routing

In DSH settings, select a proxy profile for a detected model provider or leave it on a direct connection. The plugin maps the provider's hostnames to the selected profile and routes requests to them through an undici dispatcher. Requests to hosts without a proxy assignment go directly.

The plugin looks for a host-and-port route first, then a hostname route. If providers use the same destination address with different settings, the plugin reports a conflict and uses the first assigned profile. That route also applies to a provider set to connect directly to the same address.

## Profiles and connection tests

A profile has a name, protocol (HTTP, HTTPS, or SOCKS5), host, port, and optional username and password. Leave `ignoreSslErrors` off unless needed; see [Security](Security_EN.md). A connection test sends a request to a test URL through the selected profile and reports the latency.

Credentials are omitted from exports by default. To transfer them, select the option to include credentials and set an encryption password. When importing that file, enter the password or skip credentials.

## Stack and structure

- `src/shared/`: TypeScript models, constants, helpers, and localization. The interface follows the DSH language.
- `src/host/`: Cordis plugin, undici routing, storage, and connection tests.
- `src/client/`: React UI for profiles and bindings. Vite builds the package and Vitest runs the tests.
