# Open SaaS

This is SaaS boilerplate starter kit built on top of Wasp, a batteries-included framework for building full-stack web apps with React, Node.js, and Prisma.

## Documentation

### Open SaaS

Always fetch and verify your knowledge against the Open SaaS documentation before taking on tasks, answering questions, or doing any development work in this project:

1. Fetch the Open SaaS documentation map from the [LLMs.txt index](https://docs.opensaas.sh/llms.txt). The map contains raw markdown file GitHub URLs of all documentation sections.
2. Fetch the guides relevant to the current task or query from those raw.githubusercontent.com URLs directly - do NOT use HTML page URLs.

### Wasp

Remember, this template is built on the Wasp framework. If, at any time, the Open SaaS docs fail to provide enough information about a certain feature, make sure to check out the Wasp docs [LLMs.txt index](https://wasp.sh/llms.txt).

<!-- SCHOOL_OS_UI:START -->
## Active Design System: School OS (Apple HIG-inspired)

The active visual contract for the school application is **School OS**, inspired by Apple Human Interface Guidelines. Read `../docs/AI_AGENT_HANDOFF.md`, `../docs/PROJECT_CONTEXT.md`, and `../docs/UI_UX_APPLE_HIG.md` before UI work.

Key rules:
- macOS-like compact desktop shell, grouped surfaces, thin separators, restrained stroke icons, system typography/colors;
- responsive iOS-like mobile behavior with role-aware navigation and safe-area handling;
- real production data only; never invent dashboard metrics;
- tenant isolation and authorization are server-side boundaries, regardless of UI visibility;
- existing `components/m3/` and `M3*` names are legacy compatibility APIs only and **do not** make Material 3 the active design authority;
- do not redesign new School OS work back toward Material 3.
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
