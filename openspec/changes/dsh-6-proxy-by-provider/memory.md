# Session Memory: dsh-6-proxy-by-provider

## 1. Initial Command and Goal
- User requested draft.md only, capturing current proxy requirements and plan for later conversion into full OpenSpec artifacts.
- Goal: independent provider-scoped proxy routing for providers sharing target domains, including multiple Codex accounts.

## 2. Clarifications and Decisions
- Use the existing proxy routing window; do not add a proxy profile selector to Codex cards.
- Implement proxy routing separately from dsh-5-multiple-openai; Codex consumes the agreed transport contract.
- Existing routing uses hostname-to-profile mapping and cannot isolate different accounts on the same host.
- Remove the Codex-specific Windows system proxy mode in dsh-5. Browser OAuth confirmation remains outside plugin transport control.
- No concrete transport API has been agreed or verified. draft.md distinguishes confirmed requirements, proposed approach, and open questions.

## 3. Progress and Completed Tasks
- Created change metadata with openspec new change.
- Created draft.md with requirements, source references, integration boundaries, preliminary plan, and verification scenarios.
- No implementation or full planning artifacts were created.

## 4. Current State and Open Tasks
- Status: planning.
- Investigate actual DSH and OAuth transport extension points before specifying the API.
- Clarify direct routing, legacy fallback, standard-provider coverage, deletion/reuse of bindings, and transport lifecycle.
- dsh-5-multiple-openai remains dependent on this unresolved contract.

## 5. Next Step for Resuming Agent
- Read draft.md, investigate feasibility, and ask clarification questions one at a time. Create full OpenSpec artifacts only when requested; do not implement from this draft.
