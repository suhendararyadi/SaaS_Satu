# Release — School OS Sidebar Color Polish

Date: **24 September 2026 (Asia/Jakarta)**
Status: **LIVE (static/frontend)**

## Runtime

Static commit: `c3297df47447bed8b2b59350f7db4a0e6266f8e4`

Static release: `c3297df-sidebar-color-polish`

The commit is a direct descendant of backend runtime commit `c7814f5de663cac48df38eeca860782af940923d`, so it contains the same Teaching Session source plus the final sidebar visual refinement.

## Scope

The change rebalances navigation drawer color usage to reduce excessive purple emphasis while retaining the Apple HIG-inspired School OS hierarchy. It also adds component regression coverage for navigation drawer styling.

Changed source:

- `app/src/client/components/m3/M3NavigationDrawer.tsx`
- `app/src/client/components/m3/m3Components.test.tsx`

No database/schema/backend behavior changed in this static-only refinement.

## Production verification

On 26 September 2026 the live static pointer was re-verified as:

`/var/www/saas-satu/releases/c3297df-sidebar-color-polish`

The backend remained:

`/home/ubuntu/deployments/SaaS_Satu/releases/c7814f5-lms-teaching-session-gen1`
