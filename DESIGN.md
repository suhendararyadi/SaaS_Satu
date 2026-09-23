---
version: alpha
name: School OS HIG
description: Apple HIG-inspired visual system for the School OS authenticated application shell and operational school modules.
colors:
  primary: "#0071E3"
  primary-reference: "#007AFF"
  on-primary: "#FFFFFF"
  primary-container: "rgba(0, 122, 255, 0.12)"
  on-primary-container: "#005CC8"
  success: "#237A36"
  success-reference: "#34C759"
  success-container: "rgba(52, 199, 89, 0.14)"
  warning: "#A05A00"
  warning-reference: "#FF9500"
  warning-container: "rgba(255, 149, 0, 0.14)"
  error: "#D70015"
  error-reference: "#FF3B30"
  error-container: "rgba(255, 59, 48, 0.12)"
  background: "#F2F2F7"
  surface: "#FFFFFF"
  surface-low: "#F7F7FA"
  surface-container: "#F2F2F7"
  surface-high: "#E9E9EE"
  surface-highest: "#DEDEE4"
  text-primary: "rgba(0, 0, 0, 0.85)"
  text-secondary: "rgba(60, 60, 67, 0.60)"
  outline: "rgba(60, 60, 67, 0.28)"
  separator: "rgba(60, 60, 67, 0.12)"
  scrim: "rgba(0, 0, 0, 0.30)"
  dark-primary: "#0A84FF"
  dark-success: "#30D158"
  dark-warning: "#FF9F0A"
  dark-error: "#FF453A"
  dark-background: "#000000"
  dark-surface: "#1C1C1E"
  dark-surface-high: "#2C2C2E"
  dark-surface-highest: "#3A3A3C"
  dark-text-primary: "rgba(255, 255, 255, 0.92)"
  dark-text-secondary: "rgba(235, 235, 245, 0.60)"
  dark-outline: "rgba(235, 235, 245, 0.30)"
  dark-separator: "rgba(84, 84, 88, 0.65)"
  icon-blue: "#0A84FF"
  icon-indigo: "#5E5CE6"
  icon-cyan: "#30B0C7"
  icon-green: "#34C759"
  icon-orange: "#FF9F0A"
  icon-pink: "#FF375F"
  icon-purple: "#AF52DE"
  icon-red: "#FF453A"
typography:
  display-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.035em
  headline-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 25px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-medium:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.015em
  title-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-medium:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.005em
  title-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
  body-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.006em
  body-medium:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: -0.004em
  body-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0em
  label-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0em
  label-medium:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 11.5px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0.005em
  label-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: 10.5px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0.01em
rounded:
  xs: 4px
  sm: 7px
  control: 9px
  field: 10px
  lg: 12px
  panel: 16px
  sheet: 20px
  spotlight: 22px
  full: 9999px
spacing:
  xxs: 4px
  xs: 6px
  sm: 8px
  md: 10px
  lg: 12px
  xl: 14px
  xxl: 16px
  panel: 18px
  section: 20px
  page: 24px
  shell: 26px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.control}"
    height: 34px
    padding: 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.panel}"
    padding: 18px
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.field}"
    height: 34px
    padding: 14px
  sidebar:
    backgroundColor: "rgba(246, 248, 252, 0.76)"
    textColor: "{colors.text-primary}"
    width: 240px
    padding: 12px
  top-bar:
    backgroundColor: "rgba(255, 255, 255, 0.68)"
    textColor: "{colors.text-primary}"
    height: 58px
    padding: 26px
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.panel}"
    padding: 18px
  table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.panel}"
    padding: 14px
  spotlight:
    backgroundColor: "rgba(255, 255, 255, 0.95)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.spotlight}"
    width: 720px
    padding: 12px
  spotlight-search:
    backgroundColor: "rgba(118, 118, 128, 0.12)"
    textColor: "{colors.text-primary}"
    typography: "{typography.title-medium}"
    rounded: "{rounded.field}"
    height: 36px
    padding: 10px
---

# School OS HIG

## Overview

School OS is a calm, content-first school operations interface inspired by Apple Human Interface Guidelines and the interaction density of macOS Settings/Finder. It is not an Apple clone and must not copy Apple branding, SF Symbols, proprietary fonts, wallpapers, or other proprietary assets. The active system uses original project assets, cross-platform system typography, Lucide stroke icons, and semantic colors implemented in the existing React/Tailwind component layer.

The intended feeling is **quiet, precise, institutional, and highly usable**. Desktop screens should feel like a capable native productivity application: compact toolbar, restrained translucent sidebar, grouped surfaces, thin separators, dense but readable tables, and minimal decorative chrome. Mobile screens should preserve the same hierarchy while increasing touch comfort and using bottom navigation/sheet-like dialogs where appropriate.

This file is the primary cross-agent visual source of truth. The normative token values above are derived from the production implementation in `app/src/client/Main.css` and the shared components in `app/src/client/components/m3/`. The historical `M3*` names are compatibility APIs only; Material 3 is not the active visual authority. Detailed implementation history remains in `docs/UI_UX_APPLE_HIG.md`.

When a design choice is not explicitly specified, choose the option that keeps attention on school data and the user's current task rather than on decoration. Toolbar gives context; sidebar gives orientation; content area gives work and data without excessive chrome.

## Colors

The interface is built on neutral grouped surfaces and sparse semantic color.

- **System action blue (`#0071E3`)** is the production filled-action color. `#007AFF` remains the visual reference blue for selection and Apple-like accents where contrast permits. Blue is not decoration; it signals primary action, active navigation, focus, or selected state.
- **Success green (`#237A36`)**, **warning orange (`#A05A00`)**, and **error red (`#D70015`)** are contrast-adjusted light-mode action/status colors. Their brighter system-reference counterparts are reserved for icon tiles, non-filled accents, or dark mode.
- **Grouped background (`#F2F2F7`)** and **white surface (`#FFFFFF`)** form the default light hierarchy. Panels should usually differ by grouping, separator, or a very slight surface shift rather than by saturated fill.
- **Primary text** uses near-black at about 85% opacity. **Secondary text** uses the system-gray family at about 60% opacity. Avoid low-contrast gray for primary labels.
- **Separators** are intentionally faint (`rgba(60,60,67,.12)`). Borders should organize, not box every element.
- Dark mode uses black grouped background, `#1C1C1E` surfaces, `#0A84FF` blue, and the brighter green/orange/red tokens listed in frontmatter.
- Status must never depend on color alone. Pair state color with a label, icon, count, text, or other explicit signal.

Sidebar icon tiles may use the defined Apple-like blue, indigo, cyan, green, orange, pink, purple, and red palette when each icon has a stable semantic mapping. Do not introduce arbitrary page-specific rainbow palettes.

## Typography

Use the operating-system stack declared in the tokens. Do not bundle or redistribute Apple font files. On Apple devices, the browser may resolve the installed system face; on other platforms, use the next available system font.

Desktop typography is intentionally compact. Common controls and table content are around 13px; primary titles are commonly 17px; section/body copy typically uses 12–16px depending on hierarchy. Mobile body/control text increases where needed for handheld readability.

Use weight and spacing more than oversized type to express hierarchy. Most operational pages need only a compact title, a restrained eyebrow or supporting line, and normal data text. Avoid giant dashboard headlines, marketing-style hero typography, or multiple competing headline scales inside authenticated application screens.

Negative letter spacing is subtle and follows the production system tokens. Uppercase section labels are small, semibold, and letter-spaced; they are navigational metadata, not decorative display text.

## Layout

Desktop is optimized for information density and precision input.

- Expanded sidebar: approximately **240px**. Collapsed rail: approximately **60px**.
- Top toolbar: approximately **58px** high.
- Main grouped panels: usually **16px** radius with 16–18px internal padding.
- Standard page rhythm: 20–24px between major content groups; smaller 6–12px gaps within controls and rows.
- Desktop forms and buttons use compact control heights around 32–36px. Mobile interactive controls should remain approximately **44px or larger**.
- Content should use available horizontal space for real operational data. Do not convert dense desktop tables into decorative card grids merely for visual novelty.
- Long labels should truncate or wrap deliberately without changing neighboring data geometry.
- Mobile reflows grouped information into lists/cards, preserves safe-area bottom spacing, and keeps role-aware bottom navigation usable.

Prefer clear alignment lanes for labels, data, progress indicators, and actions. Repeated rows should share consistent starting and ending edges. When a toolbar already provides page context, avoid duplicating the same information in an oversized breadcrumb/hero block.

## Elevation & Depth

Depth is restrained and secondary to grouping.

- Base panels use either a thin separator/border or a very light `0 1px 2px` shadow.
- Interactive cards may gain a small `0 2px 10px` shadow on hover, but should not float dramatically.
- Dialogs and Spotlight may use stronger shadows because they sit above a scrim and must establish modal depth.
- Sidebar and toolbar use translucent materials with blur/saturation where supported. They should feel like application chrome, not frosted-glass decoration.
- Avoid decorative gradients in authenticated operational UI. The authentication wallpaper is a separate, original project asset and must not become a general-purpose panel treatment.

Do not stack multiple heavy shadows, glowing borders, or glass effects on ordinary data surfaces.

## Shapes

Use a small, deliberate radius family.

- **7–10px:** compact controls, icon buttons, navigation rows, fields, search controls.
- **12px:** selected compact floating controls or special action surfaces.
- **16px:** primary grouped panels, cards, tables, and desktop dialogs.
- **20px top corners:** mobile sheet/dialog treatment.
- **22px:** Spotlight search surface.
- **Full radius:** avatars, status dots, pills, and circular clear affordances only.

Do not make every element pill-shaped. Do not mix sharp rectangles with oversized 24–32px card radii in the same operational view. Thin 0.5–1px separators are preferred to thick outlines.

## Components

### App shell

`M3NavigationDrawer` is the macOS Settings/Finder-style sidebar despite its historical name. It uses a translucent material, thin right separator, grouped section labels, compact 9px navigation-row radius, restrained stroke icons, and strong near-black labels. Active navigation uses system blue with white text. The school identity row belongs to the sidebar and should not be duplicated as branding chrome elsewhere.

`M3TopAppBar` is a compact translucent toolbar. It provides page context, small global actions, notification/search access, and mobile drawer control. Do not turn it into a marketing header.

### Navigation icons

Use Lucide stroke icons first for the primary desktop shell. Keep strokes restrained and icon geometry simple. Small rounded icon tiles may be used when they encode a stable category or attention type, especially in sidebar and Settings-like lists. Material Symbols remain an existing fallback API but should not drive a Material visual redesign. Emoji are not UI icons.

### Search and Spotlight

The sidebar search is a single filled system-gray control with no visible rectangular inner-input chrome. Spotlight is keyboard-first and modal: `Cmd+K` on macOS and `Ctrl+K` on Windows/Linux; Escape closes; arrows move; Enter opens.

Spotlight uses a maximum desktop width of about 720px, 22px surface radius, restrained blur, and a 36px desktop / 40px mobile search control. The search wrapper is the only visual frame; the internal input remains transparent with zero border, radius, shadow, and outline, including Safari/WebKit search chrome. Selected results use system blue; inactive results remain neutral.

### Buttons

Use filled blue for the most important action, tonal blue for secondary emphasis, outlined/elevated for bounded utility actions, text style for low-emphasis navigation, and red only for destructive actions. Tonal/translucent fills must be evaluated after compositing against their actual surface; do not assume an alpha token alone satisfies text contrast. Desktop controls are compact; mobile uses larger touch heights. Button labels are concise verbs or direct actions. Avoid multiple filled-primary buttons competing in the same local action group.

### Fields and selects

Fields use white/dark-surface backgrounds, 10px radius, thin neutral borders, and a subtle blue focus halo. Labels are 13px semibold. Error state changes border/text semantically and must include readable error copy. Forms should look like system controls, not large floating cards around every input.

### Cards and grouped lists

`M3Card` maps to a grouped content surface. Default operational cards use 16px radius, subtle border, and almost no shadow. Prefer grouped lists (`hig-list` / `hig-list-row`) for settings, attention queues, compact operational summaries, and navigation rows where repeated geometry is more useful than separate cards.

### Tables

Use `M3Table` for desktop data density. Tables sit in a 16px grouped surface, use a subtle low-surface header, 11.5px semibold headers, 13px cells, thin row separators, and a very faint hover state. Keep tables horizontally scrollable when necessary rather than shrinking text below readable sizes.

### Dialogs and evidence previews

Desktop dialogs are centered 16px-radius surfaces; mobile dialogs attach to the bottom with 20px top corners when appropriate. Use a modest black scrim, preserve keyboard focus, support Escape, lock background scroll, and restore focus on close. Media/evidence previews should stay in an authenticated in-page dialog when feasible instead of opening unprotected raw URLs or unnecessary new tabs.

### Status, badges, and EWS

Badges and EWS states communicate verified system conditions, not decoration. EWS is a prioritization aid and must not visually imply that an automated signal is already a disciplinary decision. Missing measurements remain neutral rather than being presented as zero or failure.

### Dashboards

Dashboards use real server-backed data only. Prefer compact stat strips, grouped lists, aligned progress rows, and explicit empty states. Never invent counts, trends, revenue, attendance, student progress, or other metrics to balance a layout.

## Do's and Don'ts

- **Do** read this file before implementing or generating School OS UI.
- **Do** preserve the existing HIG-inspired system even though shared component names still begin with `M3`.
- **Do** use system typography, semantic colors, thin separators, restrained stroke icons, grouped surfaces, and compact desktop density.
- **Do** keep mobile touch targets around 44px or larger and respect safe areas.
- **Do** use real role/tenant-scoped data and honest loading, error, and empty states.
- **Do** preserve keyboard workflows, visible focus, reduced-motion support, and readable light/dark contrast.
- **Do** use modal/in-page previews for protected evidence when that keeps authentication and context intact.
- **Do** treat authorization as a server concern; hiding a menu item is never the security boundary.
- **Don't** redesign new work back toward Material 3 solely because of `M3*` source names.
- **Don't** imitate Apple branding or ship proprietary Apple fonts, SF Symbols, wallpapers, or other assets.
- **Don't** use emoji as application icons.
- **Don't** use decorative gradients, giant hero cards, oversized headings, glow effects, or heavy shadows in operational screens.
- **Don't** make every control a pill or every data section a separate floating card.
- **Don't** use color as the only status signal or invent metrics for visual completeness.
- **Don't** duplicate toolbar/sidebar context with redundant hero/breadcrumb chrome.
- **Don't** open authenticated evidence through a raw URL that bypasses the app's bearer-session flow.
