---
paths:
  - "**/openspec/changes/**"
description: Standard for migrating or creating new DSH plugins and projects.
---

# Project Migration and Creation Standard

When migrating a legacy project or creating a new DSH plugin:

## 1. Architecture Requirements
- **Tech Stack**: MUST use TypeScript (strict), React (latest), and Vite.
- **Dependency Management**: Common UI components, hooks, and contracts MUST be extracted to or used from @kalex/dsh-core.
- **Layered Structure**: Projects MUST adhere to the unidirectional flow: shared -> host / client.
  - src/shared/: Models, DTOs, constants.
  - src/host/: Node.js/Cordis services.
  - src/client/: React components and feature modules.

## 2. Process Requirements
- **OpenSpec**: NO code changes or feature implementation until an OpenSpec change is created and approved.
- **Documentation**: All new/migrated code must have documentation artifacts (proposal, design, tasks) updated in the OpenSpec change.

## 3. UI and Design
- **Compliance**: All frontend work MUST comply with agents/front/skills/design-principles/skill.md.
- **Component Priority**: Shared components, UI primitives, and design tokens from @kalex/dsh-core MUST be used as the primary source of truth. Do not implement custom UI components or primitives if a suitable one exists in dsh-core. Extend existing ones if necessary.