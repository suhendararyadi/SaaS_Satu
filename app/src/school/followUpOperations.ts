import { HttpError, prisma } from "wasp/server";
import { randomUUID } from "node:crypto";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requirePklMonitoring } from "./authGuards";
import { getPklEwsAlertsForScope } from "../pkl/ews";
import { STUDENT_AFFAIRS_STUDENT_LIMIT } from "./studentAffairs";
import {
  FOLLOW_UP_SEVERITIES,
  FOLLOW_UP_STATUSES,
  defaultFollowUpDueDate,
  nextFollowUpStatuses,
  type FollowUpSeverityCode,
  type FollowUpStatusCode,
} from "./followUp";

function isAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

async function validateFollowUpAssignee(
  schoolId: string,
  id: string | null | undefined,
) {
  if (!id) return null;
  const assignee = await prisma.user.findFirst({
    where: {
      id,
      schoolId,
      role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
    },
    select: { id: true },
  });
  if (!assignee) {
    throw new HttpError(400, "Penanggung jawab harus guru atau admin sekolah yang valid.");
  }
  return assignee.id;
}

function jakartaDateOnly(date = new Date()) {
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

async function getLeadershipAccess(user: ReturnType<typeof ensureSchoolUser>) {
  if (isAdmin(user as User)) return { canSeeAll: true, canAssign: true };

  if (user.role !== "TEACHER") {
    return { canSeeAll: false, canAssign: false };
  }

  const [principal, wakasek] = await Promise.all([
    prisma.schoolStaffAssignment.findFirst({
      where: {
        schoolId: user.schoolId,
        teacherId: user.id,
        role: "PRINCIPAL",
        isActive: true,
      },
      select: { id: true },
    }),
    prisma.wakasekAssignment.findFirst({
      where: { schoolId: user.schoolId, teacherId: user.id },
      select: { id: true },
    }),
  ]);

  return {
    canSeeAll: !!principal || !!wakasek,
    canAssign: !!principal || !!wakasek,
  };
}

async function resolveRoleOwner(
  schoolId: string,
  role: "KURIKULUM" | "KESISWAAN" | "HUMAS_HUBIN",
) {
  const assignment = await prisma.wakasekAssignment.findFirst({
    where: { schoolId, role },
    orderBy: { createdAt: "asc" },
    select: { teacherId: true },
  });
  return assignment?.teacherId || null;
}

type FindingInput = {
  sourceType: "ATTENDANCE" | "PKL_EWS" | "DUTY_TEACHER" | "SYSTEM";
  sourceKey: string;
  sourceUrl: string;
  title: string;
  description: string;
  severity: FollowUpSeverityCode;
  subjectStudentId?: string | null;
  assignedToId?: string | null;
  metadata?: Record<string, unknown>;
};

async function upsertFinding(
  schoolId: string,
  actorId: string | null,
  finding: FindingInput,
) {
  const existing = await prisma.schoolFollowUpCase.findUnique({
    where: {
      schoolId_sourceType_sourceKey: {
        schoolId,
        sourceType: finding.sourceType,
        sourceKey: finding.sourceKey,
      },
    },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      dueAt: true,
    },
  });

  if (existing) {
    if (existing.status === "RESOLVED" || existing.status === "CANCELED") {
      return { id: existing.id, created: false, closed: true };
    }

    const autoAssigned = !existing.assignedToId && !!finding.assignedToId;
    const nextStatus =
      existing.status === "FINDING" && (existing.assignedToId || finding.assignedToId)
        ? "ASSIGNED"
        : existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.schoolFollowUpCase.update({
        where: { id: existing.id },
        data: {
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          sourceUrl: finding.sourceUrl,
          subjectStudentId: finding.subjectStudentId || null,
          assignedToId: existing.assignedToId || finding.assignedToId || null,
          status: nextStatus,
          dueAt: existing.dueAt || defaultFollowUpDueDate(finding.severity),
          metadata: (finding.metadata || undefined) as any,
        },
      });
      if (autoAssigned) {
        await tx.schoolFollowUpEvent.create({
          data: {
            caseId: existing.id,
            actorId,
            type: "ASSIGNED",
            fromStatus: existing.status,
            toStatus: nextStatus,
            note: "Penanggung jawab ditetapkan otomatis berdasarkan struktur sekolah.",
            metadata: { assignedToId: finding.assignedToId } as any,
          },
        });
      }
    });
    return { id: existing.id, created: false, closed: false };
  }

  const assignedToId = finding.assignedToId || null;
  const created = await prisma.schoolFollowUpCase.create({
    data: {
      schoolId,
      sourceType: finding.sourceType,
      sourceKey: finding.sourceKey,
      sourceUrl: finding.sourceUrl,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      status: assignedToId ? "ASSIGNED" : "FINDING",
      subjectStudentId: finding.subjectStudentId || null,
      assignedToId,
      createdById: actorId,
      dueAt: defaultFollowUpDueDate(finding.severity),
      metadata: (finding.metadata || undefined) as any,
      events: {
        create: [
          {
            actorId,
            type: "CREATED",
            toStatus: assignedToId ? "ASSIGNED" : "FINDING",
            note: "Temuan dibuat dari sumber operasional School OS.",
          },
          ...(assignedToId
            ? [{
                actorId,
                type: "ASSIGNED" as const,
                toStatus: "ASSIGNED" as const,
                note: "Penanggung jawab ditetapkan otomatis berdasarkan struktur sekolah.",
                metadata: { assignedToId },
              }]
            : []),
        ],
      },
    },
    select: { id: true },
  });
  return { id: created.id, created: true, closed: false };
}

async function syncFindingsForSchool(schoolId: string, actorId: string | null) {
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFromKey = jakartaDateOnly(dateFrom);

  const [kesiswaanOwner, kurikulumOwner, humasOwner, attendanceRecords, pklAlerts, dutyReports] =
    await Promise.all([
      resolveRoleOwner(schoolId, "KESISWAAN"),
      resolveRoleOwner(schoolId, "KURIKULUM"),
      resolveRoleOwner(schoolId, "HUMAS_HUBIN"),
      prisma.schoolDailyAttendance.findMany({
        where: {
          schoolId,
          dateOnly: { gte: dateFromKey },
          status: { in: ["ALPA", "TERLAMBAT"] },
        },
        select: {
          studentId: true,
          status: true,
          student: {
            select: {
              name: true,
              email: true,
              username: true,
              classRoom: {
                select: {
                  name: true,
                  homeroomTeacherId: true,
                },
              },
            },
          },
        },
      }),
      getPklEwsAlertsForScope(schoolId),
      prisma.dutyTeacherReport.findMany({
        where: {
          schoolId,
          date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          OR: [
            { lateStudentsCount: { gte: 3 } },
            { dispensationsCount: { gte: 3 } },
            { notes: { not: null } },
          ],
        },
        select: {
          id: true,
          date: true,
          lateStudentsCount: true,
          dispensationsCount: true,
          notes: true,
          dutyTeacherId: true,
          dutyTeacher: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

  const findings: FindingInput[] = [];
  const groupedAttendance = new Map<string, {
    alpa: number;
    terlambat: number;
    studentName: string;
    className: string;
    homeroomTeacherId: string | null;
  }>();

  for (const record of attendanceRecords) {
    const current = groupedAttendance.get(record.studentId) || {
      alpa: 0,
      terlambat: 0,
      studentName: record.student.name || record.student.username || record.student.email || "Siswa",
      className: record.student.classRoom?.name || "Belum ada rombel",
      homeroomTeacherId: record.student.classRoom?.homeroomTeacherId || null,
    };
    if (record.status === "ALPA") current.alpa += 1;
    if (record.status === "TERLAMBAT") current.terlambat += 1;
    groupedAttendance.set(record.studentId, current);
  }

  for (const [studentId, risk] of groupedAttendance.entries()) {
    if (risk.alpa < 3 && risk.terlambat < 5) continue;
    const severity: FollowUpSeverityCode =
      risk.alpa >= 5 || risk.terlambat >= 8 ? "HIGH" : "MEDIUM";
    findings.push({
      sourceType: "ATTENDANCE",
      sourceKey: `student:${studentId}:rolling30`,
      sourceUrl: "/school/attendance",
      title: `Risiko kehadiran · ${risk.studentName}`,
      description: `${risk.className}: ${risk.alpa} Alpa dan ${risk.terlambat} Terlambat dalam 30 hari terakhir.`,
      severity,
      subjectStudentId: studentId,
      assignedToId: risk.homeroomTeacherId || kesiswaanOwner,
      metadata: { alpa: risk.alpa, terlambat: risk.terlambat, windowDays: 30 },
    });
  }

  const placementIds = [...new Set(pklAlerts.map((alert) => alert.placementId))];
  const placements = placementIds.length
    ? await prisma.placement.findMany({
        where: { schoolId, id: { in: placementIds } },
        select: { id: true, teacherSupervisorId: true },
      })
    : [];
  const supervisorByPlacement = new Map(
    placements.map((placement) => [placement.id, placement.teacherSupervisorId]),
  );

  for (const alert of pklAlerts) {
    findings.push({
      sourceType: "PKL_EWS",
      sourceKey: alert.id,
      sourceUrl: "/school/pkl/monitoring",
      title: `PKL · ${alert.issue}`,
      description: `${alert.studentName} · ${alert.className} · ${alert.companyName}. ${alert.details}`,
      severity: alert.severity === "HIGH" ? "HIGH" : "MEDIUM",
      subjectStudentId: alert.studentId,
      assignedToId: supervisorByPlacement.get(alert.placementId) || humasOwner,
      metadata: {
        placementId: alert.placementId,
        alertCode: alert.code,
        category: alert.category,
      },
    });
  }

  for (const report of dutyReports) {
    const hasMeaningfulNote = !!report.notes?.trim();
    if (!hasMeaningfulNote && report.lateStudentsCount < 3 && report.dispensationsCount < 3) continue;
    findings.push({
      sourceType: "DUTY_TEACHER",
      sourceKey: report.id,
      sourceUrl: "/school/governance/piket",
      title: `Laporan Guru Piket · ${jakartaDateOnly(report.date)}`,
      description:
        report.notes?.trim() ||
        `${report.lateStudentsCount} siswa terlambat dan ${report.dispensationsCount} dispensasi tercatat.`,
      severity:
        report.lateStudentsCount >= 8 || report.dispensationsCount >= 8 ? "HIGH" : "MEDIUM",
      assignedToId: kesiswaanOwner,
      metadata: {
        lateStudentsCount: report.lateStudentsCount,
        dispensationsCount: report.dispensationsCount,
        dutyTeacherId: report.dutyTeacherId,
        dutyTeacherName: report.dutyTeacher.name,
      },
    });
  }

  const [studentsWithoutClass, teachersWithoutCourse] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: "STUDENT", classRoomId: null } }),
    prisma.user.count({
      where: { schoolId, role: "TEACHER", teacherCourses: { none: {} } },
    }),
  ]);

  if (studentsWithoutClass > 0) {
    findings.push({
      sourceType: "SYSTEM",
      sourceKey: "students-without-class",
      sourceUrl: "/school/students",
      title: "Siswa belum memiliki rombel",
      description: `${studentsWithoutClass} siswa belum ditempatkan ke rombel.`,
      severity: studentsWithoutClass >= 5 ? "HIGH" : "MEDIUM",
      assignedToId: kesiswaanOwner,
      metadata: { count: studentsWithoutClass },
    });
  }

  if (teachersWithoutCourse > 0) {
    findings.push({
      sourceType: "SYSTEM",
      sourceKey: "teachers-without-course",
      sourceUrl: "/school/lms/courses",
      title: "Guru belum memiliki ruang mapel",
      description: `${teachersWithoutCourse} guru belum memiliki ruang/mapel pada sistem.`,
      severity: "LOW",
      assignedToId: kurikulumOwner,
      metadata: { count: teachersWithoutCourse },
    });
  }

  let created = 0;
  let updated = 0;
  for (const finding of findings) {
    const result = await upsertFinding(schoolId, actorId, finding);
    if (result.created) created += 1;
    else if (!result.closed) updated += 1;
  }

  return { scanned: findings.length, created, updated };
}

function visibleCaseWhere(
  user: ReturnType<typeof ensureSchoolUser>,
  canSeeAll: boolean,
) {
  if (canSeeAll) return { schoolId: user.schoolId };

  if (user.role === "TEACHER") {
    return {
      schoolId: user.schoolId,
      OR: [
        { assignedToId: user.id },
        { createdById: user.id },
        { subjectStudent: { classRoom: { homeroomTeacherId: user.id } } },
        {
          subjectStudent: {
            studentPlacements: {
              some: { teacherSupervisorId: user.id, status: "ACTIVE" },
            },
          },
        },
      ],
    };
  }

  if (user.role === "DUDI_MENTOR") {
    return {
      schoolId: user.schoolId,
      OR: [
        { assignedToId: user.id },
        { createdById: user.id },
        {
          subjectStudent: {
            studentPlacements: {
              some: { dudiMentorId: user.id, status: "ACTIVE" },
            },
          },
        },
      ],
    };
  }

  throw new HttpError(403, "Workflow tindak lanjut tidak tersedia untuk akun ini.");
}

const workflowQuerySchema = z.object({
  view: z.enum(["ACTIVE", "MINE", "HISTORY"]).default("ACTIVE"),
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  severity: z.enum(FOLLOW_UP_SEVERITIES).optional(),
  search: z.string().trim().max(120).optional(),
});

export const getFollowUpWorkflowData = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  if (user.role === "STUDENT") throw new HttpError(403, "Workflow tindak lanjut tidak tersedia untuk siswa.");

  const args = ensureArgsSchemaOrThrowHttpError(workflowQuerySchema, rawArgs ?? {});
  const leadership = await getLeadershipAccess(user);
  const baseWhere = visibleCaseWhere(user, leadership.canSeeAll);

  const stateWhere =
    args.view === "HISTORY"
      ? { status: { in: ["RESOLVED", "CANCELED"] as const } }
      : args.status
        ? { status: args.status }
        : { status: { in: ["FINDING", "ASSIGNED", "IN_PROGRESS"] as const } };

  const searchWhere = args.search
    ? {
        OR: [
          { title: { contains: args.search, mode: "insensitive" as const } },
          { description: { contains: args.search, mode: "insensitive" as const } },
          { subjectStudent: { name: { contains: args.search, mode: "insensitive" as const } } },
          { assignedTo: { name: { contains: args.search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const where: any = {
    AND: [
      baseWhere,
      stateWhere,
      ...(args.severity ? [{ severity: args.severity }] : []),
      ...(args.view === "MINE" ? [{ assignedToId: user.id }] : []),
      ...(args.search ? [searchWhere] : []),
    ],
  };

  const [cases, openCounts, assignees, studentOptions] = await Promise.all([
    prisma.schoolFollowUpCase.findMany({
      where,
      orderBy: [
        { severity: "desc" },
        { dueAt: "asc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        sourceType: true,
        sourceKey: true,
        sourceUrl: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        dueAt: true,
        resolvedAt: true,
        resolutionNote: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        subjectStudent: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            classRoom: { select: { id: true, name: true } },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, username: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true, username: true },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: { id: true, name: true, email: true, username: true },
            },
          },
        },
      },
      take: 200,
    }),
    prisma.schoolFollowUpCase.groupBy({
      by: ["status"],
      where: {
        ...baseWhere,
        status: { in: ["FINDING", "ASSIGNED", "IN_PROGRESS"] },
      } as any,
      _count: { _all: true },
    }),
    leadership.canAssign
      ? prisma.user.findMany({
          where: {
            schoolId: user.schoolId,
            role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
          },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: leadership.canSeeAll
        ? { schoolId: user.schoolId, role: "STUDENT" }
        : user.role === "TEACHER"
          ? {
              schoolId: user.schoolId,
              role: "STUDENT",
              OR: [
                { classRoom: { homeroomTeacherId: user.id } },
                { studentPlacements: { some: { teacherSupervisorId: user.id, status: "ACTIVE" } } },
              ],
            }
          : {
              schoolId: user.schoolId,
              role: "STUDENT",
              studentPlacements: { some: { dudiMentorId: user.id, status: "ACTIVE" } },
            },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        classRoom: { select: { id: true, name: true } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: STUDENT_AFFAIRS_STUDENT_LIMIT,
    }),
  ]);

  const counts = { FINDING: 0, ASSIGNED: 0, IN_PROGRESS: 0 };
  for (const row of openCounts) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = row._count._all;
    }
  }

  const now = new Date();
  const overdue = cases.filter(
    (item) =>
      item.dueAt &&
      item.dueAt.getTime() < now.getTime() &&
      item.status !== "RESOLVED" &&
      item.status !== "CANCELED",
  ).length;

  return {
    access: {
      canSeeAll: leadership.canSeeAll,
      canAssign: leadership.canAssign,
      userId: user.id,
    },
    stats: {
      ...counts,
      active: counts.FINDING + counts.ASSIGNED + counts.IN_PROGRESS,
      overdue,
      mine: cases.filter((item) => item.assignedTo?.id === user.id).length,
    },
    cases,
    assignees,
    studentOptions,
  };
};

export const syncFollowUpFindings = async (
  _args: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const leadership = await getLeadershipAccess(user);
  if (!leadership.canSeeAll) {
    throw new HttpError(403, "Sinkronisasi temuan hanya dapat dilakukan oleh Admin, Kepala Sekolah, atau Wakasek.");
  }
  return syncFindingsForSchool(user.schoolId, user.id);
};

const manualCaseSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(4).max(3000),
  severity: z.enum(FOLLOW_UP_SEVERITIES).default("MEDIUM"),
  subjectStudentId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  sourceType: z.enum(["HOMEROOM", "WAKASEK", "MANUAL"]).default("MANUAL"),
});

export const createManualFollowUpCase = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  if (user.role === "STUDENT") throw new HttpError(403, "Akun siswa tidak dapat membuat tindak lanjut.");
  const args = ensureArgsSchemaOrThrowHttpError(manualCaseSchema, rawArgs);
  const leadership = await getLeadershipAccess(user);

  if (args.subjectStudentId) {
    const student = await prisma.user.findFirst({
      where: leadership.canSeeAll
        ? { id: args.subjectStudentId, schoolId: user.schoolId, role: "STUDENT" }
        : user.role === "TEACHER"
          ? {
              id: args.subjectStudentId,
              schoolId: user.schoolId,
              role: "STUDENT",
              OR: [
                { classRoom: { homeroomTeacherId: user.id } },
                { studentPlacements: { some: { teacherSupervisorId: user.id, status: "ACTIVE" } } },
              ],
            }
          : {
              id: args.subjectStudentId,
              schoolId: user.schoolId,
              role: "STUDENT",
              studentPlacements: { some: { dudiMentorId: user.id, status: "ACTIVE" } },
            },
      select: { id: true },
    });
    if (!student) throw new HttpError(400, "Siswa terkait tidak valid atau berada di luar lingkup akses Anda.");
  }

  const validatedAssigneeId = leadership.canAssign
    ? await validateFollowUpAssignee(user.schoolId, args.assignedToId)
    : null;

  const assignedToId = leadership.canAssign ? validatedAssigneeId : user.id;
  const sourceType = leadership.canAssign
    ? args.sourceType
    : user.role === "TEACHER" && args.sourceType === "HOMEROOM"
      ? "HOMEROOM"
      : "MANUAL";

  return prisma.schoolFollowUpCase.create({
    data: {
      schoolId: user.schoolId,
      sourceType,
      sourceKey: `manual:${randomUUID()}`,
      sourceUrl: "/school/follow-up",
      title: args.title,
      description: args.description,
      severity: args.severity,
      status: assignedToId ? "ASSIGNED" : "FINDING",
      subjectStudentId: args.subjectStudentId || null,
      assignedToId,
      createdById: user.id,
      dueAt: args.dueAt || defaultFollowUpDueDate(args.severity),
      events: {
        create: {
          actorId: user.id,
          type: "CREATED",
          toStatus: assignedToId ? "ASSIGNED" : "FINDING",
          note: "Tindak lanjut dibuat secara manual.",
        },
      },
    },
    select: { id: true, status: true },
  });
};

const updateCaseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  severity: z.enum(FOLLOW_UP_SEVERITIES).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  resolutionNote: z.string().trim().max(3000).optional().nullable(),
});

export const updateFollowUpCase = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  if (user.role === "STUDENT") throw new HttpError(403, "Akun siswa tidak dapat mengubah tindak lanjut.");
  const args = ensureArgsSchemaOrThrowHttpError(updateCaseSchema, rawArgs);
  const leadership = await getLeadershipAccess(user);

  const current = await prisma.schoolFollowUpCase.findFirst({
    where: { id: args.id, ...(visibleCaseWhere(user, leadership.canSeeAll) as any) },
    select: {
      id: true,
      status: true,
      severity: true,
      resolutionNote: true,
      assignedToId: true,
      createdById: true,
      updatedAt: true,
      subjectStudent: { select: { classRoom: { select: { homeroomTeacherId: true } } } },
    },
  });
  if (!current) throw new HttpError(404, "Tindak lanjut tidak ditemukan atau tidak dapat Anda akses.");

  const canWork =
    leadership.canAssign ||
    current.assignedToId === user.id ||
    current.createdById === user.id ||
    current.subjectStudent?.classRoom?.homeroomTeacherId === user.id;
  if (!canWork) throw new HttpError(403, "Anda tidak memiliki hak untuk memperbarui tindak lanjut ini.");

  if (args.assignedToId !== undefined && !leadership.canAssign) {
    throw new HttpError(403, "Hanya Admin, Kepala Sekolah, atau Wakasek yang dapat mengubah penanggung jawab.");
  }

  const validatedAssigneeId =
    args.assignedToId !== undefined && leadership.canAssign
      ? await validateFollowUpAssignee(user.schoolId, args.assignedToId)
      : args.assignedToId;

  if (args.status && args.status !== current.status) {
    const allowed = nextFollowUpStatuses(current.status as FollowUpStatusCode);
    if (!allowed.includes(args.status)) {
      throw new HttpError(400, "Perubahan status tersebut tidak sesuai alur tindak lanjut.");
    }
  }

  const nextAssignedTo =
    args.assignedToId !== undefined ? validatedAssigneeId : current.assignedToId;
  let nextStatus = args.status || current.status;
  if (args.assignedToId !== undefined && !args.status) {
    if (nextAssignedTo && current.status === "FINDING") nextStatus = "ASSIGNED";
    if (!nextAssignedTo && current.status === "ASSIGNED") nextStatus = "FINDING";
  }

  const isResolved = nextStatus === "RESOLVED";
  if (isResolved && !args.resolutionNote?.trim() && !current.resolutionNote?.trim()) {
    throw new HttpError(400, "Tambahkan catatan penyelesaian sebelum menutup temuan.");
  }

  return prisma.$transaction(async (tx) => {
    const write = await tx.schoolFollowUpCase.updateMany({
      where: { id: current.id, updatedAt: current.updatedAt },
      data: {
        status: nextStatus,
        severity: args.severity || undefined,
        assignedToId: args.assignedToId !== undefined ? validatedAssigneeId : undefined,
        dueAt: args.dueAt !== undefined ? args.dueAt : undefined,
        resolutionNote:
          args.resolutionNote !== undefined
            ? args.resolutionNote?.trim() || null
            : current.status === "RESOLVED" && nextStatus === "IN_PROGRESS"
              ? null
              : undefined,
        resolvedAt: isResolved ? new Date() : nextStatus === "IN_PROGRESS" ? null : undefined,
        resolvedById: isResolved ? user.id : nextStatus === "IN_PROGRESS" ? null : undefined,
      },
    });
    if (write.count !== 1) {
      throw new HttpError(409, "Tindak lanjut telah diperbarui pengguna lain. Muat ulang sebelum menyimpan lagi.");
    }
    const updated = await tx.schoolFollowUpCase.findUniqueOrThrow({
      where: { id: current.id },
      select: { id: true, status: true, updatedAt: true },
    });

    if (args.assignedToId !== undefined && validatedAssigneeId !== current.assignedToId) {
      await tx.schoolFollowUpEvent.create({
        data: {
          caseId: current.id,
          actorId: user.id,
          type: "ASSIGNED",
          fromStatus: current.status,
          toStatus: nextStatus,
          note: validatedAssigneeId ? "Penanggung jawab diperbarui." : "Penanggung jawab dilepas.",
          metadata: { assignedToId: validatedAssigneeId },
        },
      });
    }

    if (nextStatus !== current.status) {
      await tx.schoolFollowUpEvent.create({
        data: {
          caseId: current.id,
          actorId: user.id,
          type: "STATUS_CHANGED",
          fromStatus: current.status,
          toStatus: nextStatus,
          note: args.resolutionNote?.trim() || null,
        },
      });
    } else if (
      args.severity !== undefined ||
      args.dueAt !== undefined ||
      args.resolutionNote !== undefined
    ) {
      await tx.schoolFollowUpEvent.create({
        data: {
          caseId: current.id,
          actorId: user.id,
          type: "UPDATED",
          fromStatus: current.status,
          toStatus: current.status,
          note: "Detail tindak lanjut diperbarui.",
        },
      });
    }

    return updated;
  });
};

const commentSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().min(2).max(3000),
});

export const addFollowUpComment = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  if (user.role === "STUDENT") throw new HttpError(403, "Akun siswa tidak dapat menambahkan catatan.");
  const args = ensureArgsSchemaOrThrowHttpError(commentSchema, rawArgs);
  const leadership = await getLeadershipAccess(user);

  const item = await prisma.schoolFollowUpCase.findFirst({
    where: { id: args.id, ...(visibleCaseWhere(user, leadership.canSeeAll) as any) },
    select: { id: true, status: true },
  });
  if (!item) throw new HttpError(404, "Tindak lanjut tidak ditemukan atau tidak dapat Anda akses.");

  return prisma.schoolFollowUpEvent.create({
    data: {
      caseId: item.id,
      actorId: user.id,
      type: "COMMENT",
      fromStatus: item.status,
      toStatus: item.status,
      note: args.note,
    },
    select: { id: true, createdAt: true },
  });
};

const pklAlertSchema = z.object({ alertId: z.string().min(4).max(200) });

export const ensurePklEwsFollowUp = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = requirePklMonitoring(context);
  const args = ensureArgsSchemaOrThrowHttpError(pklAlertSchema, rawArgs);
  const alerts = await getPklEwsAlertsForScope(
    user.schoolId,
    user.role === "TEACHER"
      ? { teacherSupervisorId: user.id }
      : user.role === "DUDI_MENTOR"
        ? { dudiMentorId: user.id }
        : {},
  );
  const alert = alerts.find((item) => item.id === args.alertId);
  if (!alert) throw new HttpError(404, "Sinyal EWS tidak ditemukan dalam lingkup akses Anda.");

  const placement = await prisma.placement.findFirst({
    where: { id: alert.placementId, schoolId: user.schoolId },
    select: { teacherSupervisorId: true },
  });
  const humasOwner = await resolveRoleOwner(user.schoolId, "HUMAS_HUBIN");

  const result = await upsertFinding(user.schoolId, user.id, {
    sourceType: "PKL_EWS",
    sourceKey: alert.id,
    sourceUrl: "/school/pkl/monitoring",
    title: `PKL · ${alert.issue}`,
    description: `${alert.studentName} · ${alert.className} · ${alert.companyName}. ${alert.details}`,
    severity: alert.severity === "HIGH" ? "HIGH" : "MEDIUM",
    subjectStudentId: alert.studentId,
    assignedToId: placement?.teacherSupervisorId || humasOwner || user.id,
    metadata: {
      placementId: alert.placementId,
      alertCode: alert.code,
      category: alert.category,
    },
  });

  if (result.closed) {
    const closed = await prisma.schoolFollowUpCase.findUnique({
      where: { id: result.id },
      select: { status: true },
    });
    if (closed) {
      await prisma.$transaction([
        prisma.schoolFollowUpCase.update({
          where: { id: result.id },
          data: {
            status: "IN_PROGRESS",
            resolvedAt: null,
            resolvedById: null,
          },
        }),
        prisma.schoolFollowUpEvent.create({
          data: {
            caseId: result.id,
            actorId: user.id,
            type: "STATUS_CHANGED",
            fromStatus: closed.status,
            toStatus: "IN_PROGRESS",
            note: "Kasus dibuka kembali karena sinyal EWS masih aktif dan ditindaklanjuti kembali.",
          },
        }),
      ]);
    }
  }

  return { id: result.id };
};
