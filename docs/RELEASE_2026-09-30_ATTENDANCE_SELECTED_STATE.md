# Release — Attendance Selected-State Visibility

**Date:** 30 September 2026 (Asia/Jakarta)  
**Source commit:** `7db1b56470cb8288cc66fa8919759118d40c4a2c`  
**Static release:** `7db1b56-attendance-selected-state`  
**Production:** `https://sekolah.suhendararyadi.com/school/attendance`

## Scope

This frontend-only release strengthens the visual distinction between idle and selected daily-attendance status controls without changing attendance persistence or backend behavior.

Selected controls now use:

- stronger status-colored background and border;
- 2px status-colored focus-like ring;
- stronger but restrained shadow;
- filled status icon with higher contrast;
- extra-bold selected label;
- explicit checkmark as a second non-color signal;
- retained `aria-pressed` semantics.

Idle controls keep the lighter treatment so the selected choice is easier to scan across a full class roster.

## Runtime impact

- Backend remains `e4bd953-attendance-unrecorded`.
- Static is `7db1b56-attendance-selected-state`.
- Static rollback is `e4bd953-attendance-unrecorded`.
- No database/schema/API/business-logic changes.

## Verification

- `git diff --check`: PASS;
- full Vitest regression: **207/207 PASS across 38 files**;
- Wasp build: PASS;
- Vite production SSR/client build: PASS;
- bounded static preflight: PASS;
- bounded static deployment: PASS;
- repeated static deployment: **idempotent true**;
- public `/school/attendance`: HTTP 200;
- public `/school`: HTTP 200;
- `saas-satu.service`: active;
- backend production pointer remained `e4bd953-attendance-unrecorded`.

Existing dependency/deprecation warnings and the known Vite Prisma browser-alias warning remain nonblocking technical debt outside this UI-only scope.
