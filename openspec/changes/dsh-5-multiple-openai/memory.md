# Session Memory: dsh-5-multiple-openai

## 1. Initial Command and Goal
- User requested a coherent OpenSpec plan for the new OpenAI Hub plugin and asked for reviews before implementation.
- The authoritative requirements are in proposal.md, design.md, specs/openai-hub/spec.md, and tasks.md. This file must not duplicate those requirements.

## 2. Clarifications and Decisions Not Repeated in Main Requirements
- The user requires sequential clarification: answer a direct question first; ask only one unresolved question at a time; report how many remain when practical.
- The available high-reasoning review route was mwscode/personal/336/gpt-6-luna. The requested openai-codex/gpt-6-luna route was unavailable in this session, so a second review from that route could not be performed.
- The user confirmed the final public presentation: chat group "OpenAI Hub" with model `workaccount/gpt-6.2-sol`; subagent presentation may be `openai-hub/workaccount/gpt-6.2-sol`; do not store the provider prefix in the chat model name.
- The user confirmed that OpenAI Hub must not contain proxy mechanisms or call dsh-proxy-provider APIs. OpenAI-specific proxy code must not be moved into dsh-core or other packages.
- The user confirmed the package patch must be renamed to Loader id `dsh-openai-hub` and package name `@kalex/dsh-openai-hub`; this is a static install-time change, not runtime profile rewriting.
- The existing DSH Cordis runtime is reused. "Cordis rename" is not a requirement and must not be added back.
- User chose to rename the OpenSpec delta path to `specs/openai-hub/spec.md`; update schema references consistently and do not keep a duplicate historical spec file.
- The user asked to retain no backward compatibility for the old package; old installation removal and new installation are separate user actions.

## 3. Review Findings
- Current source has not been implemented for the new plan. Existing code still contains the old package name, old service/route constants, dynamic account route construction, single-account Remote handlers, static model catalog, and proxy-mode handlers. These are implementation gaps, not reasons to weaken the requirements.
- The plan was reviewed by mwscode/personal/336/gpt-6-luna in high reasoning. It identified the same gaps and the previous stale planning artifacts. The findings were incorporated into the current artifacts.
- `openspec validate dsh-5-multiple-openai --strict` passed after artifact synchronization.

## 4. OpenSpec structure
- The capability is new: `openai-hub`; there is no modified capability.
- The delta specification is `specs/openai-hub/spec.md`; the legacy path was removed before implementation.

## 5. Current State and Next Step
- Status: ready for final user approval before implementation.
- Do not edit source code until the user explicitly starts implementation through the approved OpenSpec plan.
- Before implementation, read the current tasks/design/spec context using the OpenSpec apply instructions. During implementation, assign only genuinely isolated work to the approved subagent routes and keep complex integration under the lead agent.
- If a new contradiction is discovered during implementation, stop that slice, report the exact file/API evidence, and ask one focused question rather than inventing a compatibility layer.
