# Features

## What the plugin does

Routes network requests of selected DSH model providers through configured proxy servers. Other providers work directly.

## Why it is needed

Helps work around network restrictions and API blocks for individual providers (OpenAI, Anthropic, DeepSeek, OpenRouter, and others). Lets you use different proxies for different providers.

## How it works

1. Discovers DSH model providers and their hosts.
2. Compiles a routing table: maps provider hosts to proxy profiles.
3. Replaces the undici dispatcher for proxied hosts; other requests go direct.
4. Detects domain conflicts between providers.

## Supported protocols

- HTTP
- HTTPS
- SOCKS5

## Proxy profiles

A profile describes a proxy server: `id`, name, protocol, host, port, authentication (username and password), and the `ignoreSslErrors` flag.

## Provider bindings

For each provider you can select a proxy profile or direct connection.

## Credential encryption

Username and password are encrypted with AES-256-GCM using a local master key (see [Security](Security_EN.md)).

## Connection test

Lets you check proxy availability and measure latency against a test URL.

## Import and export profiles

Profiles can be imported and exported; passwords are encrypted.

## Tech Stack

| Technology | Version / features     |
| ---------- | ---------------------- |
| TypeScript | >= 7.0.2, strict typing |
| React      | 19                     |
| undici     | 8.12.3, networking     |
| Vite (Oxc) | 8.3.5                  |
| Vitest     | 3.2.0                  |
| Cordis     | DSH plugin environment |

## Architecture

Three-layer modular:

1. `src/shared/` - models, constants, validators, localization (no Node.js or React).
2. `src/host/` - routing, encryption, dispatcher, storage, and connection-test services.
3. `src/client/` - profiles and provider-binding UI.
