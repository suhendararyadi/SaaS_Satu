import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";
import type { SchoolScopedUser } from "./types";
import { getPklEwsAlertsForScope } from "../pkl/ews";
import {
  STUDENT_RISK_SOURCES,
  buildRiskRecommendations,
  comparableScore,
  riskTrend,
  scoreSignals,
  sourceContributionOrder,
  type StudentRiskSignal,
  type StudentRiskSource,
} from "./studentRisk";

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  classRoomId: string | null;
  classRoom: {
    id: string;
    name: string;
    gradeLevel: number;
    departmentId: string | null;
    department: { id: string; code: string; name: string } | null;
    homeroomTeacher: { id: string; name: string | null; email: string | null; username: string | null } | null;
  } | null;
  studentProfile: { nis: string | null; nisn: string | null } | null;
};

export type StudentRiskAccess = {
  canView: boolean;
  canViewAll: boolean;
  fullStudentIds: Set<string>;
  limitedStudentIds: Set<string>;
  scopeLabel: string;
  roleMode: "SCHOOL" | "RESPONSIBILITY" | "PKL_ONLY";
  reasons: string[];
};

function isAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

function displayName(input: { name?: string | null; username?: string | null; email?: string | null }) {
  return input.name || input.username || input.email || "Siswa";
}

function dateKeyJakarta(date = new Date()) {
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

function windowStart(daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const key = dateKeyJakarta(date);
  return { key, date: new Date(`${key}T00:00:00+07:00`) };
}

function severityPoints(severity: string) {
  if (severity === "CRITICAL") return 18;
  if (severity === "HIGH") return 12;
  if (severity === "MEDIUM") return 6;
  return 3;
}

function followUpPoints(severity: string, overdue: boolean) {
  if (overdue) return 10;
  if (severity === "CRITICAL") return 10;
  if (severity === "HIGH") return 7;
  if (severity === "MEDIUM") return 4;
  return 2;
}

function pklPoints(severity: string) {
  if (severity === "HIGH") return 10;
  if (severity === "MEDIUM") return 6;
  return 3;
}

function signal(
  input: Omit<StudentRiskSignal, "occurredAt"> & { occurredAt?: Date | string },
): StudentRiskSignal {
  return {
    ...input,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
  };
}

export async function resolveStudentRiskAccess(user: SchoolScopedUser): Promise<StudentRiskAccess> {
  if (user.role === "STUDENT") {
    return {
      canView: false,
      canViewAll: false,
      fullStudentIds: new Set(),
      limitedStudentIds: new Set(),
      scopeLabel: "Tidak tersedia untuk siswa",
      roleMode: "RESPONSIBILITY",
      reasons: [],
    };
  }

  if (isAdmin(user as User)) {
    return {
      canView: true,
      canViewAll: true,
      fullStudentIds: new Set(),
      limitedStudentIds: new Set(),
      scopeLabel: "Seluruh siswa sekolah",
      roleMode: "SCHOOL",
      reasons: ["Administrator sekolah"],
    };
  }

  if (user.role === "DUDI_MENTOR") {
    const placements = await prisma.placement.findMany({
      where: { schoolId: user.schoolId, dudiMentorId: user.id, status: "ACTIVE" },
      select: { studentId: true },
    });
    const ids = new Set(placements.map((item) => item.studentId));
    return {
      canView: ids.size > 0,
      canViewAll: false,
      fullStudentIds: new Set(),
      limitedStudentIds: ids,
      scopeLabel: "Siswa PKL bimbingan DUDI",
      roleMode: "PKL_ONLY",
      reasons: ["Pembimbing DUDI"],
    };
  }

  if (user.role !== "TEACHER") {
    return {
      canView: false,
      canViewAll: false,
      fullStudentIds: new Set(),
      limitedStudentIds: new Set(),
      scopeLabel: "Tidak tersedia",
      roleMode: "RESPONSIBILITY",
      reasons: [],
    };
  }

  const now = new Date();
  const [wakasekAssignments, staffAssignments, homeroomStudents, supervisedPlacements] =
    await Promise.all([
      prisma.wakasekAssignment.findMany({
        where: { schoolId: user.schoolId, teacherId: user.id },
        select: { role: true },
      }),
      prisma.schoolStaffAssignment.findMany({
        where: {
          schoolId: user.schoolId,
          teacherId: user.id,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            { OR: [{ academicYearId: null }, { academicYear: { isActive: true } }] },
          ],
        },
        select: { role: true, departmentId: true },
      }),
      prisma.user.findMany({
        where: {
          schoolId: user.schoolId,
          role: "STUDENT",
          classRoom: { homeroomTeacherId: user.id },
        },
        select: { id: true },
      }),
      prisma.placement.findMany({
        where: {
          schoolId: user.schoolId,
          teacherSupervisorId: user.id,
          status: "ACTIVE",
        },
        select: { studentId: true },
      }),
    ]);

  const wakaRoles = new Set(wakasekAssignments.map((item) => item.role));
  const isPrincipal = staffAssignments.some((item) => item.role === "PRINCIPAL");
  const schoolWide =
    isPrincipal || wakaRoles.has("KESISWAAN") || wakaRoles.has("KURIKULUM");

  if (schoolWide) {
    const reasons = [
      ...(isPrincipal ? ["Kepala Sekolah"] : []),
      ...(wakaRoles.has("KESISWAAN") ? ["Wakasek Kesiswaan"] : []),
      ...(wakaRoles.has("KURIKULUM") ? ["Wakasek Kurikulum"] : []),
    ];
    return {
      canView: true,
      canViewAll: true,
      fullStudentIds: new Set(),
      limitedStudentIds: new Set(),
      scopeLabel: "Seluruh siswa sekolah",
      roleMode: "SCHOOL",
      reasons,
    };
  }

  const fullIds = new Set(homeroomStudents.map((item) => item.id));
  const departmentIds = staffAssignments
    .filter((item) => item.role === "DEPARTMENT_HEAD" && item.departmentId)
    .map((item) => item.departmentId as string);

  if (departmentIds.length) {
    const departmentStudents = await prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: "STUDENT",
        classRoom: { departmentId: { in: departmentIds } },
      },
      select: { id: true },
    });
    for (const student of departmentStudents) fullIds.add(student.id);
  }

  let limitedIds = new Set(supervisedPlacements.map((item) => item.studentId));
  if (wakaRoles.has("HUMAS_HUBIN")) {
    const pklStudents = await prisma.placement.findMany({
      where: { schoolId: user.schoolId, status: "ACTIVE" },
      select: { studentId: true },
    });
    limitedIds = new Set(pklStudents.map((item) => item.studentId));
  }
  for (const id of fullIds) limitedIds.delete(id);

  const reasons = [
    ...(homeroomStudents.length ? ["Wali Kelas"] : []),
    ...(departmentIds.length ? ["Kaprog / Kakomli"] : []),
    ...(supervisedPlacements.length ? ["Pembimbing PKL"] : []),
    ...(wakaRoles.has("HUMAS_HUBIN") ? ["Wakasek Humas/Hubin"] : []),
  ];

  return {
    canView: fullIds.size > 0 || limitedIds.size > 0,
    canViewAll: false,
    fullStudentIds: fullIds,
    limitedStudentIds: limitedIds,
    scopeLabel:
      fullIds.size && limitedIds.size
        ? "Siswa sesuai tanggung jawab sekolah & PKL"
        : fullIds.size
          ? "Siswa sesuai tanggung jawab sekolah"
          : "Siswa PKL sesuai tanggung jawab",
    roleMode: fullIds.size ? "RESPONSIBILITY" : "PKL_ONLY",
    reasons,
  };
}

async function loadVisibleStudents(user: SchoolScopedUser, access: StudentRiskAccess) {
  const select = {
    id: true,
    name: true,
    email: true,
    username: true,
    classRoomId: true,
    classRoom: {
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        departmentId: true,
        department: { select: { id: true, code: true, name: true } },
        homeroomTeacher: { select: { id: true, name: true, email: true, username: true } },
      },
    },
    studentProfile: { select: { nis: true, nisn: true } },
  } as const;

  if (access.canViewAll) {
    return prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "STUDENT" },
      select,
      orderBy: [{ classRoom: { gradeLevel: "asc" } }, { classRoom: { name: "asc" } }, { name: "asc" }],
    });
  }

  const ids = [...new Set([...access.fullStudentIds, ...access.limitedStudentIds])];
  if (!ids.length) return [];

  return prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "STUDENT", id: { in: ids } },
    select,
    orderBy: [{ classRoom: { gradeLevel: "asc" } }, { classRoom: { name: "asc" } }, { name: "asc" }],
  });
}

const studentRiskOverviewCache = new Map<string, { expiresAt: number; value: any }>();

export async function buildStudentRiskOverview(
  user: SchoolScopedUser,
  options: { cacheMs?: number } = {},
) {
  const cacheMs = Math.max(0, options.cacheMs || 0);
  const cacheKey = user.schoolId + ":" + user.id + ":" + user.role;
  if (cacheMs > 0) {
    const cached = studentRiskOverviewCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }

  const access = await resolveStudentRiskAccess(user);
  if (!access.canView) {
    throw new HttpError(403, "Early Warning terpadu tidak tersedia untuk tanggung jawab akun ini.");
  }

  const students = (await loadVisibleStudents(user, access)) as StudentRow[];
  const studentIds = students.map((student) => student.id);
  const fullIds = access.canViewAll ? new Set(studentIds) : access.fullStudentIds;
  const limitedIds = access.canViewAll ? new Set<string>() : access.limitedStudentIds;
  const fullStudentIds = [...fullIds];
  const now = new Date();
  const currentWindow = windowStart(30);
  const previousWindow = windowStart(60);

  const liveSignalsByStudent = new Map<string, StudentRiskSignal[]>(
    studentIds.map((id) => [id, []]),
  );
  const trendSignalsByStudent = new Map<string, StudentRiskSignal[]>(
    fullStudentIds.map((id) => [id, []]),
  );

  const addLive = (studentId: string, item: StudentRiskSignal) => {
    const list = liveSignalsByStudent.get(studentId);
    if (list) list.push(item);
  };
  const addTrend = (studentId: string, item: StudentRiskSignal) => {
    const list = trendSignalsByStudent.get(studentId);
    if (list) list.push(item);
  };

  const fullStudentClassIds = [
    ...new Set(
      students
        .filter((student) => fullIds.has(student.id))
        .map((student) => student.classRoomId)
        .filter(Boolean) as string[],
    ),
  ];

  const [
    attendanceRows,
    attendanceCurrentRows,
    habituationEvents,
    subjectAlpaRows,
    violations,
    coachings,
    overduePermits,
    assignments,
    followUps,
    pklAlerts,
  ] = await Promise.all([
    fullStudentIds.length
      ? prisma.schoolDailyAttendance.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            dateOnly: { gte: previousWindow.key },
            OR: [
              { status: { in: ["ALPA", "TERLAMBAT"] } },
              { earlyLeave: true },
              { reconciliationStatus: "NEEDS_REVIEW" },
            ],
          },
          select: { id: true, studentId: true, status: true, dateOnly: true, earlyLeave: true, reconciliationStatus: true, updatedAt: true },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.schoolDailyAttendance.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            dateOnly: { gte: currentWindow.key },
            status: { in: ["HADIR", "SAKIT", "IZIN", "ALPA", "TERLAMBAT"] },
          },
          select: { id: true, studentId: true, status: true, dateOnly: true, earlyLeave: true, reconciliationStatus: true, updatedAt: true },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.studentAttendanceEvent.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            dateOnly: { gte: currentWindow.key },
            type: "HABIT_ATTENDANCE",
            status: { in: ["TIDAK_HADIR", "TERLAMBAT"] },
          },
          select: { id: true, studentId: true, status: true, dateOnly: true, occurredAt: true, metadata: true },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.lmsAttendanceRecord.findMany({
          where: {
            studentId: { in: fullStudentIds },
            status: "ALPA",
            session: {
              course: { schoolId: user.schoolId },
              teachingSession: {
                is: {
                  dateOnly: { gte: currentWindow.key },
                  status: { in: ["IN_PROGRESS", "COMPLETED"] },
                },
              },
            },
          },
          select: {
            id: true,
            studentId: true,
            session: {
              select: {
                teachingSession: { select: { id: true, dateOnly: true } },
                course: { select: { id: true, subjectName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.studentViolation.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            OR: [
              { status: { in: ["RECORDED", "IN_REVIEW"] } },
              { incidentAt: { gte: previousWindow.date } },
            ],
          },
          select: {
            id: true,
            studentId: true,
            title: true,
            severity: true,
            points: true,
            status: true,
            incidentAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.studentCoaching.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            studentId: true,
            topic: true,
            status: true,
            nextReviewAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    fullStudentIds.length
      ? prisma.studentPermit.findMany({
          where: {
            schoolId: user.schoolId,
            studentId: { in: fullStudentIds },
            status: "APPROVED",
            endAt: { lt: now },
            returnedAt: null,
          },
          select: { id: true, studentId: true, reason: true, endAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
    fullStudentClassIds.length
      ? prisma.lmsAssignment.findMany({
          where: {
            course: {
              schoolId: user.schoolId,
              classRoomId: { in: fullStudentClassIds },
              academicYear: { isActive: true },
            },
            deadline: { gte: previousWindow.date, lt: now },
          },
          select: {
            id: true,
            title: true,
            deadline: true,
            course: { select: { id: true, subjectName: true, classRoomId: true } },
            submissions: {
              where: { studentId: { in: fullStudentIds } },
              select: { id: true, studentId: true, submittedAt: true, grade: true },
            },
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.schoolFollowUpCase.findMany({
          where: {
            schoolId: user.schoolId,
            subjectStudentId: { in: studentIds },
            status: { in: ["FINDING", "ASSIGNED", "IN_PROGRESS"] },
            NOT: { sourceKey: { startsWith: "ews2:student:" } },
          },
          select: {
            id: true,
            subjectStudentId: true,
            title: true,
            description: true,
            severity: true,
            sourceType: true,
            sourceKey: true,
            dueAt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? getPklEwsAlertsForScope(
          user.schoolId,
          user.role === "DUDI_MENTOR"
            ? { dudiMentorId: user.id }
            : access.canViewAll
              ? {}
              : { studentIds },
        )
      : Promise.resolve([]),
  ]);

  // Attendance 360: status harian tetap baseline; early-leave dan konflik evidence menjadi signal tambahan.
  for (const row of attendanceRows) {
    const isCurrent = row.dateOnly >= currentWindow.key;
    const window = isCurrent ? "CURRENT" as const : "PREVIOUS" as const;
    if (row.status === "ALPA" || row.status === "TERLAMBAT") {
      const points = row.status === "ALPA" ? 6 : 2;
      const item = signal({
        id: `attendance:${row.id}`, source: "ATTENDANCE", code: row.status,
        title: row.status === "ALPA" ? "Alpa tercatat" : "Keterlambatan tercatat",
        detail: `${row.status === "ALPA" ? "Alpa" : "Terlambat"} pada ${row.dateOnly}.`,
        points, href: "/school/attendance", occurredAt: row.updatedAt, comparableWindow: window,
      });
      addTrend(row.studentId, item); if (isCurrent) addLive(row.studentId, item);
    }
    if (row.earlyLeave) {
      const item = signal({ id: `attendance-early-leave:${row.id}`, source: "ATTENDANCE", code: "EARLY_LEAVE", title: "Pulang lebih awal", detail: `Pulang lebih awal tercatat pada ${row.dateOnly}.`, points: 2, href: "/school/attendance", occurredAt: row.updatedAt, comparableWindow: window });
      addTrend(row.studentId, item); if (isCurrent) addLive(row.studentId, item);
    }
    if (row.reconciliationStatus === "NEEDS_REVIEW") {
      const item = signal({ id: `attendance-conflict:${row.id}`, source: "ATTENDANCE", code: "ATTENDANCE_CONFLICT", title: "Evidence kehadiran perlu diverifikasi", detail: `Ada evidence kehadiran yang belum konsisten pada ${row.dateOnly}.`, points: 2, href: "/school/attendance", occurredAt: row.updatedAt, comparableWindow: window });
      addTrend(row.studentId, item); if (isCurrent) addLive(row.studentId, item);
    }
  }

  // Kehadiran mapel tetap independen dari Global. Hanya anomali Global HADIR/TERLAMBAT + mapel ALPA
  // yang masuk EWS sebagai selective truancy, tanpa mengubah SchoolDailyAttendance.
  const globalPresentByStudentDate = new Set(
    attendanceCurrentRows
      .filter((row) => row.status === "HADIR" || row.status === "TERLAMBAT")
      .map((row) => `${row.studentId}:${row.dateOnly}`),
  );
  const selectiveTruancyByStudent = new Map<string, Array<{ id: string; dateOnly: string; subjectName: string; courseId: string }>>();
  for (const row of subjectAlpaRows) {
    const teachingSession = row.session.teachingSession;
    if (!teachingSession) continue;
    if (!globalPresentByStudentDate.has(`${row.studentId}:${teachingSession.dateOnly}`)) continue;
    const items = selectiveTruancyByStudent.get(row.studentId) || [];
    items.push({
      id: row.id,
      dateOnly: teachingSession.dateOnly,
      subjectName: row.session.course.subjectName,
      courseId: row.session.course.id,
    });
    selectiveTruancyByStudent.set(row.studentId, items);
  }
  for (const [studentId, items] of selectiveTruancyByStudent) {
    if (!items.length) continue;
    const points = items.length >= 4 ? 8 : items.length >= 2 ? 4 : 2;
    const subjects = [...new Set(items.map((item) => item.subjectName))].slice(0, 3).join(", ");
    const newest = [...items].sort((a, b) => b.dateOnly.localeCompare(a.dateOnly))[0];
    const item = signal({
      id: `subject-truancy:${studentId}:${currentWindow.key}`,
      source: "ATTENDANCE",
      code: "SELECTIVE_TRUANCY",
      title: "Tidak hadir pada sesi mapel saat tercatat hadir di sekolah",
      detail: `${items.length} sesi ALPA mapel dalam 30 hari terakhir saat Kehadiran Global tercatat hadir/terlambat${subjects ? ` · ${subjects}` : ""}.`,
      points,
      href: `/school/lms/courses/${newest.courseId}/teaching`,
      occurredAt: new Date(`${newest.dateOnly}T12:00:00+07:00`),
      comparableWindow: "CURRENT",
    });
    addLive(studentId, item);
    addTrend(studentId, item);
  }

  // Pola 30 hari: agregasi kehadiran, keterlambatan, pulang awal, konflik, dan alpa beruntun.
  for (const studentId of fullStudentIds) {
    const currentRows = attendanceCurrentRows
      .filter((row) => row.studentId === studentId)
      .sort((a, b) => a.dateOnly.localeCompare(b.dateOnly));
    const lateCount = currentRows.filter((row) => row.status === "TERLAMBAT").length;
    if (lateCount >= 5) {
      const item = signal({ id: `attendance-pattern:late:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "REPEATED_LATENESS", title: "Keterlambatan berulang", detail: `${lateCount} kali terlambat dalam 30 hari terakhir.`, points: 4, href: "/school/attendance", occurredAt: now, comparableWindow: "CURRENT" });
      addLive(studentId, item); addTrend(studentId, item);
    }
    let maxConsecutiveAlpa = 0; let streak = 0;
    for (const row of currentRows) {
      if (row.status === "ALPA") { streak += 1; maxConsecutiveAlpa = Math.max(maxConsecutiveAlpa, streak); }
      else if (row.status === "HADIR" || row.status === "TERLAMBAT" || row.status === "SAKIT" || row.status === "IZIN") streak = 0;
    }
    if (maxConsecutiveAlpa >= 3) {
      const item = signal({ id: `attendance-pattern:alpa:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "CONSECUTIVE_ALPA", title: "Alpa berturut-turut", detail: `Terdeteksi sedikitnya ${maxConsecutiveAlpa} catatan alpa berurutan dalam 30 hari terakhir.`, points: 8, href: "/school/attendance", occurredAt: now, comparableWindow: "CURRENT" });
      addLive(studentId, item); addTrend(studentId, item);
    }
    if (currentRows.length >= 5) {
      const present = currentRows.filter((row) => row.status === "HADIR" || row.status === "TERLAMBAT").length;
      const rate = Math.round((present / currentRows.length) * 100);
      if (rate < 85) {
        const item = signal({ id: `attendance-pattern:rate:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "LOW_ATTENDANCE_RATE", title: "Persentase kehadiran rendah", detail: `Kehadiran ${rate}% dari ${currentRows.length} hari yang telah tercatat dalam 30 hari terakhir.`, points: rate < 70 ? 8 : 5, href: "/school/attendance", occurredAt: now, comparableWindow: "CURRENT" });
        addLive(studentId, item); addTrend(studentId, item);
      }
    }
    const earlyLeaveCount = currentRows.filter((row) => row.earlyLeave).length;
    if (earlyLeaveCount >= 3) {
      const item = signal({ id: `attendance-pattern:early-leave:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "REPEATED_EARLY_LEAVE", title: "Pulang lebih awal berulang", detail: `${earlyLeaveCount} kali pulang lebih awal dalam 30 hari terakhir.`, points: 4, href: "/school/attendance", occurredAt: now, comparableWindow: "CURRENT" });
      addLive(studentId, item); addTrend(studentId, item);
    }
    const conflictCount = currentRows.filter((row) => row.reconciliationStatus === "NEEDS_REVIEW").length;
    if (conflictCount >= 3) {
      const item = signal({ id: `attendance-pattern:conflict:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "REPEATED_ATTENDANCE_CONFLICT", title: "Konflik evidence kehadiran berulang", detail: `${conflictCount} hari masih memerlukan verifikasi kehadiran dalam 30 hari terakhir.`, points: 4, href: "/school/attendance", occurredAt: now, comparableWindow: "CURRENT" });
      addLive(studentId, item); addTrend(studentId, item);
    }
    const habitMisses = habituationEvents.filter((event) => event.studentId === studentId);
    if (habitMisses.length >= 4) {
      const item = signal({ id: `attendance-pattern:habituation:${studentId}:${currentWindow.key}`, source: "ATTENDANCE", code: "HABITUATION_PARTICIPATION_TREND", title: "Partisipasi pembiasaan perlu perhatian", detail: `${habitMisses.length} catatan tidak hadir/terlambat pada kegiatan pembiasaan dalam 30 hari terakhir. Signal ini terpisah dari status hadir sekolah.`, points: 2, href: "/school/attendance/habituation", occurredAt: habitMisses[0]?.occurredAt || now, comparableWindow: "CURRENT" });
      addLive(studentId, item); addTrend(studentId, item);
    }
  }

  // Kesiswaan: kasus terbuka memengaruhi risiko live; seluruh insiden 60 hari menjadi bukti tren.
  for (const item of violations) {
    const basePoints = severityPoints(item.severity);
    const trendWindow =
      item.incidentAt >= currentWindow.date
        ? "CURRENT"
        : item.incidentAt >= previousWindow.date
          ? "PREVIOUS"
          : null;

    if (trendWindow) {
      addTrend(
        item.studentId,
        signal({
          id: `violation-trend:${item.id}`,
          source: "STUDENT_AFFAIRS",
          code: `VIOLATION_${item.severity}`,
          title: item.title,
          detail: "Insiden kesiswaan pada periode tren.",
          points: basePoints,
          href: `/school/student-affairs?tab=VIOLATIONS&record=${item.id}`,
          occurredAt: item.incidentAt,
          comparableWindow: trendWindow,
        }),
      );
    }

    if (item.status === "RECORDED" || item.status === "IN_REVIEW") {
      addLive(
        item.studentId,
        signal({
          id: `violation:${item.id}`,
          source: "STUDENT_AFFAIRS",
          code: `OPEN_VIOLATION_${item.severity}`,
          title: item.title,
          detail: `Pelanggaran ${item.severity.toLowerCase()} masih aktif.`,
          points: basePoints + Math.min(4, Math.max(0, Math.floor(item.points / 10))),
          href: `/school/student-affairs?tab=VIOLATIONS&record=${item.id}`,
          occurredAt: item.updatedAt,
        }),
      );
    }
  }

  for (const item of coachings) {
    const overdue = !!item.nextReviewAt && item.nextReviewAt < now;
    addLive(
      item.studentId,
      signal({
        id: `coaching:${item.id}`,
        source: "STUDENT_AFFAIRS",
        code: overdue ? "COACHING_REVIEW_OVERDUE" : "COACHING_ACTIVE",
        title: overdue ? `Evaluasi pembinaan terlambat · ${item.topic}` : `Pembinaan aktif · ${item.topic}`,
        detail: overdue
          ? "Jadwal evaluasi pembinaan sudah terlewati."
          : "Pembinaan masih berstatus aktif.",
        points: overdue ? 6 : 3,
        href: `/school/student-affairs?tab=COACHING&record=${item.id}`,
        occurredAt: item.updatedAt,
      }),
    );
  }

  for (const item of overduePermits) {
    addLive(
      item.studentId,
      signal({
        id: `permit:${item.id}`,
        source: "STUDENT_AFFAIRS",
        code: "PERMIT_OVERDUE",
        title: "Izin melewati batas waktu",
        detail: item.reason,
        points: 4,
        href: "/school/student-affairs?tab=PERMITS",
        occurredAt: item.updatedAt,
      }),
    );
  }

  // LMS: tugas terlambat dan nilai rendah pada 30 hari terakhir.
  const studentsByClass = new Map<string, string[]>();
  for (const student of students) {
    if (!fullIds.has(student.id) || !student.classRoomId) continue;
    const list = studentsByClass.get(student.classRoomId) || [];
    list.push(student.id);
    studentsByClass.set(student.classRoomId, list);
  }

  for (const assignment of assignments) {
    const classStudents = studentsByClass.get(assignment.course.classRoomId) || [];
    const submissionByStudent = new Map(
      assignment.submissions.map((submission) => [submission.studentId, submission]),
    );
    const window =
      assignment.deadline >= currentWindow.date
        ? "CURRENT"
        : assignment.deadline >= previousWindow.date
          ? "PREVIOUS"
          : null;

    for (const studentId of classStudents) {
      const submission = submissionByStudent.get(studentId);
      if (!submission) {
        const daysOverdue = Math.max(
          1,
          Math.floor((now.getTime() - assignment.deadline.getTime()) / (24 * 60 * 60 * 1000)),
        );
        const points = daysOverdue >= 7 ? 7 : 5;
        const item = signal({
          id: `assignment-missing:${assignment.id}:${studentId}`,
          source: "LEARNING",
          code: "ASSIGNMENT_OVERDUE",
          title: `Tugas terlambat · ${assignment.title}`,
          detail: `${assignment.course.subjectName} · terlambat ${daysOverdue} hari.`,
          points,
          href: `/school/lms/courses/${assignment.course.id}`,
          occurredAt: assignment.deadline,
          comparableWindow: window,
        });
        if (window) addTrend(studentId, item);
        if (window === "CURRENT") addLive(studentId, item);
        continue;
      }

      if (
        submission.grade != null &&
        submission.grade < 75 &&
        submission.submittedAt >= currentWindow.date
      ) {
        const points = submission.grade < 60 ? 6 : 4;
        const item = signal({
          id: `assignment-low:${assignment.id}:${studentId}`,
          source: "LEARNING",
          code: "LOW_GRADE",
          title: `Capaian tugas rendah · ${assignment.title}`,
          detail: `${assignment.course.subjectName} · nilai ${Math.round(submission.grade)}.`,
          points,
          href: `/school/lms/courses/${assignment.course.id}`,
          occurredAt: submission.submittedAt,
          comparableWindow: "CURRENT",
        });
        addTrend(studentId, item);
        addLive(studentId, item);
      } else if (
        submission.grade != null &&
        submission.grade < 75 &&
        submission.submittedAt >= previousWindow.date &&
        submission.submittedAt < currentWindow.date
      ) {
        addTrend(
          studentId,
          signal({
            id: `assignment-low-prev:${assignment.id}:${studentId}`,
            source: "LEARNING",
            code: "LOW_GRADE",
            title: `Capaian tugas rendah · ${assignment.title}`,
            detail: `${assignment.course.subjectName} · nilai ${Math.round(submission.grade)}.`,
            points: submission.grade < 60 ? 6 : 4,
            href: `/school/lms/courses/${assignment.course.id}`,
            occurredAt: submission.submittedAt,
            comparableWindow: "PREVIOUS",
          }),
        );
      }
    }
  }

  // PKL menggunakan engine EWS PKL yang sudah kanonik.
  for (const alert of pklAlerts) {
    if (!liveSignalsByStudent.has(alert.studentId)) continue;
    addLive(
      alert.studentId,
      signal({
        id: `pkl:${alert.id}`,
        source: "PKL",
        code: alert.code,
        title: `PKL · ${alert.issue}`,
        detail: `${alert.companyName}. ${alert.details}`,
        points: pklPoints(alert.severity),
        href: alert.destination,
        occurredAt: now,
      }),
    );
  }

  // Tindak lanjut dibatasi untuk profil penuh; profil PKL terbatas hanya melihat kasus PKL.
  for (const item of followUps) {
    if (!item.subjectStudentId) continue;
    const full = fullIds.has(item.subjectStudentId);
    if (!full && item.sourceType !== "PKL_EWS") continue;
    const overdue = !!item.dueAt && item.dueAt < now;
    addLive(
      item.subjectStudentId,
      signal({
        id: `followup:${item.id}`,
        source: "FOLLOW_UP",
        code: overdue ? "FOLLOW_UP_OVERDUE" : `FOLLOW_UP_${item.severity}`,
        title: overdue ? `Tindak lanjut terlambat · ${item.title}` : item.title,
        detail: item.description,
        points: followUpPoints(item.severity, overdue),
        href: `/school/follow-up?case=${item.id}`,
        occurredAt: item.updatedAt,
      }),
    );
  }

  const profiles = students.map((student) => {
    const liveSignals = (liveSignalsByStudent.get(student.id) || []).sort(
      (a, b) => b.points - a.points || b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
    const trendSignals = trendSignalsByStudent.get(student.id) || [];
    const scored = scoreSignals(liveSignals);
    const currentComparable = comparableScore(trendSignals, "CURRENT");
    const previousComparable = comparableScore(trendSignals, "PREVIOUS");
    const trend = riskTrend(currentComparable, previousComparable);
    const sourceOrder = sourceContributionOrder(scored.sourceScores);
    const sourceCount = STUDENT_RISK_SOURCES.filter(
      (source) => scored.sourceScores[source] > 0,
    ).length;
    const allowedSources: StudentRiskSource[] = fullIds.has(student.id)
      ? [...STUDENT_RISK_SOURCES]
      : ["PKL", "FOLLOW_UP"];

    return {
      student: {
        id: student.id,
        displayName: displayName(student),
        nis: student.studentProfile?.nis || null,
        nisn: student.studentProfile?.nisn || null,
        classRoom: student.classRoom
          ? {
              id: student.classRoom.id,
              name: student.classRoom.name,
              gradeLevel: student.classRoom.gradeLevel,
              department: student.classRoom.department,
            }
          : null,
        homeroomTeacher: student.classRoom?.homeroomTeacher
          ? {
              id: student.classRoom.homeroomTeacher.id,
              displayName: displayName(student.classRoom.homeroomTeacher),
            }
          : null,
      },
      accessMode: fullIds.has(student.id) ? ("FULL" as const) : ("PKL_ONLY" as const),
      allowedSources,
      score: scored.score,
      level: scored.level,
      sourceScores: scored.sourceScores,
      sourceOrder,
      sourceCount,
      signals: liveSignals.slice(0, 24),
      recommendations: buildRiskRecommendations(scored.sourceScores),
      trend: {
        ...trend,
        currentComparable,
        previousComparable,
        note: "Tren membandingkan bukti 30 hari terakhir dengan 30 hari sebelumnya dari Presensi, Kesiswaan, dan LMS.",
      },
      lastSignalAt: liveSignals[0]?.occurredAt || null,
    };
  });

  profiles.sort(
    (a, b) =>
      b.score - a.score ||
      (a.trend.code === "WORSENING" ? -1 : 0) - (b.trend.code === "WORSENING" ? -1 : 0) ||
      a.student.displayName.localeCompare(b.student.displayName, "id"),
  );

  const levelCounts = {
    CRITICAL: profiles.filter((item) => item.level === "CRITICAL").length,
    HIGH: profiles.filter((item) => item.level === "HIGH").length,
    MEDIUM: profiles.filter((item) => item.level === "MEDIUM").length,
    WATCH: profiles.filter((item) => item.level === "WATCH").length,
    NORMAL: profiles.filter((item) => item.level === "NORMAL").length,
  };

  const sourceTotals = Object.fromEntries(
    STUDENT_RISK_SOURCES.map((source) => [
      source,
      {
        students: profiles.filter((profile) => profile.sourceScores[source] > 0).length,
        score: profiles.reduce((sum, profile) => sum + profile.sourceScores[source], 0),
      },
    ]),
  ) as Record<StudentRiskSource, { students: number; score: number }>;

  const classOptions = [
    ...new Map(
      profiles
        .filter((profile) => profile.student.classRoom)
        .map((profile) => [
          profile.student.classRoom!.id,
          { id: profile.student.classRoom!.id, name: profile.student.classRoom!.name },
        ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "id"));

  const result = {
    access: {
      canViewAll: access.canViewAll,
      scopeLabel: access.scopeLabel,
      roleMode: access.roleMode,
      reasons: access.reasons,
    },
    generatedAt: now,
    windows: {
      currentStart: currentWindow.date,
      previousStart: previousWindow.date,
      currentDays: 30,
      previousDays: 30,
    },
    summary: {
      totalStudents: profiles.length,
      atRisk: profiles.filter((item) => item.score >= 40).length,
      highOrCritical: levelCounts.HIGH + levelCounts.CRITICAL,
      worsening: profiles.filter((item) => item.trend.code === "WORSENING").length,
      levelCounts,
      sourceTotals,
    },
    classOptions,
    profiles,
  };

  if (cacheMs > 0) {
    studentRiskOverviewCache.set(cacheKey, {
      expiresAt: Date.now() + cacheMs,
      value: result,
    });
  }

  return result;
}
