# AGENTS

Instructions for AI agents in the DeepSeek Harness (DSH) plugin monorepo.
Packages are located in `packages/dsh-core`, `packages/dsh-agents-router`, `packages/dsh-proxy-provider`, and `packages/dsh-workspace-manager`.

## Rules and skills by area

Global rules are stored in `agents/rules/`; global skills are stored in `agents/skills/`.
Domain rules and skills are automatically loaded by path and keywords through `agents/dsh/agents-router.json`:

- `agents/front/` - client interface (React 19.3, DSH + Google M3 design system, components, hooks, Vitest tests).
- `agents/host/` - plugin server side (Node.js, Cordis, proxy, routing, shared contracts).
- `agents/openspec/` - work with OpenSpec specifications and tasks.

The agent's base role is defined by the active profile and system instructions; no separate ponytail file is used.

## Permanent project boundaries

- Before searching and reading files, account for exclusions in `.agentignore`, if present, and [`.gitignore`](/.gitignore).
- Do not add secrets, keys, tokens, or real connection strings to the repository.
- Perform commit, amend, push, and PR operations only at a person's explicit request (exception: when closing a completed item in OpenSpec `tasks.md`, the agent commits the stage through the [commit](/agents/skills/commit/SKILL.md) skill). Do not bypass hooks or force-push to `main` or `master`.
- Run `pnpm fix` and `pnpm check` for code validation and automatic fixes instead of manual formatting.

## Language and reports

- Follow the rules in [human-communication](/agents/rules/human-communication.md) and [no-fancy-symbols](/agents/rules/no-fancy-symbols.md).
