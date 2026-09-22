# Release — Student Mobile Attendance UI

Date: **23 September 2026**  
Production release: **`c083fdf-student-mobile-attendance`**  
Runtime commit: **`c083fdf`**  
Previous rollback release: **`d77dd38-attendance360`**

## Purpose

Refine the School OS student mobile attendance experience using the interaction hierarchy of the supplied attendance-app references while keeping `DESIGN.md` as the sole visual authority.

The reference was used for **composition and task hierarchy only**. The implementation deliberately does not copy its branding, gradients, typography, oversized card radii, or visual language.

## Mobile composition delivered

On `/school/my-attendance` below the `md` breakpoint, the student now gets an app-like attendance surface with:

- personal student header: initials, greeting, student name, class, notification shortcut;
- centered Jakarta/server-relative date and live clock;
- school/location identity;
- client-side distance preview and GPS-accuracy state;
- a single dominant circular `MASUK` / `PULANG` / `SELESAI` action;
- explicit support text explaining why the action is ready or unavailable;
- clear inside/outside-radius, GPS-accuracy, school-day, policy, and time-window feedback;
- two-column school check-in / check-out schedule and actual recorded times;
- selfie/evidence section with optional note;
- permit/sick shortcut;
- today's evidence list;
- attendance history section;
- floating HIG-style bottom navigation: `Riwayat · Presensi · Akun` on the attendance page.

Outside the attendance page, the student mobile bottom navigation now includes `Presensi` as a first-class destination while retaining learning/PKL navigation where applicable.

## DESIGN.md preservation

The redesign stays inside the existing School OS HIG system:

- system action blue from project tokens;
- grouped neutral background and white/dark surfaces;
- 16px primary panel radius;
- 9px control/selection radius;
- low shadows and thin separators;
- system font stack;
- Lucide stroke icons;
- no decorative gradient in authenticated UI;
- semantic states always include text/icon, never color alone;
- mobile controls remain touch-friendly;
- desktop page and role shells remain unchanged.

`DESIGN.md` was **not modified** and remains the authoritative cross-agent visual source of truth.

## Attendance 360 behavior preserved

No attendance authorization or truth logic was weakened.

- server-side geofence remains authoritative;
- server schedule/calendar policy remains authoritative;
- selfie evidence requirements remain server-enforced;
- check-in/check-out idempotency remains unchanged;
- tenant isolation remains unchanged;
- `SchoolDailyAttendance` remains canonical;
- the new distance/radius display is a client preview only;
- the large mobile CTA never bypasses selfie, geofence, GPS-accuracy, school-day, or time-window validation.

`getMyAttendance` only gained safe student/class/school display context required by the new mobile header.

## Verification

- `git diff --check`: PASS
- Wasp build: PASS
- full regression: **163/163 PASS across 30 files**
- generated server bundle: PASS
- Vite SSR build: PASS
- Vite client production build: PASS
- immutable release preflight: PASS
- production deploy: PASS
- repeat deploy: **idempotent=true**
- `/school`: 200
- `/school/my-attendance`: 200
- `/school/lms/courses`: 200
- `/account`: 200
- unauthenticated `get-my-attendance`: 401
- unauthenticated `record-self-attendance`: 401
- service: active
- recent service error scan: clean

Production data integrity after deploy:

- SMKN 12 Garut students: **1,539**
- SMKN 12 Garut daily attendance: **0**
- SMKN 12 Garut Attendance 360 events: **0**
- SMKN 12 Garut Attendance 360 policy: **0**
- SMKN 1 Rongga UAT policy: **1**
- SMKN 1 Rongga UAT Attendance 360 events: **18**

VPS post-deploy snapshot was healthy (CPU idle at check time, service active, memory well within available capacity).

## Manual visual verification

Because no test password/session is stored or fabricated by the deployment workflow, authenticated mobile visual verification should be completed with the existing login-ready SMKN 1 Rongga student demo account from `DEMO_ACCOUNTS_SMKN1_RONGGA.md`.

Recommended viewport: physical iPhone/Android browser or responsive width around **390–430 px**. Verify the reference-inspired hierarchy while confirming HIG surfaces, spacing, status semantics, camera/GPS permission handling, safe-area bottom navigation, and scroll behavior.
