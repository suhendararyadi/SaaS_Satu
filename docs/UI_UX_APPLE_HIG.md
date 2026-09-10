# SaaS Satu — School OS UI System

Status: active / implemented
Design direction: Apple HIG-inspired web interface
Official design reference: https://developer.apple.com/design/human-interface-guidelines
Golden prototypes: user-provided `School OS.zip` plus subsequent production visual reviews

## 1. Purpose

School OS is the active visual system for SaaS Satu. It adapts principles from Apple Human Interface Guidelines to a browser-based school information system without copying Apple product branding or distributing proprietary Apple assets.

The goal is a calm, familiar, content-first interface:

- macOS-like information density on desktop;
- iOS-like touch comfort and sheets on mobile;
- semantic system colors instead of decorative palettes;
- subtle materials, separators, shadows, and grouping;
- role-aware information architecture inherited from SaaS Satu v2;
- no changes to tenant isolation, server authorization, or business rules.

## 2. Golden References

The supplied School OS prototypes define two target modes.

### Desktop

The desktop admin prototype and later production reviews are the reference for:

- approximately 240px translucent sidebar;
- compact navigation rows with restrained stroke icons;
- approximately 58px toolbar;
- grouped white surfaces over a neutral background;
- 16px panels and dialogs;
- thin separators;
- compact tables and controls;
- restrained shadows;
- high information density without visual clutter.

### Mobile

The teacher prototype is the reference for:

- 44px or larger primary touch targets;
- grouped cards and lists;
- bottom navigation with safe-area support;
- bottom sheets for contextual actions;
- compact confirmation dialogs;
- large enough body text for handheld use;
- semantic blue, green, orange, and red states.

Prototype content is reference-only. Fake names, metrics, attendance, scores, and other sample data must never be copied into production.

## 3. Typography

Use the operating system font stack:

```css
-apple-system,
BlinkMacSystemFont,
"SF Pro Text",
"SF Pro Display",
"Helvetica Neue",
Arial,
system-ui,
sans-serif
```

No Apple font files are bundled or redistributed. On Apple devices, the platform can select its installed system typeface. Other platforms use the next available system font.

Desktop density is closer to macOS, with body/control text commonly around 13px. Mobile uses larger text and touch targets closer to iOS conventions.

## 4. Semantic Colors

Light mode core values:

- Apple reference blue: `#007AFF`; web filled-action token: `#0071E3` agar label putih memenuhi WCAG AA;
- Apple reference green: `#34C759`; web filled-success token: `#237A36` pada light mode;
- Apple reference orange: `#FF9500`; web filled-warning token: `#A05A00` pada light mode;
- Apple reference red: `#FF3B30`; web filled-destructive token: `#D70015` pada light mode;
- pada dark mode, system colors Apple yang lebih terang dipertahankan dengan foreground gelap yang kontras;
- grouped background: `#F2F2F7`;
- primary surface: `#FFFFFF`;
- primary label: `rgba(0,0,0,.85)`;
- secondary label: `rgba(60,60,67,.60)`;
- separator: `rgba(60,60,67,.12)`.

Dark mode uses corresponding darker-environment system-like values such as `#0A84FF`, `#30D158`, `#FF9F0A`, `#FF453A`, black background, and `#1C1C1E` surfaces.

Color is semantic and sparse. Status must never depend on color alone.

## 5. Shape and Elevation

- compact control: 7–10px radius;
- content panel/card: 16px;
- mobile sheet top corners: 20px;
- avatar/status pill: full radius where appropriate;
- borders/separators are visually thin;
- shadows are low-opacity and secondary to grouping.

Avoid oversized floating cards, decorative gradients, and heavy multi-layer shadows.

## 6. App Shell

### Desktop

- translucent sidebar material;
- compact top-level navigation with restrained stroke icons;
- navigation labels use strong near-black primary text rather than low-contrast gray;
- sidebar show/hide control follows macOS toolbar conventions;
- translucent toolbar separated from content by a thin line;
- content canvas remains neutral and spacious;
- keyboard/precision-input workflows remain first class;
- dense tables use the available screen width rather than converting everything into cards.

The sidebar composition should feel closer to macOS Settings/Finder than to a Material navigation drawer: low-chrome grouping, clear labels, modest active-state treatment, and no decorative blue status dot beside the school identity.

### Mobile

- bottom navigation remains role-aware;
- navigation respects safe areas;
- controls retain approximately 44px minimum touch height;
- contextual dialogs become bottom sheets where appropriate;
- content reflows to grouped lists/cards instead of squeezing desktop layouts.

## 7. Shared Components

The existing source folder and public component names under `components/m3/` are retained for backwards compatibility. Their active visual contract is School OS, not Material 3.

Key mappings:

- `M3Card` → grouped content surface;
- `M3Button` → compact macOS / touch-friendly iOS action;
- `M3TextField`, `M3Select` → system form controls;
- `M3Switch` → iOS-like switch geometry;
- `M3Tabs` → segmented control;
- `M3NavigationDrawer` → macOS-like Settings/Finder sidebar;
- `M3TopAppBar` → toolbar material;
- `M3BottomNavigation` → iOS-like bottom navigation;
- `M3Dialog` → centered desktop dialog / mobile bottom sheet;
- `M3Table` → compact desktop data table.

A future internal rename can remove the historical `M3` prefix, but it is not required for visual correctness and would create unnecessary migration risk now.

## 8. Icons

Primary desktop sidebar navigation uses restrained Lucide stroke icons to approximate the visual weight of macOS/SF Symbols without bundling Apple assets. Material Symbols remain available as a cross-platform fallback in existing shared APIs and screens where replacement is not justified.

Rules:

- icons must be simple, outlined/stroked, and visually quiet;
- do not use decorative icon tiles unless the information hierarchy genuinely needs them;
- do not use emoji as interface icons;
- do not bundle or redistribute SF Symbols or proprietary Apple font/icon assets.

## 9. Role Dashboards

Existing role-specific server DTOs remain authoritative.

- Student: next learning priority, tasks/CBT, classes, own PKL state.
- Teacher: work requiring attention, teaching rooms, supervised PKL, extra assignments.
- Admin: school summary, real attention conditions, attendance, quick management.
- DUDI Mentor: assigned students and journal review work.

Visual redesign must not introduce fake progress, invented metrics, or cross-role data.

Admin dashboard refinement includes:

- compact stat strip using real tenant data;
- **Kehadiran per rombel** uses up to five compact horizontal bars ranked by the lowest measured attendance percentage for the current day; random sampling is not used for operational prioritization;
- missing attendance data stays neutral and is never treated as 0%; a red bar is reserved for a rombel that has an actual `ALPA` record;
- `Perlu Keputusan Anda` remains backed by server-side attention data and uses compact rounded icon tiles, restrained stroke icons, optional count, and a trailing disclosure chevron in the macOS Settings/Finder visual language;
- operational navigation rows that sit inside `Perlu Keputusan Anda` must use the same `hig-list-row` geometry as attention rows when they are visually integrated, while remaining semantically excluded from the real decision count;
- honest empty states remain required when operational records do not exist.

## 10. Accessibility

- keyboard navigation and focus-visible states remain required;
- touch targets remain larger on mobile;
- reduced motion is respected;
- status has labels/icons, not color alone;
- text and control boundaries must remain readable in light and dark modes;
- native/system typography is preferred for platform familiarity.

## 11. Security and Data Honesty

This design-system migration is frontend-only unless a separate feature explicitly requires backend work.

It must not modify:

- tenant scoping;
- role/assignment authorization;
- dashboard DTO security;
- database schema;
- integration feature flags;
- production secrets.

Demo/synthetic records used for QA must remain explicitly marked and must not be presented as genuine school data. See [`DEMO_DATA.md`](./DEMO_DATA.md).

## 12. Quality Gate

Before production promotion:

1. `git diff --check` passes;
2. Wasp/TypeScript compilation passes;
3. the full client test suite passes;
4. production Wasp build passes when runtime code changed;
5. production Vite SSR/client build passes for static release work;
6. no unintended database/schema diff exists;
7. production URLs are correct in the static bundle;
8. `/`, `/login`, and `/school` return 200 after cutover;
9. backend remains unchanged for genuinely frontend-only rollout;
10. the previous static/runtime release remains available for rollback.

## 13. Production status — 10 September 2026

The original School OS baseline was promoted on 9 September 2026 and then refined through several production-reviewed commits.

Current pointers verified from the server on 10 September 2026:

- active static release: `/var/www/saas-satu/releases/76395d0-decision-row`;
- active backend release: `/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring`;
- `saas-satu.service`: active/running.

The current development branch/worktree snapshot is documented in [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## 14. Current refinement — macOS Settings/Finder sidebar

The dot-only sidebar experiment is historical and **not** the final active contract. Subsequent production review intentionally restored icons and refined the shell further.

Current sidebar contract:

- navigation uses restrained stroke icons plus text labels;
- labels use strong near-black text for Finder/macOS-like readability;
- the blue dot beside the school identity is removed;
- `Ganti Sekolah` is treated as a compact toolbar/action control rather than an oversized button;
- hide/show sidebar control follows a macOS-style sidebar toggle;
- navigation grouping and active states take inspiration from macOS Settings/Finder;
- grouped empty states and inline notices remain low-chrome and content-first;
- dashboard keeps compact stat strips, grouped panels, thin separators, and real-data-only metrics;
- breadcrumb/hero duplication stays removed where the toolbar already provides sufficient context.

Related refinement commits: `70108d1`, `5b66eb1`, `0adb095`, `ea99802`.

Final principle: **toolbar memberi konteks; sidebar memberi orientasi; content area memberi pekerjaan dan data tanpa chrome yang berlebihan.**

## 15. EWS, dialog focus, and PKL monitoring refinement — 10 September 2026

The current production refinement extends the Apple HIG-inspired contract into operational monitoring and form behavior:

- shared dialogs must preserve focus/caret while controlled form fields update; dialog lifecycle side effects run on open/close state rather than callback identity changes;
- **Kehadiran per rombel** still selects the five lowest-attendance priority classes, then presents that set from higher to lower attendance so the visual hierarchy naturally ends with the most concerning rows;
- among measured rows, the bottom two use Apple-like orange then red accents; unmeasured rows remain neutral;
- **Perlu keputusan Anda** may include a real EWS PKL summary with a compact orange alert tile and navigation to `/school/ews`;
- `/school/ews` is the overview/hub: concise status, counts, priority list, source context, and interpretation guidance;
- `/school/pkl/monitoring` is the evidence/detail view: grouped surfaces, compact filters, thin separators, alert tiles, and direct navigation to attendance/journal evidence rather than generic outreach chrome;
- EWS is a prioritization aid, not an automatic disciplinary decision. UI copy must keep the distinction between a detected signal and a verified school decision.

Related implementation commits: `af4bf88` and `6f5d9b2`.

## 16. Dashboard label alignment and sidebar palette refinement — 10 September 2026

The School OS shell applies the following refinement after production review:

- attendance rows use a fixed label lane, flexible progress lane, and fixed numeric lane so bars start and end consistently regardless of class-name length;
- the visible attendance label is the canonical class-room name only; department information may remain in tooltip/accessibility context instead of being conditionally appended to only some rows;
- long class-room names truncate to one line rather than changing the geometry of neighboring progress bars;
- Admin Dashboard no longer exposes `Import Data` as a header action or `Kelola cepat` shortcut; the dedicated sidebar entry remains the intentional navigation path for that feature;
- sidebar icon tiles should not default visually to gray when a semantic icon exists. The current palette intentionally mixes Apple-like blue, indigo, cyan, green, orange, pink, purple, and red while keeping labels and surfaces neutral;
- `account_tree` and `warning` require explicit icon/tone mappings, and common system items such as reports/settings should also use deliberate tones instead of repeated gray fallback.

Related implementation commit: `d16662a`.

## 17. School identity row, sidebar toggle, and decision-card integration — 10 September 2026

The desktop shell further refines the sidebar using the hierarchy seen in macOS Settings while keeping the content specific to a school system:

- the active school is presented as a compact identity row with a circular school glyph, the school name as the primary label, and `Unit sekolah aktif · <kota>` as secondary context when city data exists;
- the identity row is contextual UI, not an imitation of Apple Account branding; School OS remains the product identity;
- the desktop collapse/expand control uses one restrained split-panel glyph and lives at the trailing edge of the sidebar header, keeping the action visually attached to the panel it controls;
- the desktop top app bar no longer duplicates the sidebar collapse action; the mobile navigation button remains in the top bar because the mobile drawer is a different interaction;
- keyboard `Ctrl+B` / `Cmd+B` remains available for precision-input workflows;
- the Admin **Perlu keputusan Anda** card may include the utility route `Buka pusat monitoring PKL`, but it must be rendered inside the same `hig-list` and use the same row height, icon tile scale, typography, separator behavior, hover state, and disclosure chevron as the real attention items;
- the monitoring utility row is not part of `attention`, carries no count, and does not increment the attention badge. Its role is navigation, not a fabricated detected problem or decision.

Related implementation commits: `349ac7c`, `bcca333`, and `76395d0`. Production static release: `76395d0-decision-row`; backend remains `6f5d9b2-ews-apple-monitoring`.
