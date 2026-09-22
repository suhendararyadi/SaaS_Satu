import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import { ensureSchoolUser } from "./authGuards";

export function isSchoolAdminLike(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

export async function resolveStudentAffairsAccess(
  user: ReturnType<typeof ensureSchoolUser>,
) {
  if (isSchoolAdminLike(user as User)) {
    return {
      canAccess: true,
      canManageAll: true,
      homeroomClassIds: [] as string[],
      scope: "FULL" as const,
    };
  }

  if (user.role !== "TEACHER") {
    return {
      canAccess: false,
      canManageAll: false,
      homeroomClassIds: [] as string[],
      scope: "NONE" as const,
    };
  }

  const [principal, kesiswaan, activeYear] = await Promise.all([
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
      where: {
        schoolId: user.schoolId,
        teacherId: user.id,
        role: "KESISWAAN",
      },
      select: { id: true },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true },
    }),
  ]);

  if (principal || kesiswaan) {
    return {
      canAccess: true,
      canManageAll: true,
      homeroomClassIds: [] as string[],
      scope: principal ? ("PRINCIPAL" as const) : ("KESISWAAN" as const),
    };
  }

  if (!activeYear) {
    return {
      canAccess: false,
      canManageAll: false,
      homeroomClassIds: [] as string[],
      scope: "NONE" as const,
    };
  }

  const classes = await prisma.classRoom.findMany({
    where: {
      schoolId: user.schoolId,
      homeroomTeacherId: user.id,
      academicYearId: activeYear.id,
    },
    select: { id: true },
  });
  const homeroomClassIds = classes.map((item) => item.id);

  return {
    canAccess: homeroomClassIds.length > 0,
    canManageAll: false,
    homeroomClassIds,
    scope: homeroomClassIds.length > 0 ? ("HOMEROOM" as const) : ("NONE" as const),
  };
}

export function studentAffairsStudentWhere(
  user: ReturnType<typeof ensureSchoolUser>,
  access: Awaited<ReturnType<typeof resolveStudentAffairsAccess>>,
) {
  if (access.canManageAll) {
    return { schoolId: user.schoolId, role: "STUDENT" as const };
  }
  return {
    schoolId: user.schoolId,
    role: "STUDENT" as const,
    classRoomId: { in: access.homeroomClassIds },
  };
}

export async function requireStudentAffairsAccess(
  context: { user?: User },
) {
  const user = ensureSchoolUser(context);
  const access = await resolveStudentAffairsAccess(user);
  if (!access.canAccess) {
    throw new HttpError(
      403,
      "Kesiswaan Terpadu hanya tersedia untuk Admin, Kepala Sekolah, Waka Kesiswaan, atau Wali Kelas.",
    );
  }
  return { user, access };
}

export async function assertStudentAffairsStudent(
  user: ReturnType<typeof ensureSchoolUser>,
  access: Awaited<ReturnType<typeof resolveStudentAffairsAccess>>,
  studentId: string,
) {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      ...studentAffairsStudentWhere(user, access),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      classRoomId: true,
      classRoom: {
        select: {
          id: true,
          name: true,
          homeroomTeacherId: true,
        },
      },
    },
  });
  if (!student) {
    throw new HttpError(
      404,
      "Siswa tidak ditemukan atau berada di luar lingkup Kesiswaan Anda.",
    );
  }
  return student;
}
