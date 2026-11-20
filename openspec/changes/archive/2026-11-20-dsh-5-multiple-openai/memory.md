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

## 3. Initial Review Findings (historical)
- At the initial planning review, source had not yet been implemented for the new plan. Existing code still contains the old package name, old service/route constants, dynamic account route construction, single-account Remote handlers, static model catalog, and proxy-mode handlers. These are implementation gaps, not reasons to weaken the requirements.
- The plan was reviewed by mwscode/personal/336/gpt-6-luna in high reasoning. It identified the same gaps and the previous stale planning artifacts. The findings were incorporated into the current artifacts.
- `openspec validate dsh-5-multiple-openai --strict` passed after artifact synchronization.

## 4. OpenSpec structure
- The capability is new: `openai-hub`; there is no modified capability.
- The delta specification is `specs/openai-hub/spec.md`; the legacy path was removed before implementation.

## 5. Final Implementation State
- All 23 implementation/check/handoff tasks are complete. The change is not archived; real-account and live visual acceptance remain user actions.
- Host uses one openai-hub route, accounts[] configuration, per-account credentials/catalog/model settings/quota/reset state, upstream-ID routing and fresh-install deletion. OpenAI Hub-owned proxy mechanisms and credential debug logs are removed.
- User-approved SDK refs use underscores (`openai_hub_device_code_<hash>` / `openai_hub_browser_oauth_<hash>`). Full account IDs remain in protected credential data, not config or snapshots.
- Normal ConfigEditor remounts are supported: committed mutation responses retain account views; first catalog loading resumes in the next instance. Serialized credential take/restore preserves a completed rotating refresh when configuration deletion fails.
- Client consumes actual Typert RemoteResult envelopes and the installed SDK modelDirectories selection store. A plugin-lifetime scheduler deduplicates per-account timers, pauses hidden requests and accelerates only selected low-quota models. Hooks live in feature hooks/; pending reset rename retains idempotency before publishing the new card.
- Local Modal backdrops use dsh-core-root with effective theme and modal background token in Hub and workspace-manager; Core/proxy production packages are unchanged.
- Two parallel final reviewers (final-review-host and final-review-client), plus lead self-audit, completed; confirmed findings were fixed and rereviewed. Three stale agents-router verification fixtures were corrected without production-code changes.
- Final verification: pnpm fix/check/build; root tests 192; Hub tests 66; workspace tests 38; Hub release verify; OpenSpec strict validation; diff whitespace check. Full evidence, resolved findings and limitations are in review.md.
- Live Client Inspect did not respond. Profile installation and real credentials were not touched. User next step: manual old-package removal/new local package installation, refresh the existing DSH page, and complete docs/Setup.md acceptance. Archive only after user acceptance.
