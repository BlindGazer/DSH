# Router demo project

This folder is a small, non-generated fixture for trying the project router. Open this directory as the DSH project root; the instructions live in `agents/` and only serve as input to the plugin. The plugin does not write or create files here.

## Test

Test section added.

## Example paths and expected routing

| Path | Expected managed instructions |
| --- | --- |
| `src/front/components/AccessibleButton.tsx` | Global `agents.md`; global TypeScript rule; `front/agents.md`; front area component rule |
| `src/front/admin/permissions.ts` | Above frontend instructions plus inherited `front/admin/agents.md` |
| `src/private/config.ts` | Global baseline; TypeScript rule; private-source rule |
| `src/api/health.ts` or `src/core/format.ts` | Global baseline and TypeScript rule; the `back` area is disabled |

A new session starts with an empty workset. Use the **Agents Router** tab to inspect each path without adding it, then use **Add** or read/edit it with DSH's supported file tool to add it to the workset. Search results do not automatically add files.

The root skill is available as `/review`; the frontend skill is `/front-review`. Their instructions are distinct. Try both over a frontend diff to observe the project/area prefixes and native DSH skill invocation policies. `agents/front/admin/` also demonstrates nested area inheritance without defining a separate skill.

Change the project settings in the plugin tab to try alternative names for the instruction root, rules/skills folders, or main file. The sample JSON remains at `agents/dsh/agents-router.json` for the defaults; changing `instructionsRoot` moves the expected JSON location but does not move or copy files automatically.

All example code is synthetic. In particular, `src/private/config.ts` contains no credentials.
