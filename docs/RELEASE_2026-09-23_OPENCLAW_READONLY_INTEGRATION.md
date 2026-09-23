# Release — OpenClaw read-only integration API

**Date:** 23 September 2026
**Production release (backend):** `884abc6-openclaw-integration`
**Runtime commit:** `884abc6`
**Rollback release (backend):** `5a4d731-tu-content-gen2`
**Static release:** unchanged — `5a4d731-tu-content-gen2` (no client code changed)

## Why

The product owner wants daily student attendance (and other School OS data) read
**without opening the panel**. The integration is deliberately not a browser
session and not a database credential: it is a small, token-protected HTTP
surface that answers only read requests over loopback.

Design concept agreed with the owner: **A + C** — a scoped read-only endpoint
(A) plus a scheduled digest pushed to Telegram (C).

## What shipped

Three additive files under `app/src/integration/` (206 lines) and two additive
edits (+4 lines):

- `app/src/integration/env.ts` — optional `INTEGRATION_TOKEN` env schema;
- `app/src/integration/integration.wasp.ts` — `api("GET", …)` declarations;
- `app/src/integration/integrationApi.ts` — handlers;
- `app/main.wasp.ts` — register `integrationSpec`;
- `app/src/env.ts` — merge `integrationEnvSchema`.

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/operations/integration/schools` | tenant list (id, slug, name, city, level) |
| GET | `/operations/integration/attendance/daily` | daily attendance by class (`date`, `school`, `detail`) |
| GET | `/operations/integration/attendance/student/:studentId` | one student's history (`from`, `to`) |

## Security contract

- Authorization is a bearer token (`INTEGRATION_TOKEN`) checked **inside** the
  handlers while the Wasp declaration stays `auth: false`.
- **Fail-closed**: a missing token, or one shorter than 16 characters, denies
  every request. It never falls open.
- Token comparison is timing-safe (`crypto.timingSafeEqual`).
- **Read-only by construction**: every handler calls Prisma `findMany` /
  `findUnique`. There is no write path, and `POST` to these paths returns 404.
- **PII minimisation**: responses are aggregates by default; student names are
  returned only when the caller passes `detail=1`.
- Row counts are bounded (`take`), and `date`/`from`/`to` are validated.
- **Loopback-only**: nginx returns 404 for `/operations/integration/` from the
  public internet. The surface is reachable only from `127.0.0.1:3101`.
- The token never enters chat, logs, or the model context. It lives in
  `/etc/saas-satu/staging.env` (root, 0600) for the app and in
  `/home/ubuntu/.openclaw/secrets/schoolos-integration-token` (0600) for OpenClaw.

## Verification (blue-green, port 3102, before cutover)

| Check | Result |
| --- | --- |
| `wasp build` | PASS |
| `tsc --build && rollup` server bundle | PASS |
| request without token | 401 |
| request with wrong token | 401 |
| `GET /schools` with token | 200 — 3 tenants returned |
| `GET /attendance/daily` with token | 200 — totals + per-class summary |
| `POST` to an integration path | 404 (no write route) |
| `date=abc` | 400 |
| live homepage after cutover | 200 |
| public `/operations/integration/schools` | 404 (blocked) |
| loopback `/operations/integration/schools` without token | 401 |
| loopback `/operations/integration/schools` with token | 200 |

One build failure was hit and fixed during the run: the generated router calls
API handlers with three arguments, so each handler signature needed the optional
third `_context?: unknown` parameter (matching the existing
`schoolSiteSitemapApi`). Re-bundle: PASS.

## Deployment

1. `git worktree add releases/884abc6-openclaw-integration 884abc6` (backend);
2. `wasp build` then `npm run bundle` inside `.wasp/out/server`;
3. `/etc/saas-satu/staging.env` gained `INTEGRATION_TOKEN` (0600, backed up);
4. nginx gained a `location ^~ /operations/integration/ { return 404; }` block
   ahead of the existing `/operations/` proxy (config backed up, `nginx -t`, reload);
5. backend symlink `deployments/SaaS_Satu/current` switched and
   `saas-satu.service` restarted;
6. static release intentionally untouched — no client change.

`RELEASE_CURRENT` now records the new backend release plus the rollback release.

## Rollback

```
ln -sfn /home/ubuntu/deployments/SaaS_Satu/releases/5a4d731-tu-content-gen2 \
        /home/ubuntu/deployments/SaaS_Satu/current
sudo systemctl restart saas-satu.service
```

The nginx deny block is independent and can stay; removing the
`INTEGRATION_TOKEN` line from `staging.env` disables the surface entirely
(fail-closed) without a code change.

## Operations

- Daily digest: automation **"School OS - rekap absensi harian"** at **09:00
  Asia/Jakarta**, delivered to the owner's Telegram DM. It runs
  `/home/ubuntu/.openclaw/scripts/schoolos-attendance-summary.sh`, which reads
  the token file and prints a human summary; the token is never printed.
- Rotate: write a new value into `INTEGRATION_TOKEN` in `staging.env`, restart
  `saas-satu.service`, update the OpenClaw token file.
- Revoke: remove/blank `INTEGRATION_TOKEN` and restart — all requests then 401.

## Backups taken during this change

- `/home/ubuntu/backups/SaaS_Satu/pre-openclaw-integration-20260923-140715.dump` (database, 77 tables)
- `/home/ubuntu/backups/SaaS_Satu/staging.env.bak-20260923-142227`
- `/home/ubuntu/backups/SaaS_Satu/nginx-sekolah.conf.bak-20260923-142236`
