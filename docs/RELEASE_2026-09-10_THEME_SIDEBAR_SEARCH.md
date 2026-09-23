# School OS Release: Theme, Account Chrome, and Sidebar Search

Date: 10 September 2026 (Asia/Jakarta)

## Scope

This frontend-only refinement addresses three production review items:

1. Super Admin light mode did not reliably switch after navigating from a School OS page that had dark mode active.
2. The School sidebar repeated the logged-in account identity even though the account control already exists in the top toolbar, and the toolbar trigger itself was visually too verbose.
3. The School sidebar had no menu search.

## Root cause: Super Admin light mode

The School OS shell and the Super Admin shell were using two different theme contracts.

- School OS persisted the theme in localStorage key `theme` and toggled the `dark` class on both `document.documentElement` and `document.body`.
- Super Admin still used the legacy `useColorMode()` path, persisted `color-theme`, and only controlled the body class.

When a user arrived at `/admin` after using dark mode in School OS, the `dark` class could remain on the HTML element. Switching the legacy admin control to light mode therefore did not remove every active dark-mode selector.

The Super Admin shell now uses the same contract as School OS: localStorage key `theme`, system preference fallback, and synchronized `dark` class state on both HTML and body.

## Account chrome refinement

`M3AccountMenu` now uses a single circular avatar/initial as its toolbar trigger. The visible name, role label, and disclosure chevron were removed from the trigger to reduce toolbar chrome. Full account identity and actions remain available inside the dropdown.

The School sidebar no longer renders the duplicate account footer. The Super Admin sidebar may still render its platform context footer because that shell is separate from the School tenant sidebar requested in this refinement.

## School sidebar search

The expanded desktop School sidebar and mobile School drawer now expose a compact `Cari menu` search field.

Behavior:

- filtering is case-insensitive and locale-aware;
- it searches only existing navigation section names and existing menu labels;
- a section-name match keeps the real items from that section visible;
- a menu-label match shows only matching real navigation items;
- no routes or menu items are fabricated;
- the clear control resets the query;
- an honest `Menu tidak ditemukan.` state is shown when there are no matches;
- search is intentionally hidden in the collapsed navigation rail because the rail has insufficient space for a text field.

## Authorization and data boundaries

No backend operation, database schema, migration, tenant isolation rule, role rule, or `user.isAdmin` authorization was changed. Search only filters navigation that the current role has already been allowed to see.

## Quality gates

Source verification before rollout:

- TypeScript `tsc --noEmit`: PASS;
- full Vitest: 5 test files, **70/70 tests PASS**;
- two regression tests added for School sidebar search/account-footer behavior and avatar-only account trigger;
- `git diff --check`: PASS;
- anti-slop em-dash scan for changed UI files: PASS;
- Prisma schema/migration diff: NONE;
- Wasp 0.25.0 production build: PASS;
- Vite SSR build: PASS;
- Vite client build with production API origin: PASS.

The first Wasp build attempt inherited `NODE_ENV=production` from the host environment, which caused Wasp's build-time npm install to prune required development dependencies. This was a build-environment issue, not a source failure. Dependencies were restored with `wasp install` and the production build was repeated with `NODE_ENV` unset during compilation. Runtime production configuration was not changed.

Existing npm dependency audit debt remains and this release is not described as audit-clean.

## Production rollout

Application source commit:

`37754b3808569836e2488ff70643718e82f97837` (`refine(shell): fix theme and add sidebar search`)

Static release:

`/var/www/saas-satu/releases/37754b3-theme-sidebar-search`

Backend intentionally retained:

`/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring`

Rollback static:

`/var/www/saas-satu/releases/ef167b5-auth-admin-hig`

Post-cutover checks:

- `saas-satu.service`: active;
- `/admin`: HTTP 200;
- `/school`: HTTP 200;
- `/login`: HTTP 200;
- `/auth/me`: HTTP 200;
- unauthenticated School Admin dashboard operation remains HTTP 401 through the bounded deploy smoke test;
- live bundle contains sidebar search, search empty state, avatar-only account trigger, and the unified Super Admin theme contract;
- recent `/auth/me` HTTP 500 count during verification: 0;
- backend pointer was not changed and the backend service was not restarted by this static-only rollout.
