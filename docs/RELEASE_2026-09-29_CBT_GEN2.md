# Release — CBT Gen2

Date: **29 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Runtime

Runtime/source commit:

`9b49eb6e8dabec72d65b356ea592fde8845a5818`

Production release:

`9b49eb6-cbt-gen2`

Live pointers:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/9b49eb6-cbt-gen2`
- static: `/var/www/saas-satu/releases/9b49eb6-cbt-gen2`

Application rollback:

- backend: `3bd5515-teacher-login-provisioning`
- previous static: `bf79043-school-profile-routing`

## Purpose

Upgrade the existing School OS LMS CBT from a one-shot basic assessment flow into a production-grade exam workflow while preserving all legacy assessment/question/result data.

## Compatibility

Legacy models remain authoritative-compatible:

- `LmsAssessment`
- `LmsAssessmentQuestion`
- `LmsAssessmentResult`

CBT Gen2 adds:

- `LmsQuestionBankItem`
- `LmsAssessmentAttempt`
- `LmsAssessmentAnswer`
- `LmsAssessmentEvent`

`LmsAssessmentResult` remains the compatibility/final-result projection. Existing result rows are preserved with nullable `attemptId`.

Immediately after production migration:

- assessments: **24**
- legacy results: **36**
- questions: **48**
- legacy results with `attemptId = NULL`: **36**
- Gen2 attempts/answers/bank/events: **0** before first real use

No legacy CBT row was rewritten or deleted.

## Teacher workflow

Teacher CBT now uses a dedicated workspace:

`/school/lms/courses/:id/cbt/:assessmentId`

Capabilities:

- explicit start/end schedule;
- duration per attempt;
- Draft / Published / Archived lifecycle;
- configurable attempt limit;
- configurable passing score / KKM;
- question randomization;
- option randomization;
- optional exam token and token regeneration;
- score visibility policy;
- instructions;
- multiple-choice and essay question editor;
- safe question CRUD;
- question bank;
- add question from bank;
- CSV question import, including quoted fields;
- structure freeze after the first student attempt;
- monitoring: not started / in progress / submitted / graded;
- answer-detail review;
- manual essay grading and feedback;
- result projection;
- MC item analysis;
- pending-essay analysis;
- average/highest/lowest result summary;
- CBT audit trail.

Course Detail remains a launchpad. New assessments are created as Draft with an explicit schedule and are then managed in the CBT workspace.

## Student workflow

Students now use the dedicated mobile-first CBT runner instead of the old small modal.

Capabilities:

- schedule and eligibility checks;
- optional token input;
- server-authoritative attempt start;
- attempt resume after refresh;
- stable per-attempt question order;
- stable per-attempt option order;
- no answer-key metadata in student payload;
- one-question-at-a-time mobile runner;
- question navigator;
- debounced autosave;
- local answer retention when autosave fails;
- final-submit answer flush;
- server-clock-adjusted countdown;
- server-authoritative expiration;
- auto-submit after expiry;
- attempt limit;
- score visibility according to teacher policy;
- score hidden while essay grading remains pending.

The server remains the final authority for timing, eligibility, scoring, and submission status.

## Security and integrity

- Teacher operations use the existing managed-course / tenant guard.
- Student operations require role `STUDENT`, same school, and same course class.
- Client-supplied score is never trusted.
- Client clock never determines final eligibility or expiration.
- Attempt/question IDs are validated against the assessment.
- Duplicate start is idempotent; concurrent start requests collapse to one attempt.
- Final submit is transactional and idempotent.
- Structure editing is blocked after attempts exist.
- Structural schedule/randomization/attempt settings are frozen after students start.
- Cross-tenant start/view/grading is rejected.
- The legacy submit endpoint is retained only as a compatibility path and routes through Gen2 rules for supported multiple-choice exams.

## Scoring

Multiple-choice answers are scored server-side.

Essay answers are manually graded by the authorized teacher.

Attempt scoring stores:

- automatic score;
- manual score;
- total raw points;
- percentage;
- passing state;
- grading status.

The compatibility `LmsAssessmentResult.score` remains on the historical **0–100 percentage scale**.

## Migration

Migration:

`20260929050000_add_cbt_gen2`

The migration is additive only:

- no DROP TABLE;
- no DROP COLUMN;
- no TRUNCATE;
- no DELETE.

It was first tested on a production clone and then applied to production using the official Prisma migration path:

`prisma migrate deploy`

Production migration history confirms the migration finished successfully.

## Verification

Before production rollout:

- Wasp 0.25 full build: **PASS**
- production-clone migration compatibility: **PASS**
- official Prisma migration path on fresh production clone: **PASS**
- CBT Gen2 lifecycle UAT: **16/16 PASS**
- full School OS regression: **200/200 PASS across 37 test files**
- generated server TypeScript/Rollup bundle: **PASS**
- Vite SSR production build: **PASS**
- Vite client production build: **PASS**
- `git diff --check`: **PASS**
- immutable release preflight: **PASS**

Production:

- migration deploy: **PASS**
- application deploy: **PASS**
- repeated deploy: `idempotent=true`
- service: **active**
- CBT shell route: **HTTP 200**
- unauthenticated CBT Gen2 query/action endpoints: **401**
- recent service error scan: clean
- legacy assessment/result/question counts unchanged after migration

The 16 production-clone UAT cases verify question bank, essay, bulk import, Draft denial, tenant isolation, token validation, randomized stable attempts, answer-key secrecy, autosave, server scoring, pending essay state, manual grading, result projection, structure/settings freeze, attempt limits, expiry auto-submit, concurrent start idempotency, legacy submit compatibility, and audit events.

## Backup

Pre-release production backup:

`/home/ubuntu/backups/SaaS_Satu/pre-cbt-gen2-20260929-045036.dump`

- size: **1,668,512 bytes**
- mode: **600**
- owner: **ubuntu**
- SHA-256: `91bd17f2cae453b3e065d5539d3f137ac4e60bd4d36d2566e9d3f261acc857f4`

## Deferred / optional enhancements

Not blockers for CBT Gen2 core:

- advanced remote proctoring;
- webcam recording;
- lockdown-browser integration;
- full offline exam submission without network connectivity;
- external QTI/item-bank standards;
- optional attendance/EWS warning overlay for exam eligibility.

These enhancements must not introduce a hard attendance block by default without a separate product decision.
