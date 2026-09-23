# Release — OpenClaw integration: tenant attribution & date ranges

**Date:** 23 September 2026
**Production release (backend):** `34fcd3b-openclaw-tenant-attribution`
**Runtime commit:** `34fcd3b`
**Rollback release (backend):** `884abc6-openclaw-integration`
**Static release:** unchanged — `5a4d731-tu-content-gen2` (no client change)
**Predecessor:** `docs/RELEASE_2026-09-23_OPENCLAW_READONLY_INTEGRATION.md`

## Why

Follow-up to the initial read-only integration. The owner asked to query
**per tenant** (School OS is multi-tenant). The first release could already
filter with `?school=<slug>`, but the response carried no school identity, so an
all-tenant query was ambiguous, and only a single day could be requested.

## What changed (all additive, still read-only)

- every class row now carries `schoolId`, `schoolName`, `schoolSlug`;
- new `schools[]` rollup per tenant: `records`, `classCount`, `summary`, `rate`;
- `attendance/daily` accepts `from`/`to` for range queries and reports
  `mode` (`date` | `range`), `from`, `to`; `date` still works for a single day;
- invalid ranges (`from > to`) are rejected with **400**; invalid dates with 400;
- class ordering is now school → grade level → class name.

Unchanged contract: bearer `INTEGRATION_TOKEN` checked inside the handlers,
fail-closed token policy, timing-safe comparison, Prisma reads only, aggregate
responses by default (`detail=1` for names), nginx `return 404` for the public
path, loopback-only.

## Verification (blue-green on port 3102, then live)

| Check | Result |
| --- | --- |
| `wasp build` + `tsc --build && rollup` | PASS |
| all-tenant query carries `schoolName` per class | PASS (`SMKN 1 RONGGA`) |
| `schools[]` rollup present | PASS (1 tenant with records, 1 class) |
| `?school=smkn-1-rongga` filter | PASS |
| `?from=2026-09-01&to=2026-09-30` | PASS — `mode=range`, 29 records, rate 79% |
| invalid range (`from > to`) | 400 |
| inactive tenant (`smkn-12-garut`, `smpn-1-gununghalu`) | 0 records, no error |
| live homepage after cutover | 200 |
| public `/operations/integration/schools` | 404 |
| daily digest script against production | PASS, with school attribution |

Observed live output after cutover:

```
Absensi 2026-09-23 — 1 catatan
Hadir: 1 | Terlambat: 0 | Sakit: 0 | Izin: 0 | Alpa: 0
Tingkat kehadiran: 100%

- SMKN 1 RONGGA · [DEMO] 11 RPL 1: 1 siswa (H:1 T:0 S:0 I:0 A:0)
```

A defect was found and fixed in the operator scripts during this release:
writing `$(cat …token…)` into a helper script caused the value to be redacted at
write time, so the script sent an invalid header. Both
`schoolos-attendance-summary.sh` and `schoolos-api.sh` now read the token with
`read -r TOKEN < "$TOKEN_FILE"` and never embed a command substitution.

## Deployment

Same manual path as the predecessor: release worktree at `34fcd3b`, `wasp build`
plus `npm run bundle` inside `.wasp/out/server`, backend symlink switch, and
`saas-satu.service` restart. `RELEASE_CURRENT` records the new backend release
and `884abc6-openclaw-integration` as rollback. The static release is untouched.

## Rollback

```
ln -sfn /home/ubuntu/deployments/SaaS_Satu/releases/884abc6-openclaw-integration \
        /home/ubuntu/deployments/SaaS_Satu/current
sudo systemctl restart saas-satu.service
```

## Still open (not in this release)

- **Per-tenant tokens** (option E from the owner discussion): the current token
  can read every tenant. Add scoped tokens only when more than one assistant
  needs isolated access.
- `?school=` filter on the per-student endpoint (option C).
