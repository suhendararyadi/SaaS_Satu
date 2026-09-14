import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { defaultFollowUpDueDate, FOLLOW_UP_SEVERITIES } from "./followUp";
import {
  ACHIEVEMENT_LEVELS,
  COACHING_STATUSES,
  COACHING_TYPES,
  PERMIT_STATUSES,
  PERMIT_TYPES,
  VIOLATION_STATUSES,
  nextCoachingStatuses,
  nextPermitStatuses,
  nextViolationStatuses,
  shouldAutoCreateViolationFollowUp,
  type CoachingStatusCode,
  type PermitStatusCode,
  type ViolationStatusCode,
} from "./studentAffairs";
import {
  assertStudentAffairsStudent,
  requireStudentAffairsAccess,
  studentAffairsStudentWhere,
} from "./studentAffairsAccess";

const personSelect = { id: true, name: true } as const;

function personLabel(person: { name?: string | null } | null | undefined) {
  return person?.name || "Petugas sekolah";
}

async function kesiswaanOwner(schoolId: string) {
  const assignment = await prisma.wakasekAssignment.findFirst({
    where: { schoolId, role: "KESISWAAN" },
    orderBy: { createdAt: "asc" },
    select: { teacherId: true },
  });
  return assignment?.teacherId || null;
}

async function validateStaffAssignee(
  schoolId: string,
  id: string | null | undefined,
) {
  if (!id) return null;
  const user = await prisma.user.findFirst({
    where: {
      id,
      schoolId,
      role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
    },
    select: { id: true },
  });
  if (!user) throw new HttpError(400, "Penanggung jawab tidak valid.");
  return user.id;
}

async function createStudentAffairsEvent(
  tx: any,
  args: {
    schoolId: string;
    studentId: string;
    entityType: "VIOLATION" | "ACHIEVEMENT" | "COACHING" | "PERMIT";
    entityId: string;
    type: "CREATED" | "UPDATED" | "STATUS_CHANGED" | "COMMENT";
    actorId: string;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return tx.studentAffairsEvent.create({
    data: {
      schoolId: args.schoolId,
      studentId: args.studentId,
      entityType: args.entityType,
      entityId: args.entityId,
      type: args.type,
      actorId: args.actorId,
      note: args.note || null,
      metadata: (args.metadata || undefined) as any,
    },
  });
}

async function ensureStudentAffairsFollowUp(
  tx: any,
  input: {
    schoolId: string;
    actorId: string;
    studentId: string;
    sourceKey: string;
    sourceUrl: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assignedToId?: string | null;
    note: string;
  },
) {
  const existing = await tx.schoolFollowUpCase.findUnique({
    where: {
      schoolId_sourceType_sourceKey: {
        schoolId: input.schoolId,
        sourceType: "STUDENT_AFFAIRS",
        sourceKey: input.sourceKey,
      },
    },
    select: { id: true },
  });
  if (existing) return existing;

  const assignedToId = input.assignedToId || null;
  return tx.schoolFollowUpCase.create({
    data: {
      schoolId: input.schoolId,
      sourceType: "STUDENT_AFFAIRS",
      sourceKey: input.sourceKey,
      sourceUrl: input.sourceUrl,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: assignedToId ? "ASSIGNED" : "FINDING",
      subjectStudentId: input.studentId,
      assignedToId,
      createdById: input.actorId,
      dueAt: defaultFollowUpDueDate(input.severity),
      metadata: { studentAffairsSourceKey: input.sourceKey },
      events: {
        create: [
          {
            actorId: input.actorId,
            type: "CREATED",
            toStatus: assignedToId ? "ASSIGNED" : "FINDING",
            note: input.note,
          },
          ...(assignedToId
            ? [{
                actorId: input.actorId,
                type: "ASSIGNED" as const,
                toStatus: "ASSIGNED" as const,
                note: "Penanggung jawab ditetapkan dari struktur Kesiswaan.",
                metadata: { assignedToId },
              }]
            : []),
        ],
      },
    },
    select: { id: true },
  });
}

async function syncFollowUpState(
  tx: any,
  input: {
    schoolId: string;
    actorId: string;
    sourceKey: string;
    desiredStatus: "FINDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELED";
    assignedToId?: string | null;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    resolutionNote?: string | null;
  },
) {
  const followUp = await tx.schoolFollowUpCase.findUnique({
    where: {
      schoolId_sourceType_sourceKey: {
        schoolId: input.schoolId,
        sourceType: "STUDENT_AFFAIRS",
        sourceKey: input.sourceKey,
      },
    },
    select: {
      id: true,
      status: true,
      assignedToId: true,
    },
  });
  if (!followUp) return;

  const nextAssignedTo =
    input.assignedToId === undefined ? followUp.assignedToId : input.assignedToId;

  await tx.schoolFollowUpCase.update({
    where: { id: followUp.id },
    data: {
      status: input.desiredStatus,
      assignedToId: nextAssignedTo,
      severity: input.severity || undefined,
      resolutionNote:
        input.desiredStatus === "RESOLVED"
          ? input.resolutionNote || null
          : input.desiredStatus === "IN_PROGRESS"
            ? null
            : undefined,
      resolvedAt:
        input.desiredStatus === "RESOLVED"
          ? new Date()
          : input.desiredStatus === "IN_PROGRESS"
            ? null
            : undefined,
      resolvedById:
        input.desiredStatus === "RESOLVED"
          ? input.actorId
          : input.desiredStatus === "IN_PROGRESS"
            ? null
            : undefined,
    },
  });

  if (nextAssignedTo !== followUp.assignedToId) {
    await tx.schoolFollowUpEvent.create({
      data: {
        caseId: followUp.id,
        actorId: input.actorId,
        type: "ASSIGNED",
        fromStatus: followUp.status,
        toStatus: input.desiredStatus,
        note: nextAssignedTo
          ? "PIC Kesiswaan diperbarui."
          : "PIC Kesiswaan dilepas.",
        metadata: { assignedToId: nextAssignedTo },
      },
    });
  }

  if (followUp.status !== input.desiredStatus) {
    await tx.schoolFollowUpEvent.create({
      data: {
        caseId: followUp.id,
        actorId: input.actorId,
        type: "STATUS_CHANGED",
        fromStatus: followUp.status,
        toStatus: input.desiredStatus,
        note: input.resolutionNote || "Status disinkronkan dari Kesiswaan Terpadu.",
      },
    });
  }
}

const dashboardSchema = z.object({
  classRoomId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
});

export const getStudentAffairsData = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(dashboardSchema, rawArgs ?? {});
  const baseStudentWhere: any = studentAffairsStudentWhere(user, access);

  if (args.classRoomId) {
    if (!access.canManageAll && !access.homeroomClassIds.includes(args.classRoomId)) {
      throw new HttpError(403, "Rombel berada di luar lingkup Kesiswaan Anda.");
    }
    baseStudentWhere.classRoomId = args.classRoomId;
  }
  if (args.studentId) baseStudentWhere.id = args.studentId;

  const students = await prisma.user.findMany({
    where: baseStudentWhere,
    select: {
      id: true,
      name: true,
      username: true,
      studentProfile: { select: { nis: true, nisn: true } },
      classRoom: { select: { id: true, name: true } },
    },
    orderBy: [{ classRoom: { name: "asc" } }, { name: "asc" }],
    take: 1500,
  });

  const studentIds = students.map((student) => student.id);
  const recordWhere = { schoolId: user.schoolId, studentId: { in: studentIds } };

  const [
    violations,
    achievements,
    coachings,
    permits,
    events,
    followUps,
    classes,
    assignees,
  ] = await Promise.all([
    prisma.studentViolation.findMany({
      where: recordWhere,
      select: {
        id: true,
        studentId: true,
        category: true,
        title: true,
        description: true,
        severity: true,
        points: true,
        incidentAt: true,
        location: true,
        status: true,
        actionTaken: true,
        resolutionNote: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { id: true, name: true } },
            studentProfile: { select: { nis: true, nisn: true } },
          },
        },
        reportedBy: { select: personSelect },
        handledBy: { select: personSelect },
      },
      orderBy: [{ status: "asc" }, { incidentAt: "desc" }],
      take: 600,
    }),
    prisma.studentAchievement.findMany({
      where: recordWhere,
      select: {
        id: true,
        studentId: true,
        category: true,
        title: true,
        level: true,
        award: true,
        organizer: true,
        achievementDate: true,
        notes: true,
        evidenceUrl: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { id: true, name: true } },
            studentProfile: { select: { nis: true, nisn: true } },
          },
        },
        recordedBy: { select: personSelect },
      },
      orderBy: { achievementDate: "desc" },
      take: 600,
    }),
    prisma.studentCoaching.findMany({
      where: recordWhere,
      select: {
        id: true,
        studentId: true,
        type: true,
        topic: true,
        summary: true,
        attendees: true,
        agreement: true,
        nextAction: true,
        nextReviewAt: true,
        status: true,
        completedAt: true,
        resolutionNote: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { id: true, name: true } },
            studentProfile: { select: { nis: true, nisn: true } },
          },
        },
        recordedBy: { select: personSelect },
        assignedTo: { select: personSelect },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 600,
    }),
    prisma.studentPermit.findMany({
      where: recordWhere,
      select: {
        id: true,
        studentId: true,
        type: true,
        reason: true,
        destination: true,
        startAt: true,
        endAt: true,
        status: true,
        approvalNote: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { id: true, name: true } },
            studentProfile: { select: { nis: true, nisn: true } },
          },
        },
        recordedBy: { select: personSelect },
        approvedBy: { select: personSelect },
      },
      orderBy: [{ status: "asc" }, { startAt: "desc" }],
      take: 600,
    }),
    prisma.studentAffairsEvent.findMany({
      where: { schoolId: user.schoolId, studentId: { in: studentIds } },
      select: {
        id: true,
        studentId: true,
        entityType: true,
        entityId: true,
        type: true,
        note: true,
        metadata: true,
        createdAt: true,
        actor: { select: personSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.schoolFollowUpCase.findMany({
      where: {
        schoolId: user.schoolId,
        sourceType: "STUDENT_AFFAIRS",
        subjectStudentId: { in: studentIds },
      },
      select: {
        id: true,
        sourceKey: true,
        status: true,
        severity: true,
        assignedToId: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    }),
    prisma.classRoom.findMany({
      where: access.canManageAll
        ? { schoolId: user.schoolId, academicYear: { isActive: true } }
        : { id: { in: access.homeroomClassIds } },
      select: {
        id: true,
        name: true,
        homeroomTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    access.canManageAll
      ? prisma.user.findMany({
          where: {
            schoolId: user.schoolId,
            role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
          },
          select: personSelect,
          orderBy: { name: "asc" },
        })
      : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  const followUpMap = new Map(followUps.map((item) => [item.sourceKey, item]));
  const now = new Date();
  const openViolations = violations.filter(
    (item) => item.status === "RECORDED" || item.status === "IN_REVIEW",
  ).length;
  const openCoachings = coachings.filter(
    (item) => item.status === "OPEN" || item.status === "IN_PROGRESS",
  ).length;
  const activePermits = permits.filter(
    (item) =>
      item.status === "APPROVED" &&
      item.startAt <= now &&
      (!item.endAt || item.endAt >= now),
  ).length;
  const overduePermits = permits.filter(
    (item) =>
      item.status === "APPROVED" &&
      !!item.endAt &&
      item.endAt < now &&
      !item.returnedAt,
  ).length;

  return {
    access: {
      scope: access.scope,
      canManageAll: access.canManageAll,
      userId: user.id,
    },
    stats: {
      studentCount: students.length,
      openViolations,
      openCoachings,
      activePermits,
      overduePermits,
      achievementCount: achievements.length,
      followUpActive: followUps.filter(
        (item) => item.status !== "RESOLVED" && item.status !== "CANCELED",
      ).length,
    },
    students,
    classes,
    assignees,
    violations: violations.map((item) => ({
      ...item,
      followUp: followUpMap.get("violation:" + item.id) || null,
    })),
    achievements,
    coachings: coachings.map((item) => ({
      ...item,
      followUp: followUpMap.get("coaching:" + item.id) || null,
    })),
    permits,
    events,
  };
};

const violationCreateSchema = z.object({
  studentId: z.string().uuid(),
  category: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(4).max(4000),
  severity: z.enum(FOLLOW_UP_SEVERITIES).default("MEDIUM"),
  points: z.coerce.number().int().min(0).max(10000).default(0),
  incidentAt: z.coerce.date(),
  location: z.string().trim().max(180).optional().nullable(),
  handledById: z.string().uuid().optional().nullable(),
  createFollowUp: z.boolean().optional(),
});

export const createStudentViolation = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(violationCreateSchema, rawArgs);
  const student = await assertStudentAffairsStudent(user, access, args.studentId);

  const requestedHandler = access.canManageAll
    ? await validateStaffAssignee(user.schoolId, args.handledById)
    : user.id;
  const fallbackOwner = await kesiswaanOwner(user.schoolId);
  const handledById =
    requestedHandler || student.classRoom?.homeroomTeacherId || fallbackOwner;
  const status = handledById ? "IN_REVIEW" : "RECORDED";
  const wantsFollowUp =
    args.createFollowUp ?? shouldAutoCreateViolationFollowUp(args.severity);

  return prisma.$transaction(async (tx) => {
    const created = await tx.studentViolation.create({
      data: {
        schoolId: user.schoolId,
        studentId: student.id,
        category: args.category,
        title: args.title,
        description: args.description,
        severity: args.severity,
        points: args.points,
        incidentAt: args.incidentAt,
        location: args.location || null,
        status,
        reportedById: user.id,
        handledById,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: student.id,
      entityType: "VIOLATION",
      entityId: created.id,
      type: "CREATED",
      actorId: user.id,
      note: "Pelanggaran dicatat.",
      metadata: {
        severity: args.severity,
        points: args.points,
        handledById,
      },
    });

    if (wantsFollowUp) {
      await ensureStudentAffairsFollowUp(tx, {
        schoolId: user.schoolId,
        actorId: user.id,
        studentId: student.id,
        sourceKey: "violation:" + created.id,
        sourceUrl: "/school/student-affairs?tab=VIOLATIONS&record=" + created.id,
        title: "Kesiswaan · " + args.title,
        description:
          (student.name || "Siswa") +
          (student.classRoom?.name ? " · " + student.classRoom.name : "") +
          ". " +
          args.description,
        severity: args.severity,
        assignedToId: handledById,
        note: "Tindak lanjut dibuat dari catatan pelanggaran Kesiswaan.",
      });
    }

    return created;
  });
};

const violationUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(VIOLATION_STATUSES).optional(),
  severity: z.enum(FOLLOW_UP_SEVERITIES).optional(),
  points: z.coerce.number().int().min(0).max(10000).optional(),
  handledById: z.string().uuid().optional().nullable(),
  actionTaken: z.string().trim().max(4000).optional().nullable(),
  resolutionNote: z.string().trim().max(4000).optional().nullable(),
  createFollowUp: z.boolean().optional(),
});

export const updateStudentViolation = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(violationUpdateSchema, rawArgs);

  const current = await prisma.studentViolation.findFirst({
    where: {
      id: args.id,
      schoolId: user.schoolId,
      student: studentAffairsStudentWhere(user, access),
    },
    select: {
      id: true,
      studentId: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      handledById: true,
      student: {
        select: {
          name: true,
          classRoom: { select: { name: true, homeroomTeacherId: true } },
        },
      },
    },
  });
  if (!current) throw new HttpError(404, "Catatan pelanggaran tidak ditemukan.");

  const nextStatus = args.status || current.status;
  if (args.status && args.status !== current.status) {
    const allowed = nextViolationStatuses(current.status as ViolationStatusCode);
    if (!allowed.includes(args.status)) {
      throw new HttpError(400, "Perubahan status pelanggaran tidak sesuai alur.");
    }
  }
  if (nextStatus === "RESOLVED" && !args.resolutionNote?.trim()) {
    throw new HttpError(400, "Catatan penyelesaian wajib diisi.");
  }

  const handledById =
    args.handledById === undefined
      ? current.handledById
      : access.canManageAll
        ? await validateStaffAssignee(user.schoolId, args.handledById)
        : user.id;
  const nextSeverity = args.severity || current.severity;
  const wantsFollowUp =
    args.createFollowUp === true ||
    shouldAutoCreateViolationFollowUp(nextSeverity);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.studentViolation.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        severity: args.severity || undefined,
        points: args.points === undefined ? undefined : args.points,
        handledById:
          args.handledById === undefined ? undefined : handledById,
        actionTaken:
          args.actionTaken === undefined ? undefined : args.actionTaken || null,
        resolutionNote:
          args.resolutionNote === undefined
            ? undefined
            : args.resolutionNote || null,
        resolvedAt:
          nextStatus === "RESOLVED"
            ? new Date()
            : nextStatus === "IN_REVIEW"
              ? null
              : undefined,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: current.studentId,
      entityType: "VIOLATION",
      entityId: current.id,
      type:
        nextStatus !== current.status ? "STATUS_CHANGED" : "UPDATED",
      actorId: user.id,
      note:
        args.resolutionNote ||
        args.actionTaken ||
        (nextStatus !== current.status
          ? "Status pelanggaran diperbarui."
          : "Catatan pelanggaran diperbarui."),
      metadata: {
        fromStatus: current.status,
        toStatus: nextStatus,
        severity: nextSeverity,
        handledById,
      },
    });

    if (wantsFollowUp) {
      await ensureStudentAffairsFollowUp(tx, {
        schoolId: user.schoolId,
        actorId: user.id,
        studentId: current.studentId,
        sourceKey: "violation:" + current.id,
        sourceUrl: "/school/student-affairs?tab=VIOLATIONS&record=" + current.id,
        title: "Kesiswaan · " + current.title,
        description:
          (current.student.name || "Siswa") +
          (current.student.classRoom?.name
            ? " · " + current.student.classRoom.name
            : "") +
          ". " +
          current.description,
        severity: nextSeverity,
        assignedToId:
          handledById ||
          current.student.classRoom?.homeroomTeacherId ||
          (await kesiswaanOwner(user.schoolId)),
        note: "Tindak lanjut dibuat dari catatan pelanggaran Kesiswaan.",
      });
    }

    const desiredFollowStatus =
      nextStatus === "RESOLVED"
        ? "RESOLVED"
        : nextStatus === "CANCELED"
          ? "CANCELED"
          : nextStatus === "IN_REVIEW"
            ? "IN_PROGRESS"
            : handledById
              ? "ASSIGNED"
              : "FINDING";

    await syncFollowUpState(tx, {
      schoolId: user.schoolId,
      actorId: user.id,
      sourceKey: "violation:" + current.id,
      desiredStatus: desiredFollowStatus,
      assignedToId: handledById,
      severity: nextSeverity,
      resolutionNote: args.resolutionNote,
    });

    return updated;
  });
};

const achievementSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  category: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(180),
  level: z.enum(ACHIEVEMENT_LEVELS),
  award: z.string().trim().max(180).optional().nullable(),
  organizer: z.string().trim().max(180).optional().nullable(),
  achievementDate: z.coerce.date(),
  notes: z.string().trim().max(3000).optional().nullable(),
  evidenceUrl: z.string().trim().url("URL bukti tidak valid").optional().nullable().or(z.literal("")),
});

export const saveStudentAchievement = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(achievementSchema, rawArgs);
  const student = await assertStudentAffairsStudent(user, access, args.studentId);

  if (args.id) {
    const existing = await prisma.studentAchievement.findFirst({
      where: {
        id: args.id,
        schoolId: user.schoolId,
        studentId: student.id,
      },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Catatan prestasi tidak ditemukan.");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.studentAchievement.update({
        where: { id: existing.id },
        data: {
          category: args.category,
          title: args.title,
          level: args.level,
          award: args.award || null,
          organizer: args.organizer || null,
          achievementDate: args.achievementDate,
          notes: args.notes || null,
          evidenceUrl: args.evidenceUrl || null,
        },
        select: { id: true },
      });
      await createStudentAffairsEvent(tx, {
        schoolId: user.schoolId,
        studentId: student.id,
        entityType: "ACHIEVEMENT",
        entityId: existing.id,
        type: "UPDATED",
        actorId: user.id,
        note: "Catatan prestasi diperbarui.",
      });
      return updated;
    });
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.studentAchievement.create({
      data: {
        schoolId: user.schoolId,
        studentId: student.id,
        category: args.category,
        title: args.title,
        level: args.level,
        award: args.award || null,
        organizer: args.organizer || null,
        achievementDate: args.achievementDate,
        notes: args.notes || null,
        evidenceUrl: args.evidenceUrl || null,
        recordedById: user.id,
      },
      select: { id: true },
    });
    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: student.id,
      entityType: "ACHIEVEMENT",
      entityId: created.id,
      type: "CREATED",
      actorId: user.id,
      note: "Prestasi siswa dicatat.",
      metadata: { level: args.level },
    });
    return created;
  });
};

const coachingCreateSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(COACHING_TYPES),
  topic: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(4).max(5000),
  attendees: z.string().trim().max(1000).optional().nullable(),
  agreement: z.string().trim().max(4000).optional().nullable(),
  nextAction: z.string().trim().max(4000).optional().nullable(),
  nextReviewAt: z.coerce.date().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  createFollowUp: z.boolean().default(false),
});

export const createStudentCoaching = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(coachingCreateSchema, rawArgs);
  const student = await assertStudentAffairsStudent(user, access, args.studentId);
  const assignedToId = access.canManageAll
    ? (await validateStaffAssignee(user.schoolId, args.assignedToId)) ||
      student.classRoom?.homeroomTeacherId ||
      (await kesiswaanOwner(user.schoolId))
    : user.id;

  return prisma.$transaction(async (tx) => {
    const created = await tx.studentCoaching.create({
      data: {
        schoolId: user.schoolId,
        studentId: student.id,
        type: args.type,
        topic: args.topic,
        summary: args.summary,
        attendees: args.attendees || null,
        agreement: args.agreement || null,
        nextAction: args.nextAction || null,
        nextReviewAt: args.nextReviewAt || null,
        status: assignedToId ? "IN_PROGRESS" : "OPEN",
        recordedById: user.id,
        assignedToId,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: student.id,
      entityType: "COACHING",
      entityId: created.id,
      type: "CREATED",
      actorId: user.id,
      note:
        args.type === "PARENT_MEETING"
          ? "Pertemuan/pemanggilan orang tua dicatat."
          : "Pembinaan siswa dicatat.",
      metadata: { type: args.type, assignedToId },
    });

    if (args.createFollowUp) {
      await ensureStudentAffairsFollowUp(tx, {
        schoolId: user.schoolId,
        actorId: user.id,
        studentId: student.id,
        sourceKey: "coaching:" + created.id,
        sourceUrl: "/school/student-affairs?tab=COACHING&record=" + created.id,
        title: "Pembinaan · " + args.topic,
        description:
          (student.name || "Siswa") +
          (student.classRoom?.name ? " · " + student.classRoom.name : "") +
          ". " +
          (args.nextAction || args.summary),
        severity: "MEDIUM",
        assignedToId,
        note: "Tindak lanjut dibuat dari pembinaan Kesiswaan.",
      });
    }

    return created;
  });
};

const coachingUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(COACHING_STATUSES).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  agreement: z.string().trim().max(4000).optional().nullable(),
  nextAction: z.string().trim().max(4000).optional().nullable(),
  nextReviewAt: z.coerce.date().optional().nullable(),
  resolutionNote: z.string().trim().max(4000).optional().nullable(),
  createFollowUp: z.boolean().optional(),
});

export const updateStudentCoaching = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(coachingUpdateSchema, rawArgs);

  const current = await prisma.studentCoaching.findFirst({
    where: {
      id: args.id,
      schoolId: user.schoolId,
      student: studentAffairsStudentWhere(user, access),
    },
    select: {
      id: true,
      studentId: true,
      topic: true,
      summary: true,
      status: true,
      assignedToId: true,
      student: {
        select: {
          name: true,
          classRoom: { select: { name: true, homeroomTeacherId: true } },
        },
      },
    },
  });
  if (!current) throw new HttpError(404, "Catatan pembinaan tidak ditemukan.");

  const nextStatus = args.status || current.status;
  if (args.status && args.status !== current.status) {
    const allowed = nextCoachingStatuses(current.status as CoachingStatusCode);
    if (!allowed.includes(args.status)) {
      throw new HttpError(400, "Perubahan status pembinaan tidak sesuai alur.");
    }
  }
  if (nextStatus === "COMPLETED" && !args.resolutionNote?.trim()) {
    throw new HttpError(400, "Catatan penyelesaian wajib diisi.");
  }

  const assignedToId =
    args.assignedToId === undefined
      ? current.assignedToId
      : access.canManageAll
        ? await validateStaffAssignee(user.schoolId, args.assignedToId)
        : user.id;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.studentCoaching.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        assignedToId:
          args.assignedToId === undefined ? undefined : assignedToId,
        agreement:
          args.agreement === undefined ? undefined : args.agreement || null,
        nextAction:
          args.nextAction === undefined ? undefined : args.nextAction || null,
        nextReviewAt:
          args.nextReviewAt === undefined ? undefined : args.nextReviewAt,
        resolutionNote:
          args.resolutionNote === undefined
            ? undefined
            : args.resolutionNote || null,
        completedAt:
          nextStatus === "COMPLETED"
            ? new Date()
            : nextStatus === "IN_PROGRESS"
              ? null
              : undefined,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: current.studentId,
      entityType: "COACHING",
      entityId: current.id,
      type:
        nextStatus !== current.status ? "STATUS_CHANGED" : "UPDATED",
      actorId: user.id,
      note:
        args.resolutionNote ||
        args.nextAction ||
        (nextStatus !== current.status
          ? "Status pembinaan diperbarui."
          : "Catatan pembinaan diperbarui."),
      metadata: {
        fromStatus: current.status,
        toStatus: nextStatus,
        assignedToId,
      },
    });

    if (args.createFollowUp === true) {
      await ensureStudentAffairsFollowUp(tx, {
        schoolId: user.schoolId,
        actorId: user.id,
        studentId: current.studentId,
        sourceKey: "coaching:" + current.id,
        sourceUrl: "/school/student-affairs?tab=COACHING&record=" + current.id,
        title: "Pembinaan · " + current.topic,
        description:
          (current.student.name || "Siswa") +
          (current.student.classRoom?.name
            ? " · " + current.student.classRoom.name
            : "") +
          ". " +
          (args.nextAction || current.summary),
        severity: "MEDIUM",
        assignedToId:
          assignedToId ||
          current.student.classRoom?.homeroomTeacherId ||
          (await kesiswaanOwner(user.schoolId)),
        note: "Tindak lanjut dibuat dari pembinaan Kesiswaan.",
      });
    }

    const desiredFollowStatus =
      nextStatus === "COMPLETED"
        ? "RESOLVED"
        : nextStatus === "CANCELED"
          ? "CANCELED"
          : nextStatus === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : assignedToId
              ? "ASSIGNED"
              : "FINDING";

    await syncFollowUpState(tx, {
      schoolId: user.schoolId,
      actorId: user.id,
      sourceKey: "coaching:" + current.id,
      desiredStatus: desiredFollowStatus,
      assignedToId,
      resolutionNote: args.resolutionNote,
    });

    return updated;
  });
};

const permitCreateSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(PERMIT_TYPES),
  reason: z.string().trim().min(3).max(3000),
  destination: z.string().trim().max(240).optional().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  approveImmediately: z.boolean().default(false),
  approvalNote: z.string().trim().max(2000).optional().nullable(),
});

export const createStudentPermit = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(permitCreateSchema, rawArgs);
  const student = await assertStudentAffairsStudent(user, access, args.studentId);
  if (args.endAt && args.endAt < args.startAt) {
    throw new HttpError(400, "Waktu selesai izin tidak boleh sebelum waktu mulai.");
  }

  const status = args.approveImmediately ? "APPROVED" : "REQUESTED";

  return prisma.$transaction(async (tx) => {
    const created = await tx.studentPermit.create({
      data: {
        schoolId: user.schoolId,
        studentId: student.id,
        type: args.type,
        reason: args.reason,
        destination: args.destination || null,
        startAt: args.startAt,
        endAt: args.endAt || null,
        status,
        recordedById: user.id,
        approvedById: args.approveImmediately ? user.id : null,
        approvalNote: args.approvalNote || null,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: student.id,
      entityType: "PERMIT",
      entityId: created.id,
      type: "CREATED",
      actorId: user.id,
      note:
        status === "APPROVED"
          ? "Izin/dispensasi dicatat dan disetujui."
          : "Pengajuan izin/dispensasi dicatat.",
      metadata: { type: args.type, status },
    });
    return created;
  });
};

const permitUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PERMIT_STATUSES),
  approvalNote: z.string().trim().max(2000).optional().nullable(),
});

export const updateStudentPermit = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const { user, access } = await requireStudentAffairsAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(permitUpdateSchema, rawArgs);

  const current = await prisma.studentPermit.findFirst({
    where: {
      id: args.id,
      schoolId: user.schoolId,
      student: studentAffairsStudentWhere(user, access),
    },
    select: {
      id: true,
      studentId: true,
      status: true,
    },
  });
  if (!current) throw new HttpError(404, "Izin/dispensasi tidak ditemukan.");

  if (args.status !== current.status) {
    const allowed = nextPermitStatuses(current.status as PermitStatusCode);
    if (!allowed.includes(args.status)) {
      throw new HttpError(400, "Perubahan status izin tidak sesuai alur.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.studentPermit.update({
      where: { id: current.id },
      data: {
        status: args.status,
        approvalNote:
          args.approvalNote === undefined ? undefined : args.approvalNote || null,
        approvedById:
          args.status === "APPROVED" || args.status === "REJECTED"
            ? user.id
            : undefined,
        returnedAt:
          args.status === "RETURNED"
            ? new Date()
            : args.status === "APPROVED"
              ? null
              : undefined,
      },
      select: { id: true, status: true },
    });

    await createStudentAffairsEvent(tx, {
      schoolId: user.schoolId,
      studentId: current.studentId,
      entityType: "PERMIT",
      entityId: current.id,
      type: "STATUS_CHANGED",
      actorId: user.id,
      note: args.approvalNote || "Status izin/dispensasi diperbarui.",
      metadata: {
        fromStatus: current.status,
        toStatus: args.status,
      },
    });
    return updated;
  });
};
