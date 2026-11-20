# Tasks

## Execution rules

- Complex work is owned by lead agent `mwscode/personal/336/gpt-6.1-sol`.
- Simple isolated work may be delegated to `mwscode/personal/336/gpt-6-luna`, maximum one parallel child at high reasoning.
- UI, modal styles, documentation, and focused tests may be delegated to `openai-codex/gpt-6-luna`, maximum three parallel children at medium or high reasoning.
- Lead reviews every delegated change, integrates conflicts, and runs the final checks.
- Use synthetic OAuth/network data only. Do not use real secrets.
- Close each checked task only after implementation and verification; update memory and commit according to project rules.

## 1. Package rename first

- [x] 1.1 Rename `packages/dsh-openai-codex-provider` to `packages/dsh-openai-hub`, update package name to `@kalex/dsh-openai-hub`, and update manifests, patch references, imports, Remote symbols, tests, docs, and generated build inputs. Verify no old package reference remains except an explicit release note.
- [x] 1.2 Build the renamed package and run its focused tests. Verify installation metadata and generated paths use the new package name.

## 2. OpenAI Hub host foundation

- [x] 2.1 Replace `ServiceKey` and `ProviderRoute` with `openai-hub`, keep `RemoteNamespace = openaiHub`, and remove dynamic route replacement. Verify `llm.listProviders()` reports one route and no `openai-codex` route.
- [x] 2.2 Add account configuration schema with `accounts[]`, lowercase ASCII labels, `authMethod`, hashed credential key, per-account model settings, and persisted quota auto-refresh disabled by default. Verify config editor writes only account settings and no secrets.
- [x] 2.3 Add credential resolver boundary using `openai-hub-<authMethod>-<8-hex-hash(accountId)>`; keep current one-account operation while allowing a later second record without route changes. Verify credentials never appear in snapshots, errors, logs, or client responses.

## 3. Dynamic catalog and model routing

- [x] 3.1 Implement authenticated API catalog loading after login and manual refresh. Reconcile per-account models while preserving valid names/order/enabled state, adding new models, and removing unavailable models. Verify with synthetic Sol/Astra 6.2 responses.
- [x] 3.2 Expose one combined model list under `openai-hub` with provider group `OpenAI Hub`, IDs `<accountLabel>/<upstreamModelId>`, and model names `<accountLabel>/<upstreamModelId>`. Verify adapter requests unwrap the public ID before upstream calls and DSH subagent presentation may add `openai-hub/` externally.
- [x] 3.3 Preserve the last successful catalog on API errors; before the first successful catalog use local `pi-ai.getModels()`. Verify error state is visible without losing usable prior models.

## 4. Account settings and quota UI

- [x] 4.1 Render one account information block and one model modal per account in Settings -> Models. Verify two synthetic accounts render sequentially and each modal operates only on its account.
- [x] 4.2 Add account label input before OAuth and label editing in the account block. Verify validation, duplicate handling, public ID rebuild, credential stability, and stale history behavior.
- [x] 4.3 Add persisted per-account auto-refresh switch, disabled by default. Verify normal five-minute polling, one-minute polling when the selected model's nearest-reset limit is below 25 percent, and priority of hourly then five-hour then daily limits.
- [x] 4.4 Pause quota network requests while the page is hidden using browser visibility APIs and refresh once on return. Verify hidden state makes no requests and visible transition refreshes only the relevant account.
- [x] 4.5 Connect chat status bar to the selected conversation provider/model. Verify it shows only the selected OpenAI Hub account's limits and hides for other providers or stale data.

## 5. Account deletion and fresh-install state

- [x] 5.1 Delete all plugin-owned Credential Store/configuration/model data for one account without rewriting history; mark old model references stale. Verify neighboring accounts remain unchanged.
- [x] 5.2 Delete the last account and reset to fresh-install state with no account settings/models and the initial add-account UI. Verify no old credential or client cache remains.

## 6. Independent bug fixes

- [x] 6.1 Trace Core Modal portal/theme ownership and fix `dsh-modal-card` backgrounds in OpenAI Hub and workspace-manager using theme tokens. Verify all affected modals in light/dark themes, including workspace `addir-modal` usage.
- [x] 6.2 Remove credential-bearing debug logs and all OpenAI Hub-owned `ProxyMode`/system-proxy UI, handlers, workers, and transports. Verify no OAuth object is logged, OpenAI Hub contains no proxy mechanism, and other packages are unchanged.

## 7. Tests and documentation per slice

- [x] 7.1 Add focused shared/host integration tests for route registration, account labels, credential resolution, catalog reconciliation, fallback, model ID unwrapping, deletion, and stale operations. Verify tests use synthetic data.
- [x] 7.2 Add focused Client tests for account blocks, modal isolation, refresh switch/timers, visibility pause, selected-model status limits, and modal backgrounds. Verify accessibility and localized states.
- [x] 7.3 Update package README/docs and `docs/Workflow.md` with the final names, flow diagrams, storage rules, reinstall requirement, API/fallback behavior, quota policy, and known limitations. Verify links and examples use `@kalex/dsh-openai-hub`.

## 8. Integration review and handoff

- [x] 8.1 Lead performs a full source/history audit against every requirement and reports missing or contradictory changes. Verify no old architecture remains in source or docs.
- [x] 8.2 Run package tests, `pnpm fix`, `pnpm check`, and `pnpm build`; repeat affected tests after fixes and record failures or limitations. Do not claim unavailable checks passed.
- [x] 8.3 Prepare manual uninstall-old/install-new instructions and acceptance checklist. Verify generated artifacts and links; manual real-account acceptance remains a user step.

## Specification reference

Capability requirements: `specs/openai-hub/spec.md`.

## Workflow follow-up

- Archive the change only after implementation, review, and user acceptance of the delivered plan.
- Independent proxy routing remains deferred to dsh-6.
