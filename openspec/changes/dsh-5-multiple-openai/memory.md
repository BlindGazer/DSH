# Session Memory: dsh-5-multiple-openai

## 1. Initial Command and Goal
- Initial command: /openspec-propose dsh-5-multiple-openai.
- Goal: replace the automatic singleton Codex provider with explicitly created named accounts, isolated authorization/settings, Models cards, and detail modals.
- Latest request: reconcile all planning artifacts and rewrite tasks for GPT 6 Luna. Do not implement dsh-6 in this iteration.

## 2. Clarifications and Decisions
- Q: Preserve the legacy automatic provider and authorization? -> A: Delete them; user accepts signing in again.
- Q: How do agent tools select an account? -> A: codex_login and codex_logout require providerId even with one account. codex_status without providerId lists names, IDs, and states; with providerId checks that account. No implicit first account.
- Q: Which quota appears beside the composer? -> A: The selected conversation model's account; hide for other providers. Never use the last opened settings card as the account source.
- Q: Shared or per-account network route? -> A: Initially per-account DSH/system controls were requested; later superseded by removal of the Codex system-proxy mode and deferred proxy routing.
- Q: Keep the Codex DSH/system selector? -> A: Remove the selector and Codex-specific Windows system-proxy implementation. Use existing DSH networking this iteration.
- Q: What happens to conversations referencing the old automatic route? -> A: Keep history and require manual model/provider selection; never remap to the first new account.
- Q: Include rename and deletion? -> A: Include both.
- Q: Provider ID and display name? -> A: Enter both at creation, with a fixed openai-codex- prefix plus a user-entered suffix. ID is immutable; only display name is renameable. Lowercase Latin letters, digits, and hyphens in the suffix; host validates uniqueness. Duplicate display names remain allowed.
- Q: May a deleted ID be reused? -> A: Yes; existing conversation references may then point to the new account. No old credentials/settings restored. Use a fresh internal instance identity to reject late operations from the deleted account.
- Shared Codex implementation means shared algorithms, not shared tokens. Browser confirmation determines the actual OpenAI account for each separately initiated login.
- User will manually test the final build after all agent tasks finish. The implementation agent is GPT 6 Luna. Agent checks use synthetic OAuth/network responses; no real login or credit expenditure is required to complete tracked tasks.
- Q: Include independent proxy routing here? -> A: Separate change dsh-6-proxy-by-provider. Existing proxy UI is reused; no new proxy selector in Codex cards.
- Finding: existing proxy code compiles provider bindings into a hostname-to-profile table and chooses transport by URL. Different IDs on a shared domain do not isolate proxies. Discovery of distinct provider rows is separate from routing correctness.
- Latest scope decision supersedes the earlier dsh-6 dependency: both proxy routing implementation AND Codex consumption of its future API are deferred. dsh-5 has no prerequisite on dsh-6, no proxy-plugin rewrite, and no independent-proxy acceptance test. Preserve ordinary DSH network behavior and document the shared-domain limitation.
- dsh-6 currently has a draft only. Its earlier draft statements about dsh-5 consuming a future contract describe later integration, not a requirement for this iteration.
- Current direct request authorizes revising existing unfinished tasks, not adding a parallel checklist retaining the old seven tasks.

## 3. Progress and Completed Tasks
- Reviewed original proposal, delta, design, tasks, base capability, and key Codex/proxy implementation points.
- Revised proposal, spec delta, design, and tasks for the confirmed scope.
- Added explicit legacy migration exception, removed legacy network-choice requirement, and specified ordinary DSH networking instead.
- Replaced seven broad tasks with 18 ordered tasks including per-task checks, initial SDK contract verification, final review, and handoff. All implementation tasks remain unchecked.
- Manual acceptance is an untracked user follow-up, not a condition of agent task completion.
- No implementation changes or real-account testing performed during planning.

## 4. Current State and Open Tasks
- Status: ready-for-review of revised planning artifacts; implementation not started.
- [ ] 1.1: Verify actual SDK contracts for routes, names, credentials, selected conversation provider, and settings persistence; record evidence. This was not proven during requirements review.
- [ ] 2.1-2.3: Account registry, lifecycle, and idempotent legacy migration.
- [ ] 3.1-3.3: Isolated OAuth, usage/reset operations, and account-addressed agent tools.
- [ ] 4.1-4.3: Model registrations, discovery/conversation references, and removal of system-proxy mode while preserving ordinary DSH networking.
- [ ] 5.1-5.4: Remote contract, per-account client state, Models UI, and selected-account quota dock.
- [ ] 6.1-6.4: Automated integration, quality checks/build, final review, and installation/manual acceptance documentation.
- Implementation roots: packages/dsh-openai-codex-provider, suitable existing dsh-core components only when needed. Do not modify read-only DSH installation or implement proxy routing.

## 5. Next Step for Resuming Agent
- Read the reconciled proposal, specs, design, and tasks. Run openspec validate dsh-5-multiple-openai --strict.
- On an explicit implementation request, load openspec-apply, obtain openspec instructions apply --change dsh-5-multiple-openai --json, and read all listed context files.
- Start at task 1.1. Do not invent unavailable SDK APIs; report a concrete missing integration point if found. Do not block on or implement dsh-6.
- Close each implemented and verified task immediately, update this log, and use the commit skill per project rules. Do not wait for the user's later real-account manual acceptance to close agent tasks.
