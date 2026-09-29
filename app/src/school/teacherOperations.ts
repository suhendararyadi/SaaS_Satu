import { randomBytes } from "node:crypto";
import { HttpError, prisma } from "wasp/server";
import {
  createProviderId,
  findAuthIdentity,
  getProviderDataWithPassword,
  sanitizeAndSerializeProviderData,
  updateAuthIdentityProviderData,
} from "wasp/auth/utils";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireSchoolAdmin, requireSchoolDirectoryAccess } from "./authGuards";
import { buildTeacherTemporaryLoginEmail } from "./teacherLoginPolicy";

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
    const auth = canManage
      ? await prisma.auth.findUnique({
          where: { userId: teacher.id },
          select: {
            id: true,
            identities: {
              where: { providerName: "email" },
              select: { providerUserId: true },
              take: 1,
            },
          },
        })
      : null;
    return {
      teacher,
      canManage,
      profileStats,
      hasLogin: !!auth,
      loginEmail: auth?.identities?.[0]?.providerUserId || null,
    };
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
const provisionTeacherLoginSchema = z.object({
  teacherId: z.string().uuid("ID guru tidak valid"),
  confirm: z.literal("PROVISION_TEACHER_TEMPORARY_LOGIN"),
});

const resetTeacherLoginSchema = z.object({
  teacherId: z.string().uuid("ID guru tidak valid"),
  confirm: z.literal("RESET_TEACHER_TEMPORARY_PASSWORD"),
});

const revokeTeacherLoginSchema = z.object({
  teacherId: z.string().uuid("ID guru tidak valid"),
  confirm: z.literal("REVOKE_TEACHER_LOGIN"),
});

async function getTeacherLoginTarget(schoolId: string, teacherId: string) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, schoolId, role: "TEACHER" },
    include: {
      auth: { include: { identities: true } },
      teacherProfile: { select: { nip: true } },
    },
  });
  if (!teacher) throw new HttpError(404, "Guru/GTK tidak ditemukan di unit sekolah ini.");
  return teacher;
}

function generateTeacherTemporaryPassword() {
  return "TmpGTK-" + randomBytes(12).toString("base64url") + "!7a";
}

export const provisionTeacherLogin = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(provisionTeacherLoginSchema, rawArgs);
  const teacher = await getTeacherLoginTarget(admin.schoolId, args.teacherId);
  if (teacher.auth) throw new HttpError(409, "Guru/GTK ini sudah memiliki akun login.");

  let loginEmail = buildTeacherTemporaryLoginEmail({
    id: teacher.id,
    username: teacher.username,
    nip: teacher.teacherProfile?.nip,
    email: teacher.email,
  });
  let providerId = createProviderId("email", loginEmail);
  if (await findAuthIdentity(providerId)) {
    loginEmail = buildTeacherTemporaryLoginEmail({
      id: teacher.id,
      username: teacher.username,
      nip: teacher.teacherProfile?.nip,
      email: teacher.email,
      forceIdSuffix: true,
    });
    providerId = createProviderId("email", loginEmail);
    if (await findAuthIdentity(providerId)) {
      throw new HttpError(409, "Identitas login Guru/GTK sudah digunakan. Hubungi administrator.");
    }
  }

  const temporaryPassword = generateTeacherTemporaryPassword();
  const providerData = await sanitizeAndSerializeProviderData<"email">({
    hashedPassword: temporaryPassword,
    isEmailVerified: true,
    emailVerificationSentAt: null,
    passwordResetSentAt: null,
  });

  await prisma.auth.create({
    data: {
      userId: teacher.id,
      identities: {
        create: {
          providerName: providerId.providerName,
          providerUserId: providerId.providerUserId,
          providerData,
        },
      },
    },
  });

  return { teacherId: teacher.id, name: teacher.name, loginEmail, temporaryPassword };
};

export const resetTeacherLoginPassword = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(resetTeacherLoginSchema, rawArgs);
  const teacher = await getTeacherLoginTarget(admin.schoolId, args.teacherId);
  if (!teacher.auth) throw new HttpError(409, "Guru/GTK ini belum memiliki akun login.");

  const identity = teacher.auth.identities.find((item) => item.providerName === "email");
  if (!identity) {
    throw new HttpError(409, "Akun Guru/GTK tidak menggunakan login email yang dapat direset dari panel sekolah.");
  }

  const providerId = createProviderId("email", identity.providerUserId);
  const existingProviderData = getProviderDataWithPassword<"email">(identity.providerData);
  const temporaryPassword = generateTeacherTemporaryPassword();
  await updateAuthIdentityProviderData<"email">(providerId, existingProviderData, {
    hashedPassword: temporaryPassword,
    isEmailVerified: true,
    passwordResetSentAt: null,
  });
  await prisma.session.deleteMany({ where: { userId: teacher.auth.id } });

  return {
    teacherId: teacher.id,
    name: teacher.name,
    loginEmail: identity.providerUserId,
    temporaryPassword,
  };
};

export const revokeTeacherLogin = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(revokeTeacherLoginSchema, rawArgs);
  const teacher = await getTeacherLoginTarget(admin.schoolId, args.teacherId);
  if (!teacher.auth) return { teacherId: teacher.id, revoked: false };
  await prisma.auth.delete({ where: { id: teacher.auth.id } });
  return { teacherId: teacher.id, revoked: true };
};
