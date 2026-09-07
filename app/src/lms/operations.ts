import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, requireTeacher } from "../school/authGuards";
import { canAccessCourse, canManageCourse } from "./accessPolicy";

function requireActiveSchoolId(user: { schoolId?: string | null }) {
  if (!user.schoolId) {
    throw new HttpError(403, "Pilih unit sekolah sebelum mengakses data LMS.");
  }
  return user.schoolId;
}

async function getManagedCourseOrThrow(
  user: { id: string; schoolId?: string | null; isAdmin: boolean; role: string },
  courseId: string
) {
  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId: requireActiveSchoolId(user) },
    select: { id: true, schoolId: true, classRoomId: true, teacherId: true },
  });
  if (!course || !canManageCourse(user, course)) {
    throw new HttpError(404, "Mata pelajaran tidak ditemukan atau Anda tidak memiliki akses.");
  }
  return course;
}

// ==========================================
// 1. LMS Courses Operations (Ruang Mapel)
// ==========================================

const getLmsCoursesSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
}).optional();

export const getLmsCourses = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (!user.isAdmin && !["SUPERADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(user.role)) {
    throw new HttpError(403, "Peran akun ini tidak memiliki akses ke LMS sekolah.");
  }
  const schoolId = requireActiveSchoolId(user);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getLmsCoursesSchema || z.any(),
    rawArgs || {}
  );

  if (user.role === "STUDENT" && !user.classRoomId) return [];

  return prisma.lmsCourse.findMany({
    where: {
      schoolId,
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
  const schoolId = requireActiveSchoolId(user);

  const courseAccess = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId },
    select: { id: true, teacherId: true, classRoomId: true },
  });
  if (!courseAccess) throw new HttpError(404, "Ruang kelas mapel tidak ditemukan.");

  const isStudent = user.role === "STUDENT" && !user.isAdmin;
  if (!canAccessCourse(user, courseAccess)) {
    throw new HttpError(403, "Anda tidak memiliki akses ke ruang mata pelajaran ini.");
  }

  const course = await prisma.lmsCourse.findFirst({
    where: { id: courseId, schoolId },
    include: {
      teacher: { select: { id: true, name: true, email: true, teacherProfile: true } },
      classRoom: {
        include: {
          department: true,
          students: {
            ...(isStudent ? { where: { id: user.id } } : {}),
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
            ...(isStudent ? { where: { studentId: user.id } } : {}),
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { deadline: "desc" },
      },
      assessments: {
        include: {
          questions: true,
          results: {
            ...(isStudent ? { where: { studentId: user.id } } : {}),
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startTime: "desc" },
      },
      attendances: {
        include: {
          records: {
            ...(isStudent ? { where: { studentId: user.id } } : {}),
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!course) throw new HttpError(404, "Ruang kelas mapel tidak ditemukan.");

  if (isStudent) {
    for (const assessment of course.assessments) {
      for (const question of assessment.questions) {
        question.options = Array.isArray(question.options)
          ? question.options.map((option) => {
              const optionRecord =
                option && typeof option === "object" && !Array.isArray(option)
                  ? (option as { id?: unknown; text?: unknown })
                  : {};
              return {
                id: typeof optionRecord.id === "string" ? optionRecord.id : "",
                text: typeof optionRecord.text === "string" ? optionRecord.text : "",
              };
            })
          : null;
      }
    }
  }

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
  const schoolId = requireActiveSchoolId(admin);

  const [classRoom, teacher, academicYear] = await Promise.all([
    prisma.classRoom.findFirst({ where: { id: args.classRoomId, schoolId }, select: { id: true } }),
    prisma.user.findFirst({
      where: { id: args.teacherId, schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
      select: { id: true },
    }),
    prisma.academicYear.findFirst({ where: { id: args.academicYearId, schoolId }, select: { id: true } }),
  ]);
  if (!classRoom || !teacher || !academicYear) {
    throw new HttpError(400, "Rombel, guru pengampu, atau tahun ajaran tidak berasal dari unit sekolah ini.");
  }

  return prisma.lmsCourse.create({
    data: {
      schoolId,
      subjectName: args.subjectName.trim(),
      classRoomId: args.classRoomId,
      teacherId: args.teacherId,
      academicYearId: args.academicYearId,
      description: args.description || null,
    },
  });
};

const bulkCreateLmsCoursesSchema = z.object({
  classRoomId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  courses: z.array(
    z.object({
      subjectName: z.string().min(2, "Nama mata pelajaran minimal 2 karakter"),
      teacherId: z.string().uuid(),
      description: z.string().optional().nullable(),
    })
  ).min(1, "Minimal 1 mata pelajaran dipilih"),
});

export const bulkCreateLmsCourses = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(bulkCreateLmsCoursesSchema, rawArgs);
  const schoolId = requireActiveSchoolId(admin);

  const teacherIds = [...new Set(args.courses.map((course) => course.teacherId))];
  const [classRoom, academicYear, teachers] = await Promise.all([
    prisma.classRoom.findFirst({ where: { id: args.classRoomId, schoolId }, select: { id: true } }),
    prisma.academicYear.findFirst({ where: { id: args.academicYearId, schoolId }, select: { id: true } }),
    prisma.user.findMany({
      where: { id: { in: teacherIds }, schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
      select: { id: true },
    }),
  ]);
  if (!classRoom || !academicYear || teachers.length !== teacherIds.length) {
    throw new HttpError(400, "Rombel, tahun ajaran, atau guru pengampu tidak berasal dari unit sekolah ini.");
  }

  const existing = await prisma.lmsCourse.findMany({
    where: {
      schoolId,
      classRoomId: args.classRoomId,
      academicYearId: args.academicYearId,
    },
    select: { subjectName: true },
  });

  const existingNames = new Set(existing.map((c) => c.subjectName.toLowerCase().trim()));

  const toCreate = args.courses.filter(
    (c) => !existingNames.has(c.subjectName.toLowerCase().trim())
  );

  if (toCreate.length === 0) {
    return {
      createdCount: 0,
      skippedCount: args.courses.length,
      message: "Semua mata pelajaran yang dipilih sudah terdaftar di rombel ini.",
    };
  }

  await prisma.lmsCourse.createMany({
    data: toCreate.map((c) => ({
      schoolId,
      classRoomId: args.classRoomId,
      academicYearId: args.academicYearId,
      subjectName: c.subjectName.trim(),
      teacherId: c.teacherId,
      description: c.description?.trim() || null,
    })),
  });

  return {
    createdCount: toCreate.length,
    skippedCount: args.courses.length - toCreate.length,
    message: `Berhasil menambahkan ${toCreate.length} mata pelajaran ke rombel kelas.`,
  };
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
  await getManagedCourseOrThrow(teacher, args.courseId);

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
  ).min(1, "Minimal satu peserta didik harus dicatat."),
});

export const recordCourseAttendance = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(recordCourseAttendanceSchema, rawArgs);
  const course = await getManagedCourseOrThrow(teacher, args.courseId);
  const studentIds = [...new Set(args.records.map((record) => record.studentId))];
  if (studentIds.length !== args.records.length) {
    throw new HttpError(400, "Setiap peserta didik hanya boleh dicatat sekali per sesi presensi.");
  }
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds }, schoolId: course.schoolId, classRoomId: course.classRoomId, role: "STUDENT" },
    select: { id: true },
  });
  if (students.length !== studentIds.length) {
    throw new HttpError(400, "Daftar presensi berisi siswa di luar rombel mata pelajaran ini.");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.lmsAttendanceSession.create({
      data: { courseId: args.courseId, date: new Date(), sessionNumber: args.sessionNumber },
    });
    await tx.lmsAttendanceRecord.createMany({
      data: args.records.map((record) => ({
        sessionId: session.id,
        studentId: record.studentId,
        status: record.status,
        notes: record.notes || null,
      })),
    });
    return session;
  });
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
  await getManagedCourseOrThrow(teacher, args.courseId);

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
  await getManagedCourseOrThrow(teacher, args.courseId);
  const deadline = new Date(args.deadline);
  if (Number.isNaN(deadline.valueOf())) throw new HttpError(400, "Tenggat tugas tidak valid.");

  return prisma.lmsAssignment.create({
    data: {
      courseId: args.courseId,
      title: args.title.trim(),
      instruction: args.instruction.trim(),
      deadline,
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
  const schoolId = requireActiveSchoolId(student);
  if (student.role !== "STUDENT") throw new HttpError(403, "Hanya akun peserta didik yang dapat mengumpulkan tugas.");
  const classRoomId = student.classRoomId;
  if (!classRoomId) throw new HttpError(403, "Akun peserta didik belum terdaftar pada rombel.");

  const assignment = await prisma.lmsAssignment.findFirst({
    where: {
      id: args.assignmentId,
      course: { schoolId, classRoomId },
    },
    select: { id: true, deadline: true },
  });
  if (!assignment) throw new HttpError(404, "Tugas tidak ditemukan di rombel Anda.");
  if (assignment.deadline < new Date()) throw new HttpError(400, "Tenggat pengumpulan tugas telah berakhir.");

  return prisma.lmsSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: args.assignmentId,
        studentId: student.id,
      },
    },
    create: {
      assignmentId: args.assignmentId,
      studentId: student.id,
      textContent: args.textContent || null,
      fileUrl: args.fileUrl || null,
    },
    update: {
      submittedAt: new Date(),
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
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(gradeSubmissionSchema, rawArgs);

  const submission = await prisma.lmsSubmission.findFirst({
    where: { id: args.submissionId },
    select: { id: true, assignment: { select: { courseId: true } } },
  });
  if (!submission) throw new HttpError(404, "Pengumpulan tugas tidak ditemukan.");
  await getManagedCourseOrThrow(teacher, submission.assignment.courseId);

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
  await getManagedCourseOrThrow(teacher, args.courseId);
  const startTime = new Date(args.startTime);
  const endTime = new Date(args.endTime);
  if (Number.isNaN(startTime.valueOf()) || Number.isNaN(endTime.valueOf()) || startTime >= endTime) {
    throw new HttpError(400, "Waktu mulai ujian harus lebih awal daripada waktu selesai.");
  }

  return prisma.lmsAssessment.create({
    data: {
      courseId: args.courseId,
      title: args.title.trim(),
      durationMinutes: args.durationMinutes,
      startTime,
      endTime,
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
  points: z.number().positive().max(1000).default(10.0),
});

export const addAssessmentQuestion = async (rawArgs: unknown, context: { user?: User }) => {
  const teacher = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(addAssessmentQuestionSchema, rawArgs);

  if (args.questionType === "MULTIPLE_CHOICE") {
    if (args.options.length < 2) {
      throw new HttpError(400, "Soal pilihan ganda membutuhkan minimal dua opsi.");
    }
    const optionIds = new Set(args.options.map((option) => option.id));
    if (optionIds.size !== args.options.length) {
      throw new HttpError(400, "ID opsi jawaban harus unik dalam satu soal.");
    }
    if (args.options.some((option) => option.id.trim() === "" || option.text.trim() === "")) {
      throw new HttpError(400, "ID dan teks opsi jawaban wajib diisi.");
    }
    if (args.options.filter((option) => option.isCorrect).length !== 1) {
      throw new HttpError(400, "Soal pilihan ganda harus memiliki tepat satu jawaban benar.");
    }
  } else if (args.options.some((option) => option.isCorrect)) {
    throw new HttpError(400, "Soal esai tidak boleh menyimpan opsi jawaban benar.");
  }

  const assessment = await prisma.lmsAssessment.findFirst({
    where: { id: args.assessmentId },
    select: { courseId: true },
  });
  if (!assessment) throw new HttpError(404, "Ujian CBT tidak ditemukan.");
  await getManagedCourseOrThrow(teacher, assessment.courseId);

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
  const schoolId = requireActiveSchoolId(student);
  if (student.role !== "STUDENT") throw new HttpError(403, "Hanya akun peserta didik yang dapat mengerjakan ujian CBT.");
  const classRoomId = student.classRoomId;
  if (!classRoomId) throw new HttpError(403, "Akun peserta didik belum terdaftar pada rombel.");

  const assessment = await prisma.lmsAssessment.findFirst({
    where: {
      id: args.assessmentId,
      course: { schoolId, classRoomId },
    },
    include: { questions: true },
  });
  if (!assessment) throw new HttpError(404, "Ujian CBT tidak ditemukan.");
  const now = new Date();
  if (now < assessment.startTime || now > assessment.endTime) {
    throw new HttpError(400, "Ujian CBT belum dimulai atau sudah berakhir.");
  }
  const existingResult = await prisma.lmsAssessmentResult.findFirst({
    where: { assessmentId: assessment.id, studentId: student.id },
    select: { id: true },
  });
  if (existingResult) throw new HttpError(409, "Jawaban ujian CBT sudah pernah dikirim.");

  const questionsById = new Map(assessment.questions.map((question) => [question.id, question]));
  for (const [questionId, answer] of Object.entries(args.answers)) {
    const question = questionsById.get(questionId);
    if (!question) {
      throw new HttpError(400, "Jawaban memuat soal yang tidak termasuk dalam ujian ini.");
    }
    if (question.questionType === "MULTIPLE_CHOICE") {
      const options = Array.isArray(question.options) ? question.options : [];
      if (!options.some((option: any) => option?.id === answer)) {
        throw new HttpError(400, "Pilihan jawaban tidak valid untuk soal ujian.");
      }
    }
  }

  let totalScore = 0;
  for (const question of assessment.questions) {
    if (question.questionType === "MULTIPLE_CHOICE" && Array.isArray(question.options)) {
      const studentAnswer = args.answers[question.id];
      const correctOption = (question.options as any[]).find((option) => option.isCorrect === true);
      if (correctOption && correctOption.id === studentAnswer) {
        totalScore += question.points;
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
