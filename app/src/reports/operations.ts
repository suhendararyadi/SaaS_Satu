import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";

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
    where: { id: courseId, schoolId: user.schoolId },
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
  const currentMonthIdx = filter?.month ? filter.month - 1 : new Date().getMonth();
  const selectedMonthName = months[currentMonthIdx] || months[new Date().getMonth()];
  const selectedYear = filter?.year || new Date().getFullYear();
  const monthStart = new Date(selectedYear, currentMonthIdx, 1);
  const nextMonthStart = new Date(selectedYear, currentMonthIdx + 1, 1);

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const classRoom = filter?.classRoomId
    ? await prisma.classRoom.findFirst({
        where: { id: filter.classRoomId, schoolId: user.schoolId },
        include: {
          department: true,
          academicYear: true,
          homeroomTeacher: { select: { id: true, name: true, teacherProfile: true } },
          students: {
            select: {
              id: true,
              name: true,
              studentProfile: true,
              attendanceRecords: {
                where: { session: { date: { gte: monthStart, lt: nextMonthStart } } },
                select: { status: true },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      })
    : await prisma.classRoom.findFirst({
        where: { schoolId: user.schoolId },
        include: {
          department: true,
          academicYear: true,
          homeroomTeacher: { select: { id: true, name: true, teacherProfile: true } },
          students: {
            select: {
              id: true,
              name: true,
              studentProfile: true,
              attendanceRecords: {
                where: { session: { date: { gte: monthStart, lt: nextMonthStart } } },
                select: { status: true },
              },
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

  const studentsAttendance = classRoom.students.map((student) => {
    const records = student.attendanceRecords || [];
    const hadir = records.filter((r) => r.status === "HADIR").length;
    const sakit = records.filter((r) => r.status === "SAKIT").length;
    const izin = records.filter((r) => r.status === "IZIN").length;
    const alpa = records.filter((r) => r.status === "ALPA").length;
    const total = hadir + sakit + izin + alpa;

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
      rate: total > 0 ? Math.round((hadir / total) * 100) : null,
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

  const student = filter?.studentId
    ? await prisma.user.findFirst({
        where: { id: filter.studentId, schoolId: user.schoolId, role: "STUDENT" },
        include: {
          studentProfile: true,
          classRoom: {
            include: { department: true, academicYear: true },
          },
        },
      })
    : await prisma.user.findFirst({
        where: { schoolId: user.schoolId, role: "STUDENT" },
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
  const user = ensureSchoolUser(context);

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
  });

  const classRooms = await prisma.classRoom.findMany({
    where: { schoolId: user.schoolId },
    include: {
      department: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });

  const students = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "STUDENT" },
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
