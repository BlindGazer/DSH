# AGENTS

Repository convetions for AI agents demonstration project.

## skills and rules

The only location for storing rules is `.cursor/rules/`, and for skills is `.cursor/skills/`.
Rules and skills are mandatory for all agents.

- Rules: All `.cursor/rules/*.mdc` and `.cursor/rules/*.md` files are rules; both extensions have equal priority. If a tool has loaded a rule automatically, do not read it again.
  - Read rules with `alwaysApply: true` at the start of the session.
  - Load other rules based on their frontmatter: before creating or editing a file, find rules whose `globs` or `paths` match the file path, or whose `description` matches the task, and read each applicable rule in full.
  - If a rule conflicts with this file, follow the stricter requirement and tell the person about the conflict.
- Skills: `.cursor/skills/<name>/SKILL.md`. If a task matches a skill's `description`, read its `SKILL.md` and follow it instead of your own workflow.
- Do not delete or rename files in `.cursor/` without the person's explicit request.

Do not add secrets, keys, tokens, or real connection strings to the repository.

Perform commits, amends, pushes, and PRs only when explicitly requested by a human.

Language and Reports
Use the rules from `agents/rules/human-communication.md`.
