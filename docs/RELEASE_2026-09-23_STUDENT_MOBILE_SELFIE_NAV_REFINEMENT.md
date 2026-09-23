# Release — Student Mobile Selfie & Navigation Refinement

Date: **23 September 2026**  
Production release: **`eada47c-student-mobile-selfie-nav`**  
Runtime commit: **`eada47c`**  
Rollback release: **`c083fdf-student-mobile-attendance`**

## Scope

This refinement continues the student mobile panel work without changing the visual authority of root `DESIGN.md`.

### 1. Attendance navigation is integrated with the student home shell

The attendance page no longer replaces the normal student bottom navigation with a special `Riwayat · Presensi · Akun` navigation set.

All student mobile pages now use the same role-aware bottom navigation pattern:

- Beranda
- Presensi
- Kelas
- PKL when applicable
- Akun

This removes page-specific navigation drift and keeps `/school/my-attendance` consistent with the student home experience.

### 2. Main attendance action opens selfie capture directly

On mobile, tapping the large `MASUK` / `PULANG` attendance control now opens the front-camera file capture directly when selfie evidence is required.

The old separate mobile `Verifikasi presensi` card has been removed.

Flow:

1. policy/day/time/GPS/radius conditions must already be valid;
2. student taps `MASUK` or `PULANG`;
3. native front-camera capture opens;
4. selected selfie is uploaded through the authenticated evidence endpoint;
5. successful upload immediately calls the existing `recordSelfAttendance` operation with that evidence key;
6. server remains authoritative for geofence, GPS accuracy, schedule, selfie requirement, idempotency and tenant scope.

If evidence upload fails, the existing mobile warning surface receives the error message. The desktop attendance form keeps its existing explicit uploader/notes controls.

### 3. Student mobile sidebar removed

For role `STUDENT` on small screens:

- the hamburger/drawer trigger is not rendered;
- the mobile navigation drawer cannot open;
- the desktop sidebar remains available at the desktop breakpoint;
- bottom navigation is the primary mobile navigation mechanism.

Teacher/Admin/DUDI mobile drawer behavior is unchanged.

## DESIGN.md preservation

No change was made to `DESIGN.md`. The implementation continues using the existing School OS HIG tokens, grouped surfaces, system typography, Lucide icons, touch targets, subtle borders/shadows and semantic status language.

## Verification

- `git diff --check`: PASS
- Wasp compile/build: PASS
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

Manual mobile verification should still confirm the native camera picker behavior on the user's actual iOS/Android browser because browser camera-launch UX is platform controlled.
