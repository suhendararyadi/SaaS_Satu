# CBT Gen2 — Architecture & Delivery Contract

Date: 29 September 2026
Status: implementation baseline for P4

## Goals

Upgrade the existing LMS CBT without deleting or rewriting legacy assessment/result data.

CBT Gen2 must provide:

- explicit exam schedule and duration;
- question bank;
- multiple-choice and essay questions;
- real server-side question/option randomization;
- server-authoritative attempts and timer;
- autosave/resume;
- safe final submission;
- configurable attempt limit and passing score;
- optional exam token;
- teacher monitoring;
- manual essay grading and feedback;
- result/analysis;
- audit events;
- mobile-first student exam UX.

## Compatibility

Existing tables remain:

- `LmsAssessment`
- `LmsAssessmentQuestion`
- `LmsAssessmentResult`

`LmsAssessmentResult` remains a compatibility/final-result projection so existing reports and old data continue to work.

Gen2 adds:

- `LmsQuestionBankItem`
- `LmsAssessmentAttempt`
- `LmsAssessmentAnswer`
- `LmsAssessmentEvent`

Existing assessments default to `PUBLISHED`, one attempt, immediate score visibility and no token.

## Assessment lifecycle

Publication state:

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Availability is derived from server time and `startTime/endTime`.

An assessment is student-startable only when:

- publication state is `PUBLISHED`;
- current server time is within schedule;
- student's course/class/tenant matches;
- token is valid when required;
- submitted/graded attempts are below the configured attempt limit.

## Attempt lifecycle

- `IN_PROGRESS`
- `SUBMITTED`
- `AUTO_SUBMITTED`
- `GRADED`

Start is idempotent: an existing in-progress attempt is returned.

`expiresAt = min(startedAt + durationMinutes, assessment.endTime)`.

The server, never the browser clock, decides whether an attempt is expired.

## Answer persistence

Answers are persisted per attempt/question using an upsert.

Multiple choice stores `selectedOptionId`.

Essay stores `answerText`.

Autosave is allowed only while attempt status is `IN_PROGRESS` and server time has not passed `expiresAt`.

## Randomization

At attempt creation the server creates and stores:

- question order;
- option order per multiple-choice question.

The stored order is stable when the student resumes.

Correct-answer metadata is never returned to student queries.

## Scoring

Multiple choice is auto-scored from server-side question options.

Essay answers are manually graded.

Attempt stores:

- auto score;
- manual score;
- total raw points;
- percentage;
- passing state;
- grading status.

`LmsAssessmentResult` is upserted when an attempt is submitted and updated after essay grading.

## Score visibility

- `IMMEDIATE`
- `AFTER_END`
- `HIDDEN`

Teacher views always see scores.

## Monitoring

Teacher workspace reports:

- eligible students;
- not started;
- in progress;
- submitted;
- graded;
- pending essay grading;
- started/submitted timestamps;
- score/percentage/pass status;
- question analysis for MC questions.

## Security

- teacher actions use existing managed-course tenant guard;
- student actions require STUDENT role, same school and same course class;
- no client-supplied score is trusted;
- no client-supplied timestamps determine eligibility;
- final submission is transactionally guarded and idempotent;
- attempt/question IDs are always validated against the assessment;
- direct legacy submit is routed through the same Gen2 rules.

## UX

Teacher:

- CBT card links to a dedicated assessment workspace;
- settings, schedule, token and score policy;
- question editor + bank;
- CSV import;
- monitoring;
- essay grading;
- results/analysis.

Student:

- dedicated mobile-first assessment page;
- eligibility/start card;
- token input when required;
- authoritative countdown;
- one-question-at-a-time navigator on small screens;
- autosave status;
- resume after refresh;
- final submit confirmation;
- score shown according to visibility policy.

## Deferred after Gen2 core

These are not blockers for this release unless required by a discovered regression:

- advanced remote proctoring;
- webcam recording;
- offline submission without any network connectivity;
- external item-bank standards such as QTI;
- high-stakes lockdown browser integration.
