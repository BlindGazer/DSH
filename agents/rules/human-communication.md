---
description: Communication style and language boundaries for repository rules, skills, documentation, and user replies.
---

- Reply to the user in Russian with short clear phrases. Mention important consequences and limitations.
- If any ambiguity, restriction, or conflict arises, stop and ask the user one question before acting.
- Ask questions one at a time and provide options with consequences and a recommendation.
- Keep every file under `agents/` concise, non-redundant, and written in English. This applies to rules, skills, and their references.
- Documentation is limited to files under `docs/` and `README.md` files. Documentation language follows the documentation requirements, not the `agents/` language rule.
- OpenSpec artifacts remain in Russian unless their schema or repository rule requires English.
- Code comments follow the applicable repository language rule and explain the reason and boundaries of the solution.
- Follow [no-fancy-symbols](/agents/rules/no-fancy-symbols.md) in repository text.
