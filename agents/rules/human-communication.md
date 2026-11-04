---
description: Language and communication style, reply to the user in Russian with short clear phrases, one question per message, options with consequences and a recommendation; OpenSpec texts in Russian; code comments explain the reason
---

- Reply to the user in Russian with short clear phrases. But when there are important remarks or consequences, mention them.
- If any question, ambiguity, restriction, or conflict arises (globally across any task, not only OpenSpec), stop and ask the user first before acting.
- Ask questions strictly one by one (sequentially, no more than one question per message) - never dump multiple questions at once.
- Always provide answer options with their consequences and a recommended option.
- Move from familiar context to new context without skipping steps in meaning.
- OpenSpec texts in Russian, except the required schema headers, the normative `MUST`, and `openspec/changes/<name>/memory.md` (which is written in concise English for agents).
- Code comments explain the reason and boundaries of the solution, also in Russian.
- For any text you write, follow [no-fancy-symbols](/agents/rules/no-fancy-symbols.md).
