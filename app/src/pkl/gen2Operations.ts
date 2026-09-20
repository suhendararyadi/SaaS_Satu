import { createHash } from "node:crypto";
import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  requireAnySchoolCapability,
  requirePklAccess,
  requireSchoolAdmin,
  requireStudent,
} from "../school/authGuards";
import { parseCsv } from "../school/import/csvParser";
import { ensureFileUploadConfigured, isFileUploadConfigured } from "../file-upload/config";
import { checkFileExistsInS3, getDownloadFileSignedURLFromS3, getUploadFileSignedURLFromS3 } from "../file-upload/s3Utils";
import {
  evaluatePlacementReadiness,
  getScheduleStatus,
  isWorkingDay,
  normalizeTime,
  normalizedImportValue,
  PKL_ATTENDANCE_STATUSES,
  PKL_IMPORT_KINDS,
  resolveJournalOverallStatus,
  toCsv,
} from "./gen2Policy";

function jakartaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const dateOnly = `${get("year")}-${get("month")}-${get("day")}`;
  const localTime = `${get("hour")}:${get("minute")}`;
  const weekday = get("weekday");
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dateOnly, localTime, day: dayMap[weekday] ?? date.getUTCDay() };
}

function parseDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new HttpError(400, `${label} tidak valid.`);
  return date;
}

function isDateWithin(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function openPlacementWhere() {
  return { in: ["PLANNED", "ACTIVE"] };
}

function placementSnapshot(placement: any) {
  return {
    id: placement.id,
    studentId: placement.studentId,
    companyId: placement.companyId,
    pklPeriodId: placement.pklPeriodId,
    departmentId: placement.departmentId,
    teacherSupervisorId: placement.teacherSupervisorId,
    dudiMentorId: placement.dudiMentorId,
    startDate: placement.startDate,
    endDate: placement.endDate,
    status: placement.status,
    notes: placement.notes,
  };
}

async function createPlacementEvent(args: {
  schoolId: string;
  placementId: string;
  eventType: string;
  actorId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}, tx: any = prisma) {
  return tx.pklPlacementEvent.create({
    data: {
      schoolId: args.schoolId,
      placementId: args.placementId,
      eventType: args.eventType,
      actorId: args.actorId ?? null,
      reason: args.reason?.trim() || null,
      snapshotBefore: args.before as any,
      snapshotAfter: args.after as any,
    },
  });
}

async function getStudentForPlacement(schoolId: string, studentId: string) {
  const student = await prisma.user.findFirst({
    where: { id: studentId, schoolId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      classRoomId: true,
      classRoom: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          department: { select: { id: true, code: true, name: true } },
        },
      },
      studentProfile: { select: { nis: true, nisn: true, status: true } },
    },
  });
  if (!student) throw new HttpError(404, "Siswa tidak ditemukan di sekolah aktif.");
  if (!student.classRoom?.departmentId) {
    throw new HttpError(400, `Siswa ${student.name || "terpilih"} belum memiliki konsentrasi keahlian melalui rombel.`);
  }
  return student;
}

async function getPeriodOrThrow(schoolId: string, periodId: string) {
  const period = await prisma.pklPeriod.findFirst({
    where: { id: periodId, schoolId },
  });
  if (!period) throw new HttpError(404, "Periode PKL tidak ditemukan.");
  return period;
}

async function getCompanyForPlacement(schoolId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, schoolId },
    include: {
      departmentLinks: { where: { isActive: true } },
    },
  });
  if (!company) throw new HttpError(404, "Mitra DUDI tidak ditemukan.");
  return company;
}

async function ensureTeacher(schoolId: string, teacherId?: string | null) {
  if (!teacherId) return null;
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
    select: { id: true, name: true },
  });
  if (!teacher) throw new HttpError(404, "Guru pembimbing tidak ditemukan di sekolah aktif.");
  return teacher;
}

async function ensureMentor(schoolId: string, companyId: string, mentorId?: string | null) {
  if (!mentorId) return null;
  const mentor = await prisma.user.findFirst({
    where: {
      id: mentorId,
      schoolId,
      role: "DUDI_MENTOR",
      dudiMentorProfile: { companyId, isActive: true },
    },
    select: { id: true, name: true },
  });
  if (!mentor) {
    throw new HttpError(404, "Pembimbing DUDI tidak aktif atau tidak terhubung ke mitra yang dipilih.");
  }
  return mentor;
}

async function getCapacityState(args: {
  schoolId: string;
  periodId: string;
  companyId: string;
  departmentId: string;
  excludePlacementId?: string;
}) {
  const capacity = await prisma.pklCompanyCapacity.findFirst({
    where: {
      schoolId: args.schoolId,
      periodId: args.periodId,
      companyId: args.companyId,
      departmentId: args.departmentId,
    },
  });
  const used = await prisma.placement.count({
    where: {
      schoolId: args.schoolId,
      pklPeriodId: args.periodId,
      companyId: args.companyId,
      departmentId: args.departmentId,
      status: openPlacementWhere(),
      ...(args.excludePlacementId ? { NOT: { id: args.excludePlacementId } } : {}),
    },
  });
  return {
    capacity,
    used,
    remaining: capacity ? Math.max(0, capacity.quota - used) : null,
  };
}

async function computePlacementReadiness(schoolId: string, placementId: string) {
  const placement = await prisma.placement.findFirst({
    where: { id: placementId, schoolId },
    include: {
      pklPeriod: true,
      company: {
        include: {
          departmentLinks: { where: { isActive: true } },
        },
      },
      department: true,
      teacherSupervisor: { select: { id: true, name: true } },
      dudiMentor: {
        select: {
          id: true,
          name: true,
          dudiMentorProfile: { select: { companyId: true, isActive: true } },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          classRoom: { select: { name: true, departmentId: true } },
        },
      },
    },
  });
  if (!placement) throw new HttpError(404, "Penempatan PKL tidak ditemukan.");

  const departmentId = placement.departmentId || placement.student.classRoom?.departmentId || null;
  const period = placement.pklPeriod;
  const acceptsDepartment = !!departmentId && placement.company.departmentLinks.some(
    (link) => link.departmentId === departmentId,
  );
  const capacityState = period && departmentId
    ? await getCapacityState({
        schoolId,
        periodId: period.id,
        companyId: placement.companyId,
        departmentId,
        excludePlacementId: placement.id,
      })
    : { capacity: null, used: 0, remaining: null };

  const datesInsidePeriod = !!period
    && placement.startDate >= period.startDate
    && placement.endDate <= period.endDate
    && placement.startDate < placement.endDate;

  const mentorMatchesCompany = !!placement.dudiMentorId
    && placement.dudiMentor?.dudiMentorProfile?.isActive === true
    && placement.dudiMentor?.dudiMentorProfile?.companyId === placement.companyId;

  const result = evaluatePlacementReadiness({
    hasPeriod: !!period,
    periodActive: period?.isActive === true,
    dateInsidePeriod: datesInsidePeriod,
    companyActive: placement.company.isActive,
    companyPartnershipActive: placement.company.partnershipStatus === "ACTIVE",
    acceptsDepartment,
    capacityConfigured: !!capacityState.capacity,
    capacityRemaining: capacityState.remaining,
    hasTeacher: !!placement.teacherSupervisorId,
    hasMentor: mentorMatchesCompany,
    hasGps: placement.company.latitude != null && placement.company.longitude != null,
  });

  return {
    ...result,
    placement: {
      id: placement.id,
      status: placement.status,
      student: placement.student,
      company: { id: placement.company.id, name: placement.company.name },
      department: placement.department,
      period: period ? { id: period.id, name: period.name, startDate: period.startDate, endDate: period.endDate } : null,
      teacherSupervisor: placement.teacherSupervisor,
      dudiMentor: placement.dudiMentor ? { id: placement.dudiMentor.id, name: placement.dudiMentor.name } : null,
      startDate: placement.startDate,
      endDate: placement.endDate,
    },
    capacity: capacityState.capacity
      ? { quota: capacityState.capacity.quota, usedByOthers: capacityState.used, availableForPlacement: capacityState.remaining }
      : null,
  };
}

// ==========================================
// Placement Gen2 workspace / bulk / readiness
// ==========================================

const workspaceSchema = z.object({
  periodId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
}).optional();

export const getPlacementWorkspace = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(workspaceSchema || z.any(), rawArgs || {});

  const [periods, departments, companies, teachers, mentors, students, placements] = await Promise.all([
    prisma.pklPeriod.findMany({
      where: { schoolId: admin.schoolId },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    }),
    prisma.department.findMany({
      where: { schoolId: admin.schoolId },
      orderBy: { code: "asc" },
    }),
    prisma.company.findMany({
      where: { schoolId: admin.schoolId, isActive: true },
      include: {
        departmentLinks: {
          where: { isActive: true },
          include: { department: { select: { id: true, code: true, name: true } } },
        },
        pklCapacities: {
          where: args?.periodId ? { periodId: args.periodId } : undefined,
          include: { department: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId: admin.schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
      select: { id: true, name: true, teacherProfile: { select: { nip: true, jobTitle: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.dudiMentorProfile.findMany({
      where: { schoolId: admin.schoolId, isActive: true },
      include: { user: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.user.findMany({
      where: {
        schoolId: admin.schoolId,
        role: "STUDENT",
        ...(args?.departmentId ? { classRoom: { departmentId: args.departmentId } } : {}),
      },
      select: {
        id: true,
        name: true,
        classRoom: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
        studentProfile: { select: { nis: true, nisn: true, status: true } },
        studentPlacements: {
          where: { status: openPlacementWhere() },
          select: { id: true, status: true, pklPeriodId: true, companyId: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.placement.findMany({
      where: {
        schoolId: admin.schoolId,
        ...(args?.periodId ? { pklPeriodId: args.periodId } : {}),
        ...(args?.departmentId ? { departmentId: args.departmentId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentProfile: { select: { nis: true, nisn: true } },
            classRoom: { select: { name: true, department: { select: { id: true, code: true, name: true } } } },
          },
        },
        company: { select: { id: true, name: true, code: true } },
        pklPeriod: { select: { id: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        teacherSupervisor: { select: { id: true, name: true } },
        dudiMentor: { select: { id: true, name: true } },
        _count: { select: { attendances: true, journals: true, events: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    }),
  ]);

  const capacityUsage = await prisma.placement.groupBy({
    by: ["pklPeriodId", "companyId", "departmentId"],
    where: {
      schoolId: admin.schoolId,
      status: openPlacementWhere(),
      pklPeriodId: { not: null },
      departmentId: { not: null },
      ...(args?.periodId ? { pklPeriodId: args.periodId } : {}),
    },
    _count: { _all: true },
  });
  const usageKey = (periodId: string | null, companyId: string, departmentId: string | null) =>
    `${periodId || ""}:${companyId}:${departmentId || ""}`;
  const usage = new Map(capacityUsage.map((row) => [
    usageKey(row.pklPeriodId, row.companyId, row.departmentId),
    row._count._all,
  ]));

  return {
    periods,
    departments,
    teachers,
    mentors,
    students,
    placements,
    companies: companies.map((company) => ({
      ...company,
      pklCapacities: company.pklCapacities.map((capacity) => {
        const used = usage.get(usageKey(capacity.periodId, company.id, capacity.departmentId)) || 0;
        return { ...capacity, used, remaining: Math.max(0, capacity.quota - used) };
      }),
    })),
  };
};

const bulkPlacementSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(200),
  periodId: z.string().uuid(),
  companyId: z.string().uuid(),
  teacherSupervisorId: z.string().uuid().optional().nullable(),
  dudiMentorId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
});

export const createPlacementsBulk = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(bulkPlacementSchema, rawArgs);
  const uniqueStudentIds = [...new Set(args.studentIds)];
  const [period, company] = await Promise.all([
    getPeriodOrThrow(admin.schoolId, args.periodId),
    getCompanyForPlacement(admin.schoolId, args.companyId),
  ]);
  await Promise.all([
    ensureTeacher(admin.schoolId, args.teacherSupervisorId),
    ensureMentor(admin.schoolId, args.companyId, args.dudiMentorId),
  ]);

  if (!period.isActive) throw new HttpError(400, "Periode PKL belum aktif.");
  if (!company.isActive || company.partnershipStatus !== "ACTIVE") {
    throw new HttpError(400, "Mitra DUDI tidak aktif untuk penempatan.");
  }

  const startDate = args.startDate ? parseDate(args.startDate, "Tanggal mulai") : period.startDate;
  const endDate = args.endDate ? parseDate(args.endDate, "Tanggal selesai") : period.endDate;
  if (startDate < period.startDate || endDate > period.endDate || startDate >= endDate) {
    throw new HttpError(400, "Tanggal penempatan harus berada di dalam rentang Periode PKL.");
  }

  const students = await Promise.all(uniqueStudentIds.map((id) => getStudentForPlacement(admin.schoolId, id)));
  const existing = await prisma.placement.findMany({
    where: { schoolId: admin.schoolId, studentId: { in: uniqueStudentIds }, status: openPlacementWhere() },
    select: { studentId: true, status: true },
  });
  if (existing.length) {
    const names = students.filter((student) => existing.some((row) => row.studentId === student.id)).map((student) => student.name).filter(Boolean);
    throw new HttpError(400, `Siswa berikut sudah memiliki penempatan terbuka: ${names.join(", ")}.`);
  }

  const grouped = new Map<string, number>();
  for (const student of students) {
    const departmentId = student.classRoom!.departmentId!;
    if (!company.departmentLinks.some((link) => link.departmentId === departmentId)) {
      throw new HttpError(400, `Mitra ${company.name} tidak menerima konsentrasi ${student.classRoom?.department?.code || student.classRoom?.department?.name || ""}.`);
    }
    grouped.set(departmentId, (grouped.get(departmentId) || 0) + 1);
  }

  for (const [departmentId, requested] of grouped) {
    const state = await getCapacityState({
      schoolId: admin.schoolId,
      periodId: period.id,
      companyId: company.id,
      departmentId,
    });
    if (!state.capacity) throw new HttpError(400, "Kapasitas DUDI untuk periode dan konsentrasi siswa belum dikonfigurasi.");
    if ((state.remaining || 0) < requested) {
      throw new HttpError(400, `Kuota tidak cukup. Dibutuhkan ${requested}, tersisa ${state.remaining || 0}.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const created: any[] = [];
    for (const student of students) {
      const placement = await tx.placement.create({
        data: {
          schoolId: admin.schoolId,
          studentId: student.id,
          companyId: company.id,
          pklPeriodId: period.id,
          departmentId: student.classRoom!.departmentId!,
          teacherSupervisorId: args.teacherSupervisorId || null,
          dudiMentorId: args.dudiMentorId || null,
          startDate,
          endDate,
          status: "PLANNED",
          notes: args.notes?.trim() || null,
          source: "MANUAL",
        },
      });
      await createPlacementEvent({
        schoolId: admin.schoolId,
        placementId: placement.id,
        eventType: "CREATED",
        actorId: admin.id,
        after: placementSnapshot(placement),
      }, tx);
      created.push(placement);
    }
    return { count: created.length, placements: created };
  });
};

const readinessSchema = z.object({ id: z.string().uuid() });

export const getPlacementReadiness = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(readinessSchema, rawArgs);
  const placement = await prisma.placement.findFirst({
    where: {
      id,
      schoolId: user.schoolId,
      ...(!user.isAdmin && user.role === "STUDENT" ? { studentId: user.id } : {}),
      ...(!user.isAdmin && user.role === "TEACHER" ? { teacherSupervisorId: user.id } : {}),
      ...(!user.isAdmin && user.role === "DUDI_MENTOR" ? { dudiMentorId: user.id } : {}),
    },
    select: { id: true },
  });
  if (!placement) throw new HttpError(404, "Penempatan tidak ditemukan atau tidak dapat diakses.");
  return computePlacementReadiness(user.schoolId, id);
};

export const activatePlacement = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(readinessSchema, rawArgs);
  const readiness = await computePlacementReadiness(admin.schoolId, id);
  if (!readiness.ready) {
    throw new HttpError(400, "Penempatan belum siap diaktifkan: " + readiness.blockers.map((item) => item.detail).join(" "));
  }
  const current = await prisma.placement.findFirst({ where: { id, schoolId: admin.schoolId } });
  if (!current) throw new HttpError(404, "Penempatan tidak ditemukan.");
  if (current.status === "ACTIVE") return current;
  if (current.status !== "PLANNED") throw new HttpError(400, "Hanya penempatan berstatus PLANNED yang dapat diaktifkan.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.placement.update({
      where: { id },
      data: { status: "ACTIVE", readinessCheckedAt: new Date(), activatedAt: new Date() },
    });
    await createPlacementEvent({
      schoolId: admin.schoolId,
      placementId: id,
      eventType: "ACTIVATED",
      actorId: admin.id,
      before: placementSnapshot(current),
      after: placementSnapshot(updated),
    }, tx);
    return updated;
  });
};

const updateGen2Schema = z.object({
  id: z.string().uuid(),
  teacherSupervisorId: z.string().uuid().optional().nullable(),
  dudiMentorId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(3000).optional().nullable(),
});

export const updatePlacementGen2 = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateGen2Schema, rawArgs);
  const current = await prisma.placement.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
  });
  if (!current) throw new HttpError(404, "Penempatan tidak ditemukan.");

  await ensureTeacher(admin.schoolId, args.teacherSupervisorId);
  await ensureMentor(admin.schoolId, current.companyId, args.dudiMentorId);

  const startDate = args.startDate ? parseDate(args.startDate, "Tanggal mulai") : current.startDate;
  const endDate = args.endDate ? parseDate(args.endDate, "Tanggal selesai") : current.endDate;
  if (startDate >= endDate) throw new HttpError(400, "Tanggal mulai harus lebih awal daripada tanggal selesai.");
  if (current.pklPeriodId) {
    const period = await getPeriodOrThrow(admin.schoolId, current.pklPeriodId);
    if (startDate < period.startDate || endDate > period.endDate) {
      throw new HttpError(400, "Tanggal penempatan harus berada di dalam Periode PKL.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.placement.update({
      where: { id: current.id },
      data: {
        ...(args.teacherSupervisorId !== undefined ? { teacherSupervisorId: args.teacherSupervisorId } : {}),
        ...(args.dudiMentorId !== undefined ? { dudiMentorId: args.dudiMentorId } : {}),
        ...(args.startDate ? { startDate } : {}),
        ...(args.endDate ? { endDate } : {}),
        ...(args.notes !== undefined ? { notes: args.notes?.trim() || null } : {}),
        readinessCheckedAt: null,
      },
    });
    await createPlacementEvent({
      schoolId: admin.schoolId,
      placementId: current.id,
      eventType: "UPDATED",
      actorId: admin.id,
      before: placementSnapshot(current),
      after: placementSnapshot(updated),
    }, tx);
    return updated;
  });
};

const transferSchema = z.object({
  id: z.string().uuid(),
  targetCompanyId: z.string().uuid(),
  targetMentorId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().min(5).max(2000),
});

export const transferPlacement = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(transferSchema, rawArgs);
  const current = await prisma.placement.findFirst({
    where: { id: args.id, schoolId: admin.schoolId, status: { in: ["PLANNED", "ACTIVE"] } },
    include: { student: { select: { classRoom: { select: { departmentId: true } } } } },
  });
  if (!current) throw new HttpError(404, "Penempatan terbuka tidak ditemukan.");
  if (!current.pklPeriodId) throw new HttpError(400, "Penempatan belum memiliki Periode PKL.");
  const departmentId = current.departmentId || current.student.classRoom?.departmentId;
  if (!departmentId) throw new HttpError(400, "Konsentrasi keahlian siswa belum tersedia.");

  const targetCompany = await getCompanyForPlacement(admin.schoolId, args.targetCompanyId);
  if (!targetCompany.isActive || targetCompany.partnershipStatus !== "ACTIVE") {
    throw new HttpError(400, "Mitra tujuan tidak aktif.");
  }
  if (!targetCompany.departmentLinks.some((link) => link.departmentId === departmentId)) {
    throw new HttpError(400, "Mitra tujuan tidak menerima konsentrasi siswa.");
  }
  const capacity = await getCapacityState({
    schoolId: admin.schoolId,
    periodId: current.pklPeriodId,
    companyId: targetCompany.id,
    departmentId,
    excludePlacementId: current.companyId === targetCompany.id ? current.id : undefined,
  });
  if (!capacity.capacity || (capacity.remaining || 0) < 1) throw new HttpError(400, "Kuota mitra tujuan tidak tersedia.");
  await ensureMentor(admin.schoolId, targetCompany.id, args.targetMentorId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.placement.update({
      where: { id: current.id },
      data: {
        companyId: targetCompany.id,
        dudiMentorId: args.targetMentorId || null,
        departmentId,
        readinessCheckedAt: null,
      },
    });
    await createPlacementEvent({
      schoolId: admin.schoolId,
      placementId: current.id,
      eventType: "TRANSFERRED",
      actorId: admin.id,
      reason: args.reason,
      before: placementSnapshot(current),
      after: placementSnapshot(updated),
    }, tx);
    return updated;
  });
};

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["COMPLETED", "CANCELED"]),
  reason: z.string().max(2000).optional().nullable(),
});

export const finalizePlacement = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(statusSchema, rawArgs);
  const current = await prisma.placement.findFirst({ where: { id: args.id, schoolId: admin.schoolId } });
  if (!current) throw new HttpError(404, "Penempatan tidak ditemukan.");
  if (["COMPLETED", "CANCELED"].includes(current.status)) return current;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.placement.update({
      where: { id: current.id },
      data: {
        status: args.status,
        ...(args.status === "COMPLETED" ? { completedAt: new Date() } : { canceledAt: new Date() }),
      },
    });
    await createPlacementEvent({
      schoolId: admin.schoolId,
      placementId: current.id,
      eventType: args.status,
      actorId: admin.id,
      reason: args.reason,
      before: placementSnapshot(current),
      after: placementSnapshot(updated),
    }, tx);
    return updated;
  });
};

export const getPlacementHistory = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(readinessSchema, rawArgs);
  const placement = await prisma.placement.findFirst({
    where: {
      id,
      schoolId: user.schoolId,
      ...(!user.isAdmin && user.role === "STUDENT" ? { studentId: user.id } : {}),
      ...(!user.isAdmin && user.role === "TEACHER" ? { teacherSupervisorId: user.id } : {}),
      ...(!user.isAdmin && user.role === "DUDI_MENTOR" ? { dudiMentorId: user.id } : {}),
    },
    select: { id: true },
  });
  if (!placement) throw new HttpError(404, "Penempatan tidak ditemukan.");
  return prisma.pklPlacementEvent.findMany({
    where: { schoolId: user.schoolId, placementId: id },
    orderBy: { createdAt: "desc" },
  });
};

// ==========================================
// Work schedules
// ==========================================

export const getPklWorkSchedules = async (_args: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  return prisma.pklWorkSchedule.findMany({
    where: { schoolId: admin.schoolId },
    include: {
      period: { select: { id: true, name: true, isActive: true } },
      company: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ period: { startDate: "desc" } }, { company: { name: "asc" } }],
  });
};

const workScheduleSchema = z.object({
  periodId: z.string().uuid(),
  companyId: z.string().uuid(),
  workingDays: z.string().default("1,2,3,4,5"),
  checkInStart: z.string().optional().nullable(),
  lateAfter: z.string().optional().nullable(),
  checkOutStart: z.string().optional().nullable(),
  checkOutEnd: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).optional().nullable(),
});

export const savePklWorkSchedule = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(workScheduleSchema, rawArgs);
  await Promise.all([
    getPeriodOrThrow(admin.schoolId, args.periodId),
    getCompanyForPlacement(admin.schoolId, args.companyId),
  ]);
  const times = {
    checkInStart: args.checkInStart ? normalizeTime(args.checkInStart) : null,
    lateAfter: args.lateAfter ? normalizeTime(args.lateAfter) : null,
    checkOutStart: args.checkOutStart ? normalizeTime(args.checkOutStart) : null,
    checkOutEnd: args.checkOutEnd ? normalizeTime(args.checkOutEnd) : null,
  };
  for (const [key, value] of Object.entries(times)) {
    const original = (args as any)[key];
    if (original && !value) throw new HttpError(400, `Format waktu ${key} harus HH:mm.`);
  }
  return prisma.pklWorkSchedule.upsert({
    where: { periodId_companyId: { periodId: args.periodId, companyId: args.companyId } },
    create: {
      schoolId: admin.schoolId,
      periodId: args.periodId,
      companyId: args.companyId,
      workingDays: args.workingDays,
      ...times,
      isActive: args.isActive,
      notes: args.notes?.trim() || null,
    },
    update: {
      workingDays: args.workingDays,
      ...times,
      isActive: args.isActive,
      notes: args.notes?.trim() || null,
    },
  });
};

export const deletePklWorkSchedule = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(readinessSchema, rawArgs);
  const row = await prisma.pklWorkSchedule.findFirst({ where: { id, schoolId: admin.schoolId } });
  if (!row) throw new HttpError(404, "Jadwal kerja tidak ditemukan.");
  return prisma.pklWorkSchedule.delete({ where: { id } });
};

// ==========================================
// PKL evidence uploads (selfie / journal documentation)
// ==========================================

const PKL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const getPklEvidenceUploadStatus = async () => ({ enabled: isFileUploadConfigured() });

const evidenceUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.enum(PKL_IMAGE_TYPES),
});

export const createPklEvidenceUploadUrl = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  ensureFileUploadConfigured();
  const args = ensureArgsSchemaOrThrowHttpError(evidenceUploadSchema, rawArgs);
  return getUploadFileSignedURLFromS3({
    fileType: args.fileType,
    fileName: args.fileName,
    userId: user.id,
  });
};

async function ensureOwnedEvidenceKey(userId: string, key?: string | null) {
  if (!key) return null;
  if (!key.startsWith(userId + "/")) throw new HttpError(403, "Bukti upload tidak sesuai dengan pemilik akun.");
  ensureFileUploadConfigured();
  if (!(await checkFileExistsInS3({ s3Key: key }))) throw new HttpError(404, "Bukti upload belum ditemukan di storage.");
  return key;
}

const signedEvidenceSchema = z.object({
  kind: z.enum(["ATTENDANCE", "JOURNAL"]),
  id: z.string().uuid(),
});

export const getPklEvidenceSignedUrl = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  ensureFileUploadConfigured();
  const args = ensureArgsSchemaOrThrowHttpError(signedEvidenceSchema, rawArgs);
  const scope =
    user.isAdmin || user.role === "SCHOOL_ADMIN" || user.role === "SUPERADMIN"
      ? {}
      : user.role === "STUDENT" ? { studentId: user.id }
      : user.role === "TEACHER" ? { teacherSupervisorId: user.id }
      : { dudiMentorId: user.id };

  let key: string | null = null;
  if (args.kind === "ATTENDANCE") {
    const row = await prisma.attendanceLog.findFirst({
      where: { id: args.id, placement: { schoolId: user.schoolId, ...scope } },
      select: { photoUrl: true, evidenceUrl: true },
    });
    if (!row) throw new HttpError(404, "Bukti presensi tidak ditemukan.");
    key = row.photoUrl || row.evidenceUrl;
  } else {
    const row = await prisma.dailyJournal.findFirst({
      where: { id: args.id, placement: { schoolId: user.schoolId, ...scope } },
      select: { photoUrl: true, evidenceUrl: true },
    });
    if (!row) throw new HttpError(404, "Bukti jurnal tidak ditemukan.");
    key = row.evidenceUrl || row.photoUrl;
  }
  if (!key) throw new HttpError(404, "Bukti belum tersedia.");
  return getDownloadFileSignedURLFromS3({ s3Key: key });
};

// ==========================================
// Attendance Gen2
// ==========================================

const attendanceSchema = z.object({
  placementId: z.string().uuid(),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const recordAttendanceGen2 = async (rawArgs: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  const args = ensureArgsSchemaOrThrowHttpError(attendanceSchema, rawArgs);
  const evidenceKey = await ensureOwnedEvidenceKey(student.id, args.photoUrl);
  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: student.schoolId,
      studentId: student.id,
      status: "ACTIVE",
    },
    include: {
      company: true,
      pklPeriod: true,
    },
  });
  if (!placement) throw new HttpError(404, "Penempatan PKL aktif tidak ditemukan.");
  const now = new Date();
  if (!isDateWithin(now, placement.startDate, placement.endDate)) {
    throw new HttpError(400, "Presensi hanya dapat dilakukan selama rentang tanggal penempatan aktif.");
  }
  if (placement.pklPeriod && !isDateWithin(now, placement.pklPeriod.startDate, placement.pklPeriod.endDate)) {
    throw new HttpError(400, "Periode PKL tidak sedang berlangsung.");
  }

  const local = jakartaParts(now);
  const schedule = placement.pklPeriodId
    ? await prisma.pklWorkSchedule.findFirst({
        where: {
          schoolId: student.schoolId,
          periodId: placement.pklPeriodId,
          companyId: placement.companyId,
          isActive: true,
        },
      })
    : null;
  if (schedule && !isWorkingDay(local.day, schedule.workingDays)) {
    throw new HttpError(400, "Hari ini bukan hari kerja PKL berdasarkan jadwal DUDI.");
  }

  const existing = await prisma.attendanceLog.findFirst({
    where: { placementId: placement.id, dateOnly: local.dateOnly, type: args.type },
  });
  if (existing) throw new HttpError(409, `Presensi ${args.type} hari ini sudah tercatat.`);

  let distanceMeters: number | null = null;
  let geofenceStatus: string = "UNVERIFIED";
  if (
    args.latitude != null && args.longitude != null
    && placement.company.latitude != null && placement.company.longitude != null
  ) {
    const { calculateDistanceMeters } = await import("./geofence");
    distanceMeters = calculateDistanceMeters(
      args.latitude,
      args.longitude,
      placement.company.latitude,
      placement.company.longitude,
    );
    geofenceStatus = distanceMeters <= placement.company.radiusMeters ? "INSIDE" : "OUTSIDE";
  }

  const scheduleStatus = args.type === "CHECK_IN"
    ? getScheduleStatus(local.localTime, schedule?.lateAfter)
    : schedule ? "ON_TIME" : "UNSCHEDULED";
  const status = args.type === "CHECK_IN" && scheduleStatus === "LATE" ? "TERLAMBAT" : "HADIR";

  return prisma.attendanceLog.create({
    data: {
      placementId: placement.id,
      timestamp: now,
      dateOnly: local.dateOnly,
      type: args.type,
      status,
      geofenceStatus,
      scheduleStatus,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      distanceMeters,
      photoUrl: evidenceKey,
      notes: args.notes?.trim() || null,
    },
  });
};

const attendanceExceptionSchema = z.object({
  placementId: z.string().uuid(),
  status: z.enum(["IZIN", "SAKIT"]),
  notes: z.string().trim().min(5).max(2000),
  evidenceUrl: z.string().max(2000).optional().nullable(),
});

export const recordAttendanceException = async (rawArgs: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  const args = ensureArgsSchemaOrThrowHttpError(attendanceExceptionSchema, rawArgs);
  const evidenceKey = await ensureOwnedEvidenceKey(student.id, args.evidenceUrl);
  const placement = await prisma.placement.findFirst({
    where: { id: args.placementId, schoolId: student.schoolId, studentId: student.id, status: "ACTIVE" },
  });
  if (!placement) throw new HttpError(404, "Penempatan PKL aktif tidak ditemukan.");
  const now = new Date();
  if (!isDateWithin(now, placement.startDate, placement.endDate)) {
    throw new HttpError(400, "Status izin/sakit hanya dapat dikirim selama penempatan aktif.");
  }
  const { dateOnly } = jakartaParts(now);
  return prisma.attendanceLog.upsert({
    where: { placementId_dateOnly_type: { placementId: placement.id, dateOnly, type: "EXCEPTION" } },
    create: {
      placementId: placement.id,
      timestamp: now,
      dateOnly,
      type: "EXCEPTION",
      status: args.status,
      geofenceStatus: "UNVERIFIED",
      scheduleStatus: "UNSCHEDULED",
      evidenceUrl: evidenceKey,
      notes: args.notes,
    },
    update: {
      status: args.status,
      evidenceUrl: evidenceKey,
      notes: args.notes,
      timestamp: now,
    },
  });
};

const adminAttendanceSchema = z.object({
  placementId: z.string().uuid(),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(PKL_ATTENDANCE_STATUSES),
  notes: z.string().max(2000).optional().nullable(),
  correctionReason: z.string().trim().min(3).max(1000),
});

export const setAttendanceDayStatus = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(adminAttendanceSchema, rawArgs);
  const placement = await prisma.placement.findFirst({
    where: { id: args.placementId, schoolId: admin.schoolId },
  });
  if (!placement) throw new HttpError(404, "Penempatan tidak ditemukan.");
  const now = new Date();
  return prisma.attendanceLog.upsert({
    where: { placementId_dateOnly_type: { placementId: placement.id, dateOnly: args.dateOnly, type: "EXCEPTION" } },
    create: {
      placementId: placement.id,
      timestamp: now,
      dateOnly: args.dateOnly,
      type: "EXCEPTION",
      status: args.status,
      geofenceStatus: "UNVERIFIED",
      scheduleStatus: "UNSCHEDULED",
      notes: args.notes?.trim() || null,
      isManualCorrection: true,
      correctedById: admin.id,
      correctedAt: now,
      correctionReason: args.correctionReason,
    },
    update: {
      status: args.status,
      notes: args.notes?.trim() || null,
      isManualCorrection: true,
      correctedById: admin.id,
      correctedAt: now,
      correctionReason: args.correctionReason,
    },
  });
};

const correctionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PKL_ATTENDANCE_STATUSES),
  notes: z.string().max(2000).optional().nullable(),
  reason: z.string().trim().min(3).max(1000),
});

export const correctAttendance = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(correctionSchema, rawArgs);
  const row = await prisma.attendanceLog.findFirst({
    where: { id: args.id, placement: { schoolId: admin.schoolId } },
  });
  if (!row) throw new HttpError(404, "Presensi tidak ditemukan.");
  return prisma.attendanceLog.update({
    where: { id: row.id },
    data: {
      status: args.status,
      notes: args.notes?.trim() || null,
      isManualCorrection: true,
      correctedById: admin.id,
      correctedAt: new Date(),
      correctionReason: args.reason,
    },
  });
};

// ==========================================
// Journal Gen2
// ==========================================

const saveJournalSchema = z.object({
  placementId: z.string().uuid(),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityDescription: z.string().trim().min(5).max(10000),
  obstacleDescription: z.string().max(5000).optional().nullable(),
  competencies: z.string().max(5000).optional().nullable(),
  reflection: z.string().max(5000).optional().nullable(),
  evidenceUrl: z.string().max(2000).optional().nullable(),
  submit: z.boolean().default(false),
});

async function snapshotJournal(journal: any, actorId: string, reason?: string) {
  const revisionNo = (journal.revisionCount || 0) + 1;
  return prisma.dailyJournalRevision.create({
    data: {
      journalId: journal.id,
      revisionNo,
      actorId,
      reason: reason || null,
      snapshot: {
        activityDescription: journal.activityDescription,
        obstacleDescription: journal.obstacleDescription,
        competencies: journal.competencies,
        reflection: journal.reflection,
        evidenceUrl: journal.evidenceUrl,
        status: journal.status,
        teacherReviewStatus: journal.teacherReviewStatus,
        mentorReviewStatus: journal.mentorReviewStatus,
        updatedAt: journal.updatedAt,
      },
    },
  });
}

export const saveDailyJournalGen2 = async (rawArgs: unknown, context: { user?: User }) => {
  const student = requireStudent(context);
  const args = ensureArgsSchemaOrThrowHttpError(saveJournalSchema, rawArgs);
  const evidenceKey = await ensureOwnedEvidenceKey(student.id, args.evidenceUrl);
  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: student.schoolId,
      studentId: student.id,
      status: "ACTIVE",
    },
  });
  if (!placement) throw new HttpError(404, "Penempatan PKL aktif tidak ditemukan.");

  const today = jakartaParts().dateOnly;
  const dateOnly = args.dateOnly || today;
  const journalDate = new Date(dateOnly + "T12:00:00+07:00");
  if (!isDateWithin(journalDate, placement.startDate, placement.endDate)) {
    throw new HttpError(400, "Tanggal jurnal harus berada dalam rentang penempatan PKL.");
  }

  const existing = await prisma.dailyJournal.findFirst({
    where: { placementId: placement.id, dateOnly },
  });
  if (existing && !["DRAFT", "REVISION"].includes(existing.status)) {
    throw new HttpError(409, "Jurnal hari tersebut sudah dikirim dan belum dapat diedit.");
  }

  const submittedAt = args.submit ? new Date() : null;
  if (!existing) {
    return prisma.dailyJournal.create({
      data: {
        placementId: placement.id,
        date: journalDate,
        dateOnly,
        activityDescription: args.activityDescription,
        obstacleDescription: args.obstacleDescription?.trim() || null,
        competencies: args.competencies?.trim() || null,
        reflection: args.reflection?.trim() || null,
        evidenceUrl: evidenceKey,
        status: args.submit ? "SUBMITTED" : "DRAFT",
        submittedAt,
        teacherReviewStatus: placement.teacherSupervisorId && args.submit ? "PENDING" : null,
        mentorReviewStatus: placement.dudiMentorId && args.submit ? "PENDING" : null,
      },
    });
  }

  const wasRevision = existing.status === "REVISION";
  if (wasRevision) await snapshotJournal(existing, student.id, "Siswa memperbarui jurnal setelah permintaan revisi.");
  return prisma.dailyJournal.update({
    where: { id: existing.id },
    data: {
      activityDescription: args.activityDescription,
      obstacleDescription: args.obstacleDescription?.trim() || null,
      competencies: args.competencies?.trim() || null,
      reflection: args.reflection?.trim() || null,
      evidenceUrl: evidenceKey,
      status: args.submit ? "SUBMITTED" : "DRAFT",
      submittedAt: args.submit ? new Date() : existing.submittedAt,
      revisionCount: wasRevision ? { increment: 1 } : undefined,
      teacherReviewStatus: placement.teacherSupervisorId && args.submit ? "PENDING" : existing.teacherReviewStatus,
      mentorReviewStatus: placement.dudiMentorId && args.submit ? "PENDING" : existing.mentorReviewStatus,
      teacherFeedback: wasRevision && args.submit ? null : undefined,
      mentorFeedback: wasRevision && args.submit ? null : undefined,
      teacherScore: wasRevision && args.submit ? null : undefined,
      mentorScore: wasRevision && args.submit ? null : undefined,
    },
  });
};

const reviewJournalSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REVISION"]),
  feedback: z.string().max(3000).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
});

export const reviewDailyJournalGen2 = async (rawArgs: unknown, context: { user?: User }) => {
  const reviewer = requireAnySchoolCapability(context, ["teach", "mentor"]);
  const args = ensureArgsSchemaOrThrowHttpError(reviewJournalSchema, rawArgs);
  if (!["TEACHER", "DUDI_MENTOR"].includes(reviewer.role) && !reviewer.isAdmin) {
    throw new HttpError(403, "Review jurnal hanya untuk Guru Pembimbing atau Pembimbing DUDI.");
  }
  const role = reviewer.role === "DUDI_MENTOR" ? "MENTOR" : "TEACHER";
  const journal = await prisma.dailyJournal.findFirst({
    where: {
      id: args.id,
      status: { in: ["SUBMITTED", "APPROVED", "REVISION"] },
      placement: {
        schoolId: reviewer.schoolId,
        ...(role === "TEACHER" && !reviewer.isAdmin ? { teacherSupervisorId: reviewer.id } : {}),
        ...(role === "MENTOR" && !reviewer.isAdmin ? { dudiMentorId: reviewer.id } : {}),
      },
    },
    include: { placement: true },
  });
  if (!journal) throw new HttpError(404, "Jurnal tidak ditemukan atau bukan dalam bimbingan Anda.");

  const teacherStatus = role === "TEACHER" ? args.decision : journal.teacherReviewStatus;
  const mentorStatus = role === "MENTOR" ? args.decision : journal.mentorReviewStatus;
  const overall = resolveJournalOverallStatus({
    teacherRequired: !!journal.placement.teacherSupervisorId,
    mentorRequired: !!journal.placement.dudiMentorId,
    teacherStatus,
    mentorStatus,
  });
  const scores = [
    role === "TEACHER" ? args.score : journal.teacherScore,
    role === "MENTOR" ? args.score : journal.mentorScore,
  ].filter((value): value is number => typeof value === "number");
  const aggregateScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const now = new Date();

  return prisma.dailyJournal.update({
    where: { id: journal.id },
    data: {
      status: overall,
      ...(role === "TEACHER" ? {
        teacherReviewStatus: args.decision,
        teacherFeedback: args.feedback?.trim() || null,
        teacherScore: args.score ?? null,
        teacherReviewedAt: now,
        teacherReviewedById: reviewer.id,
      } : {
        mentorReviewStatus: args.decision,
        mentorFeedback: args.feedback?.trim() || null,
        mentorScore: args.score ?? null,
        mentorReviewedAt: now,
        mentorReviewedById: reviewer.id,
      }),
      feedback: args.feedback?.trim() || null,
      score: aggregateScore,
      approvedAt: overall === "APPROVED" ? now : null,
      approvedById: overall === "APPROVED" ? reviewer.id : null,
      lastRevisionAt: args.decision === "REVISION" ? now : journal.lastRevisionAt,
    },
  });
};

// ==========================================
// Role dashboard
// ==========================================

export const getPklDashboard = async (_args: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  const placementScope =
    user.isAdmin || user.role === "SCHOOL_ADMIN" || user.role === "SUPERADMIN"
      ? {}
      : user.role === "STUDENT"
        ? { studentId: user.id }
        : user.role === "TEACHER"
          ? { teacherSupervisorId: user.id }
          : user.role === "DUDI_MENTOR"
            ? { dudiMentorId: user.id }
            : {};

  const placements = await prisma.placement.findMany({
    where: { schoolId: user.schoolId, ...placementScope },
    include: {
      student: { select: { id: true, name: true, classRoom: { select: { name: true } } } },
      company: { select: { id: true, name: true } },
      pklPeriod: { select: { id: true, name: true } },
      teacherSupervisor: { select: { id: true, name: true } },
      dudiMentor: { select: { id: true, name: true } },
      attendances: { orderBy: { timestamp: "desc" }, take: 5 },
      journals: { orderBy: { date: "desc" }, take: 5 },
    },
    orderBy: { startDate: "desc" },
  });
  const placementIds = placements.map((row) => row.id);
  const [pendingJournals, attendanceToday] = await Promise.all([
    placementIds.length
      ? prisma.dailyJournal.count({ where: { placementId: { in: placementIds }, status: { in: ["SUBMITTED", "REVISION"] } } })
      : 0,
    placementIds.length
      ? prisma.attendanceLog.count({ where: { placementId: { in: placementIds }, dateOnly: jakartaParts().dateOnly } })
      : 0,
  ]);

  return {
    role: user.role,
    summary: {
      total: placements.length,
      planned: placements.filter((row) => row.status === "PLANNED").length,
      active: placements.filter((row) => row.status === "ACTIVE").length,
      completed: placements.filter((row) => row.status === "COMPLETED").length,
      canceled: placements.filter((row) => row.status === "CANCELED").length,
      pendingJournals,
      attendanceToday,
    },
    placements: placements.slice(0, 20),
  };
};

// ==========================================
// Reports
// ==========================================

const reportSchema = z.object({
  periodId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.string().optional(),
}).optional();

export const getPklReportData = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requirePklAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(reportSchema || z.any(), rawArgs || {});
  const scope =
    user.isAdmin || user.role === "SCHOOL_ADMIN" || user.role === "SUPERADMIN"
      ? {}
      : user.role === "TEACHER"
        ? { teacherSupervisorId: user.id }
        : user.role === "DUDI_MENTOR"
          ? { dudiMentorId: user.id }
          : { studentId: user.id };

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, npsn: true, address: true, city: true, province: true, logoUrl: true },
  });
  const placements = await prisma.placement.findMany({
    where: {
      schoolId: user.schoolId,
      ...scope,
      ...(args?.periodId ? { pklPeriodId: args.periodId } : {}),
      ...(args?.companyId ? { companyId: args.companyId } : {}),
      ...(args?.departmentId ? { departmentId: args.departmentId } : {}),
      ...(args?.status ? { status: args.status } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentProfile: { select: { nis: true, nisn: true } },
          classRoom: { select: { name: true } },
        },
      },
      company: { select: { id: true, code: true, name: true } },
      pklPeriod: { select: { id: true, name: true } },
      department: { select: { id: true, code: true, name: true } },
      teacherSupervisor: { select: { id: true, name: true } },
      dudiMentor: { select: { id: true, name: true } },
      attendances: { orderBy: [{ dateOnly: "asc" }, { timestamp: "asc" }] },
      journals: { orderBy: { date: "asc" } },
    },
    orderBy: [{ pklPeriod: { startDate: "desc" } }, { student: { name: "asc" } }],
  });

  const placementRows = placements.map((row) => [
    row.student.name || "",
    row.student.studentProfile?.nis || "",
    row.student.classRoom?.name || "",
    row.department?.code || "",
    row.pklPeriod?.name || "",
    row.company.name,
    row.teacherSupervisor?.name || "",
    row.dudiMentor?.name || "",
    row.status,
    row.startDate.toISOString().slice(0, 10),
    row.endDate.toISOString().slice(0, 10),
  ]);
  const attendanceRows = placements.flatMap((row) => row.attendances.map((attendance) => [
    row.student.name || "",
    row.company.name,
    attendance.dateOnly,
    attendance.type,
    attendance.status,
    attendance.geofenceStatus || "",
    attendance.scheduleStatus || "",
    attendance.distanceMeters ?? "",
    attendance.notes || "",
  ]));
  const journalRows = placements.flatMap((row) => row.journals.map((journal) => [
    row.student.name || "",
    row.company.name,
    journal.dateOnly || journal.date.toISOString().slice(0, 10),
    journal.status,
    journal.teacherReviewStatus || "",
    journal.mentorReviewStatus || "",
    journal.score ?? "",
    journal.activityDescription,
  ]));

  return {
    school,
    summary: {
      placements: placements.length,
      planned: placements.filter((row) => row.status === "PLANNED").length,
      active: placements.filter((row) => row.status === "ACTIVE").length,
      completed: placements.filter((row) => row.status === "COMPLETED").length,
      attendanceRecords: attendanceRows.length,
      journals: journalRows.length,
    },
    placements,
    exports: {
      placementsCsv: toCsv(
        ["Siswa","NIS","Rombel","Konsentrasi","Periode","DUDI","Guru Pembimbing","Pembimbing DUDI","Status","Mulai","Selesai"],
        placementRows,
      ),
      attendanceCsv: toCsv(
        ["Siswa","DUDI","Tanggal","Tipe","Status","Geofence","Jadwal","Jarak Meter","Catatan"],
        attendanceRows,
      ),
      journalsCsv: toCsv(
        ["Siswa","DUDI","Tanggal","Status","Review Guru","Review DUDI","Nilai","Kegiatan"],
        journalRows,
      ),
    },
  };
};

// ==========================================
// Import preview -> validate -> commit
// ==========================================

const importSchema = z.object({
  kind: z.enum(PKL_IMPORT_KINDS),
  csvContent: z.string().min(1).max(5_000_000),
});

function importHash(schoolId: string, kind: string, rows: unknown[]) {
  return createHash("sha256").update(JSON.stringify({ schoolId, kind, rows })).digest("hex");
}

async function buildImportPreview(schoolId: string, kind: (typeof PKL_IMPORT_KINDS)[number], csvContent: string) {
  const raw = parseCsv(csvContent);
  const periods = await prisma.pklPeriod.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const departments = await prisma.department.findMany({ where: { schoolId }, select: { id: true, code: true, name: true } });
  const companies = await prisma.company.findMany({ where: { schoolId }, select: { id: true, code: true, name: true } });
  const teachers = await prisma.user.findMany({
    where: { schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
    select: { id: true, name: true, teacherProfile: { select: { nip: true } } },
  });
  const mentors = await prisma.dudiMentorProfile.findMany({
    where: { schoolId },
    include: { user: { select: { id: true, name: true } }, company: { select: { id: true, code: true, name: true } } },
  });
  const students = await prisma.user.findMany({
    where: { schoolId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      studentProfile: { select: { nis: true, nisn: true } },
      classRoom: { select: { departmentId: true } },
    },
  });

  const normalized = raw.map((row, index) => {
    const errors: string[] = [];
    const base: any = { rowNumber: index + 2, errors };
    if (kind === "DUDI") {
      const code = normalizedImportValue(row, ["kode","code","kodedudi"]).toUpperCase();
      const name = normalizedImportValue(row, ["nama","namadudi","perusahaan"]);
      const address = normalizedImportValue(row, ["alamat","address"]);
      const departmentCodes = normalizedImportValue(row, ["konsentrasi","kodekonsentrasi","departmentcodes"])
        .split(/[|;]/).map((value) => value.trim().toUpperCase()).filter(Boolean);
      if (!code) errors.push("Kode DUDI wajib diisi.");
      if (!name) errors.push("Nama DUDI wajib diisi.");
      if (!address) errors.push("Alamat wajib diisi.");
      const unknown = departmentCodes.filter((codeValue) => !departments.some((dept) => dept.code.toUpperCase() === codeValue));
      if (unknown.length) errors.push("Kode konsentrasi tidak dikenal: " + unknown.join(", "));
      const departmentIds = departmentCodes
        .map((codeValue) => departments.find((dept) => dept.code.toUpperCase() === codeValue)?.id)
        .filter((value): value is string => !!value);
      return {
        ...base, code, name, address,
        industrySector: normalizedImportValue(row, ["sektor","industrysector","bidang"]),
        phone: normalizedImportValue(row, ["telepon","phone"]),
        email: normalizedImportValue(row, ["email"]),
        website: normalizedImportValue(row, ["website"]),
        picName: normalizedImportValue(row, ["pic","picname"]),
        picPhone: normalizedImportValue(row, ["hppic","picphone"]),
        departmentCodes,
        departmentIds,
      };
    }
    if (kind === "MENTOR") {
      const name = normalizedImportValue(row, ["nama","namapembimbing","mentor"]);
      const companyCode = normalizedImportValue(row, ["kodedudi","companycode","dudi"]).toUpperCase();
      const company = companies.find((item) => item.code?.toUpperCase() === companyCode);
      if (!name) errors.push("Nama pembimbing wajib diisi.");
      if (!companyCode || !company) errors.push("Kode DUDI tidak ditemukan.");
      return {
        ...base, name, companyCode, companyId: company?.id || null,
        position: normalizedImportValue(row, ["jabatan","position"]),
        phone: normalizedImportValue(row, ["telepon","phone"]),
        email: normalizedImportValue(row, ["email"]),
      };
    }
    if (kind === "CAPACITY") {
      const periodName = normalizedImportValue(row, ["periode","periodname"]);
      const companyCode = normalizedImportValue(row, ["kodedudi","companycode"]).toUpperCase();
      const departmentCode = normalizedImportValue(row, ["konsentrasi","departmentcode"]).toUpperCase();
      const quota = Number(normalizedImportValue(row, ["kuota","quota"]));
      const period = periods.find((item) => item.name.toLowerCase() === periodName.toLowerCase());
      const company = companies.find((item) => item.code?.toUpperCase() === companyCode);
      const department = departments.find((item) => item.code.toUpperCase() === departmentCode);
      if (!period) errors.push("Periode tidak ditemukan.");
      if (!company) errors.push("Kode DUDI tidak ditemukan.");
      if (!department) errors.push("Konsentrasi tidak ditemukan.");
      if (!Number.isInteger(quota) || quota < 1) errors.push("Kuota harus bilangan bulat minimal 1.");
      return { ...base, periodName, periodId: period?.id || null, companyCode, companyId: company?.id || null, departmentCode, departmentId: department?.id || null, quota };
    }
    const studentKey = normalizedImportValue(row, ["nisn","nis","studentid"]);
    const periodName = normalizedImportValue(row, ["periode","periodname"]);
    const companyCode = normalizedImportValue(row, ["kodedudi","companycode"]).toUpperCase();
    const teacherNip = normalizedImportValue(row, ["nipguru","teachernip"]);
    const mentorName = normalizedImportValue(row, ["pembimbingdudi","mentorname"]);
    const student = students.find((item) => item.studentProfile?.nisn === studentKey || item.studentProfile?.nis === studentKey);
    const period = periods.find((item) => item.name.toLowerCase() === periodName.toLowerCase());
    const company = companies.find((item) => item.code?.toUpperCase() === companyCode);
    const teacher = teacherNip ? teachers.find((item) => item.teacherProfile?.nip === teacherNip) : null;
    const mentor = mentorName && company ? mentors.find((item) => item.companyId === company.id && item.user.name?.toLowerCase() === mentorName.toLowerCase()) : null;
    if (!student) errors.push("Siswa tidak ditemukan dari NIS/NISN.");
    if (!period) errors.push("Periode tidak ditemukan.");
    if (!company) errors.push("Kode DUDI tidak ditemukan.");
    if (teacherNip && !teacher) errors.push("Guru pembimbing tidak ditemukan dari NIP.");
    if (mentorName && !mentor) errors.push("Pembimbing DUDI tidak ditemukan pada mitra tersebut.");
    return {
      ...base,
      studentKey, studentId: student?.id || null,
      departmentId: student?.classRoom?.departmentId || null,
      periodName, periodId: period?.id || null,
      companyCode, companyId: company?.id || null,
      teacherNip, teacherId: teacher?.id || null,
      mentorName, mentorId: mentor?.userId || null,
    };
  });

  return {
    kind,
    rows: normalized,
    validRows: normalized.filter((row) => row.errors.length === 0).length,
    invalidRows: normalized.filter((row) => row.errors.length > 0).length,
    previewHash: importHash(schoolId, kind, normalized),
  };
}

export const previewPklImport = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(importSchema, rawArgs);
  return buildImportPreview(admin.schoolId, args.kind, args.csvContent);
};

const commitImportSchema = importSchema.extend({ previewHash: z.string().length(64) });

export const commitPklImport = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(commitImportSchema, rawArgs);
  const preview = await buildImportPreview(admin.schoolId, args.kind, args.csvContent);
  if (preview.previewHash !== args.previewHash) throw new HttpError(409, "Preview sudah berubah. Jalankan preview ulang sebelum commit.");
  if (preview.invalidRows > 0) throw new HttpError(400, "Import belum dapat dijalankan karena masih ada baris tidak valid.");

  if (args.kind === "DUDI") {
    return prisma.$transaction(async (tx) => {
      let created = 0, updated = 0;
      for (const row of preview.rows as any[]) {
        const existing = await tx.company.findFirst({ where: { schoolId: admin.schoolId, code: row.code } });
        const company = existing
          ? await tx.company.update({ where: { id: existing.id }, data: {
              name: row.name, address: row.address, industrySector: row.industrySector || null,
              phone: row.phone || null, email: row.email || null, website: row.website || null,
              picName: row.picName || null, picPhone: row.picPhone || null, isActive: true,
            } })
          : await tx.company.create({ data: {
              schoolId: admin.schoolId, code: row.code, name: row.name, address: row.address,
              industrySector: row.industrySector || null, phone: row.phone || null, email: row.email || null,
              website: row.website || null, picName: row.picName || null, picPhone: row.picPhone || null,
              isActive: true, partnershipStatus: "ACTIVE",
            } });
        existing ? updated++ : created++;
        const departmentIds = row.departmentIds as string[];
        await tx.companyDepartment.deleteMany({ where: { schoolId: admin.schoolId, companyId: company.id } });
        if (departmentIds.length) await tx.companyDepartment.createMany({ data: departmentIds.map((departmentId: string) => ({ schoolId: admin.schoolId, companyId: company.id, departmentId })) });
      }
      return { created, updated };
    });
  }

  if (args.kind === "MENTOR") {
    return prisma.$transaction(async (tx) => {
      let created = 0, updated = 0;
      for (const row of preview.rows as any[]) {
        const existing = await tx.dudiMentorProfile.findFirst({
          where: { schoolId: admin.schoolId, companyId: row.companyId, user: { name: row.name } },
          include: { user: true },
        });
        if (existing) {
          await tx.user.update({ where: { id: existing.userId }, data: { name: row.name } });
          await tx.dudiMentorProfile.update({ where: { id: existing.id }, data: { position: row.position || null, phone: row.phone || null, email: row.email || null, isActive: true } });
          updated++;
        } else {
          const user = await tx.user.create({ data: { schoolId: admin.schoolId, role: "DUDI_MENTOR", name: row.name } });
          await tx.dudiMentorProfile.create({ data: { schoolId: admin.schoolId, userId: user.id, companyId: row.companyId, position: row.position || null, phone: row.phone || null, email: row.email || null } });
          created++;
        }
      }
      return { created, updated };
    });
  }

  if (args.kind === "CAPACITY") {
    return prisma.$transaction(async (tx) => {
      let upserted = 0;
      for (const row of preview.rows as any[]) {
        await tx.companyDepartment.upsert({
          where: { companyId_departmentId: { companyId: row.companyId, departmentId: row.departmentId } },
          create: { schoolId: admin.schoolId, companyId: row.companyId, departmentId: row.departmentId, isActive: true },
          update: { isActive: true },
        });
        await tx.pklCompanyCapacity.upsert({
          where: { periodId_companyId_departmentId: { periodId: row.periodId, companyId: row.companyId, departmentId: row.departmentId } },
          create: { schoolId: admin.schoolId, periodId: row.periodId, companyId: row.companyId, departmentId: row.departmentId, quota: row.quota },
          update: { quota: row.quota },
        });
        upserted++;
      }
      return { upserted };
    });
  }

  const placementRows = preview.rows as any[];
  const studentIds = placementRows.map((row) => row.studentId as string);
  const duplicateStudents = await prisma.placement.findMany({
    where: { schoolId: admin.schoolId, studentId: { in: studentIds }, status: openPlacementWhere() },
    select: { studentId: true },
  });
  if (duplicateStudents.length) {
    throw new HttpError(409, "Ada siswa yang sudah memiliki penempatan terbuka sejak preview dibuat. Jalankan preview ulang.");
  }

  const requestedByKey = new Map<string, number>();
  for (const row of placementRows) {
    if (!row.departmentId) throw new HttpError(400, "Ada siswa tanpa konsentrasi keahlian.");
    const key = `${row.periodId}:${row.companyId}:${row.departmentId}`;
    requestedByKey.set(key, (requestedByKey.get(key) || 0) + 1);
  }
  for (const [key, requested] of requestedByKey) {
    const [periodId, companyId, departmentId] = key.split(":");
    const company = await getCompanyForPlacement(admin.schoolId, companyId);
    if (!company.departmentLinks.some((link) => link.departmentId === departmentId)) {
      throw new HttpError(409, "Relasi DUDI dan konsentrasi berubah sejak preview. Jalankan preview ulang.");
    }
    const state = await getCapacityState({ schoolId: admin.schoolId, periodId, companyId, departmentId });
    if (!state.capacity || (state.remaining || 0) < requested) {
      throw new HttpError(409, "Kuota PKL berubah sejak preview. Jalankan preview ulang.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const created: string[] = [];
    for (const row of placementRows) {
      const period = await tx.pklPeriod.findFirst({ where: { id: row.periodId, schoolId: admin.schoolId } });
      if (!period) throw new HttpError(409, "Periode berubah sejak preview.");
      const placement = await tx.placement.create({
        data: {
          schoolId: admin.schoolId,
          studentId: row.studentId,
          companyId: row.companyId,
          pklPeriodId: row.periodId,
          departmentId: row.departmentId,
          teacherSupervisorId: row.teacherId || null,
          dudiMentorId: row.mentorId || null,
          startDate: period.startDate,
          endDate: period.endDate,
          status: "PLANNED",
          source: "IMPORT",
        },
      });
      await createPlacementEvent({
        schoolId: admin.schoolId,
        placementId: placement.id,
        eventType: "IMPORTED",
        actorId: admin.id,
        after: placementSnapshot(placement),
      }, tx);
      created.push(placement.id);
    }
    return { created: created.length, placementIds: created };
  });
};
