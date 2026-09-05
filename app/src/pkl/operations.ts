import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, requireTeacher } from "../school/authGuards";
import { calculateDistanceMeters, isWithinGeofence } from "./geofence";

// ==========================================
// 1. DUDI / Company Operations
// ==========================================

export const getCompanies = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  return prisma.company.findMany({
    where: { schoolId: user.schoolId },
    include: {
      placements: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            select: { id: true, name: true, email: true, studentProfile: true },
          },
          teacherSupervisor: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: { placements: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const companySchema = z.object({
  name: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  industrySector: z.string().optional(),
  address: z.string().min(3, "Alamat wajib diisi"),
  picName: z.string().optional(),
  picPhone: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  radiusMeters: z.number().int().min(10).max(5000).default(100),
  maxQuota: z.number().int().min(1).default(5),
});

export const createCompany = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(companySchema, rawArgs);

  return prisma.company.create({
    data: {
      schoolId: admin.schoolId,
      name: args.name.trim(),
      industrySector: args.industrySector?.trim() || null,
      address: args.address.trim(),
      picName: args.picName?.trim() || null,
      picPhone: args.picPhone?.trim() || null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      radiusMeters: args.radiusMeters,
      maxQuota: args.maxQuota,
    },
  });
};

const updateCompanySchema = companySchema.extend({
  id: z.string().uuid(),
});

export const updateCompany = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateCompanySchema, rawArgs);

  const existing = await prisma.company.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
  });
  if (!existing) throw new HttpError(404, "Data perusahaan tidak ditemukan.");

  return prisma.company.update({
    where: { id: args.id },
    data: {
      name: args.name.trim(),
      industrySector: args.industrySector?.trim() || null,
      address: args.address.trim(),
      picName: args.picName?.trim() || null,
      picPhone: args.picPhone?.trim() || null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      radiusMeters: args.radiusMeters,
      maxQuota: args.maxQuota,
    },
  });
};

const deleteCompanySchema = z.object({
  id: z.string().uuid(),
});

export const deleteCompany = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteCompanySchema, rawArgs);

  const company = await prisma.company.findFirst({
    where: { id, schoolId: admin.schoolId },
    include: { _count: { select: { placements: true } } },
  });
  if (!company) throw new HttpError(404, "Data perusahaan tidak ditemukan.");

  if (company._count.placements > 0) {
    throw new HttpError(
      400,
      `Tidak dapat menghapus DUDI ini karena memiliki ${company._count.placements} riwayat penempatan siswa.`
    );
  }

  return prisma.company.delete({ where: { id } });
};

// ==========================================
// 2. PKL Placement Operations
// ==========================================

const getPlacementsSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.string().optional(),
}).optional();

export const getPlacements = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getPlacementsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.placement.findMany({
    where: {
      schoolId: user.schoolId,
      ...(filter?.companyId ? { companyId: filter.companyId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
      ...(user.role === "TEACHER" && !user.isAdmin ? { teacherSupervisorId: user.id } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: true,
          classRoom: { select: { name: true, department: { select: { code: true } } } },
        },
      },
      company: true,
      teacherSupervisor: {
        select: { id: true, name: true, email: true, teacherProfile: true },
      },
      _count: {
        select: { attendances: true, journals: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
};

const createPlacementSchema = z.object({
  studentId: z.string().uuid(),
  companyId: z.string().uuid(),
  teacherSupervisorId: z.string().uuid().optional().nullable(),
  startDate: z.string(), // ISO string
  endDate: z.string(),   // ISO string
});

export const createPlacement = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createPlacementSchema, rawArgs);

  // Check student doesn't already have an active placement
  const existing = await prisma.placement.findFirst({
    where: {
      schoolId: admin.schoolId,
      studentId: args.studentId,
      status: "ACTIVE",
    },
  });
  if (existing) {
    throw new HttpError(400, "Siswa ini sudah memiliki penempatan PKL aktif.");
  }

  // Check company quota
  const company = await prisma.company.findFirst({
    where: { id: args.companyId, schoolId: admin.schoolId },
    include: { _count: { select: { placements: { where: { status: "ACTIVE" } } } } },
  });
  if (!company) throw new HttpError(404, "Perusahaan DUDI tidak ditemukan.");

  if (company._count.placements >= company.maxQuota) {
    throw new HttpError(
      400,
      `Kuota tempat PKL di "${company.name}" sudah penuh (${company.maxQuota} siswa).`
    );
  }

  return prisma.placement.create({
    data: {
      schoolId: admin.schoolId,
      studentId: args.studentId,
      companyId: args.companyId,
      teacherSupervisorId: args.teacherSupervisorId || null,
      startDate: new Date(args.startDate),
      endDate: new Date(args.endDate),
      status: "ACTIVE",
    },
    include: {
      student: true,
      company: true,
      teacherSupervisor: true,
    },
  });
};

const updatePlacementSchema = z.object({
  id: z.string().uuid(),
  teacherSupervisorId: z.string().uuid().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updatePlacement = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updatePlacementSchema, rawArgs);

  return prisma.placement.update({
    where: { id: args.id },
    data: {
      ...(args.teacherSupervisorId !== undefined ? { teacherSupervisorId: args.teacherSupervisorId } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.startDate ? { startDate: new Date(args.startDate) } : {}),
      ...(args.endDate ? { endDate: new Date(args.endDate) } : {}),
    },
  });
};

// ==========================================
// 3. Attendance & GPS Geofencing Operations
// ==========================================

const recordAttendanceSchema = z.object({
  placementId: z.string().uuid(),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const recordAttendance = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(recordAttendanceSchema, rawArgs);

  // Validate placement belongs to user or admin
  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: user.schoolId,
      ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
    },
    include: { company: true },
  });
  if (!placement) {
    throw new HttpError(404, "Data penempatan PKL tidak ditemukan atau Anda tidak memiliki akses.");
  }

  let distanceMeters: number | null = null;
  let status = "HADIR";

  // Check geofence if company has coordinates
  if (
    args.latitude !== null &&
    args.latitude !== undefined &&
    args.longitude !== null &&
    args.longitude !== undefined &&
    placement.company.latitude !== null &&
    placement.company.longitude !== null
  ) {
    const check = isWithinGeofence(
      args.latitude,
      args.longitude,
      placement.company.latitude,
      placement.company.longitude,
      placement.company.radiusMeters
    );
    distanceMeters = check.distanceMeters;

    if (!check.isWithin) {
      status = "DI LUAR RADIUS";
    }
  }

  // Indonesian date string YYYY-MM-DD (Asia/Jakarta)
  const now = new Date();
  const dateOnly = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  return prisma.attendanceLog.create({
    data: {
      placementId: placement.id,
      timestamp: now,
      dateOnly,
      type: args.type,
      status,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      distanceMeters,
      photoUrl: args.photoUrl ?? null,
      notes: args.notes ?? null,
    },
  });
};

const getAttendanceLogsSchema = z.object({
  placementId: z.string().uuid().optional(),
  dateOnly: z.string().optional(),
}).optional();

export const getAttendanceLogs = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getAttendanceLogsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.attendanceLog.findMany({
    where: {
      placement: {
        schoolId: user.schoolId,
        ...(filter?.placementId ? { id: filter.placementId } : {}),
        ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
      },
      ...(filter?.dateOnly ? { dateOnly: filter.dateOnly } : {}),
    },
    include: {
      placement: {
        include: {
          student: { select: { id: true, name: true, studentProfile: true } },
          company: { select: { name: true, radiusMeters: true } },
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
};

// ==========================================
// 4. Daily Journal Operations
// ==========================================

const createDailyJournalSchema = z.object({
  placementId: z.string().uuid(),
  activityDescription: z.string().min(5, "Deskripsi kegiatan minimal 5 karakter"),
  obstacleDescription: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

export const createDailyJournal = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(createDailyJournalSchema, rawArgs);

  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: user.schoolId,
      ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
    },
  });
  if (!placement) throw new HttpError(404, "Penempatan tidak ditemukan.");

  return prisma.dailyJournal.create({
    data: {
      placementId: placement.id,
      date: new Date(),
      activityDescription: args.activityDescription,
      obstacleDescription: args.obstacleDescription || null,
      photoUrl: args.photoUrl || null,
      status: "SUBMITTED",
    },
  });
};

const getDailyJournalsSchema = z.object({
  placementId: z.string().uuid().optional(),
  status: z.string().optional(),
}).optional();

export const getDailyJournals = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getDailyJournalsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.dailyJournal.findMany({
    where: {
      placement: {
        schoolId: user.schoolId,
        ...(filter?.placementId ? { id: filter.placementId } : {}),
        ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
      },
      ...(filter?.status ? { status: filter.status } : {}),
    },
    include: {
      placement: {
        include: {
          student: { select: { id: true, name: true, studentProfile: true } },
          company: { select: { id: true, name: true } },
          teacherSupervisor: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });
};

const reviewDailyJournalSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["APPROVED", "REVISION"]),
  feedback: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
});

export const reviewDailyJournal = async (rawArgs: unknown, context: { user?: User }) => {
  const reviewer = requireTeacher(context);
  const args = ensureArgsSchemaOrThrowHttpError(reviewDailyJournalSchema, rawArgs);

  return prisma.dailyJournal.update({
    where: { id: args.id },
    data: {
      status: args.status,
      feedback: args.feedback || null,
      score: args.score !== undefined ? args.score : undefined,
      approvedAt: new Date(),
      approvedById: reviewer.id,
    },
  });
};

// ==========================================
// 5. Early Warning System (EWS) Monitoring
// ==========================================

export const getPklEwsAlerts = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  // Find active placements in this school
  const activePlacements = await prisma.placement.findMany({
    where: {
      schoolId: user.schoolId,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentProfile: true,
          classRoom: { select: { name: true } },
        },
      },
      company: { select: { id: true, name: true } },
      teacherSupervisor: { select: { id: true, name: true } },
      attendances: {
        orderBy: { timestamp: "desc" },
        take: 5,
      },
      journals: {
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  });

  const alerts: Array<{
    studentId: string;
    studentName: string;
    className: string;
    companyName: string;
    teacherName: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    issue: string;
    details: string;
  }> = [];

  const now = new Date();

  for (const p of activePlacements) {
    const studentName = p.student?.name || "Siswa";
    const className = p.student?.classRoom?.name || "-";
    const companyName = p.company?.name || "-";
    const teacherName = p.teacherSupervisor?.name || "Belum Ditugaskan";

    // 1. Missing attendance in last 3 days
    const recentAttendances = p.attendances;
    if (recentAttendances.length === 0) {
      alerts.push({
        studentId: p.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "HIGH",
        issue: "Belum Pernah Presensi",
        details: "Siswa belum pernah mencatatkan kehadiran di lokasi PKL sejak penempatan dibuat.",
      });
    }

    // 2. Out of radius check-ins
    const outOfRadiusCount = recentAttendances.filter((a) => a.status === "DI LUAR RADIUS").length;
    if (outOfRadiusCount > 0) {
      alerts.push({
        studentId: p.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "MEDIUM",
        issue: `${outOfRadiusCount} Presensi Di Luar Radius DUDI`,
        details: "Terdeteksi presensi dari luar radius geofence yang ditentukan oleh perusahaan mitra.",
      });
    }

    // 3. Journal inactivity
    const lastJournal = p.journals[0];
    if (!lastJournal) {
      alerts.push({
        studentId: p.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "MEDIUM",
        issue: "Belum Mengisi Jurnal",
        details: "Belum ada laporan jurnal kegiatan harian yang diunggah siswa.",
      });
    } else {
      const daysSinceLastJournal = Math.floor(
        (now.getTime() - new Date(lastJournal.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastJournal >= 3) {
        alerts.push({
          studentId: p.studentId,
          studentName,
          className,
          companyName,
          teacherName,
          severity: "HIGH",
          issue: `Jurnal Tertunda ${daysSinceLastJournal} Hari`,
          details: `Terakhir kali mengisi jurnal pada ${new Date(lastJournal.date).toLocaleDateString("id-ID")}.`,
        });
      }
    }
  }

  return alerts;
};
