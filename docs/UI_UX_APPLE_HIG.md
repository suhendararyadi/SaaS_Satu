# SaaS Satu — School OS UI System

Status: implemented baseline
Design direction: Apple HIG-inspired web interface
Official design reference: https://developer.apple.com/design/human-interface-guidelines
Golden prototypes: user-provided `School OS.zip`

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

The desktop admin prototype is the reference for:

- 240px translucent sidebar;
- compact navigation rows;
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
- pada dark mode, system colors Apple yang lebih terang dipertahankan dengan foreground gelap yang kontras.
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
- compact top-level navigation;
- translucent toolbar separated from content by a thin line;
- content canvas remains neutral and spacious;
- keyboard/precision-input workflows remain first class;
- dense tables use the available screen width rather than converting everything into cards.

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
- `M3NavigationDrawer` → macOS-like sidebar;
- `M3TopAppBar` → toolbar material;
- `M3BottomNavigation` → iOS-like bottom navigation;
- `M3Dialog` → centered desktop dialog / mobile bottom sheet;
- `M3Table` → compact desktop data table.

A future internal rename can remove the historical `M3` prefix, but it is not required for visual correctness and would create unnecessary migration risk now.

## 8. Icons

Material Symbols remain a cross-platform web fallback because SF Symbols are not bundled with this web application. The default rendering is outlined and restrained to approximate system-symbol visual weight. Feature-specific React icons can still be supplied through the shared icon API.

Do not use emoji as interface icons.

## 9. Role Dashboards

Existing role-specific server DTOs remain authoritative.

- Student: next learning priority, tasks/CBT, classes, own PKL state.
- Teacher: work requiring attention, teaching rooms, supervised PKL, extra assignments.
- Admin: school summary, real attention conditions, capacity, quick management.
- DUDI Mentor: assigned students and journal review work.

Visual redesign must not introduce fake progress, invented metrics, or cross-role data.

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

## 12. Quality Gate

Before production promotion:

1. `git diff --check` passes;
2. Wasp/TypeScript compilation passes;
3. the full client test suite passes;
4. production Wasp build passes;
5. production Vite SSR/client build passes;
6. no database/schema diff exists;
7. production URLs are correct in the static bundle;
8. `/`, `/login`, and `/school` return 200 after static cutover;
9. backend release remains unchanged for a frontend-only rollout;
10. the previous static release remains available for rollback.

## Status produksi

School OS dipromosikan ke production pada 9 September 2026 dari source commit `818d1c7a89dc64b81b5cfdc78a52cd1211136146` melalui static release `818d1c7-school-os-hig`. Backend tetap menggunakan release `678181a-dashboard-fix`; tidak ada perubahan schema database.

## Refinement final — sidebar dots dan dashboard macOS

Setelah review visual production, School OS dikunci dengan refinement berikut:

- sidebar desktop tidak lagi memakai ikon per menu; navigasi menggunakan dot marker kecil seperti mockup `dashboard.html`;
- hero/header besar di dashboard dihapus; nama sekolah dan tahun ajaran aktif tampil ringkas di toolbar;
- dashboard memakai stat strip compact, grouped panels, thin separators, dan real-data-only metrics;
- Admin menampilkan siswa, guru, rombel, ruang LMS, mitra DUDI, dan PKL aktif sesuai data tenant;
- dashboard Student, Teacher, dan DUDI Mentor memakai pola statistik dan grouped list yang sama;
- breadcrumb redundan di halaman sekolah/PKL/governance/reports dihapus karena toolbar sudah menjadi sumber konteks navigasi;
- hard-coded rainbow utility colors dinormalisasi ke semantic School OS colors;
- data contoh yang tampak seperti data nyata pada form laporan dihapus dari default state dan hanya boleh hadir sebagai placeholder contoh;
- `getSchoolInfo` menambahkan `activeAcademicYear` sebagai data read-only untuk toolbar. Perubahan ini tidak mengubah schema, authorization, tenant scoping, atau business rules.

Prinsip final: **toolbar memberi konteks, content area memberi pekerjaan dan data; bukan mengulang identitas halaman dalam hero besar.**
