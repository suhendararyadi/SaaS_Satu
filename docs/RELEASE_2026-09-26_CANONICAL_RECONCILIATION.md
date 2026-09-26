# Release Record — Canonical Repository Reconciliation

Date: **26 September 2026 (Asia/Jakarta)**

## Purpose

Normalize School OS source control after parallel feature work and immutable releases so future agents have one unambiguous canonical repository and do not accidentally resume work from the historical `SaaS_Satu-hardening` worktree.

## Canonical source

- Repository: `/home/ubuntu/projects/SaaS_Satu`
- Branch: `main`
- GitHub remote `main` is the publication target.
- New feature work should use isolated worktrees under `/home/ubuntu/.cache/mso-worktrees/` based on the verified live lineage.

`/home/ubuntu/projects/SaaS_Satu-hardening` is a linked worktree of the same repository on `redesign/apple-hig`. Its unique post-divergence commits are documentation-only. It is not the production source and may be detached/removed after canonical push verification; the branch may remain as historical Git provenance.

## Production source reconciled

Actual live state verified before reconciliation:

- backend: `c7814f5de663cac48df38eeca860782af940923d`
- backend release: `c7814f5-lms-teaching-session-gen1`
- static/frontend: `c3297df47447bed8b2b59350f7db4a0e6266f8e4`
- static release: `c3297df-sidebar-color-polish`
- service: `saas-satu.service` active

`c3297df` descends directly from `c7814f5`, so it is the source superset for the live backend/frontend application. GitHub `main` already contained the OpenClaw integration history; reconciliation merges both histories rather than replacing either side.

## Durable artifacts restored to canonical source

- `RELEASE_2026-09-21_STUDENT_LOGIN_PROVISIONING.md`
- `RELEASE_2026-09-23_ATTENDANCE_GLOBAL_LMS_ONEWAY.md`
- `RELEASE_2026-09-23_LMS_TEACHING_SESSION_GEN1.md`
- `RELEASE_2026-09-24_SIDEBAR_COLOR_POLISH.md`
- `DEMO_SCENARIO_SMKN12_GARUT.md`
- `app/scripts/school-os-demo-smkn12.mjs`
- `app/scripts/school-os-demo-smkn12-modern.mjs`

## SMKN 12 Garut baseline

Authoritative real/Dapodik baseline remains:

- students: **1,539**
- class rooms: **50**

Current integrated demo overlay:

- demo students: **21**
- demo teachers: **6**
- demo DUDI mentors: **2**
- demo class rooms: **5**
- demo companies: **4**
- demo placements: **8**
- demo Teaching Sessions: **5**

A separate legacy demo `DEMO-PKL-01 — PT Demo PKL School OS` with one placement also remains from the 21 September test. It is not authoritative real-industry data.

## Deployment metadata

`/home/ubuntu/deployments/SaaS_Satu/RELEASE_CURRENT` had become stale relative to the actual symlinks. During reconciliation it is refreshed from the verified backend/static pointers. Actual symlinks and service runtime remain the authority if metadata ever disagrees again.

## Deployment impact

This reconciliation is a source-control/documentation normalization. It does not require a new application deployment or database migration because the merged source reflects functionality that is already live.

## Verification gate

The reconciled source was verified before publishing canonical `main`:

- live backend lineage included: PASS;
- live static lineage included: PASS;
- previous GitHub `main` / OpenClaw lineage included: PASS;
- `git diff --check`: PASS;
- Wasp 0.25 full build: PASS;
- full Vitest regression: **191/191 PASS across 35 test files**;
- generated server TypeScript/Rollup bundle: PASS;
- Vite production SSR build: PASS;
- Vite production client build: PASS.

No production deploy was performed as part of reconciliation; backend/static symlinks stayed on the already-live releases.
