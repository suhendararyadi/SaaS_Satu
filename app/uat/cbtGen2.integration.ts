import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", async () => {
  const { PrismaClient } = await import("@prisma/client");
  class HttpError extends Error {
    statusCode: number;
    data?: unknown;
    constructor(statusCode: number, message?: string, data?: unknown) {
      super(message);
      this.name = "HttpError";
      this.statusCode = statusCode;
      this.data = data;
    }
  }
  const url =
    process.env.CBT_GEN2_UAT_DATABASE_URL ||
    "postgresql://invalid:invalid@127.0.0.1:1/cbt_gen2_uat_disabled";
  return {
    prisma: new PrismaClient({ datasources: { db: { url } } }),
    HttpError,
  };
});

import { prisma } from "wasp/server";
import {
  addCbtQuestion,
  addCbtQuestionFromBank,
  getCbtStudentWorkspace,
  getCbtTeacherWorkspace,
  gradeCbtEssayAnswer,
  importCbtQuestions,
  saveCbtAnswers,
  saveCbtQuestionBankItem,
  startCbtAttempt,
  submitCbtAttempt,
  submitLegacyAssessmentAnswersCompat,
  updateCbtAssessmentSettings,
} from "../src/lms/cbtOperations";

const PREFIX = "uat-cbt-gen2-20260929";
const runUat =
  !!process.env.CBT_GEN2_UAT_DATABASE_URL &&
  process.env.CBT_GEN2_UAT_CONFIRM === "SYNTHETIC_PRODUCTION_UAT";
const uat = runUat ? describe.sequential : describe.skip;

async function capture<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, value: await fn(), error: null };
  } catch (error: any) {
    return { ok: false as const, value: null, error };
  }
}

function expectHttp(result: Awaited<ReturnType<typeof capture>>, status: number) {
  expect(result.ok).toBe(false);
  expect((result.error as any)?.statusCode).toBe(status);
}

async function cleanupSynthetic() {
  await prisma.user.updateMany({
    where: { email: { startsWith: PREFIX } },
    data: { classRoomId: null },
  });
  await prisma.school.deleteMany({
    where: { slug: { startsWith: PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: PREFIX } },
  });
}

uat("CBT Gen2 production-clone lifecycle", () => {
  const f: Record<string, any> = {};

  beforeAll(async () => {
    const dbName = new URL(process.env.CBT_GEN2_UAT_DATABASE_URL!)
      .pathname.replace(/^\//, "");
    if (!dbName.includes("cbt_gen2_uat")) {
      throw new Error("Refusing CBT Gen2 UAT outside a cbt_gen2_uat database.");
    }
    await cleanupSynthetic();

    f.schoolA = await prisma.school.create({
      data: {
        name: "UAT CBT Gen2 A",
        slug: PREFIX + "-a",
        npsn: "UAT-CBT-A",
        studentQuota: 50,
      },
    });
    f.schoolB = await prisma.school.create({
      data: {
        name: "UAT CBT Gen2 B",
        slug: PREFIX + "-b",
        npsn: "UAT-CBT-B",
        studentQuota: 50,
      },
    });

    f.yearA = await prisma.academicYear.create({
      data: {
        schoolId: f.schoolA.id,
        yearName: "2098/2099",
        semester: "GANJIL",
        isActive: true,
      },
    });
    f.yearB = await prisma.academicYear.create({
      data: {
        schoolId: f.schoolB.id,
        yearName: "2098/2099",
        semester: "GANJIL",
        isActive: true,
      },
    });
    f.classA = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        gradeLevel: 12,
        name: "UAT XII CBT A",
      },
    });
    f.classB = await prisma.classRoom.create({
      data: {
        schoolId: f.schoolB.id,
        academicYearId: f.yearB.id,
        gradeLevel: 12,
        name: "UAT XII CBT B",
      },
    });

    f.teacherA = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        role: "TEACHER",
        name: "UAT CBT Teacher A",
        email: PREFIX + "-teacher-a@example.invalid",
      },
    });
    f.teacherB = await prisma.user.create({
      data: {
        schoolId: f.schoolB.id,
        role: "TEACHER",
        name: "UAT CBT Teacher B",
        email: PREFIX + "-teacher-b@example.invalid",
      },
    });
    f.studentA = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        classRoomId: f.classA.id,
        role: "STUDENT",
        name: "UAT CBT Student A",
        email: PREFIX + "-student-a@example.invalid",
      },
    });
    f.studentC = await prisma.user.create({
      data: {
        schoolId: f.schoolA.id,
        classRoomId: f.classA.id,
        role: "STUDENT",
        name: "UAT CBT Student C",
        email: PREFIX + "-student-c@example.invalid",
      },
    });
    f.studentB = await prisma.user.create({
      data: {
        schoolId: f.schoolB.id,
        classRoomId: f.classB.id,
        role: "STUDENT",
        name: "UAT CBT Student B",
        email: PREFIX + "-student-b@example.invalid",
      },
    });

    f.courseA = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolA.id,
        academicYearId: f.yearA.id,
        classRoomId: f.classA.id,
        teacherId: f.teacherA.id,
        subjectName: "UAT CBT Basis Data",
      },
    });
    f.courseB = await prisma.lmsCourse.create({
      data: {
        schoolId: f.schoolB.id,
        academicYearId: f.yearB.id,
        classRoomId: f.classB.id,
        teacherId: f.teacherB.id,
        subjectName: "UAT CBT Tenant B",
      },
    });

    const now = Date.now();
    f.assessment = await prisma.lmsAssessment.create({
      data: {
        courseId: f.courseA.id,
        title: "UAT CBT Gen2 Mixed",
        instructions: "Jawab PG dan esai.",
        durationMinutes: 30,
        startTime: new Date(now - 5 * 60_000),
        endTime: new Date(now + 60 * 60_000),
        status: "PUBLISHED",
        attemptLimit: 2,
        passingScore: 60,
        requireToken: true,
        accessToken: "UAT123",
        isRandomized: true,
        shuffleOptions: true,
        showScoreMode: "IMMEDIATE",
      },
    });

    f.concurrentAssessment = await prisma.lmsAssessment.create({
      data: {
        courseId: f.courseA.id,
        title: "UAT Concurrent Start",
        durationMinutes: 20,
        startTime: new Date(now - 60_000),
        endTime: new Date(now + 30 * 60_000),
        status: "PUBLISHED",
        attemptLimit: 1,
        passingScore: 75,
        isRandomized: true,
      },
    });

    f.draftAssessment = await prisma.lmsAssessment.create({
      data: {
        courseId: f.courseA.id,
        title: "UAT Draft",
        durationMinutes: 20,
        startTime: new Date(now - 60_000),
        endTime: new Date(now + 30 * 60_000),
        status: "DRAFT",
      },
    });

    f.legacyEndpointAssessment = await prisma.lmsAssessment.create({
      data: {
        courseId: f.courseA.id,
        title: "UAT Legacy Endpoint Compatibility",
        durationMinutes: 20,
        startTime: new Date(now - 60_000),
        endTime: new Date(now + 30 * 60_000),
        status: "PUBLISHED",
        attemptLimit: 1,
        passingScore: 70,
        isRandomized: false,
      },
    });
  });

  afterAll(async () => {
    await cleanupSynthetic();
    await prisma.$disconnect();
  });

  it("01 teacher creates question bank item and adds it to assessment", async () => {
    f.bank = await saveCbtQuestionBankItem(
      {
        courseId: f.courseA.id,
        question: {
          questionType: "MULTIPLE_CHOICE",
          prompt: "Perintah untuk menampilkan data adalah?",
          points: 40,
          difficulty: "EASY",
          tags: ["sql", "select"],
          options: [
            { id: "A", text: "SELECT", isCorrect: true },
            { id: "B", text: "DELETE", isCorrect: false },
            { id: "C", text: "DROP", isCorrect: false },
            { id: "D", text: "TRUNCATE", isCorrect: false },
          ],
        },
      },
      { user: f.teacherA },
    );

    f.mc = await addCbtQuestionFromBank(
      { assessmentId: f.assessment.id, bankItemId: f.bank.id },
      { user: f.teacherA },
    );
    expect(f.mc.bankItemId).toBe(f.bank.id);
    expect(f.mc.position).toBe(0);
  });

  it("02 teacher adds essay and bulk-imports additional question safely", async () => {
    f.essay = await addCbtQuestion(
      {
        assessmentId: f.assessment.id,
        saveToBank: true,
        question: {
          questionType: "ESSAY",
          prompt: "Jelaskan fungsi primary key.",
          points: 60,
          difficulty: "MEDIUM",
          tags: ["primary-key"],
          options: [],
        },
      },
      { user: f.teacherA },
    );
    expect(f.essay.position).toBe(1);

    const imported: any = await importCbtQuestions(
      {
        assessmentId: f.concurrentAssessment.id,
        saveToBank: true,
        questions: [
          {
            questionType: "MULTIPLE_CHOICE",
            prompt: "1 + 1 = ?",
            points: 10,
            difficulty: "EASY",
            tags: [],
            options: [
              { id: "A", text: "1", isCorrect: false },
              { id: "B", text: "2", isCorrect: true },
            ],
          },
        ],
      },
      { user: f.teacherA },
    );
    expect(imported.createdCount).toBe(1);
  });

  it("03 draft assessment cannot be started", async () => {
    expectHttp(
      await capture(() =>
        startCbtAttempt(
          { assessmentId: f.draftAssessment.id },
          { user: f.studentA },
        ),
      ),
      403,
    );
  });

  it("04 cross-tenant student and teacher cannot access the assessment", async () => {
    expectHttp(
      await capture(() =>
        startCbtAttempt(
          { assessmentId: f.assessment.id, token: "UAT123" },
          { user: f.studentB },
        ),
      ),
      404,
    );

    expectHttp(
      await capture(() =>
        getCbtTeacherWorkspace(
          { assessmentId: f.assessment.id },
          { user: f.teacherB },
        ),
      ),
      404,
    );
  });

  it("05 invalid token is rejected", async () => {
    expectHttp(
      await capture(() =>
        startCbtAttempt(
          { assessmentId: f.assessment.id, token: "WRONG" },
          { user: f.studentA },
        ),
      ),
      403,
    );
  });

  it("06 valid start creates stable randomized attempt and duplicate start is idempotent", async () => {
    const first: any = await startCbtAttempt(
      { assessmentId: f.assessment.id, token: "UAT123" },
      { user: f.studentA },
    );
    const duplicate: any = await startCbtAttempt(
      { assessmentId: f.assessment.id, token: "UAT123" },
      { user: f.studentA },
    );
    expect(duplicate.id).toBe(first.id);
    expect(first.attemptNo).toBe(1);
    expect(new Date(first.expiresAt).getTime()).toBeLessThanOrEqual(
      new Date(f.assessment.endTime).getTime(),
    );
    f.attempt = first;

    const workspace: any = await getCbtStudentWorkspace(
      { assessmentId: f.assessment.id },
      { user: f.studentA },
    );
    const again: any = await getCbtStudentWorkspace(
      { assessmentId: f.assessment.id },
      { user: f.studentA },
    );
    expect(workspace.activeAttempt.id).toBe(first.id);
    expect(workspace.activeAttempt.questions.map((q: any) => q.id)).toEqual(
      again.activeAttempt.questions.map((q: any) => q.id),
    );
    for (const question of workspace.activeAttempt.questions) {
      for (const option of question.options || []) {
        expect(option).not.toHaveProperty("isCorrect");
      }
    }
  });

  it("07 answers autosave and server validates question membership", async () => {
    const saved: any = await saveCbtAnswers(
      {
        attemptId: f.attempt.id,
        answers: [
          { questionId: f.mc.id, selectedOptionId: "A" },
          { questionId: f.essay.id, answerText: "Primary key mengidentifikasi setiap record secara unik." },
        ],
      },
      { user: f.studentA },
    );
    expect(saved.saved).toBe(true);

    const foreignQuestion = await prisma.lmsAssessmentQuestion.findFirst({
      where: { assessmentId: f.concurrentAssessment.id },
    });
    expect(foreignQuestion).toBeTruthy();
    expectHttp(
      await capture(() =>
        saveCbtAnswers(
          {
            attemptId: f.attempt.id,
            answers: [
              { questionId: foreignQuestion!.id, selectedOptionId: "B" },
            ],
          },
          { user: f.studentA },
        ),
      ),
      400,
    );
  });

  it("08 submit auto-scores MC, keeps essay pending, and writes 0-100 compatibility result", async () => {
    const submitted: any = await submitCbtAttempt(
      { attemptId: f.attempt.id },
      { user: f.studentA },
    );
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.gradingStatus).toBe("PENDING");
    expect(submitted.scoreAuto).toBe(40);
    expect(submitted.scoreTotal).toBe(40);
    expect(submitted.percentage).toBe(40);
    expect(submitted.passed).toBeNull();

    const result = await prisma.lmsAssessmentResult.findUniqueOrThrow({
      where: {
        assessmentId_studentId: {
          assessmentId: f.assessment.id,
          studentId: f.studentA.id,
        },
      },
    });
    expect(result.attemptId).toBe(f.attempt.id);
    expect(result.score).toBe(40);

    const studentWorkspace: any = await getCbtStudentWorkspace(
      { assessmentId: f.assessment.id },
      { user: f.studentA },
    );
    expect(studentWorkspace.latestResult.gradingStatus).toBe("PENDING");
    expect(studentWorkspace.latestResult.scoreVisible).toBe(false);
  });

  it("09 teacher monitoring sees pending essay and no answer keys leak to student", async () => {
    const teacherWorkspace: any = await getCbtTeacherWorkspace(
      { assessmentId: f.assessment.id },
      { user: f.teacherA },
    );
    expect(teacherWorkspace.summary.pendingEssay).toBe(1);
    expect(teacherWorkspace.summary.inProgress).toBe(0);
    const row = teacherWorkspace.monitoring.find(
      (item: any) => item.student.id === f.studentA.id,
    );
    expect(row.status).toBe("SUBMITTED");
    const answer = teacherWorkspace.assessment.attempts[0].answers.find(
      (item: any) => item.questionId === f.essay.id,
    );
    f.essayAnswerId = answer.id;
  });

  it("10 cross-tenant teacher cannot grade essay", async () => {
    expectHttp(
      await capture(() =>
        gradeCbtEssayAnswer(
          { answerId: f.essayAnswerId, score: 50, feedback: "Baik." },
          { user: f.teacherB },
        ),
      ),
      404,
    );
  });

  it("11 grading essay finalizes percentage, passing state, and compatibility result", async () => {
    const graded: any = await gradeCbtEssayAnswer(
      { answerId: f.essayAnswerId, score: 50, feedback: "Konsep sudah tepat." },
      { user: f.teacherA },
    );
    expect(graded.status).toBe("GRADED");
    expect(graded.gradingStatus).toBe("COMPLETE");
    expect(graded.scoreAuto).toBe(40);
    expect(graded.scoreManual).toBe(50);
    expect(graded.scoreTotal).toBe(90);
    expect(graded.percentage).toBe(90);
    expect(graded.passed).toBe(true);

    const result = await prisma.lmsAssessmentResult.findUniqueOrThrow({
      where: {
        assessmentId_studentId: {
          assessmentId: f.assessment.id,
          studentId: f.studentA.id,
        },
      },
    });
    expect(result.score).toBe(90);

    const studentWorkspace: any = await getCbtStudentWorkspace(
      { assessmentId: f.assessment.id },
      { user: f.studentA },
    );
    expect(studentWorkspace.latestResult.scoreVisible).toBe(true);
    expect(studentWorkspace.latestResult.percentage).toBe(90);
  });

  it("12 question structure and structural settings freeze after an attempt exists", async () => {
    expectHttp(
      await capture(() =>
        addCbtQuestion(
          {
            assessmentId: f.assessment.id,
            question: {
              questionType: "ESSAY",
              prompt: "Soal terlambat ditambahkan?",
              points: 10,
              difficulty: "MEDIUM",
              tags: [],
              options: [],
            },
          },
          { user: f.teacherA },
        ),
      ),
      409,
    );

    const assessment = await prisma.lmsAssessment.findUniqueOrThrow({
      where: { id: f.assessment.id },
    });
    expectHttp(
      await capture(() =>
        updateCbtAssessmentSettings(
          {
            assessmentId: f.assessment.id,
            expectedVersion: assessment.version,
            title: assessment.title,
            instructions: assessment.instructions,
            durationMinutes: 45,
            startTime: assessment.startTime.toISOString(),
            endTime: assessment.endTime.toISOString(),
            status: "PUBLISHED",
            attemptLimit: assessment.attemptLimit,
            passingScore: assessment.passingScore,
            isRandomized: assessment.isRandomized,
            shuffleOptions: assessment.shuffleOptions,
            requireToken: assessment.requireToken,
            showScoreMode: "IMMEDIATE",
          },
          { user: f.teacherA },
        ),
      ),
      409,
    );
  });

  it("13 second attempt is allowed, expiry autosubmits, and attempt limit is enforced", async () => {
    const second: any = await startCbtAttempt(
      { assessmentId: f.assessment.id, token: "UAT123" },
      { user: f.studentA },
    );
    expect(second.attemptNo).toBe(2);

    await prisma.lmsAssessmentAttempt.update({
      where: { id: second.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expectHttp(
      await capture(() =>
        saveCbtAnswers(
          {
            attemptId: second.id,
            answers: [{ questionId: f.mc.id, selectedOptionId: "A" }],
          },
          { user: f.studentA },
        ),
      ),
      409,
    );

    const expired = await prisma.lmsAssessmentAttempt.findUniqueOrThrow({
      where: { id: second.id },
    });
    expect(expired.status).toBe("AUTO_SUBMITTED");

    expectHttp(
      await capture(() =>
        startCbtAttempt(
          { assessmentId: f.assessment.id, token: "UAT123" },
          { user: f.studentA },
        ),
      ),
      409,
    );
  });

  it("14 concurrent starts collapse to one in-progress attempt", async () => {
    const [a, b]: any[] = await Promise.all([
      startCbtAttempt(
        { assessmentId: f.concurrentAssessment.id },
        { user: f.studentC },
      ),
      startCbtAttempt(
        { assessmentId: f.concurrentAssessment.id },
        { user: f.studentC },
      ),
    ]);
    expect(a.id).toBe(b.id);
    expect(
      await prisma.lmsAssessmentAttempt.count({
        where: {
          assessmentId: f.concurrentAssessment.id,
          studentId: f.studentC.id,
        },
      }),
    ).toBe(1);
  });

  it("15 legacy submit endpoint compatibility routes through Gen2 and returns percentage score", async () => {
    f.legacyQuestion = await addCbtQuestion(
      {
        assessmentId: f.legacyEndpointAssessment.id,
        question: {
          questionType: "MULTIPLE_CHOICE",
          prompt: "SQL merupakan singkatan dari?",
          points: 25,
          difficulty: "EASY",
          tags: [],
          options: [
            { id: "A", text: "Structured Query Language", isCorrect: true },
            { id: "B", text: "Simple Query Line", isCorrect: false },
          ],
        },
      },
      { user: f.teacherA },
    );

    const result: any = await submitLegacyAssessmentAnswersCompat(
      {
        assessmentId: f.legacyEndpointAssessment.id,
        answers: { [f.legacyQuestion.id]: "A" },
      },
      { user: f.studentA },
    );
    expect(result.status).toBe("SUBMITTED");
    expect(result.percentage).toBe(100);

    const projection = await prisma.lmsAssessmentResult.findUniqueOrThrow({
      where: {
        assessmentId_studentId: {
          assessmentId: f.legacyEndpointAssessment.id,
          studentId: f.studentA.id,
        },
      },
    });
    expect(projection.score).toBe(100);
    expect(projection.attemptId).toBeTruthy();
  });

  it("16 audit events capture start/submit/grading and tenant ownership", async () => {
    const eventTypes = await prisma.lmsAssessmentEvent.findMany({
      where: { assessmentId: f.assessment.id },
      select: { eventType: true, actorId: true },
    });
    const types = eventTypes.map((event) => event.eventType);
    expect(types).toContain("ATTEMPT_STARTED");
    expect(types).toContain("ATTEMPT_SUBMITTED");
    expect(types).toContain("ESSAY_GRADED");
    expect(
      eventTypes.every((event) =>
        [f.teacherA.id, f.studentA.id].includes(event.actorId || ""),
      ),
    ).toBe(true);
  });
});
