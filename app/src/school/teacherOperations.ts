import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireSchoolDirectoryAccess } from "./authGuards";

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
