import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";

// =========================================================================
// Official School Reports (PKL Recapitulation & LMS Gradebook)
// =========================================================================

const exportPklReportSchema = z.object({
  placementId: z.string().uuid().optional(),
  classRoomId: z.string().uuid().optional(),
}).optional();

export const exportPklAttendanceReport = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
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
  const user = ensureSchoolUser(context);
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
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    // 4. Final composite score
    const finalScore =
      avgAssignment !== null && avgExam !== null
        ? Math.round(avgAssignment * 0.4 + avgExam * 0.6)
        : avgAssignment ?? avgExam ?? 80;

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
    departmentName: course.classRoom.department.name,
    academicYear: course.academicYear.yearName,
    teacherName: course.teacher.name,
    studentsGradebook,
  };
};
