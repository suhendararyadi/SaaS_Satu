import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import { ensureSchoolUser } from "./authGuards";
import { getPklEwsAlertsForScope, summarizePklEwsAlerts } from "../pkl/ews";

function displayName(user: Pick<User, "name" | "email" | "username">) {
  return user.name || user.username || user.email || "Pengguna";
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function jakartaDayBounds(date = new Date()) {
  const key = localDateKey(date);
  return {
    start: new Date(`${key}T00:00:00+07:00`),
    end: new Date(`${key}T23:59:59.999+07:00`),
  };
}

export const getStudentDashboardData = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (user.role !== "STUDENT") throw new HttpError(403, "Dashboard ini hanya tersedia untuk peserta didik.");

  const student = await prisma.user.findFirst({
    where: { id: user.id, schoolId: user.schoolId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      classRoomId: true,
      classRoom: { select: { id: true, name: true } },
    },
  });
  if (!student) throw new HttpError(404, "Profil peserta didik tidak ditemukan.");

  const now = new Date();
  const { start, end } = jakartaDayBounds(now);

  const courses = student.classRoomId
    ? await prisma.lmsCourse.findMany({
        where: { schoolId: user.schoolId, classRoomId: student.classRoomId },
        orderBy: { subjectName: "asc" },
        select: {
          id: true,
          subjectName: true,
          teacher: { select: { name: true, email: true, username: true } },
          assignments: {
            where: { deadline: { gte: now } },
            orderBy: { deadline: "asc" },
            select: {
              id: true,
              title: true,
              deadline: true,
              submissions: { where: { studentId: user.id }, select: { id: true, submittedAt: true, grade: true } },
            },
          },
          assessments: {
            where: { endTime: { gte: now } },
            orderBy: { startTime: "asc" },
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              results: { where: { studentId: user.id }, select: { id: true, finishedAt: true } },
            },
          },
        },
      })
    : [];

  const pendingAssignments = courses.flatMap((course) =>
    course.assignments
      .filter((assignment) => assignment.submissions.length === 0)
      .map((assignment) => ({
        assignmentId: assignment.id,
        courseId: course.id,
        courseName: course.subjectName,
        title: assignment.title,
        deadline: assignment.deadline,
        submissionStatus: "PENDING" as const,
      }))
  );

  const upcomingAssessments = courses.flatMap((course) =>
    course.assessments.map((assessment) => ({
      assessmentId: assessment.id,
      courseId: course.id,
      courseName: course.subjectName,
      title: assessment.title,
      startsAt: assessment.startTime,
      endsAt: assessment.endTime,
      attemptStatus: assessment.results[0]?.finishedAt ? ("COMPLETED" as const) : assessment.results.length ? ("IN_PROGRESS" as const) : ("NOT_STARTED" as const),
    }))
  );

  const placement = await prisma.placement.findFirst({
    where: { schoolId: user.schoolId, studentId: user.id, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      company: { select: { name: true } },
      attendances: {
        where: { dateOnly: localDateKey(now) },
        orderBy: { timestamp: "desc" },
        select: { type: true, status: true },
      },
      journals: {
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  return {
    role: "STUDENT" as const,
    student: {
      id: student.id,
      displayName: displayName(student),
      classRoom: student.classRoom,
    },
    courses: courses.map((course) => ({
      id: course.id,
      subjectName: course.subjectName,
      teacherDisplayName: displayName(course.teacher),
    })),
    pendingAssignments,
    upcomingAssessments,
    pkl: placement
      ? {
          placementId: placement.id,
          companyName: placement.company.name,
          attendanceTodayStatus: placement.attendances[0]?.status ?? null,
          journalTodayStatus: placement.journals[0]?.status ?? null,
        }
      : null,
  };
};

export const getTeacherDashboardData = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (user.role !== "TEACHER") throw new HttpError(403, "Dashboard ini hanya tersedia untuk guru.");

  const [teacher, courses, profile, homeroomClass, activePlacements] = await Promise.all([
    prisma.user.findFirst({
      where: { id: user.id, schoolId: user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true, username: true },
    }),
    prisma.lmsCourse.findMany({
      where: { schoolId: user.schoolId, teacherId: user.id },
      orderBy: [{ academicYear: { isActive: "desc" } }, { subjectName: "asc" }],
      select: {
        id: true,
        subjectName: true,
        classRoom: { select: { id: true, name: true } },
        academicYear: { select: { yearName: true, semester: true, isActive: true } },
        assignments: {
          select: {
            submissions: { where: { grade: null }, select: { id: true } },
          },
        },
      },
    }),
    prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { isWaka: true } }),
    prisma.classRoom.findFirst({
      where: { schoolId: user.schoolId, homeroomTeacherId: user.id, academicYear: { isActive: true } },
      select: { id: true, name: true },
    }),
    prisma.placement.findMany({
      where: { schoolId: user.schoolId, teacherSupervisorId: user.id, status: "ACTIVE" },
      select: {
        id: true,
        student: { select: { id: true, name: true, email: true, username: true } },
        company: { select: { name: true } },
        journals: {
          where: { status: "SUBMITTED" },
          orderBy: { date: "asc" },
          take: 3,
          select: { id: true, date: true, activityDescription: true },
        },
        _count: { select: { journals: { where: { status: "SUBMITTED" } } } },
      },
    }),
  ]);
  if (!teacher) throw new HttpError(404, "Profil guru tidak ditemukan.");

  const pendingJournalReviews = activePlacements.flatMap((placement) =>
    placement.journals.map((journal) => ({
      journalId: journal.id,
      placementId: placement.id,
      studentId: placement.student.id,
      studentDisplayName: displayName(placement.student),
      companyName: placement.company.name,
      date: journal.date,
      activityDescription: journal.activityDescription,
    }))
  );

  const ungradedSubmissionCount = courses.reduce(
    (total, course) => total + course.assignments.reduce((sum, assignment) => sum + assignment.submissions.length, 0),
    0
  );

  return {
    role: "TEACHER" as const,
    teacher: { id: teacher.id, displayName: displayName(teacher) },
    courses: courses.map((course) => ({
      id: course.id,
      subjectName: course.subjectName,
      classRoom: course.classRoom,
      academicYear: `${course.academicYear.yearName} ${course.academicYear.semester}`,
      isActive: course.academicYear.isActive,
    })),
    attention: {
      ungradedSubmissionCount,
      incompleteAgendaCount: null,
      pendingPklJournalReviewCount: activePlacements.reduce((total, placement) => total + placement._count.journals, 0),
    },
    pkl: activePlacements.length
      ? {
          activePlacementCount: activePlacements.length,
          pendingJournalReviews,
          alerts: [],
        }
      : null,
    assignments: {
      homeroomClass,
      isWaka: profile?.isWaka ?? false,
      dutyTeacherContext: null,
    },
  };
};

export const getSchoolAdminDashboardData = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const isAdmin = user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
  if (!isAdmin) throw new HttpError(403, "Dashboard ini hanya tersedia untuk administrator sekolah.");

  const { start: todayStart, end: todayEnd } = jakartaDayBounds();
  const [school, academicYear, counts, studentsWithoutClass, teachersWithoutCourse, attendanceRecords, attendanceSessionCount, classAttendanceSources, ewsAlerts] = await Promise.all([
    prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { id: true, name: true, level: true, tier: true, studentQuota: true },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true, yearName: true, semester: true },
    }),
    Promise.all([
      prisma.user.count({ where: { schoolId: user.schoolId, role: "STUDENT" } }),
      prisma.user.count({ where: { schoolId: user.schoolId, role: "TEACHER" } }),
      prisma.classRoom.count({ where: { schoolId: user.schoolId } }),
      prisma.lmsCourse.count({ where: { schoolId: user.schoolId } }),
      prisma.company.count({ where: { schoolId: user.schoolId } }),
      prisma.placement.count({ where: { schoolId: user.schoolId, status: "ACTIVE" } }),
    ]),
    prisma.user.count({ where: { schoolId: user.schoolId, role: "STUDENT", classRoomId: null } }),
    prisma.user.count({
      where: { schoolId: user.schoolId, role: "TEACHER", teacherCourses: { none: {} } },
    }),
    prisma.lmsAttendanceRecord.findMany({
      where: {
        session: {
          date: { gte: todayStart, lte: todayEnd },
          course: { schoolId: user.schoolId },
        },
      },
      select: { status: true },
    }),
    prisma.lmsAttendanceSession.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        course: { schoolId: user.schoolId },
      },
    }),
    prisma.classRoom.findMany({
      where: {
        schoolId: user.schoolId,
        academicYear: { isActive: true },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        department: { select: { code: true } },
        lmsCourses: {
          select: {
            attendances: {
              where: { date: { gte: todayStart, lte: todayEnd } },
              select: { records: { select: { status: true } } },
            },
          },
        },
      },
    }),
    getPklEwsAlertsForScope(user.schoolId),
  ]);
  if (!school) throw new HttpError(404, "Data sekolah tidak ditemukan.");

  const [students, teachers, classRooms, lmsCourses, companies, placements] = counts;
  const ews = summarizePklEwsAlerts(ewsAlerts);
  const attention = [
    ...(!academicYear
      ? [{ code: "NO_ACTIVE_YEAR", severity: "warning" as const, label: "Belum ada tahun ajaran aktif", count: null, destination: "/school/academic-years" }]
      : []),
    ...(studentsWithoutClass > 0
      ? [{ code: "STUDENTS_WITHOUT_CLASS", severity: "warning" as const, label: "Siswa belum memiliki rombel", count: studentsWithoutClass, destination: "/school/students" }]
      : []),
    ...(teachersWithoutCourse > 0
      ? [{ code: "TEACHERS_WITHOUT_COURSE", severity: "info" as const, label: "Guru belum memiliki ruang mapel", count: teachersWithoutCourse, destination: "/school/lms/courses" }]
      : []),
    ...(ews.totalAlerts > 0
      ? [{
          code: "PKL_EWS_ALERTS",
          severity: ews.high > 0 ? ("warning" as const) : ("info" as const),
          label: ews.high > 0
            ? `Early Warning System: ${ews.high} prioritas tinggi`
            : "Early Warning System perlu ditinjau",
          count: ews.totalAlerts,
          destination: "/school/ews",
        }]
      : []),
  ];

  const attendanceCounts = attendanceRecords.reduce(
    (result, record) => {
      if (record.status === "HADIR") result.hadir += 1;
      else if (record.status === "SAKIT") result.sakit += 1;
      else if (record.status === "IZIN") result.izin += 1;
      else if (record.status === "ALPA") result.alpa += 1;
      return result;
    },
    { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
  );
  const attendanceTotal = attendanceCounts.hadir + attendanceCounts.sakit + attendanceCounts.izin + attendanceCounts.alpa;
  const attendanceRate = attendanceTotal > 0 ? Math.round((attendanceCounts.hadir / attendanceTotal) * 100) : null;

  const classAttendance = classAttendanceSources.map((classRoom) => {
    const statuses = classRoom.lmsCourses.flatMap((course) =>
      course.attendances.flatMap((session) => session.records.map((record) => record.status))
    );
    const hadir = statuses.filter((status) => status === "HADIR").length;
    const alpa = statuses.filter((status) => status === "ALPA").length;
    const totalRecords = statuses.length;
    const absentCount = totalRecords - hadir;
    const rate = totalRecords > 0 ? Math.round((hadir / totalRecords) * 1000) / 10 : null;

    return {
      classRoomId: classRoom.id,
      className: classRoom.name,
      departmentCode: classRoom.department?.code ?? null,
      totalRecords,
      absentCount,
      alpa,
      rate,
    };
  });

  const measuredClassAttendance = classAttendance
    .filter((item) => item.rate !== null)
    .sort((a, b) =>
      (a.rate! - b.rate!) ||
      (b.absentCount - a.absentCount) ||
      a.className.localeCompare(b.className, "id")
    );
  const unmeasuredClassAttendance = classAttendance
    .filter((item) => item.rate === null)
    .sort((a, b) => a.className.localeCompare(b.className, "id"));
  const attendanceByClass = [...measuredClassAttendance, ...unmeasuredClassAttendance].slice(0, 5);

  return {
    role: user.role === "SUPERADMIN" || user.isAdmin ? ("SUPERADMIN" as const) : ("SCHOOL_ADMIN" as const),
    school,
    academicYear,
    counts: { students, teachers, classRooms, lmsCourses, companies, placements },
    attention,
    ews,
    attendance: {
      dateKey: localDateKey(),
      sessionCount: attendanceSessionCount,
      totalRecords: attendanceTotal,
      rate: attendanceRate,
      byClass: attendanceByClass,
      ...attendanceCounts,
    },
  };
};

export const getMentorDashboardData = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  if (user.role !== "DUDI_MENTOR") throw new HttpError(403, "Dashboard ini hanya tersedia untuk pembimbing DUDI.");

  const placements = await prisma.placement.findMany({
    where: { schoolId: user.schoolId, dudiMentorId: user.id, status: "ACTIVE" },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      student: { select: { id: true, name: true, email: true, username: true } },
      company: { select: { name: true } },
      journals: {
        where: { status: "SUBMITTED" },
        orderBy: { date: "asc" },
        take: 5,
        select: { id: true, date: true, activityDescription: true },
      },
      _count: { select: { journals: { where: { status: "SUBMITTED" } } } },
    },
  });

  return {
    role: "DUDI_MENTOR" as const,
    mentor: { id: user.id, displayName: displayName(user) },
    activePlacementCount: placements.length,
    placements: placements.map((placement) => ({
      id: placement.id,
      studentId: placement.student.id,
      studentDisplayName: displayName(placement.student),
      companyName: placement.company.name,
      pendingJournalCount: placement._count.journals,
      pendingJournals: placement.journals,
    })),
  };
};
