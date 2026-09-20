import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireSchoolAdmin } from "../school/authGuards";
import {
  isValidPklDateRange,
  normalizeOptionalPklText,
} from "./foundationPolicy";

const optionalDate = z.string().optional().nullable();

function parseOptionalDateOrThrow(value: string | null | undefined, label: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new HttpError(400, `${label} tidak valid.`);
  }
  return date;
}

async function ensureAcademicYear(schoolId: string, id?: string | null) {
  if (!id) return null;
  const row = await prisma.academicYear.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!row) throw new HttpError(404, "Tahun ajaran tidak ditemukan di sekolah ini.");
  return row.id;
}

async function ensureCompany(schoolId: string, id: string) {
  const row = await prisma.company.findFirst({
    where: { id, schoolId },
    select: { id: true, name: true },
  });
  if (!row) throw new HttpError(404, "Mitra DUDI tidak ditemukan di sekolah ini.");
  return row;
}

async function ensureDepartment(schoolId: string, id: string) {
  const row = await prisma.department.findFirst({
    where: { id, schoolId },
    select: { id: true, code: true, name: true },
  });
  if (!row) throw new HttpError(404, "Konsentrasi keahlian tidak ditemukan di sekolah ini.");
  return row;
}

// ==========================================
// 1. PKL Period / Program
// ==========================================

export const getPklPeriods = async (_args: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  return prisma.pklPeriod.findMany({
    where: { schoolId: admin.schoolId },
    include: {
      academicYear: {
        select: { id: true, yearName: true, semester: true, isActive: true },
      },
      capacities: {
        include: {
          company: { select: { id: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
        },
      },
      _count: { select: { placements: true, capacities: true } },
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });
};

const periodSchema = z.object({
  name: z.string().trim().min(2, "Nama periode minimal 2 karakter").max(160),
  academicYearId: z.string().uuid().optional().nullable(),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
  isActive: z.boolean().default(true),
  notes: z.string().max(3000).optional().nullable(),
});

export const createPklPeriod = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(periodSchema, rawArgs);
  const startDate = parseOptionalDateOrThrow(args.startDate, "Tanggal mulai");
  const endDate = parseOptionalDateOrThrow(args.endDate, "Tanggal selesai");
  if (!isValidPklDateRange(startDate, endDate)) {
    throw new HttpError(400, "Tanggal selesai PKL harus setelah tanggal mulai.");
  }
  const academicYearId = await ensureAcademicYear(admin.schoolId, args.academicYearId);
  const existing = await prisma.pklPeriod.findUnique({
    where: { schoolId_name: { schoolId: admin.schoolId, name: args.name.trim() } },
    select: { id: true },
  });
  if (existing) throw new HttpError(400, "Nama periode PKL sudah digunakan di sekolah ini.");

  return prisma.pklPeriod.create({
    data: {
      schoolId: admin.schoolId,
      academicYearId,
      name: args.name.trim(),
      startDate: startDate!,
      endDate: endDate!,
      isActive: args.isActive,
      notes: normalizeOptionalPklText(args.notes),
    },
  });
};

const updatePeriodSchema = periodSchema.extend({ id: z.string().uuid() });

export const updatePklPeriod = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updatePeriodSchema, rawArgs);
  const current = await prisma.pklPeriod.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    select: { id: true },
  });
  if (!current) throw new HttpError(404, "Periode PKL tidak ditemukan.");

  const duplicate = await prisma.pklPeriod.findFirst({
    where: {
      schoolId: admin.schoolId,
      name: args.name.trim(),
      NOT: { id: args.id },
    },
    select: { id: true },
  });
  if (duplicate) throw new HttpError(400, "Nama periode PKL sudah digunakan di sekolah ini.");

  const startDate = parseOptionalDateOrThrow(args.startDate, "Tanggal mulai");
  const endDate = parseOptionalDateOrThrow(args.endDate, "Tanggal selesai");
  if (!isValidPklDateRange(startDate, endDate)) {
    throw new HttpError(400, "Tanggal selesai PKL harus setelah tanggal mulai.");
  }
  const academicYearId = await ensureAcademicYear(admin.schoolId, args.academicYearId);

  return prisma.pklPeriod.update({
    where: { id: args.id },
    data: {
      academicYearId,
      name: args.name.trim(),
      startDate: startDate!,
      endDate: endDate!,
      isActive: args.isActive,
      notes: normalizeOptionalPklText(args.notes),
    },
  });
};

const idSchema = z.object({ id: z.string().uuid() });

export const deletePklPeriod = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const row = await prisma.pklPeriod.findFirst({
    where: { id, schoolId: admin.schoolId },
    include: { _count: { select: { placements: true, capacities: true } } },
  });
  if (!row) throw new HttpError(404, "Periode PKL tidak ditemukan.");
  if (row._count.placements > 0 || row._count.capacities > 0) {
    throw new HttpError(
      400,
      "Periode PKL tidak dapat dihapus karena sudah memiliki penempatan atau konfigurasi kapasitas. Nonaktifkan periode agar histori tetap terjaga.",
    );
  }
  return prisma.pklPeriod.delete({ where: { id } });
};

// ==========================================
// 2. DUDI Mentor Master
// ==========================================

export const getDudiMentors = async (_args: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  return prisma.dudiMentorProfile.findMany({
    where: { schoolId: admin.schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { mentorPlacements: true } },
        },
      },
      company: { select: { id: true, name: true, isActive: true } },
    },
    orderBy: [{ company: { name: "asc" } }, { user: { name: "asc" } }],
  });
};

const mentorSchema = z.object({
  name: z.string().trim().min(2, "Nama pembimbing minimal 2 karakter").max(160),
  companyId: z.string().uuid(),
  position: z.string().max(200).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  email: z.string().email("Format email tidak valid").max(320).optional().nullable().or(z.literal("")),
  notes: z.string().max(3000).optional().nullable(),
  isActive: z.boolean().default(true),
});

async function ensureNoDuplicateDudiMentor(
  schoolId: string,
  companyId: string,
  name: string,
  excludeProfileId?: string,
) {
  const duplicate = await prisma.dudiMentorProfile.findFirst({
    where: {
      schoolId,
      companyId,
      ...(excludeProfileId ? { NOT: { id: excludeProfileId } } : {}),
      user: { name: { equals: name.trim(), mode: "insensitive" } },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpError(
      400,
      "Pembimbing DUDI dengan nama yang sama sudah terdaftar pada mitra ini.",
    );
  }
}

export const createDudiMentor = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(mentorSchema, rawArgs);
  await ensureCompany(admin.schoolId, args.companyId);
  await ensureNoDuplicateDudiMentor(admin.schoolId, args.companyId, args.name);

  return prisma.$transaction(async (tx) => {
    // Master-only user. No Auth, password, username, or login email is created here.
    const user = await tx.user.create({
      data: {
        schoolId: admin.schoolId,
        role: "DUDI_MENTOR",
        name: args.name.trim(),
      },
      select: { id: true, name: true, role: true },
    });

    const profile = await tx.dudiMentorProfile.create({
      data: {
        schoolId: admin.schoolId,
        userId: user.id,
        companyId: args.companyId,
        position: normalizeOptionalPklText(args.position),
        phone: normalizeOptionalPklText(args.phone),
        email: normalizeOptionalPklText(args.email),
        notes: normalizeOptionalPklText(args.notes),
        isActive: args.isActive,
      },
    });

    return { user, profile };
  });
};

const updateMentorSchema = mentorSchema.extend({ id: z.string().uuid() });

export const updateDudiMentor = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateMentorSchema, rawArgs);
  const current = await prisma.dudiMentorProfile.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    select: { id: true, userId: true },
  });
  if (!current) throw new HttpError(404, "Pembimbing DUDI tidak ditemukan.");
  await ensureCompany(admin.schoolId, args.companyId);
  await ensureNoDuplicateDudiMentor(
    admin.schoolId,
    args.companyId,
    args.name,
    args.id,
  );

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: current.userId },
      data: { name: args.name.trim() },
    });
    return tx.dudiMentorProfile.update({
      where: { id: args.id },
      data: {
        companyId: args.companyId,
        position: normalizeOptionalPklText(args.position),
        phone: normalizeOptionalPklText(args.phone),
        email: normalizeOptionalPklText(args.email),
        notes: normalizeOptionalPklText(args.notes),
        isActive: args.isActive,
      },
      include: { user: { select: { id: true, name: true } }, company: true },
    });
  });
};

export const deleteDudiMentor = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const profile = await prisma.dudiMentorProfile.findFirst({
    where: { id, schoolId: admin.schoolId },
    select: { id: true, isActive: true },
  });
  if (!profile) throw new HttpError(404, "Pembimbing DUDI tidak ditemukan.");

  // Foundation Gen2 uses archive semantics so historical placement/login
  // relationships can never be destroyed by a master-data cleanup action.
  return prisma.dudiMentorProfile.update({
    where: { id },
    data: { isActive: false },
  });
};

const companyDepartmentsSchema = z.object({
  companyId: z.string().uuid(),
  departmentIds: z.array(z.string().uuid()).max(100),
});

export const setCompanyDepartments = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(companyDepartmentsSchema, rawArgs);
  await ensureCompany(admin.schoolId, args.companyId);
  const ids = [...new Set(args.departmentIds)];

  if (ids.length) {
    const count = await prisma.department.count({
      where: { schoolId: admin.schoolId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new HttpError(400, "Ada konsentrasi keahlian yang bukan milik sekolah aktif.");
    }
  }

  const current = await prisma.companyDepartment.findMany({
    where: { schoolId: admin.schoolId, companyId: args.companyId },
    select: { departmentId: true },
  });
  const removedIds = current
    .map((item) => item.departmentId)
    .filter((departmentId) => !ids.includes(departmentId));

  if (removedIds.length > 0) {
    const capacityCount = await prisma.pklCompanyCapacity.count({
      where: {
        schoolId: admin.schoolId,
        companyId: args.companyId,
        departmentId: { in: removedIds },
      },
    });
    if (capacityCount > 0) {
      throw new HttpError(
        400,
        "Konsentrasi belum dapat dilepas karena masih memiliki konfigurasi kapasitas. Hapus kapasitas terkait terlebih dahulu.",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (removedIds.length > 0) {
      await tx.companyDepartment.deleteMany({
        where: {
          schoolId: admin.schoolId,
          companyId: args.companyId,
          departmentId: { in: removedIds },
        },
      });
    }

    for (const departmentId of ids) {
      await tx.companyDepartment.upsert({
        where: {
          companyId_departmentId: {
            companyId: args.companyId,
            departmentId,
          },
        },
        create: {
          schoolId: admin.schoolId,
          companyId: args.companyId,
          departmentId,
          isActive: true,
        },
        update: { isActive: true },
      });
    }

    return tx.companyDepartment.findMany({
      where: {
        schoolId: admin.schoolId,
        companyId: args.companyId,
        isActive: true,
      },
      include: { department: true },
      orderBy: { department: { code: "asc" } },
    });
  });
};

// ==========================================
// 3. Capacity by Period x DUDI x Department
// ==========================================

const capacityFilterSchema = z.object({
  periodId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
}).optional();

export const getPklCompanyCapacities = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const filter = ensureArgsSchemaOrThrowHttpError(capacityFilterSchema || z.any(), rawArgs || {});
  return prisma.pklCompanyCapacity.findMany({
    where: {
      schoolId: admin.schoolId,
      ...(filter?.periodId ? { periodId: filter.periodId } : {}),
      ...(filter?.companyId ? { companyId: filter.companyId } : {}),
    },
    include: {
      period: { select: { id: true, name: true, startDate: true, endDate: true, isActive: true } },
      company: { select: { id: true, name: true, maxQuota: true, isActive: true } },
      department: { select: { id: true, code: true, name: true } },
    },
    orderBy: [
      { period: { startDate: "desc" } },
      { company: { name: "asc" } },
      { department: { code: "asc" } },
    ],
  });
};

const capacitySchema = z.object({
  periodId: z.string().uuid(),
  companyId: z.string().uuid(),
  departmentId: z.string().uuid(),
  quota: z.number().int().min(1, "Kuota minimal 1 siswa").max(999),
  notes: z.string().max(2000).optional().nullable(),
});

export const savePklCompanyCapacity = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(capacitySchema, rawArgs);

  const [period, company, department] = await Promise.all([
    prisma.pklPeriod.findFirst({ where: { id: args.periodId, schoolId: admin.schoolId }, select: { id: true } }),
    ensureCompany(admin.schoolId, args.companyId),
    ensureDepartment(admin.schoolId, args.departmentId),
  ]);
  if (!period) throw new HttpError(404, "Periode PKL tidak ditemukan di sekolah ini.");

  return prisma.$transaction(async (tx) => {
    await tx.companyDepartment.upsert({
      where: {
        companyId_departmentId: {
          companyId: company.id,
          departmentId: department.id,
        },
      },
      create: {
        schoolId: admin.schoolId,
        companyId: company.id,
        departmentId: department.id,
        isActive: true,
      },
      update: { isActive: true },
    });

    return tx.pklCompanyCapacity.upsert({
      where: {
        periodId_companyId_departmentId: {
          periodId: args.periodId,
          companyId: company.id,
          departmentId: department.id,
        },
      },
      create: {
        schoolId: admin.schoolId,
        periodId: args.periodId,
        companyId: company.id,
        departmentId: department.id,
        quota: args.quota,
        notes: normalizeOptionalPklText(args.notes),
      },
      update: {
        quota: args.quota,
        notes: normalizeOptionalPklText(args.notes),
      },
      include: { period: true, company: true, department: true },
    });
  });
};

export const deletePklCompanyCapacity = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const row = await prisma.pklCompanyCapacity.findFirst({
    where: { id, schoolId: admin.schoolId },
    select: { id: true },
  });
  if (!row) throw new HttpError(404, "Kapasitas PKL tidak ditemukan.");
  return prisma.pklCompanyCapacity.delete({ where: { id } });
};
