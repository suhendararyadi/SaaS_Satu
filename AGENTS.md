# Open SaaS / School OS

This project is a multi-tenant school SaaS built on top of Open SaaS and Wasp, with React, Node.js, Prisma, and PostgreSQL.

## Persistent project context

Before changing School OS, retrieve VPS-global MSO Agent Memory for relevant `project.school_os.*` claims when available, then read [`docs/AI_AGENT_HANDOFF.md`](./docs/AI_AGENT_HANDOFF.md) for the compact verified production snapshot and [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) for the full persistent context. These documents record the active worktree/branch, production pointers, tenant baselines, privacy/safety constraints, deployment contract, and continuation point. Then read the area-specific source of truth linked from them.

Memory architecture is documented in [`docs/GLOBAL_PERSISTENT_MEMORY.md`](./docs/GLOBAL_PERSISTENT_MEMORY.md). Global Agent Memory is the durable high-value knowledge layer; `.agent/memory` is operational project memory and must not be treated as the sole permanent store.

Do not assume `main` contains the latest School OS work. The current School OS development line is maintained in the worktree/branch recorded in `docs/PROJECT_CONTEXT.md`; verify repository state before editing.

## Production deployment

Do not bypass MSO service-control guards with forced process kills or unrestricted shell exceptions. School OS exposes bounded project functions in `.mso/functions.json`:

- `school_os_deploy_preflight` validates an already-built full backend/static release, including a runtime Prisma guard that requires `user`, `auth`, and `session` delegates, plus the current rollback pointers without changing production.
- `school_os_deploy_release` performs backend symlink cutover, bounded service restart, local health verification, static cutover, public smoke checks, and automatic rollback on failure.
- `school_os_deploy_static_preflight` validates a staged static release for frontend-only work without requiring or changing its backend runtime.
- `school_os_deploy_static` promotes static assets only, verifies public smoke checks, and asserts that the backend pointer remains unchanged.

Choose the narrowest deployment scope. For frontend-only changes, use the static-only preflight/deploy path and do **not** restart or replace the backend. For backend/full-stack changes, build and verify the immutable release first, run the full preflight (including the Prisma auth-runtime guard), and only then call the full deploy function with the exact release id, expected commit, and confirmation token.

## Documentation

### Open SaaS

Always fetch and verify framework-specific knowledge against the Open SaaS documentation before taking on tasks, answering framework questions, or doing development work in this project:

1. Fetch the Open SaaS documentation map from the [LLMs.txt index](https://docs.opensaas.sh/llms.txt). The map contains raw markdown file GitHub URLs of all documentation sections.
2. Fetch the guides relevant to the current task or query from those raw.githubusercontent.com URLs directly; do not rely on stale framework assumptions.

### Wasp

This template is built on Wasp. If Open SaaS docs do not provide enough information about a feature, verify against the Wasp docs [LLMs.txt index](https://wasp.sh/llms.txt).

<!-- SCHOOL_OS_UI:START -->
## Active Design System: School OS (Apple HIG-inspired)

The active visual contract is **School OS**, inspired by Apple Human Interface Guidelines. The authoritative document is [`docs/UI_UX_APPLE_HIG.md`](./docs/UI_UX_APPLE_HIG.md).

Key characteristics:
- macOS-like desktop shell with compact toolbar, grouped surfaces, restrained sidebar, thin separators, and data-dense tables;
- iOS-like mobile behavior with role-aware bottom navigation, safe-area support, touch targets around 44px, and contextual bottom sheets;
- system font stack and semantic system-style colors;
- restrained stroke icons; no emoji used as UI icons;
- real-data-only dashboards with no invented metrics;
- tenant isolation, role/assignment authorization, and server DTO boundaries remain authoritative regardless of UI visibility.

The existing `components/m3/` folder and public `M3*` component names are a **compatibility layer only**. They do not make Material 3 the active design-system authority. Do not redesign new work back toward Material 3 merely because of those historical names.
<!-- SCHOOL_OS_UI:END -->

<!-- ANTI_SLOP:START -->
## Anti-Slop Guidelines (R-01 - R-38)
This project enforces `anti-slop` standards:
- Filter out generic AI slop in UI, text/copy, and code.
- Avoid generic filler text, robotic copywriting, unnecessary decorative gradient blobs, or cookie-cutter designs.
- Skills available in `.agents/skills/`:
  - `antislop`: Core rules & delivery gate
  - `antislop-ui`: Visual & UI components
  - `antislop-copywriting`: Real, human copy
  - `antislop-layoutmobile`: Responsive layouts
  - `antislop-code`: Clean code comments
  - `antislop-human`: Natural phrasing
<!-- ANTI_SLOP:END -->
