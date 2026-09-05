import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, requireTeacher } from "../school/authGuards";

// ==========================================
// 1. LMS Courses Operations (Ruang Mapel)
// ==========================================

const getLmsCoursesSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
}).optional();

export const getLmsCourses = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getLmsCoursesSchema || z.any(),
    rawArgs || {}
  );

  return prisma.lmsCourse.findMany({
    where: {
      schoolId: user.schoolId,
      ...(filter?.classRoomId ? { classRoomId: filter.classRoomId } : {}),
      ...(filter?.teacherId ? { teacherId: filter.teacherId } : {}),
      ...(user.role === "TEACHER" && !user.isAdmin ? { teacherId: user.id } : {}),
      ...(user.role === "STUDENT" && user.classRoomId ? { classRoomId: user.classRoomId } : {}),
    },
    include: {
      teacher: {
        select: { id: true, name: true, email: true, teacherProfile: true },
      },
      classRoom: {
        include: { department: true, _count: { select: { students: true } } },
      },
      academicYear: true,
      _count: {
        select: {
          agendas: true,
          materials: true,
          assignments: true,
          assessments: true,
          attendances: true,
        },
      },
    },
    orderBy: { subjectName: "asc" },
  });
};

const getCourseDetailSchema = z.object({
  courseId: z.string().uuid(),
});

export const getLmsCourseDetail = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(getCourseDetailSchema, rawArgs);

  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId: user.schoolId },
    include: {
      teacher: { select: { id: true, name: true, email: true, teacherProfile: true } },
      classRoom: {
        include: {
          department: true,
          students: {
            select: { id: true, name: true, studentProfile: true },
            orderBy: { name: "asc" },
          },
        },
      },
      academicYear: true,
      agendas: {
        include: { photos: true },
        orderBy: { date: "desc" },
      },
      materials: {
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        include: {
          submissions: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { deadline: "desc" },
      },
      assessments: {
        include: {
          questions: true,
          results: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startTime: "desc" },
      },
      attendances: {
        include: {
          records: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!course) throw new HttpError(404, "Ruang kelas mapel tidak ditemukan.");
  return course;
};

const createLmsCourseSchema = z.object({
  subjectName: z.string().min(2, "Nama mata pelajaran minimal 2 karakter"),
  classRoomId: z.string().uuid(),
  teacherId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  description: z.string().optional().nullable(),
});

export const createLmsCourse = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createLmsCourseSchema, rawArgs);

  return prisma.lmsCourse.create({
    data: {
      schoolId: admin.schoolId,
      subjectName: args.subjectName.trim(),
      classRoomId: args.classRoomId,
      teacherId: args.teacherId,
      academicYearId: args.academicYearId,
      description: args.description || null,
    },
  });
};

const deleteLmsCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export const deleteLmsCourse = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(deleteLmsCourseSchema, rawArgs);

  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId: admin.schoolId },
  });
  if (!course) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");

  return prisma.lmsCourse.delete({ where: { id: courseId } });
};

// ==========================================
// 2. Class Agenda & Teaching Journal (KBM)
// ==========================================

const createCourseAgendaSchema = z.object({
  courseId: z.string().uuid(),
  period: z.string().min(1, "Jam pelajaran wajib diisi"), // e.g. "Jam 1-3"
  competency: z.string().min(2, "Materi / Kompetensi wajib diisi"),
  summary: z.string().min(5, "Ringkasan kegiatan KBM wajib diisi"),
  photoUrls: z.array(z.string()).optional(),
});

export const createCourseAgenda = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(createCourseAgendaSchema, rawArgs);

  const course = await prisma.lmsCourse.findFirst({
    where: { id: args.courseId, schoolId: teacher.schoolId },
  });
  if (!course) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");

  const agenda = await prisma.lmsAgenda.create({
    data: {
      courseId: args.courseId,
      date: new Date(),
      period: args.period,
      competency: args.competency,
      summary: args.summary,
    },
  });

  if (args.photoUrls && args.photoUrls.length > 0) {
    await prisma.lmsAgendaPhoto.createMany({
      data: args.photoUrls.map((url) => ({
        agendaId: agenda.id,
        photoUrl: url,
      })),
    });
  }

  return agenda;
};

// ==========================================
// 3. LMS Student Attendance Sessions
// ==========================================

const recordCourseAttendanceSchema = z.object({
  courseId: z.string().uuid(),
  sessionNumber: z.number().int().min(1).default(1),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(["HADIR", "SAKIT", "IZIN", "ALPA"]),
      notes: z.string().optional().nullable(),
    })
  ),
});

export const recordCourseAttendance = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(recordCourseAttendanceSchema, rawArgs);

  const course = await prisma.lmsCourse.findFirst({
    where: { id: args.courseId, schoolId: teacher.schoolId },
  });
  if (!course) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");

  const session = await prisma.lmsAttendanceSession.create({
    data: {
      courseId: args.courseId,
      date: new Date(),
      sessionNumber: args.sessionNumber,
    },
  });

  await prisma.lmsAttendanceRecord.createMany({
    data: args.records.map((r) => ({
      sessionId: session.id,
      studentId: r.studentId,
      status: r.status,
      notes: r.notes || null,
    })),
  });

  return session;
};

// ==========================================
// 4. Materials & Assignments Operations
// ==========================================

const createCourseMaterialSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, "Judul materi minimal 2 karakter"),
  description: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
});

export const createCourseMaterial = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(createCourseMaterialSchema, rawArgs);

  return prisma.lmsMaterial.create({
    data: {
      courseId: args.courseId,
      title: args.title.trim(),
      description: args.description || null,
      fileUrl: args.fileUrl || null,
      externalUrl: args.externalUrl || null,
    },
  });
};

const createCourseAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, "Judul tugas minimal 2 karakter"),
  instruction: z.string().min(5, "Instruksi tugas wajib diisi"),
  deadline: z.string(), // ISO date string
  attachmentUrl: z.string().optional().nullable(),
});

export const createCourseAssignment = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(createCourseAssignmentSchema, rawArgs);

  return prisma.lmsAssignment.create({
    data: {
      courseId: args.courseId,
      title: args.title.trim(),
      instruction: args.instruction.trim(),
      deadline: new Date(args.deadline),
      attachmentUrl: args.attachmentUrl || null,
    },
  });
};

const submitAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  textContent: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});

export const submitAssignment = async (rawArgs: unknown, context: { user?: User }) => {
  const student = ensureSchoolUser(context, ["STUDENT", "SUPERADMIN"]);
  const args = ensureArgsSchemaOrThrowHttpError(submitAssignmentSchema, rawArgs);

  // Upsert submission
  const existing = await prisma.lmsSubmission.findFirst({
    where: { assignmentId: args.assignmentId, studentId: student.id },
  });

  if (existing) {
    return prisma.lmsSubmission.update({
      where: { id: existing.id },
      data: {
        submittedAt: new Date(),
        textContent: args.textContent || null,
        fileUrl: args.fileUrl || null,
      },
    });
  }

  return prisma.lmsSubmission.create({
    data: {
      assignmentId: args.assignmentId,
      studentId: student.id,
      textContent: args.textContent || null,
      fileUrl: args.fileUrl || null,
    },
  });
};

const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  grade: z.number().min(0).max(100),
  feedback: z.string().optional().nullable(),
});

export const gradeSubmission = async (rawArgs: unknown, context: { user?: User }) => {
  requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(gradeSubmissionSchema, rawArgs);

  return prisma.lmsSubmission.update({
    where: { id: args.submissionId },
    data: {
      grade: args.grade,
      feedback: args.feedback || null,
    },
  });
};

// ==========================================
// 5. CBT (Computer Based Testing) Operations
// ==========================================

const createCourseAssessmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, "Judul ujian wajib diisi"),
  durationMinutes: z.number().int().min(5).default(60),
  startTime: z.string(), // ISO string
  endTime: z.string(),   // ISO string
  isRandomized: z.boolean().default(true),
});

export const createCourseAssessment = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(createCourseAssessmentSchema, rawArgs);

  return prisma.lmsAssessment.create({
    data: {
      courseId: args.courseId,
      title: args.title.trim(),
      durationMinutes: args.durationMinutes,
      startTime: new Date(args.startTime),
      endTime: new Date(args.endTime),
      isRandomized: args.isRandomized,
    },
  });
};

const addAssessmentQuestionSchema = z.object({
  assessmentId: z.string().uuid(),
  questionType: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).default("MULTIPLE_CHOICE"),
  prompt: z.string().min(2, "Soal wajib diisi"),
  imageUrl: z.string().optional().nullable(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
    })
  ),
  points: z.number().default(10.0),
});

export const addAssessmentQuestion = async (rawArgs: unknown, context: { user?: User }) => {
  requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(addAssessmentQuestionSchema, rawArgs);

  return prisma.lmsAssessmentQuestion.create({
    data: {
      assessmentId: args.assessmentId,
      questionType: args.questionType,
      prompt: args.prompt.trim(),
      imageUrl: args.imageUrl || null,
      options: args.options,
      points: args.points,
    },
  });
};

const submitAssessmentAnswersSchema = z.object({
  assessmentId: z.string().uuid(),
  answers: z.record(z.string(), z.string()), // { questionId: selectedOptionId }
});

export const submitAssessmentAnswers = async (rawArgs: unknown, context: { user?: User }) => {
  const student = ensureSchoolUser(context, ["STUDENT", "SUPERADMIN"]);
  const args = ensureArgsSchemaOrThrowHttpError(submitAssessmentAnswersSchema, rawArgs);

  const assessment = await prisma.lmsAssessment.findUnique({
    where: { id: args.assessmentId },
    include: { questions: true },
  });
  if (!assessment) throw new HttpError(404, "Ujian CBT tidak ditemukan.");

  // Automatic Grading for Multiple Choice
  let totalScore = 0;
  for (const q of assessment.questions) {
    if (q.questionType === "MULTIPLE_CHOICE" && Array.isArray(q.options)) {
      const studentAnswer = args.answers[q.id];
      const correctOption = (q.options as any[]).find((opt) => opt.isCorrect === true);
      if (correctOption && correctOption.id === studentAnswer) {
        totalScore += q.points;
      }
    }
  }

  return prisma.lmsAssessmentResult.create({
    data: {
      assessmentId: args.assessmentId,
      studentId: student.id,
      score: totalScore,
      finishedAt: new Date(),
      answers: args.answers,
    },
  });
};
