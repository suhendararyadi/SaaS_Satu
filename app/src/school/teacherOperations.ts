import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireSchoolAdmin, requireSchoolDirectoryAccess } from "./authGuards";

const teacherDetailSchema = z.object({
  id: z.string().uuid(),
});

const profileCompletenessKeys = [
  "nip",
  "nuptk",
  "gender",
  "birthPlace",
  "birthDate",
  "nik",
  "employmentStatus",
  "ptkType",
  "frontTitle",
  "backTitle",
  "educationLevel",
  "educationMajor",
  "certification",
  "workStartDate",
  "additionalDuties",
  "subjectsTaught",
  "additionalDutyHours",
  "teachingHours",
  "totalTeachingHours",
  "studentLoad",
  "competencies",
  "jobTitle",
] as const;

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

export const getSchoolTeacherDetail = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const viewer = requireSchoolDirectoryAccess(context);
  const args = ensureArgsSchemaOrThrowHttpError(teacherDetailSchema, rawArgs);

  const teacher = await prisma.user.findFirst({
    where: {
      id: args.id,
      schoolId: viewer.schoolId,
      role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      teacherProfile: true,
      wakasekAssignments: {
        select: { id: true, role: true },
        orderBy: { role: "asc" },
      },
      staffAssignments: {
        where: {
          isActive: true,
          OR: [{ academicYearId: null }, { academicYear: { isActive: true } }],
        },
        select: {
          id: true,
          role: true,
          unitName: true,
          customTitle: true,
          notes: true,
          department: { select: { id: true, code: true, name: true } },
          academicYear: {
            select: { id: true, yearName: true, semester: true, isActive: true },
          },
        },
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
      },
      homeroomClasses: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          department: { select: { id: true, code: true, name: true } },
          academicYear: {
            select: { id: true, yearName: true, semester: true, isActive: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!teacher) {
    throw new HttpError(
      404,
      "Data guru atau tenaga kependidikan tidak ditemukan di unit sekolah ini.",
    );
  }

  const canManage =
    !!viewer.isAdmin ||
    viewer.role === "SUPERADMIN" ||
    viewer.role === "SCHOOL_ADMIN";

  const profile = teacher.teacherProfile;
  const totalFields = profileCompletenessKeys.length + 3; // name, email, phone
  const filledFields =
    (hasValue(teacher.name) ? 1 : 0) +
    (hasValue(teacher.email) ? 1 : 0) +
    (hasValue(profile?.phone) ? 1 : 0) +
    profileCompletenessKeys.filter((key) => hasValue(profile?.[key])).length;

  const profileStats = {
    totalFields,
    filledFields,
    completeness: Math.round((filledFields / Math.max(totalFields, 1)) * 100),
  };

  if (canManage || !profile) {
    return { teacher, canManage, profileStats };
  }

  return {
    teacher: {
      ...teacher,
      teacherProfile: {
        ...profile,
        nuptk: null,
        nik: null,
        birthPlace: null,
        birthDate: null,
      },
    },
    canManage,
    profileStats,
  };
};


const nullableText = z.string().trim().max(5000).optional().nullable();
const optionalDateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
  .optional()
  .nullable();
const optionalHours = z.number().int().min(0).max(999).optional().nullable();

const updateSchoolTeacherProfileSchema = z.object({
  id: z.string().uuid("ID PTK tidak valid"),
  name: z.string().trim().min(1, "Nama lengkap PTK wajib diisi").max(160),
  nip: z.string().trim().max(64).optional().nullable(),
  nuptk: z.string().trim().max(64).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  birthPlace: z.string().trim().max(160).optional().nullable(),
  birthDate: optionalDateText,
  nik: z.string().trim().max(64).optional().nullable(),
  employmentStatus: z.string().trim().max(160).optional().nullable(),
  ptkType: z.string().trim().max(160).optional().nullable(),
  frontTitle: z.string().trim().max(80).optional().nullable(),
  backTitle: z.string().trim().max(120).optional().nullable(),
  educationLevel: z.string().trim().max(80).optional().nullable(),
  educationMajor: z.string().trim().max(300).optional().nullable(),
  certification: nullableText,
  workStartDate: optionalDateText,
  additionalDuties: nullableText,
  subjectsTaught: nullableText,
  additionalDutyHours: optionalHours,
  teachingHours: optionalHours,
  totalTeachingHours: optionalHours,
  studentLoad: z.string().trim().max(300).optional().nullable(),
  competencies: nullableText,
  jobTitle: z.string().trim().max(300).optional().nullable(),
  email: z
    .string()
    .email("Format email tidak valid")
    .max(320)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().max(80).optional().nullable(),
  role: z.enum(["TEACHER", "SCHOOL_ADMIN"]),
});

function cleanOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = value.trim();
  return cleaned === "" ? null : cleaned;
}

function toOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value + "T00:00:00.000Z");
}

export const updateSchoolTeacherProfile = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateSchoolTeacherProfileSchema,
    rawArgs,
  );

  const target = await prisma.user.findFirst({
    where: {
      id: args.id,
      schoolId: admin.schoolId,
      role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
    },
    include: { teacherProfile: true },
  });

  if (!target) {
    throw new HttpError(
      404,
      "Data guru atau tenaga kependidikan tidak ditemukan di unit sekolah ini.",
    );
  }

  const email = cleanOptionalText(args.email);
  const nip = cleanOptionalText(args.nip);
  const nuptk = cleanOptionalText(args.nuptk);
  const nik = cleanOptionalText(args.nik);

  if (email && email !== target.email) {
    const duplicateEmail = await prisma.user.findUnique({ where: { email } });
    if (duplicateEmail && duplicateEmail.id !== args.id) {
      throw new HttpError(400, "Email sudah digunakan oleh pengguna lain.");
    }
  }

  if (nip && nip !== target.teacherProfile?.nip) {
    const duplicateNip = await prisma.teacherProfile.findFirst({
      where: {
        nip,
        user: { schoolId: admin.schoolId },
        NOT: { userId: args.id },
      },
      select: { id: true },
    });
    if (duplicateNip) {
      throw new HttpError(400, `NIP ${nip} sudah digunakan PTK lain di sekolah ini.`);
    }
  }

  if (nuptk && nuptk !== target.teacherProfile?.nuptk) {
    const duplicateNuptk = await prisma.teacherProfile.findFirst({
      where: {
        nuptk,
        user: { schoolId: admin.schoolId },
        NOT: { userId: args.id },
      },
      select: { id: true },
    });
    if (duplicateNuptk) {
      throw new HttpError(
        400,
        `NUPTK ${nuptk} sudah digunakan PTK lain di sekolah ini.`,
      );
    }
  }

  if (nik && nik !== target.teacherProfile?.nik) {
    const duplicateNik = await prisma.teacherProfile.findFirst({
      where: {
        nik,
        user: { schoolId: admin.schoolId },
        NOT: { userId: args.id },
      },
      select: { id: true },
    });
    if (duplicateNik) {
      throw new HttpError(400, "NIK sudah digunakan PTK lain di sekolah ini.");
    }
  }

  const profileData = {
    nip,
    nuptk,
    gender: args.gender || null,
    birthPlace: cleanOptionalText(args.birthPlace),
    birthDate: toOptionalDate(args.birthDate),
    nik,
    employmentStatus: cleanOptionalText(args.employmentStatus),
    ptkType: cleanOptionalText(args.ptkType),
    frontTitle: cleanOptionalText(args.frontTitle),
    backTitle: cleanOptionalText(args.backTitle),
    title: cleanOptionalText(args.backTitle),
    educationLevel: cleanOptionalText(args.educationLevel),
    educationMajor: cleanOptionalText(args.educationMajor),
    certification: cleanOptionalText(args.certification),
    workStartDate: toOptionalDate(args.workStartDate),
    additionalDuties: cleanOptionalText(args.additionalDuties),
    subjectsTaught: cleanOptionalText(args.subjectsTaught),
    additionalDutyHours: args.additionalDutyHours ?? null,
    teachingHours: args.teachingHours ?? null,
    totalTeachingHours: args.totalTeachingHours ?? null,
    studentLoad: cleanOptionalText(args.studentLoad),
    competencies: cleanOptionalText(args.competencies),
    jobTitle: cleanOptionalText(args.jobTitle),
    phone: cleanOptionalText(args.phone),
  };

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: args.id },
      data: {
        name: args.name.trim(),
        email,
        role: args.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const teacherProfile = await tx.teacherProfile.upsert({
      where: { userId: args.id },
      create: {
        userId: args.id,
        ...profileData,
      },
      update: profileData,
    });

    return { user: updatedUser, teacherProfile };
  });
};
