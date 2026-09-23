# Release — School OS Spotlight Search

Date: **11 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Summary

School OS now includes a global macOS-inspired Spotlight Search for authenticated users.

Primary entry points:

- `Cmd+K` on macOS;
- `Ctrl+K` on Windows/Linux;
- `Cari` control in the School OS top bar.

The feature is a real command/search surface, not a decorative modal. It searches role-authorized navigation locally and extends to tenant-scoped school data through a server query after two characters.

## Runtime release

Application commit:

`4e50fd56e44acc95077a7695990efb34ec6299b7`
`feat(school): add Spotlight search`

Regression test commit:

`3188ae8`
`test(school): cover Spotlight interactions`

Production release:

`4e50fd5-school-spotlight`

Live pointers after cutover:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/4e50fd5-school-spotlight`
- static: `/var/www/saas-satu/releases/5eb8b87-spotlight-input-chrome-fix`

Immediate rollback:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/5b16861-website-phase2`
- static: `/var/www/saas-satu/releases/5f20bdc-spotlight-apple-searchfield`

No Prisma schema change, migration, seed, or school-data mutation was required.

## User experience

The Spotlight surface uses the active School OS HIG-inspired design contract:

The Apple-style search-field refinement (`5f20bdc`) established the single filled search control. Follow-up fix `5eb8b87` removes the remaining rectangular inner-input chrome seen in Safari by making the wrapper the only visual frame (`overflow-hidden`) and forcing the internal search input to zero border, radius, ring, shadow, and outline in normal/focus states. WebKit search decoration/cancel/results controls are also disabled with `!important`. The selected result row remains 52px minimum height with 10px radius, and dark mode uses `#0A84FF`.

- centered translucent/material command palette;
- system search glyph and typography;
- compact list rows;
- active result uses semantic system blue;
- dark-mode compatible;
- mobile-responsive;
- keyboard-first navigation;
- honest loading/error/empty states.

Keyboard:

- `Cmd/Ctrl+K`: open/toggle;
- `Esc`: close;
- `Arrow Up/Down`: move selection;
- `Enter`: open active result.

Recent destinations are stored only in browser localStorage under:

`school_spotlight_recent_v1`

They are not persisted to the database.

## Search behavior

### Menu search

Menu results are filtered immediately from the role-aware navigation sections already available to the current School OS user. Spotlight cannot surface a navigation route that was not supplied to the active role.

### Data search

Data search begins after a minimum of two normalized characters and is debounced before calling the server operation.

Search categories by role:

| Role | Searchable data |
| --- | --- |
| SCHOOL_ADMIN / tenant-active platform admin | Students, teachers/staff, class rooms, LMS courses, DUDI companies, PKL placements, Website Sekolah content |
| TEACHER | Students, class rooms, own LMS courses, supervised PKL placements |
| STUDENT | LMS courses for own class room, own PKL placement |
| DUDI_MENTOR | Assigned PKL placements only |

The data operation always applies the active user's `schoolId`.

Assignment-level scoping is additionally enforced for Teacher, Student, and DUDI Mentor results.

## Deep-link behavior

Spotlight results attempt to preserve the user's context rather than only opening a module root:

- student → `/school/students?spotlight=...`
- teacher → `/school/teachers?spotlight=...`
- class room → `/school/classes?spotlight=...`
- DUDI company → `/school/pkl/companies?spotlight=...`
- admin PKL placement → `/school/pkl/placements?spotlight=...`
- LMS course → direct course detail
- Website Sekolah content → Website Sekolah workspace

The destination list pages initialize their existing search field from `?spotlight=`.

## Security boundary

Spotlight does not use client visibility as an authorization decision.

Server operation:

`getSchoolSpotlightSearch`

Security characteristics:

- `ensureSchoolUser` is required;
- active `schoolId` is applied to all searchable models;
- allowed categories are derived from explicit role policy;
- teacher LMS is constrained to `teacherId`;
- student LMS is constrained to `classRoomId`;
- PKL results are constrained to teacher supervisor, student, or DUDI mentor assignment where applicable;
- Website Sekolah content search is management-only;
- unauthenticated operation calls return HTTP 401.

Sensitive authentication/session material was not created or exposed for testing.

## Quality gates

Source and production verification completed:

- Spotlight policy tests: **5/5 PASS**
- Spotlight interaction tests: **3/3 PASS**
- full test suite: **84/84 PASS** across 8 test files
- TypeScript: **PASS**
- Wasp 0.25 production compile/build: **PASS**
- Vite SSR production build: **PASS**
- Vite client production build: **PASS**
- backend bundle: **PASS**
- `git diff --check`: **PASS**
- schema/migration diff: **none**
- full release preflight: **PASS**
- blue-green startup on port 3102: **PASS**
- blue-green `/auth/me`: HTTP 200
- blue-green unauthenticated Spotlight operation: HTTP 401
- production cutover: **PASS**
- live Spotlight unauthenticated operation: HTTP 401
- recent Spotlight/auth 500 count in verification window: **0**
- Website Sekolah public landing regression smoke: HTTP 200
- Website Sekolah sitemap regression smoke: HTTP 200
- `saas-satu.service`: active

Static bundle markers confirm both the top-bar Spotlight trigger and `School OS Spotlight` palette are present in the active production artifact.

## Verification note

An automated authenticated browser session was intentionally not fabricated because official reusable Guru/Siswa/DUDI test credentials have not yet been created. The rollout therefore did not create a synthetic password or production session solely for smoke testing.

Coverage instead includes:

- role/scope policy unit tests;
- UI interaction tests;
- Wasp compile/type validation;
- real blue-green backend startup;
- live unauthenticated security boundary;
- production health checks.

A logged-in user can perform final user-acceptance inspection directly with `Cmd/Ctrl+K`.

## Existing dependency debt

The existing npm audit baseline remains:

- 8 moderate;
- 5 high.

This release does not claim to resolve that pre-existing dependency debt. Dependency upgrades should remain a separate regression-tested task.
