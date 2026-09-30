# Release — Student & Teacher Mobile UX Hardening

**Date:** 30 September 2026 (Asia/Jakarta)  
**Source commit:** `adad36c053c55dbb3f4e2204de9a9c05a37882c9`  
**Static release:** `adad36c-mobile-ux-hardening`  
**Production:** `https://sekolah.suhendararyadi.com`

## Goal

Make School OS easier to operate on phones for Students and Teachers, with special attention to experienced/senior teachers who benefit from larger touch targets, clearer hierarchy, fewer hidden daily tasks, and less desktop-style density.

This release keeps the active Apple HIG-inspired design language and changes frontend ergonomics only.

## What changed

### Mobile foundation

- Bottom navigation target height increased to 64px.
- Mobile tabs use 44px-class targets; chips use 44px-class height.
- Notification trigger uses a 44px-class mobile target.
- Dialog action areas remain reachable while scrolling on compact screens.
- HIG list rows become taller on mobile and section titles/notes use more readable mobile sizes.
- Top-bar subtitle is hidden on very narrow screens; Spotlight button is hidden on compact screens because Menu already exposes navigation search, reducing top-bar crowding.

### Teacher navigation and home

- Wali Kelas bottom navigation: `Beranda`, `Hari Ini`, `Presensi`, `Wali Kelas`, `Menu`.
- Other Teachers: `Beranda`, `Hari Ini`, `Kelas`, optional `PKL`, `Menu`.
- Teacher Dashboard now starts with `Pekerjaan guru hari ini`, exposing KBM and homeroom actions before secondary KPI cards.

### Teaching Session

- Compact screens show a 4-step guide: `Mulai → Presensi → Tinjau → Selesai`.
- Subject attendance controls are 48px-class grid buttons on mobile and retain compact pills on larger screens.
- Engagement rubric controls use the same large-target mobile treatment.
- Attendance save area is sticky above mobile navigation and shows progress such as `31/36`.
- Engagement section shows how many students have been scored.
- Check-out and save actions become full-width on compact screens.

### Wali Kelas

- Mobile no longer depends on a horizontally scrollable data table.
- Each student is shown as a readable mobile card with identity, PKL state (when applicable), latest PKL attendance/journal state, student-affairs indicators, and clear `Buka Profil` / `Kesiswaan` actions.
- The existing table is retained for medium and desktop layouts.

### Daily Attendance and Student Attendance

- Daily Attendance status targets are enlarged on mobile while preserving the stronger selected-state ring/checkmark treatment.
- Student Attendance retains its existing task-first check-in/out experience and increases readability of smaller supporting text.

## Runtime impact

- **Backend remains:** `e4bd953-attendance-unrecorded`.
- **Static:** `adad36c-mobile-ux-hardening`.
- **Static rollback:** `7db1b56-attendance-selected-state`.
- No database migration.
- No API, auth, attendance, LMS persistence, or tenant policy changes.
- `saas-satu.service` was not switched or restarted by the static rollout.

## Verification

- `git diff --check`: PASS.
- Focused UI/shell/attendance/teaching regression: **59/59 PASS across 6 files**.
- Full Vitest regression: **208/208 PASS across 38 files**.
- Wasp build / TypeScript SDK compile: PASS.
- Vite production SSR build: PASS.
- Vite production client build: PASS.
- Bounded `school_os_deploy_static_preflight`: PASS.
- Bounded `school_os_deploy_static`: PASS.
- Repeated deployment: **idempotent true**.
- `saas-satu.service`: active.
- Public routes `/school`, `/school/attendance`, `/school/governance/walikelas`, `/school/lms/teaching`, `/school/my-attendance`: HTTP 200.
- Backend `/auth/me` health during rollout: HTTP 200.
- Unauthenticated admin-dashboard operation during rollout: HTTP 401.
- Live bundles contain the new teacher action-first and Teaching Session progress/progress-copy contracts.
- `af4bf88-ews-monitoring` remains staging only and is not a production pointer.

## Follow-up UAT

Automated regression, compile/build and production smoke are complete. A human real-device UAT should still be performed with representative Students and Teachers (including senior teachers), especially on 320/360/390/430px-class devices, keyboard-open forms, and common Android browsers. The deployment environment cannot substitute for physical-device handling, vision, motor accuracy, GPS/camera behavior, or subjective ease-of-use.

Existing npm dependency/deprecation warnings and the known nonblocking Vite Prisma browser-alias warning remain outside this frontend UX scope.
