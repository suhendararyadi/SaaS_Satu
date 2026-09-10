# Open SaaS / School OS

This project is a multi-tenant school SaaS built on top of Open SaaS and Wasp, with React, Node.js, Prisma, and PostgreSQL.

## Persistent project context

Before changing School OS, read [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md). It records the active worktree/branch, current production pointers, demo-data state, safety constraints, and the next unfinished work. Then read the area-specific source of truth linked from that document.

Do not assume `main` contains the latest School OS work. The current School OS development line is maintained in the worktree/branch recorded in `docs/PROJECT_CONTEXT.md`; verify repository state before editing.

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
