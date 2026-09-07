# Open SaaS

This is SaaS boilerplate starter kit built on top of Wasp, a batteries-included framework for building full-stack web apps with React, Node.js, and Prisma.

## Documentation

### Open SaaS

Always fetch and verify your knowledge against the Open SaaS documentation before taking on tasks, answering questions, or doing any development work in this project:

1. Fetch the Open SaaS documentation map from the [LLMs.txt index](https://docs.opensaas.sh/llms.txt). The map contains raw markdown file GitHub URLs of all documentation sections.
2. Fetch the guides relevant to the current task or query from those raw.githubusercontent.com URLs directly - do NOT use HTML page URLs.

### Wasp

Remember, this template is built on the Wasp framework. If, at any time, the Open SaaS docs fail to provide enough information about a certain feature, make sure to check out the Wasp docs [LLMs.txt index](https://wasp.sh/llms.txt).

<!-- MATERIAL_3:START -->
## Design System: Google Material 3 (Material You)
The SaaS application uses the Google Material 3 (M3) design system.
Key characteristics:
- Dynamic color roles (Primary, On-Primary, Primary Container, Secondary, Tertiary, Surface, Surface Container Low/High, Outline, Error)
- Google Material 3 typography scale (Headline, Title, Body, Label) using Roboto / Google Sans
- Google Material 3 shapes (rounded-[16px] for cards, rounded-full for buttons/chips/pills, rounded-[28px] for dialogs/FAB)
- Material 3 elevation (Level 0 to Level 5)
- Standard M3 components: Navigation Drawer, Top App Bar, M3Button, M3Card, M3TextField, M3Chip, M3Badge, M3Dialog, M3Tabs
<!-- MATERIAL_3:END -->

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
