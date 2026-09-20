import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, requireStudent, requirePklAccess, requirePklMonitoring, requireAnySchoolCapability } from "../school/authGuards";
import { type SchoolScopedUser } from "../school/types";
import { calculateDistanceMeters, isWithinGeofence } from "./geofence";
import { getPklEwsAlertsForScope } from "./ews";
import {
  isValidPklDateRange,
  normalizeOptionalPklText,
  normalizePklCode,
  parsePklDate,
  PKL_PARTNERSHIP_STATUSES,
} from "./foundationPolicy";


function getPklPlacementScope(user: SchoolScopedUser) {
  if (user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN") return {};
  if (user.role === "STUDENT") return { studentId: user.id };
  if (user.role === "TEACHER") return { teacherSupervisorId: user.id };
  if (user.role === "DUDI_MENTOR") return { dudiMentorId: user.id };
  throw new HttpError(403, "Peran akun ini tidak memiliki akses ke data PKL.");
}

// ==========================================
// 1. DUDI / Company Operations
// ==========================================

export const getCompanies = async (_args: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);

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
      departmentLinks: {
        where: { isActive: true },
        include: { department: { select: { id: true, code: true, name: true } } },
        orderBy: { department: { code: "asc" } },
      },
      _count: {
        select: { placements: true, mentors: true, pklCapacities: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const companySchema = z.object({
  code: z.string().trim().max(40).optional().nullable(),
  name: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  legalName: z.string().trim().max(240).optional().nullable(),
  industrySector: z.string().optional(),
  address: z.string().min(3, "Alamat wajib diisi"),
  phone: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email("Format email mitra tidak valid").max(320).optional().nullable().or(z.literal("")),
  website: z.string().trim().url("Format website harus URL lengkap").max(500).optional().nullable().or(z.literal("")),
  picName: z.string().optional(),
  picPhone: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  radiusMeters: z.number().int().min(10).max(5000).default(100),
  maxQuota: z.number().int().min(1).default(5),
  partnershipStatus: z.enum(PKL_PARTNERSHIP_STATUSES).default("ACTIVE"),
  partnershipStartDate: z.string().optional().nullable(),
  partnershipEndDate: z.string().optional().nullable(),
  mouNumber: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().default(true),
});

function parseCompanyPartnershipDates(
  startValue?: string | null,
  endValue?: string | null,
) {
  const partnershipStartDate = parsePklDate(startValue);
  const partnershipEndDate = parsePklDate(endValue);
  if (startValue && !partnershipStartDate) {
    throw new HttpError(400, "Tanggal mulai kerja sama tidak valid.");
  }
  if (endValue && !partnershipEndDate) {
    throw new HttpError(400, "Tanggal selesai kerja sama tidak valid.");
  }
  if (!isValidPklDateRange(partnershipStartDate, partnershipEndDate)) {
    throw new HttpError(400, "Tanggal mulai kerja sama harus lebih awal daripada tanggal selesai.");
  }
  return { partnershipStartDate, partnershipEndDate };
}

async function ensureUniqueCompanyCode(
  schoolId: string,
  code: string | null,
  excludeId?: string,
) {
  if (!code) return;
  const duplicate = await prisma.company.findFirst({
    where: {
      schoolId,
      code,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) throw new HttpError(400, "Kode mitra sudah digunakan: " + code);
}

export const createCompany = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(companySchema, rawArgs);
  const code = normalizePklCode(args.code);
  const { partnershipStartDate, partnershipEndDate } = parseCompanyPartnershipDates(
    args.partnershipStartDate,
    args.partnershipEndDate,
  );
  await ensureUniqueCompanyCode(admin.schoolId, code);

  return prisma.company.create({
    data: {
      schoolId: admin.schoolId,
      code,
      name: args.name.trim(),
      legalName: normalizeOptionalPklText(args.legalName),
      industrySector: args.industrySector?.trim() || null,
      address: args.address.trim(),
      phone: normalizeOptionalPklText(args.phone),
      email: normalizeOptionalPklText(args.email),
      website: normalizeOptionalPklText(args.website),
      picName: args.picName?.trim() || null,
      picPhone: args.picPhone?.trim() || null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      radiusMeters: args.radiusMeters,
      maxQuota: args.maxQuota,
      partnershipStatus: args.partnershipStatus,
      partnershipStartDate,
      partnershipEndDate,
      mouNumber: normalizeOptionalPklText(args.mouNumber),
      notes: normalizeOptionalPklText(args.notes),
      isActive: args.isActive,
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

  const code = normalizePklCode(args.code);
  const { partnershipStartDate, partnershipEndDate } = parseCompanyPartnershipDates(
    args.partnershipStartDate,
    args.partnershipEndDate,
  );
  await ensureUniqueCompanyCode(admin.schoolId, code, args.id);

  return prisma.company.update({
    where: { id: args.id },
    data: {
      code,
      name: args.name.trim(),
      legalName: normalizeOptionalPklText(args.legalName),
      industrySector: args.industrySector?.trim() || null,
      address: args.address.trim(),
      phone: normalizeOptionalPklText(args.phone),
      email: normalizeOptionalPklText(args.email),
      website: normalizeOptionalPklText(args.website),
      picName: args.picName?.trim() || null,
      picPhone: args.picPhone?.trim() || null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      radiusMeters: args.radiusMeters,
      maxQuota: args.maxQuota,
      partnershipStatus: args.partnershipStatus,
      partnershipStartDate,
      partnershipEndDate,
      mouNumber: normalizeOptionalPklText(args.mouNumber),
      notes: normalizeOptionalPklText(args.notes),
      isActive: args.isActive,
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
    include: {
      _count: {
        select: { placements: true, mentors: true, pklCapacities: true },
      },
    },
  });
  if (!company) throw new HttpError(404, "Data perusahaan tidak ditemukan.");

  if (
    company._count.placements > 0 ||
    company._count.mentors > 0 ||
    company._count.pklCapacities > 0
  ) {
    throw new HttpError(
      400,
      "Mitra DUDI tidak dapat dihapus karena sudah memiliki histori penempatan, pembimbing DUDI, atau konfigurasi kapasitas. Nonaktifkan mitra agar histori tetap terjaga.",
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
  const user = requirePklAccess(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getPlacementsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.placement.findMany({
    where: {
      schoolId: user.schoolId,
      ...(filter?.companyId ? { companyId: filter.companyId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...getPklPlacementScope(user),
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
  const startDate = new Date(args.startDate);
  const endDate = new Date(args.endDate);

  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) {
    throw new HttpError(400, "Tanggal mulai PKL harus lebih awal daripada tanggal selesai.");
  }

  const student = await prisma.user.findFirst({
    where: { id: args.studentId, schoolId: admin.schoolId, role: "STUDENT" },
    select: { id: true },
  });
  if (!student) throw new HttpError(404, "Siswa tidak ditemukan di unit sekolah ini.");

  if (args.teacherSupervisorId) {
    const supervisor = await prisma.user.findFirst({
      where: {
        id: args.teacherSupervisorId,
        schoolId: admin.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    });
    if (!supervisor) throw new HttpError(404, "Guru pembimbing tidak ditemukan di unit sekolah ini.");
  }

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
      startDate,
      endDate,
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

  const placement = await prisma.placement.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!placement) throw new HttpError(404, "Data penempatan PKL tidak ditemukan.");

  if (args.teacherSupervisorId) {
    const supervisor = await prisma.user.findFirst({
      where: {
        id: args.teacherSupervisorId,
        schoolId: admin.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    });
    if (!supervisor) throw new HttpError(404, "Guru pembimbing tidak ditemukan di unit sekolah ini.");
  }

  const startDate = args.startDate ? new Date(args.startDate) : placement.startDate;
  const endDate = args.endDate ? new Date(args.endDate) : placement.endDate;
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) {
    throw new HttpError(400, "Tanggal mulai PKL harus lebih awal daripada tanggal selesai.");
  }

  return prisma.placement.update({
    where: { id: args.id },
    data: {
      ...(args.teacherSupervisorId !== undefined ? { teacherSupervisorId: args.teacherSupervisorId } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.startDate ? { startDate } : {}),
      ...(args.endDate ? { endDate } : {}),
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
  const user = requireStudent(context);
  if (user.role !== "STUDENT") {
    throw new HttpError(403, "Presensi PKL hanya dapat dicatat oleh akun peserta didik.");
  }
  const args = ensureArgsSchemaOrThrowHttpError(recordAttendanceSchema, rawArgs);

  // Validate placement belongs to user or admin
  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: user.schoolId,
      studentId: user.id,
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
  const existingAttendance = await prisma.attendanceLog.findFirst({
    where: { placementId: placement.id, dateOnly, type: args.type },
    select: { id: true },
  });
  if (existingAttendance) {
    throw new HttpError(409, `Presensi ${args.type} untuk hari ini sudah tercatat.`);
  }

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
  const user = requirePklAccess(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getAttendanceLogsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.attendanceLog.findMany({
    where: {
      placement: {
        schoolId: user.schoolId,
        ...(filter?.placementId ? { id: filter.placementId } : {}),
        ...getPklPlacementScope(user),
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
  const user = requireStudent(context);
  if (user.role !== "STUDENT") {
    throw new HttpError(403, "Jurnal PKL hanya dapat dibuat oleh akun peserta didik.");
  }
  const args = ensureArgsSchemaOrThrowHttpError(createDailyJournalSchema, rawArgs);

  const placement = await prisma.placement.findFirst({
    where: {
      id: args.placementId,
      schoolId: user.schoolId,
      studentId: user.id,
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
  const user = requirePklAccess(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getDailyJournalsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.dailyJournal.findMany({
    where: {
      placement: {
        schoolId: user.schoolId,
        ...(filter?.placementId ? { id: filter.placementId } : {}),
        ...getPklPlacementScope(user),
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
  const reviewer = requireAnySchoolCapability(context, ["teach", "mentor"]);
  const args = ensureArgsSchemaOrThrowHttpError(reviewDailyJournalSchema, rawArgs);

  const reviewerScope =
    !reviewer.isAdmin && reviewer.role === "TEACHER"
      ? { teacherSupervisorId: reviewer.id }
      : !reviewer.isAdmin && reviewer.role === "DUDI_MENTOR"
        ? { dudiMentorId: reviewer.id }
        : {};

  const journal = await prisma.dailyJournal.findFirst({
    where: {
      id: args.id,
      placement: {
        schoolId: reviewer.schoolId,
        ...reviewerScope,
      },
    },
    select: { id: true },
  });
  if (!journal) {
    throw new HttpError(404, "Jurnal PKL tidak ditemukan atau bukan dalam bimbingan Anda.");
  }

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
  const user = requirePklMonitoring(context);
  return getPklEwsAlertsForScope(user.schoolId, getPklPlacementScope(user));
};
