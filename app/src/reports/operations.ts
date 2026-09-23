import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";
import { jakartaDateOnly } from "../school/dailyAttendance";

function requireReportStaff(context: { user?: User }) {
  const user = ensureSchoolUser(context);
  if (
    !user.isAdmin &&
    user.role !== "TEACHER" &&
    user.role !== "SCHOOL_ADMIN" &&
    user.role !== "SUPERADMIN"
  ) {
    throw new HttpError(403, "Laporan sekolah hanya dapat diakses oleh staf sekolah.");
  }
  return user;
}


function isUnrestrictedReportStaff(user: ReturnType<typeof requireReportStaff>) {
  return user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

function getStaffClassRoomScope(user: ReturnType<typeof requireReportStaff>) {
  if (isUnrestrictedReportStaff(user)) return {};
  return {
    OR: [
      { homeroomTeacherId: user.id },
      { lmsCourses: { some: { teacherId: user.id } } },
    ],
  };
}

// =========================================================================
// Official School Reports (PKL Recapitulation & LMS Gradebook)
// =========================================================================

const exportPklReportSchema = z.object({
  placementId: z.string().uuid().optional(),
  classRoomId: z.string().uuid().optional(),
}).optional();

export const exportPklAttendanceReport = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireReportStaff(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    exportPklReportSchema || z.any(),
    rawArgs || {}
  );

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const placements = await prisma.placement.findMany({
    where: {
      schoolId: user.schoolId,
      ...(filter?.placementId ? { id: filter.placementId } : {}),
      ...(filter?.classRoomId ? { student: { classRoomId: filter.classRoomId } } : {}),
      ...(!isUnrestrictedReportStaff(user) ? { teacherSupervisorId: user.id } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentProfile: true,
          classRoom: { select: { name: true, department: { select: { name: true } } } },
        },
      },
      company: true,
      teacherSupervisor: { select: { id: true, name: true, teacherProfile: true } },
      attendances: { orderBy: { timestamp: "asc" } },
      journals: { orderBy: { date: "asc" } },
    },
  });

  return {
    school,
    generatedAt: new Date(),
    placements: placements.map((p) => {
      const totalDays = p.attendances.length;
      const hadirCount = p.attendances.filter((a) => a.status === "HADIR").length;
      const lateOrRadiusCount = p.attendances.filter((a) => a.status !== "HADIR").length;

      const approvedJournals = p.journals.filter((j) => j.status === "APPROVED");
      const avgScore =
        approvedJournals.length > 0
          ? Math.round(
              approvedJournals.reduce((acc, j) => acc + (j.score || 0), 0) /
                approvedJournals.length
            )
          : null;

      return {
        id: p.id,
        studentName: p.student.name,
        nis: p.student.studentProfile?.nis,
        nisn: p.student.studentProfile?.nisn,
        className: p.student.classRoom?.name,
        departmentName: p.student.classRoom?.department?.name,
        companyName: p.company.name,
        companyAddress: p.company.address,
        supervisorName: p.teacherSupervisor?.name,
        startDate: p.startDate,
        endDate: p.endDate,
        stats: {
          totalAttendanceLogs: totalDays,
          hadirCount,
          lateOrRadiusCount,
          totalJournals: p.journals.length,
          approvedJournals: approvedJournals.length,
          averageJournalScore: avgScore,
        },
      };
    }),
  };
};

const exportLmsGradesSchema = z.object({
  courseId: z.string().uuid(),
});

export const exportLmsGradesReport = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireReportStaff(context);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(exportLmsGradesSchema, rawArgs);

  const course = await prisma.lmsCourse.findFirst({
    where: {
      id: courseId,
      schoolId: user.schoolId,
      ...(!isUnrestrictedReportStaff(user) ? { teacherId: user.id } : {}),
    },
    include: {
      school: true,
      teacher: { select: { id: true, name: true, teacherProfile: true } },
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
      assignments: {
        include: { submissions: true },
      },
      assessments: {
        include: { results: true },
      },
      attendances: {
        include: { records: true },
      },
    },
  });

  if (!course) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");
  if (!user.isAdmin && user.role === "TEACHER" && course.teacherId !== user.id) {
    throw new HttpError(403, "Anda hanya dapat mengekspor nilai mata pelajaran yang Anda ampu.");
  }

  const studentsGradebook = course.classRoom.students.map((student) => {
    // 1. Assignment average
    const studentSubmissions = course.assignments.map((ass) => {
      const sub = ass.submissions.find((s) => s.studentId === student.id);
      return {
        assignmentTitle: ass.title,
        grade: sub?.grade ?? null,
      };
    });

    const gradedSubs = studentSubmissions.filter((s) => s.grade !== null);
    const avgAssignment =
      gradedSubs.length > 0
        ? Math.round(
            gradedSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / gradedSubs.length
          )
        : null;

    // 2. CBT Assessment scores
    const studentExamScores = course.assessments.map((exam) => {
      const res = exam.results.find((r) => r.studentId === student.id);
      return {
        examTitle: exam.title,
        score: res?.score ?? null,
      };
    });

    const completedExams = studentExamScores.filter((e) => e.score !== null);
    const avgExam =
      completedExams.length > 0
        ? Math.round(
            completedExams.reduce((acc, e) => acc + (e.score || 0), 0) /
              completedExams.length
          )
        : null;

    // 3. Attendance attendance rate
    let totalSessions = course.attendances.length;
    let presentSessions = 0;
    for (const session of course.attendances) {
      const rec = session.records.find((r) => r.studentId === student.id);
      if (rec && rec.status === "HADIR") presentSessions++;
    }
    const attendancePercentage =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null;

    // 4. Final composite score
    const finalScore =
      avgAssignment !== null && avgExam !== null
        ? Math.round(avgAssignment * 0.4 + avgExam * 0.6)
        : avgAssignment ?? avgExam;

    return {
      studentId: student.id,
      studentName: student.name,
      nis: student.studentProfile?.nis,
      attendancePercentage,
      averageAssignment: avgAssignment,
      averageExam: avgExam,
      finalScore,
    };
  });

  return {
    school: course.school,
    courseTitle: course.subjectName,
    className: course.classRoom.name,
    departmentName: course.classRoom.department?.name || "Umum",
    academicYear: course.academicYear.yearName,
    teacherName: course.teacher.name,
    studentsGradebook,
  };
};

// =========================================================================
// 3. Class Room Monthly Attendance Report (Rekap Presensi Rombel)
// =========================================================================

const getClassRoomAttendanceReportSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().optional(),
}).optional();

export const getClassRoomAttendanceReport = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireReportStaff(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getClassRoomAttendanceReportSchema || z.any(),
    rawArgs || {}
  );
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const [todayYear, todayMonth] = jakartaDateOnly().split("-").map(Number);
  const selectedMonth = filter?.month || todayMonth;
  const currentMonthIdx = selectedMonth - 1;
  const selectedMonthName = months[currentMonthIdx] || months[todayMonth - 1];
  const selectedYear = filter?.year || todayYear;
  const monthStartDateOnly = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
  const nextMonthStartDateOnly = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const classRoom = await prisma.classRoom.findFirst({
    where: {
      schoolId: user.schoolId,
      ...(filter?.classRoomId ? { id: filter.classRoomId } : {}),
      ...getStaffClassRoomScope(user),
    },
    include: {
      department: true,
      academicYear: true,
      homeroomTeacher: { select: { id: true, name: true, teacherProfile: true } },
      students: {
        select: {
          id: true,
          name: true,
          studentProfile: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!classRoom) {
    return {
      school,
      classRoom: null,
      studentsAttendance: [],
      monthName: selectedMonthName,
      year: selectedYear,
    };
  }

  const attendanceRecords = await prisma.schoolDailyAttendance.findMany({
    where: {
      schoolId: user.schoolId,
      classRoomId: classRoom.id,
      dateOnly: {
        gte: monthStartDateOnly,
        lt: nextMonthStartDateOnly,
      },
    },
    select: {
      studentId: true,
      status: true,
      dateOnly: true,
    },
  });

  const recordsByStudent = new Map<string, typeof attendanceRecords>();
  for (const record of attendanceRecords) {
    const current = recordsByStudent.get(record.studentId) || [];
    current.push(record);
    recordsByStudent.set(record.studentId, current);
  }

  const studentsAttendance = classRoom.students.map((student) => {
    const records = recordsByStudent.get(student.id) || [];
    const hadir = records.filter((r) => r.status === "HADIR").length;
    const sakit = records.filter((r) => r.status === "SAKIT").length;
    const izin = records.filter((r) => r.status === "IZIN").length;
    const alpa = records.filter((r) => r.status === "ALPA").length;
    const terlambat = records.filter((r) => r.status === "TERLAMBAT").length;
    const total = hadir + sakit + izin + alpa + terlambat;
    const present = hadir + terlambat;

    return {
      studentId: student.id,
      name: student.name,
      nis: student.studentProfile?.nis || "-",
      nisn: student.studentProfile?.nisn || "-",
      gender: student.studentProfile?.gender || "-",
      hadir,
      sakit,
      izin,
      alpa,
      terlambat,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  });

  return {
    school,
    classRoom: {
      id: classRoom.id,
      name: classRoom.name,
      gradeLevel: classRoom.gradeLevel,
      departmentName: classRoom.department?.name,
      academicYear: classRoom.academicYear.yearName,
      semester: classRoom.academicYear.semester,
      homeroomTeacherName: classRoom.homeroomTeacher?.name || "Wali Kelas",
      homeroomTeacherNip: classRoom.homeroomTeacher?.teacherProfile?.nip || "-",
    },
    studentsAttendance,
    monthName: selectedMonthName,
    year: selectedYear,
  };
};

// =========================================================================
// 4. Student Active Certificate Data (Surat Keterangan Siswa Aktif)
// =========================================================================

const getActiveStudentCertificateDataSchema = z.object({
  studentId: z.string().uuid().optional(),
}).optional();

export const getActiveStudentCertificateData = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireReportStaff(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getActiveStudentCertificateDataSchema || z.any(),
    rawArgs || {}
  );

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const accessibleClassIds = isUnrestrictedReportStaff(user)
    ? null
    : (
        await prisma.classRoom.findMany({
          where: { schoolId: user.schoolId, ...getStaffClassRoomScope(user) },
          select: { id: true },
        })
      ).map((classRoom) => classRoom.id);

  const student = filter?.studentId
    ? await prisma.user.findFirst({
        where: {
          id: filter.studentId,
          schoolId: user.schoolId,
          role: "STUDENT",
          ...(accessibleClassIds ? { classRoomId: { in: accessibleClassIds } } : {}),
        },
        include: {
          studentProfile: true,
          classRoom: {
            include: { department: true, academicYear: true },
          },
        },
      })
    : await prisma.user.findFirst({
        where: {
          schoolId: user.schoolId,
          role: "STUDENT",
          ...(accessibleClassIds ? { classRoomId: { in: accessibleClassIds } } : {}),
        },
        include: {
          studentProfile: true,
          classRoom: {
            include: { department: true, academicYear: true },
          },
        },
      });

  return {
    school,
    student: student
      ? {
          id: student.id,
          name: student.name,
          email: student.email,
          nis: student.studentProfile?.nis || "-",
          nisn: student.studentProfile?.nisn || "-",
          gender:
            student.studentProfile?.gender === "L"
              ? "Laki-laki"
              : student.studentProfile?.gender === "P"
              ? "Perempuan"
              : "-",
          birthDate: student.studentProfile?.birthDate || null,
          status: student.studentProfile?.status || "ACTIVE",
          className: student.classRoom?.name || "-",
          gradeLevel: student.classRoom?.gradeLevel,
          academicYear: student.classRoom?.academicYear.yearName || "2026/2027",
        }
      : null,
  };
};

// =========================================================================
// 5. School Report General Context (Options for Dropdowns)
// =========================================================================

export const getSchoolReportContext = async (_rawArgs: unknown, context: { user?: User }) => {
  const user = requireReportStaff(context);

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const classRooms = await prisma.classRoom.findMany({
    where: { schoolId: user.schoolId, ...getStaffClassRoomScope(user) },
    include: {
      department: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });

  const accessibleClassIds = classRooms.map((classRoom) => classRoom.id);
  const students = await prisma.user.findMany({
    where: {
      schoolId: user.schoolId,
      role: "STUDENT",
      ...(!isUnrestrictedReportStaff(user) ? { classRoomId: { in: accessibleClassIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      classRoomId: true,
      classRoom: { select: { name: true } },
      studentProfile: { select: { nis: true, nisn: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    school,
    classRooms,
    students,
  };
};
