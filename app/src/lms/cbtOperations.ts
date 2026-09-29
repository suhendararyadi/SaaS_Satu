import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireTeacher } from "../school/authGuards";
import { canAccessCourse, canManageCourse } from "./accessPolicy";

type CbtContext = { user?: User };
type QuestionOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type SafeStudentQuestion = {
  id: string;
  questionType: string;
  prompt: string;
  imageUrl: string | null;
  points: number;
  position: number;
  options: Array<{ id: string; text: string }>;
};

const FINAL_ATTEMPT_STATUSES = ["SUBMITTED", "AUTO_SUBMITTED", "GRADED"] as const;

function requireSchoolId(user: { schoolId?: string | null }) {
  if (!user.schoolId) {
    throw new HttpError(403, "Pilih unit sekolah sebelum mengakses CBT.");
  }
  return user.schoolId;
}

async function getManagedCourseOrThrow(
  user: { id: string; schoolId?: string | null; isAdmin: boolean; role: string },
  courseId: string,
) {
  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId: requireSchoolId(user) },
    select: {
      id: true,
      schoolId: true,
      classRoomId: true,
      teacherId: true,
      subjectName: true,
    },
  });
  if (!course || !canManageCourse(user, course)) {
    throw new HttpError(404, "Mata pelajaran tidak ditemukan atau Anda tidak memiliki akses.");
  }
  return course;
}

async function getManagedAssessmentOrThrow(
  user: { id: string; schoolId?: string | null; isAdmin: boolean; role: string },
  assessmentId: string,
) {
  const assessment = await prisma.lmsAssessment.findFirst({
    where: {
      id: assessmentId,
      course: { schoolId: requireSchoolId(user) },
    },
    include: {
      course: {
        select: {
          id: true,
          schoolId: true,
          classRoomId: true,
          teacherId: true,
          subjectName: true,
        },
      },
    },
  });
  if (!assessment || !canManageCourse(user, assessment.course)) {
    throw new HttpError(404, "Ujian CBT tidak ditemukan atau Anda tidak memiliki akses.");
  }
  return assessment;
}

async function getStudentAssessmentOrThrow(student: User, assessmentId: string) {
  if (student.role !== "STUDENT") {
    throw new HttpError(403, "Hanya peserta didik yang dapat mengerjakan CBT.");
  }
  const schoolId = requireSchoolId(student);
  if (!student.classRoomId) {
    throw new HttpError(403, "Akun peserta didik belum terdaftar pada rombel.");
  }
  const assessment = await prisma.lmsAssessment.findFirst({
    where: {
      id: assessmentId,
      course: {
        schoolId,
        classRoomId: student.classRoomId,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          schoolId: true,
          classRoomId: true,
          teacherId: true,
          subjectName: true,
        },
      },
      questions: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!assessment || !canAccessCourse(student, assessment.course)) {
    throw new HttpError(404, "Ujian CBT tidak ditemukan.");
  }
  return assessment;
}

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return [];
  const result: QuestionOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.text !== "string") continue;
    result.push({
      id: record.id,
      text: record.text,
      isCorrect: record.isCorrect === true,
    });
  }
  return result;
}

function validateQuestionInput(input: {
  questionType: "MULTIPLE_CHOICE" | "ESSAY";
  prompt: string;
  options?: QuestionOption[];
  points: number;
}) {
  if (input.prompt.trim().length < 2) {
    throw new HttpError(400, "Teks soal minimal 2 karakter.");
  }
  if (!(input.points > 0) || input.points > 1000) {
    throw new HttpError(400, "Bobot soal harus lebih dari 0 dan maksimal 1000.");
  }
  if (input.questionType === "MULTIPLE_CHOICE") {
    const options = input.options || [];
    if (options.length < 2) {
      throw new HttpError(400, "Pilihan ganda membutuhkan minimal dua opsi.");
    }
    const ids = new Set(options.map((option) => option.id.trim()));
    if (ids.size !== options.length || [...ids].some((id) => !id)) {
      throw new HttpError(400, "ID opsi wajib diisi dan harus unik.");
    }
    if (options.some((option) => !option.text.trim())) {
      throw new HttpError(400, "Teks semua opsi wajib diisi.");
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      throw new HttpError(400, "Pilihan ganda harus memiliki tepat satu jawaban benar.");
    }
  }
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const bytes = randomBytes(4);
    const random = bytes.readUInt32BE(0) / 0xffffffff;
    const j = Math.floor(random * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateAccessToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function totalQuestionPoints(questions: Array<{ points: number }>) {
  return questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
}

function scoreCanBeShown(
  assessment: { showScoreMode: string; endTime: Date },
  attempt: { gradingStatus: string } | null,
  now: Date,
) {
  if (!attempt || attempt.gradingStatus === "PENDING") return false;
  if (assessment.showScoreMode === "HIDDEN") return false;
  if (assessment.showScoreMode === "AFTER_END") return now >= assessment.endTime;
  return true;
}

async function auditEvent(input: {
  assessmentId: string;
  attemptId?: string | null;
  actorId?: string | null;
  eventType: string;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.lmsAssessmentEvent.create({
    data: {
      assessmentId: input.assessmentId,
      attemptId: input.attemptId || null,
      actorId: input.actorId || null,
      eventType: input.eventType,
      payload: input.payload,
    },
  });
}

async function ensureAssessmentStructureMutable(assessmentId: string) {
  const attempts = await prisma.lmsAssessmentAttempt.count({
    where: { assessmentId },
  });
  if (attempts > 0) {
    throw new HttpError(
      409,
      "Struktur soal tidak dapat diubah setelah ada peserta yang memulai ujian.",
    );
  }
}

const questionInputSchema = z.object({
  questionType: z.enum(["MULTIPLE_CHOICE", "ESSAY"]),
  prompt: z.string().min(2),
  imageUrl: z.string().optional().nullable(),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean(),
      }),
    )
    .optional()
    .default([]),
  points: z.number().positive().max(1000).default(10),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().default("MEDIUM"),
  tags: z.array(z.string()).optional().default([]),
  explanation: z.string().optional().nullable(),
});

const getTeacherWorkspaceSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const getCbtTeacherWorkspace = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const { assessmentId } = ensureArgsSchemaOrThrowHttpError(
    getTeacherWorkspaceSchema,
    rawArgs,
  );
  const assessment = await getManagedAssessmentOrThrow(teacher, assessmentId);

  const [fullAssessment, students] = await Promise.all([
    prisma.lmsAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: { bankItem: true },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
        attempts: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            answers: true,
          },
          orderBy: [{ studentId: "asc" }, { attemptNo: "desc" }],
        },
        results: true,
        events: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        },
      },
    }),
    prisma.user.findMany({
      where: {
        schoolId: assessment.course.schoolId,
        classRoomId: assessment.course.classRoomId,
        role: "STUDENT",
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!fullAssessment) throw new HttpError(404, "Ujian CBT tidak ditemukan.");

  const latestAttemptByStudent = new Map<string, (typeof fullAssessment.attempts)[number]>();
  for (const attempt of fullAssessment.attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) {
      latestAttemptByStudent.set(attempt.studentId, attempt);
    }
  }
  const legacyResultByStudent = new Map(
    fullAssessment.results.map((result) => [result.studentId, result]),
  );

  const monitoring = students.map((student) => {
    const attempt = latestAttemptByStudent.get(student.id) || null;
    const legacy = legacyResultByStudent.get(student.id) || null;
    const status = attempt?.status || (legacy ? "LEGACY_RESULT" : "NOT_STARTED");
    return {
      student,
      status,
      attemptId: attempt?.id || null,
      attemptNo: attempt?.attemptNo || null,
      startedAt: attempt?.startedAt || legacy?.startedAt || null,
      expiresAt: attempt?.expiresAt || null,
      submittedAt: attempt?.submittedAt || legacy?.finishedAt || null,
      gradingStatus: attempt?.gradingStatus || (legacy ? "COMPLETE" : null),
      scoreTotal: attempt?.scoreTotal ?? legacy?.score ?? null,
      percentage: attempt?.percentage ?? null,
      passed: attempt?.passed ?? null,
    };
  });

  const finishedAttempts = [...latestAttemptByStudent.values()].filter((attempt) =>
    FINAL_ATTEMPT_STATUSES.includes(attempt.status as (typeof FINAL_ATTEMPT_STATUSES)[number]),
  );
  const percentageValues = finishedAttempts
    .filter((attempt) => attempt.gradingStatus !== "PENDING")
    .map((attempt) => attempt.percentage);

  const questionAnalysis = fullAssessment.questions.map((question) => {
    const answers = finishedAttempts
      .map((attempt) => attempt.answers.find((answer) => answer.questionId === question.id))
      .filter(Boolean);
    if (question.questionType === "MULTIPLE_CHOICE") {
      const answered = answers.filter((answer) => !!answer?.selectedOptionId);
      const correct = answered.filter((answer) => Number(answer?.autoScore || 0) >= question.points);
      return {
        questionId: question.id,
        questionType: question.questionType,
        answeredCount: answered.length,
        correctCount: correct.length,
        correctRate: answered.length ? (correct.length / answered.length) * 100 : 0,
        pendingGradeCount: 0,
      };
    }
    const pending = answers.filter(
      (answer) => !!answer?.answerText?.trim() && answer.manualScore === null,
    );
    return {
      questionId: question.id,
      questionType: question.questionType,
      answeredCount: answers.filter((answer) => !!answer?.answerText?.trim()).length,
      correctCount: null,
      correctRate: null,
      pendingGradeCount: pending.length,
    };
  });

  return {
    assessment: fullAssessment,
    course: assessment.course,
    monitoring,
    summary: {
      eligibleStudents: students.length,
      notStarted: monitoring.filter((item) => item.status === "NOT_STARTED").length,
      inProgress: monitoring.filter((item) => item.status === "IN_PROGRESS").length,
      submitted: monitoring.filter((item) =>
        ["SUBMITTED", "AUTO_SUBMITTED", "LEGACY_RESULT"].includes(item.status),
      ).length,
      graded: monitoring.filter((item) => item.status === "GRADED").length,
      pendingEssay: fullAssessment.attempts.reduce(
        (sum, attempt) =>
          sum +
          attempt.answers.filter(
            (answer) => !!answer.answerText?.trim() && answer.manualScore === null,
          ).length,
        0,
      ),
      averagePercentage: percentageValues.length
        ? percentageValues.reduce((sum, value) => sum + value, 0) / percentageValues.length
        : null,
      highestPercentage: percentageValues.length ? Math.max(...percentageValues) : null,
      lowestPercentage: percentageValues.length ? Math.min(...percentageValues) : null,
    },
    questionAnalysis,
    totalPoints: totalQuestionPoints(fullAssessment.questions),
    serverNow: new Date(),
  };
};

const getStudentWorkspaceSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const getCbtStudentWorkspace = async (rawArgs: unknown, context: CbtContext) => {
  const student = ensureSchoolUser(context, ["STUDENT"]);
  const { assessmentId } = ensureArgsSchemaOrThrowHttpError(
    getStudentWorkspaceSchema,
    rawArgs,
  );
  const assessment = await getStudentAssessmentOrThrow(student, assessmentId);
  const now = new Date();

  const [attempts, legacyResult] = await Promise.all([
    prisma.lmsAssessmentAttempt.findMany({
      where: { assessmentId, studentId: student.id },
      include: { answers: true },
      orderBy: { attemptNo: "desc" },
    }),
    prisma.lmsAssessmentResult.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId: student.id,
        },
      },
    }),
  ]);

  const activeAttempt = attempts.find((attempt) => attempt.status === "IN_PROGRESS") || null;
  const latestAttempt = attempts[0] || null;
  const completedAttempts = attempts.filter((attempt) =>
    FINAL_ATTEMPT_STATUSES.includes(attempt.status as (typeof FINAL_ATTEMPT_STATUSES)[number]),
  ).length;
  const legacyCompleted = legacyResult && !legacyResult.attemptId ? 1 : 0;
  const attemptsUsed = Math.max(attempts.length, completedAttempts + legacyCompleted);

  let safeQuestions: SafeStudentQuestion[] = [];
  if (activeAttempt) {
    const questionOrder = Array.isArray(activeAttempt.questionOrder)
      ? (activeAttempt.questionOrder as string[])
      : assessment.questions.map((question) => question.id);
    const optionOrder =
      activeAttempt.optionOrder && typeof activeAttempt.optionOrder === "object"
        ? (activeAttempt.optionOrder as Record<string, string[]>)
        : {};

    const questionMap = new Map(assessment.questions.map((question) => [question.id, question]));
    safeQuestions = questionOrder
      .map((questionId) => questionMap.get(questionId))
      .filter(Boolean)
      .map((question) => {
        const options = normalizeOptions(question!.options);
        const desiredOrder = optionOrder[question!.id] || options.map((option) => option.id);
        const optionMap = new Map(options.map((option) => [option.id, option]));
        return {
          id: question!.id,
          questionType: question!.questionType,
          prompt: question!.prompt,
          imageUrl: question!.imageUrl,
          points: question!.points,
          position: question!.position,
          options:
            question!.questionType === "MULTIPLE_CHOICE"
              ? desiredOrder
                  .map((id) => optionMap.get(id))
                  .filter(Boolean)
                  .map((option) => ({ id: option!.id, text: option!.text }))
              : [],
        };
      });
  }

  const answerByQuestion = new Map(
    (activeAttempt?.answers || []).map((answer) => [answer.questionId, answer]),
  );

  const availability =
    assessment.status !== "PUBLISHED"
      ? "UNAVAILABLE"
      : now < assessment.startTime
        ? "NOT_STARTED"
        : now > assessment.endTime
          ? "ENDED"
          : "OPEN";

  const visibleAttempt = latestAttempt;
  const canShowScore = visibleAttempt
    ? scoreCanBeShown(assessment, visibleAttempt, now)
    : !!legacyResult &&
      assessment.showScoreMode !== "HIDDEN" &&
      (assessment.showScoreMode === "IMMEDIATE" || now >= assessment.endTime);

  return {
    assessment: {
      id: assessment.id,
      courseId: assessment.courseId,
      title: assessment.title,
      instructions: assessment.instructions,
      durationMinutes: assessment.durationMinutes,
      startTime: assessment.startTime,
      endTime: assessment.endTime,
      status: assessment.status,
      attemptLimit: assessment.attemptLimit,
      passingScore: assessment.passingScore,
      requireToken: assessment.requireToken,
      showScoreMode: assessment.showScoreMode,
      questionCount: assessment.questions.length,
      totalPoints: totalQuestionPoints(assessment.questions),
      subjectName: assessment.course.subjectName,
    },
    availability,
    attemptsUsed,
    attemptsRemaining: Math.max(0, assessment.attemptLimit - attemptsUsed),
    legacyCompleted: !!legacyResult && !legacyResult.attemptId,
    activeAttempt: activeAttempt
      ? {
          id: activeAttempt.id,
          attemptNo: activeAttempt.attemptNo,
          status: activeAttempt.status,
          startedAt: activeAttempt.startedAt,
          expiresAt: activeAttempt.expiresAt,
          expired: now > activeAttempt.expiresAt,
          lastSavedAt: activeAttempt.lastSavedAt,
          questions: safeQuestions,
          answers: safeQuestions.reduce<Record<string, string>>((result, question) => {
            const answer = answerByQuestion.get(String(question.id));
            if (!answer) return result;
            result[String(question.id)] =
              answer.selectedOptionId || answer.answerText || "";
            return result;
          }, {}),
        }
      : null,
    latestResult:
      visibleAttempt || legacyResult
        ? {
            status: visibleAttempt?.status || "LEGACY_RESULT",
            gradingStatus: visibleAttempt?.gradingStatus || "COMPLETE",
            scoreTotal: canShowScore
              ? visibleAttempt?.scoreTotal ?? legacyResult?.score ?? null
              : null,
            percentage: canShowScore ? visibleAttempt?.percentage ?? null : null,
            passed: canShowScore ? visibleAttempt?.passed ?? null : null,
            submittedAt: visibleAttempt?.submittedAt || legacyResult?.finishedAt || null,
            scoreVisible: canShowScore,
          }
        : null,
    serverNow: now,
  };
};

const getQuestionBankSchema = z.object({
  courseId: z.string().uuid(),
  search: z.string().optional(),
  questionType: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});

export const getCbtQuestionBank = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(getQuestionBankSchema, rawArgs);
  const course = await getManagedCourseOrThrow(teacher, args.courseId);
  return prisma.lmsQuestionBankItem.findMany({
    where: {
      schoolId: course.schoolId,
      courseId: course.id,
      ...(args.questionType ? { questionType: args.questionType } : {}),
      ...(args.difficulty ? { difficulty: args.difficulty } : {}),
      ...(args.search?.trim()
        ? {
            prompt: {
              contains: args.search.trim(),
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
};

const updateSettingsSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedVersion: z.number().int().positive().optional(),
  title: z.string().min(2),
  instructions: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  attemptLimit: z.number().int().min(1).max(10),
  passingScore: z.number().min(0).max(100),
  isRandomized: z.boolean(),
  shuffleOptions: z.boolean(),
  requireToken: z.boolean(),
  showScoreMode: z.enum(["IMMEDIATE", "AFTER_END", "HIDDEN"]),
});

export const updateCbtAssessmentSettings = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateSettingsSchema, rawArgs);
  const assessment = await getManagedAssessmentOrThrow(teacher, args.assessmentId);

  const startTime = new Date(args.startTime);
  const endTime = new Date(args.endTime);
  if (
    Number.isNaN(startTime.valueOf()) ||
    Number.isNaN(endTime.valueOf()) ||
    startTime >= endTime
  ) {
    throw new HttpError(400, "Jadwal mulai harus lebih awal daripada waktu selesai.");
  }

  const attemptCount = await prisma.lmsAssessmentAttempt.count({
    where: { assessmentId: assessment.id },
  });
  if (attemptCount > 0) {
    const structuralChanged =
      assessment.durationMinutes !== args.durationMinutes ||
      assessment.isRandomized !== args.isRandomized ||
      assessment.shuffleOptions !== args.shuffleOptions ||
      assessment.attemptLimit !== args.attemptLimit ||
      assessment.startTime.getTime() !== startTime.getTime();
    if (structuralChanged) {
      throw new HttpError(
        409,
        "Durasi, waktu mulai, randomisasi, dan batas attempt tidak dapat diubah setelah peserta mulai ujian.",
      );
    }
    if (endTime < assessment.endTime) {
      throw new HttpError(409, "Waktu selesai tidak boleh dipercepat setelah ujian dimulai peserta.");
    }
  }

  const token =
    args.requireToken && !assessment.accessToken
      ? generateAccessToken()
      : args.requireToken
        ? assessment.accessToken
        : null;

  const updated = await prisma.lmsAssessment.updateMany({
    where: {
      id: assessment.id,
      ...(args.expectedVersion ? { version: args.expectedVersion } : {}),
    },
    data: {
      title: args.title.trim(),
      instructions: args.instructions?.trim() || null,
      durationMinutes: args.durationMinutes,
      startTime,
      endTime,
      status: args.status,
      attemptLimit: args.attemptLimit,
      passingScore: args.passingScore,
      isRandomized: args.isRandomized,
      shuffleOptions: args.shuffleOptions,
      requireToken: args.requireToken,
      accessToken: token,
      showScoreMode: args.showScoreMode,
      version: { increment: 1 },
    },
  });
  if (!updated.count) {
    throw new HttpError(409, "Pengaturan CBT telah berubah. Muat ulang sebelum menyimpan.");
  }

  await auditEvent({
    assessmentId: assessment.id,
    actorId: teacher.id,
    eventType: "SETTINGS_UPDATED",
    payload: {
      status: args.status,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attemptLimit: args.attemptLimit,
    },
  });

  return prisma.lmsAssessment.findUnique({ where: { id: assessment.id } });
};

const tokenSchema = z.object({ assessmentId: z.string().uuid() });

export const regenerateCbtToken = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const { assessmentId } = ensureArgsSchemaOrThrowHttpError(tokenSchema, rawArgs);
  const assessment = await getManagedAssessmentOrThrow(teacher, assessmentId);
  const token = generateAccessToken();
  await prisma.lmsAssessment.update({
    where: { id: assessment.id },
    data: {
      requireToken: true,
      accessToken: token,
      version: { increment: 1 },
    },
  });
  await auditEvent({
    assessmentId,
    actorId: teacher.id,
    eventType: "TOKEN_REGENERATED",
  });
  return { accessToken: token };
};

const bankSaveSchema = z.object({
  courseId: z.string().uuid(),
  bankItemId: z.string().uuid().optional(),
  question: questionInputSchema,
});

export const saveCbtQuestionBankItem = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(bankSaveSchema, rawArgs);
  const course = await getManagedCourseOrThrow(teacher, args.courseId);
  validateQuestionInput(args.question);

  const data = {
    schoolId: course.schoolId,
    courseId: course.id,
    createdById: teacher.id,
    questionType: args.question.questionType,
    prompt: args.question.prompt.trim(),
    imageUrl: args.question.imageUrl || null,
    options:
      args.question.questionType === "MULTIPLE_CHOICE"
        ? (args.question.options as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    points: args.question.points,
    difficulty: args.question.difficulty,
    tags: args.question.tags as Prisma.InputJsonValue,
    explanation: args.question.explanation?.trim() || null,
  };

  if (args.bankItemId) {
    const existing = await prisma.lmsQuestionBankItem.findFirst({
      where: {
        id: args.bankItemId,
        schoolId: course.schoolId,
        courseId: course.id,
      },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Butir bank soal tidak ditemukan.");
    return prisma.lmsQuestionBankItem.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.lmsQuestionBankItem.create({ data });
};

const bankDeleteSchema = z.object({
  courseId: z.string().uuid(),
  bankItemId: z.string().uuid(),
});

export const deleteCbtQuestionBankItem = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(bankDeleteSchema, rawArgs);
  const course = await getManagedCourseOrThrow(teacher, args.courseId);
  const item = await prisma.lmsQuestionBankItem.findFirst({
    where: { id: args.bankItemId, schoolId: course.schoolId, courseId: course.id },
    select: { id: true },
  });
  if (!item) throw new HttpError(404, "Butir bank soal tidak ditemukan.");
  await prisma.lmsQuestionBankItem.delete({ where: { id: item.id } });
  return { deleted: true };
};

const addQuestionSchema = z.object({
  assessmentId: z.string().uuid(),
  bankItemId: z.string().uuid().optional().nullable(),
  saveToBank: z.boolean().optional().default(false),
  question: questionInputSchema,
});

export const addCbtQuestion = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(addQuestionSchema, rawArgs);
  const assessment = await getManagedAssessmentOrThrow(teacher, args.assessmentId);
  await ensureAssessmentStructureMutable(assessment.id);
  validateQuestionInput(args.question);

  let bankItemId = args.bankItemId || null;
  if (bankItemId) {
    const item = await prisma.lmsQuestionBankItem.findFirst({
      where: {
        id: bankItemId,
        schoolId: assessment.course.schoolId,
        courseId: assessment.course.id,
      },
      select: { id: true },
    });
    if (!item) throw new HttpError(404, "Butir bank soal tidak ditemukan.");
  } else if (args.saveToBank) {
    const createdBank = await prisma.lmsQuestionBankItem.create({
      data: {
        schoolId: assessment.course.schoolId,
        courseId: assessment.course.id,
        createdById: teacher.id,
        questionType: args.question.questionType,
        prompt: args.question.prompt.trim(),
        imageUrl: args.question.imageUrl || null,
        options:
          args.question.questionType === "MULTIPLE_CHOICE"
            ? (args.question.options as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        points: args.question.points,
        difficulty: args.question.difficulty,
        tags: args.question.tags as Prisma.InputJsonValue,
        explanation: args.question.explanation?.trim() || null,
      },
    });
    bankItemId = createdBank.id;
  }

  const maxPosition = await prisma.lmsAssessmentQuestion.aggregate({
    where: { assessmentId: assessment.id },
    _max: { position: true },
  });
  const created = await prisma.lmsAssessmentQuestion.create({
    data: {
      assessmentId: assessment.id,
      bankItemId,
      questionType: args.question.questionType,
      prompt: args.question.prompt.trim(),
      imageUrl: args.question.imageUrl || null,
      options:
        args.question.questionType === "MULTIPLE_CHOICE"
          ? (args.question.options as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      points: args.question.points,
      position: (maxPosition._max.position ?? -1) + 1,
      explanation: args.question.explanation?.trim() || null,
    },
  });
  await auditEvent({
    assessmentId: assessment.id,
    actorId: teacher.id,
    eventType: "QUESTION_ADDED",
    payload: { questionId: created.id, questionType: created.questionType },
  });
  return created;
};

const updateQuestionSchema = z.object({
  questionId: z.string().uuid(),
  question: questionInputSchema,
});

export const updateCbtQuestion = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateQuestionSchema, rawArgs);
  validateQuestionInput(args.question);
  const existing = await prisma.lmsAssessmentQuestion.findUnique({
    where: { id: args.questionId },
    include: {
      assessment: {
        include: {
          course: {
            select: { id: true, schoolId: true, classRoomId: true, teacherId: true },
          },
        },
      },
    },
  });
  if (!existing || !canManageCourse(teacher, existing.assessment.course)) {
    throw new HttpError(404, "Soal CBT tidak ditemukan.");
  }
  await ensureAssessmentStructureMutable(existing.assessmentId);
  const updated = await prisma.lmsAssessmentQuestion.update({
    where: { id: existing.id },
    data: {
      questionType: args.question.questionType,
      prompt: args.question.prompt.trim(),
      imageUrl: args.question.imageUrl || null,
      options:
        args.question.questionType === "MULTIPLE_CHOICE"
          ? (args.question.options as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      points: args.question.points,
      explanation: args.question.explanation?.trim() || null,
    },
  });
  await auditEvent({
    assessmentId: existing.assessmentId,
    actorId: teacher.id,
    eventType: "QUESTION_UPDATED",
    payload: { questionId: existing.id },
  });
  return updated;
};

const deleteQuestionSchema = z.object({ questionId: z.string().uuid() });

export const deleteCbtQuestion = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const { questionId } = ensureArgsSchemaOrThrowHttpError(deleteQuestionSchema, rawArgs);
  const existing = await prisma.lmsAssessmentQuestion.findUnique({
    where: { id: questionId },
    include: {
      assessment: {
        include: {
          course: {
            select: { id: true, schoolId: true, classRoomId: true, teacherId: true },
          },
        },
      },
    },
  });
  if (!existing || !canManageCourse(teacher, existing.assessment.course)) {
    throw new HttpError(404, "Soal CBT tidak ditemukan.");
  }
  await ensureAssessmentStructureMutable(existing.assessmentId);
  await prisma.lmsAssessmentQuestion.delete({ where: { id: existing.id } });
  await auditEvent({
    assessmentId: existing.assessmentId,
    actorId: teacher.id,
    eventType: "QUESTION_DELETED",
    payload: { questionId: existing.id },
  });
  return { deleted: true };
};

const addFromBankSchema = z.object({
  assessmentId: z.string().uuid(),
  bankItemId: z.string().uuid(),
});

export const addCbtQuestionFromBank = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(addFromBankSchema, rawArgs);
  const assessment = await getManagedAssessmentOrThrow(teacher, args.assessmentId);
  await ensureAssessmentStructureMutable(assessment.id);
  const item = await prisma.lmsQuestionBankItem.findFirst({
    where: {
      id: args.bankItemId,
      schoolId: assessment.course.schoolId,
      courseId: assessment.course.id,
    },
  });
  if (!item) throw new HttpError(404, "Butir bank soal tidak ditemukan.");

  const maxPosition = await prisma.lmsAssessmentQuestion.aggregate({
    where: { assessmentId: assessment.id },
    _max: { position: true },
  });
  const created = await prisma.lmsAssessmentQuestion.create({
    data: {
      assessmentId: assessment.id,
      bankItemId: item.id,
      questionType: item.questionType,
      prompt: item.prompt,
      imageUrl: item.imageUrl,
      options: item.options ?? Prisma.JsonNull,
      points: item.points,
      position: (maxPosition._max.position ?? -1) + 1,
      explanation: item.explanation,
    },
  });
  await auditEvent({
    assessmentId: assessment.id,
    actorId: teacher.id,
    eventType: "QUESTION_ADDED_FROM_BANK",
    payload: { questionId: created.id, bankItemId: item.id },
  });
  return created;
};

const importQuestionsSchema = z.object({
  assessmentId: z.string().uuid(),
  saveToBank: z.boolean().optional().default(true),
  questions: z.array(questionInputSchema).min(1).max(250),
});

export const importCbtQuestions = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(importQuestionsSchema, rawArgs);
  const assessment = await getManagedAssessmentOrThrow(teacher, args.assessmentId);
  await ensureAssessmentStructureMutable(assessment.id);
  for (const question of args.questions) validateQuestionInput(question);

  const existingMax = await prisma.lmsAssessmentQuestion.aggregate({
    where: { assessmentId: assessment.id },
    _max: { position: true },
  });
  let position = (existingMax._max.position ?? -1) + 1;

  const createdIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const question of args.questions) {
      let bankItemId: string | null = null;
      if (args.saveToBank) {
        const bank = await tx.lmsQuestionBankItem.create({
          data: {
            schoolId: assessment.course.schoolId,
            courseId: assessment.course.id,
            createdById: teacher.id,
            questionType: question.questionType,
            prompt: question.prompt.trim(),
            imageUrl: question.imageUrl || null,
            options:
              question.questionType === "MULTIPLE_CHOICE"
                ? (question.options as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            points: question.points,
            difficulty: question.difficulty,
            tags: question.tags as Prisma.InputJsonValue,
            explanation: question.explanation?.trim() || null,
          },
        });
        bankItemId = bank.id;
      }
      const created = await tx.lmsAssessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          bankItemId,
          questionType: question.questionType,
          prompt: question.prompt.trim(),
          imageUrl: question.imageUrl || null,
          options:
            question.questionType === "MULTIPLE_CHOICE"
              ? (question.options as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          points: question.points,
          position,
          explanation: question.explanation?.trim() || null,
        },
      });
      createdIds.push(created.id);
      position += 1;
    }
    await tx.lmsAssessmentEvent.create({
      data: {
        assessmentId: assessment.id,
        actorId: teacher.id,
        eventType: "QUESTIONS_IMPORTED",
        payload: { count: createdIds.length },
      },
    });
  });

  return { createdCount: createdIds.length, questionIds: createdIds };
};

async function ensureAttemptAnswerRows(
  tx: Prisma.TransactionClient,
  attempt: {
    id: string;
    assessment: {
      questions: Array<{
        id: string;
        questionType: string;
      }>;
    };
  },
) {
  for (const question of attempt.assessment.questions) {
    await tx.lmsAssessmentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: question.id,
        },
      },
      create: {
        attemptId: attempt.id,
        questionId: question.id,
        manualScore: question.questionType === "ESSAY" ? 0 : null,
      },
      update: {},
    });
  }
}

async function recomputeAttempt(
  tx: Prisma.TransactionClient,
  attemptId: string,
  submitMode?: "SUBMITTED" | "AUTO_SUBMITTED",
) {
  const attempt = await tx.lmsAssessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: {
        include: {
          questions: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) throw new HttpError(404, "Attempt CBT tidak ditemukan.");

  await ensureAttemptAnswerRows(tx, attempt);

  const answers = await tx.lmsAssessmentAnswer.findMany({
    where: { attemptId },
  });
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  let scoreAuto = 0;
  let scoreManual = 0;
  let pendingEssay = 0;

  for (const question of attempt.assessment.questions) {
    const answer = answerMap.get(question.id);
    if (!answer) continue;

    if (question.questionType === "MULTIPLE_CHOICE") {
      const options = normalizeOptions(question.options);
      const correct = options.find((option) => option.isCorrect);
      const autoScore =
        correct && answer.selectedOptionId === correct.id ? question.points : 0;
      scoreAuto += autoScore;
      if (answer.autoScore !== autoScore) {
        await tx.lmsAssessmentAnswer.update({
          where: { id: answer.id },
          data: { autoScore },
        });
      }
    } else {
      const hasEssay = !!answer.answerText?.trim();
      if (!hasEssay) {
        if (answer.manualScore !== 0) {
          await tx.lmsAssessmentAnswer.update({
            where: { id: answer.id },
            data: { manualScore: 0 },
          });
        }
      } else if (answer.gradedAt === null) {
        pendingEssay += 1;
      }
      scoreManual += Number(answer.manualScore || 0);
    }
  }

  const totalPoints = totalQuestionPoints(attempt.assessment.questions);
  const scoreTotal = scoreAuto + scoreManual;
  const percentage = totalPoints > 0 ? Math.min(100, (scoreTotal / totalPoints) * 100) : 0;
  const gradingStatus = pendingEssay > 0 ? "PENDING" : "COMPLETE";
  const passed =
    gradingStatus === "COMPLETE"
      ? percentage >= attempt.assessment.passingScore
      : null;

  const updateData: Prisma.LmsAssessmentAttemptUpdateInput = {
    scoreAuto,
    scoreManual,
    scoreTotal,
    percentage,
    gradingStatus,
    passed,
    version: { increment: 1 },
  };
  if (submitMode) {
    updateData.status = submitMode;
    updateData.submittedAt = attempt.submittedAt || new Date();
  } else if (gradingStatus === "COMPLETE" && attempt.status !== "IN_PROGRESS") {
    updateData.status = "GRADED";
  }

  const updated = await tx.lmsAssessmentAttempt.update({
    where: { id: attempt.id },
    data: updateData,
  });

  if (updated.status !== "IN_PROGRESS") {
    const compatibilityAnswers = Object.fromEntries(
      answers.map((answer) => [
        answer.questionId,
        answer.selectedOptionId ?? answer.answerText ?? "",
      ]),
    );
    await tx.lmsAssessmentResult.upsert({
      where: {
        assessmentId_studentId: {
          assessmentId: attempt.assessmentId,
          studentId: attempt.studentId,
        },
      },
      create: {
        assessmentId: attempt.assessmentId,
        studentId: attempt.studentId,
        attemptId: attempt.id,
        score: percentage,
        startedAt: attempt.startedAt,
        finishedAt: updated.submittedAt || new Date(),
        answers: compatibilityAnswers,
      },
      update: {
        attemptId: attempt.id,
        score: percentage,
        startedAt: attempt.startedAt,
        finishedAt: updated.submittedAt || new Date(),
        answers: compatibilityAnswers,
      },
    });
  }

  return updated;
}

const startAttemptSchema = z.object({
  assessmentId: z.string().uuid(),
  token: z.string().optional().nullable(),
});

export const startCbtAttempt = async (rawArgs: unknown, context: CbtContext) => {
  const student = ensureSchoolUser(context, ["STUDENT"]);
  const args = ensureArgsSchemaOrThrowHttpError(startAttemptSchema, rawArgs);
  const assessment = await getStudentAssessmentOrThrow(student, args.assessmentId);
  const now = new Date();

  if (assessment.status !== "PUBLISHED") {
    throw new HttpError(403, "Ujian belum dipublikasikan.");
  }
  if (now < assessment.startTime) {
    throw new HttpError(409, "Ujian belum dimulai.");
  }
  if (now > assessment.endTime) {
    throw new HttpError(409, "Waktu ujian sudah berakhir.");
  }
  if (
    assessment.requireToken &&
    (!args.token || args.token.trim().toUpperCase() !== assessment.accessToken)
  ) {
    throw new HttpError(403, "Token ujian tidak valid.");
  }

  const existingInProgress = await prisma.lmsAssessmentAttempt.findFirst({
    where: {
      assessmentId: assessment.id,
      studentId: student.id,
      status: "IN_PROGRESS",
    },
    orderBy: { attemptNo: "desc" },
  });
  if (existingInProgress) {
    if (now > existingInProgress.expiresAt) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.lmsAssessmentAttempt.findUnique({
          where: { id: existingInProgress.id },
          select: { status: true },
        });
        if (current?.status === "IN_PROGRESS") {
          await recomputeAttempt(tx, existingInProgress.id, "AUTO_SUBMITTED");
          await tx.lmsAssessmentEvent.create({
            data: {
              assessmentId: assessment.id,
              attemptId: existingInProgress.id,
              actorId: student.id,
              eventType: "ATTEMPT_AUTO_SUBMITTED",
              payload: { reason: "EXPIRED_ON_RESUME" },
            },
          });
        }
      });
      throw new HttpError(409, "Attempt sebelumnya telah berakhir dan otomatis dikirim.");
    }
    return existingInProgress;
  }

  const [attemptCount, legacyResult] = await Promise.all([
    prisma.lmsAssessmentAttempt.count({
      where: { assessmentId: assessment.id, studentId: student.id },
    }),
    prisma.lmsAssessmentResult.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId: assessment.id,
          studentId: student.id,
        },
      },
      select: { id: true, attemptId: true },
    }),
  ]);

  if (legacyResult && !legacyResult.attemptId) {
    throw new HttpError(409, "Ujian ini sudah pernah diselesaikan pada sistem CBT sebelumnya.");
  }
  if (attemptCount >= assessment.attemptLimit) {
    throw new HttpError(409, "Batas attempt ujian sudah tercapai.");
  }

  const orderedQuestionIds = assessment.questions.map((question) => question.id);
  const questionOrder = assessment.isRandomized
    ? shuffled(orderedQuestionIds)
    : orderedQuestionIds;
  const optionOrder: Record<string, string[]> = {};
  for (const question of assessment.questions) {
    const optionIds = normalizeOptions(question.options).map((option) => option.id);
    optionOrder[question.id] =
      assessment.shuffleOptions && question.questionType === "MULTIPLE_CHOICE"
        ? shuffled(optionIds)
        : optionIds;
  }

  const durationEnd = new Date(now.getTime() + assessment.durationMinutes * 60_000);
  const expiresAt =
    durationEnd < assessment.endTime ? durationEnd : assessment.endTime;

  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.lmsAssessmentAttempt.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.id,
          attemptNo: attemptCount + 1,
          expiresAt,
          questionOrder,
          optionOrder,
        },
      });
      await tx.lmsAssessmentEvent.create({
        data: {
          assessmentId: assessment.id,
          attemptId: created.id,
          actorId: student.id,
          eventType: "ATTEMPT_STARTED",
          payload: {
            attemptNo: created.attemptNo,
            expiresAt: created.expiresAt.toISOString(),
          },
        },
      });
      return created;
    });
    return attempt;
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
    const concurrentAttempt = await prisma.lmsAssessmentAttempt.findFirst({
      where: {
        assessmentId: assessment.id,
        studentId: student.id,
        status: "IN_PROGRESS",
      },
      orderBy: { attemptNo: "desc" },
    });
    if (concurrentAttempt) return concurrentAttempt;
    throw new HttpError(409, "Attempt CBT sudah dibuat oleh request lain. Muat ulang halaman.");
  }
};

const saveAnswersSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().optional().nullable(),
        answerText: z.string().optional().nullable(),
      }),
    )
    .min(1)
    .max(100),
});

export const saveCbtAnswers = async (rawArgs: unknown, context: CbtContext) => {
  const student = ensureSchoolUser(context, ["STUDENT"]);
  const args = ensureArgsSchemaOrThrowHttpError(saveAnswersSchema, rawArgs);
  const attempt = await prisma.lmsAssessmentAttempt.findFirst({
    where: {
      id: args.attemptId,
      studentId: student.id,
      assessment: {
        course: {
          schoolId: requireSchoolId(student),
          classRoomId: student.classRoomId || "__none__",
        },
      },
    },
    include: {
      assessment: {
        include: { questions: true },
      },
    },
  });
  if (!attempt) throw new HttpError(404, "Attempt CBT tidak ditemukan.");
  if (attempt.status !== "IN_PROGRESS") {
    throw new HttpError(409, "Attempt CBT sudah selesai.");
  }

  const now = new Date();
  if (now > attempt.expiresAt || now > attempt.assessment.endTime) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.lmsAssessmentAttempt.findUnique({
        where: { id: attempt.id },
        select: { status: true },
      });
      if (current?.status === "IN_PROGRESS") {
        await recomputeAttempt(tx, attempt.id, "AUTO_SUBMITTED");
        await tx.lmsAssessmentEvent.create({
          data: {
            assessmentId: attempt.assessmentId,
            attemptId: attempt.id,
            actorId: student.id,
            eventType: "ATTEMPT_AUTO_SUBMITTED",
            payload: { reason: "SAVE_AFTER_EXPIRY" },
          },
        });
      }
    });
    throw new HttpError(409, "Waktu ujian habis. Jawaban tersimpan telah otomatis dikirim.");
  }

  const questionMap = new Map(
    attempt.assessment.questions.map((question) => [question.id, question]),
  );

  await prisma.$transaction(async (tx) => {
    for (const incoming of args.answers) {
      const question = questionMap.get(incoming.questionId);
      if (!question) {
        throw new HttpError(400, "Jawaban memuat soal yang tidak termasuk ujian.");
      }
      let selectedOptionId: string | null = null;
      let answerText: string | null = null;
      if (question.questionType === "MULTIPLE_CHOICE") {
        const options = normalizeOptions(question.options);
        if (
          !incoming.selectedOptionId ||
          !options.some((option) => option.id === incoming.selectedOptionId)
        ) {
          throw new HttpError(400, "Pilihan jawaban tidak valid.");
        }
        selectedOptionId = incoming.selectedOptionId;
      } else {
        answerText = incoming.answerText?.slice(0, 20_000) || "";
      }

      await tx.lmsAssessmentAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: question.id,
          },
        },
        create: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId,
          answerText,
          answeredAt: now,
          manualScore: question.questionType === "ESSAY" ? null : undefined,
        },
        update: {
          selectedOptionId,
          answerText,
          answeredAt: now,
          version: { increment: 1 },
        },
      });
    }
    await tx.lmsAssessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        lastSavedAt: now,
        version: { increment: 1 },
      },
    });
  });

  return { saved: true, savedAt: now };
};

const submitAttemptSchema = z.object({
  attemptId: z.string().uuid(),
});

export const submitCbtAttempt = async (rawArgs: unknown, context: CbtContext) => {
  const student = ensureSchoolUser(context, ["STUDENT"]);
  const { attemptId } = ensureArgsSchemaOrThrowHttpError(submitAttemptSchema, rawArgs);
  const attempt = await prisma.lmsAssessmentAttempt.findFirst({
    where: {
      id: attemptId,
      studentId: student.id,
      assessment: {
        course: {
          schoolId: requireSchoolId(student),
          classRoomId: student.classRoomId || "__none__",
        },
      },
    },
    include: { assessment: true },
  });
  if (!attempt) throw new HttpError(404, "Attempt CBT tidak ditemukan.");
  if (attempt.status !== "IN_PROGRESS") {
    return attempt;
  }

  const now = new Date();
  const auto = now > attempt.expiresAt || now > attempt.assessment.endTime;
  const finalized = await prisma.$transaction(async (tx) => {
    const current = await tx.lmsAssessmentAttempt.findUnique({
      where: { id: attempt.id },
      select: { status: true },
    });
    if (current?.status !== "IN_PROGRESS") {
      return tx.lmsAssessmentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    }
    const updated = await recomputeAttempt(
      tx,
      attempt.id,
      auto ? "AUTO_SUBMITTED" : "SUBMITTED",
    );
    await tx.lmsAssessmentEvent.create({
      data: {
        assessmentId: attempt.assessmentId,
        attemptId: attempt.id,
        actorId: student.id,
        eventType: auto ? "ATTEMPT_AUTO_SUBMITTED" : "ATTEMPT_SUBMITTED",
      },
    });
    return updated;
  });

  return finalized;
};

const gradeEssaySchema = z.object({
  answerId: z.string().uuid(),
  score: z.number().min(0),
  feedback: z.string().optional().nullable(),
});

export const gradeCbtEssayAnswer = async (rawArgs: unknown, context: CbtContext) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(gradeEssaySchema, rawArgs);
  const answer = await prisma.lmsAssessmentAnswer.findUnique({
    where: { id: args.answerId },
    include: {
      question: true,
      attempt: {
        include: {
          assessment: {
            include: {
              course: {
                select: { id: true, schoolId: true, classRoomId: true, teacherId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!answer || !canManageCourse(teacher, answer.attempt.assessment.course)) {
    throw new HttpError(404, "Jawaban esai tidak ditemukan.");
  }
  if (answer.question.questionType !== "ESSAY") {
    throw new HttpError(400, "Hanya jawaban esai yang dinilai manual.");
  }
  if (args.score > answer.question.points) {
    throw new HttpError(400, "Nilai esai tidak boleh melebihi bobot soal.");
  }
  if (answer.attempt.status === "IN_PROGRESS") {
    throw new HttpError(409, "Jawaban belum dikirim oleh peserta didik.");
  }

  const updatedAttempt = await prisma.$transaction(async (tx) => {
    await tx.lmsAssessmentAnswer.update({
      where: { id: answer.id },
      data: {
        manualScore: args.score,
        feedback: args.feedback?.trim() || null,
        gradedById: teacher.id,
        gradedAt: new Date(),
        version: { increment: 1 },
      },
    });
    const updated = await recomputeAttempt(tx, answer.attemptId);
    await tx.lmsAssessmentEvent.create({
      data: {
        assessmentId: answer.attempt.assessmentId,
        attemptId: answer.attemptId,
        actorId: teacher.id,
        eventType: "ESSAY_GRADED",
        payload: {
          answerId: answer.id,
          questionId: answer.questionId,
          score: args.score,
        },
      },
    });
    return updated;
  });
  return updatedAttempt;
};

export async function submitLegacyAssessmentAnswersCompat(
  rawArgs: { assessmentId: string; answers: Record<string, string> },
  context: CbtContext,
) {
  const student = ensureSchoolUser(context, ["STUDENT"]);
  const assessment = await getStudentAssessmentOrThrow(student, rawArgs.assessmentId);
  if (assessment.questions.some((question) => question.questionType === "ESSAY")) {
    throw new HttpError(409, "Ujian ini menggunakan CBT Gen2 dan harus dibuka dari halaman ujian.");
  }
  const attempt = await startCbtAttempt(
    { assessmentId: rawArgs.assessmentId, token: null },
    context,
  );
  await saveCbtAnswers(
    {
      attemptId: attempt.id,
      answers: Object.entries(rawArgs.answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
    },
    context,
  );
  return submitCbtAttempt({ attemptId: attempt.id }, context);
}
