import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, ensureAuthenticated } from "./authGuards";

// ==========================================
// 1. School Profile & Onboarding Operations
// ==========================================

export const getSchoolInfo = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    include: {
      _count: {
        select: {
          users: true,
          departments: true,
          classRooms: true,
          academicYears: true,
          companies: true,
          placements: true,
        },
      },
    },
  });

  if (!school) {
    throw new HttpError(404, "Data sekolah tidak ditemukan.");
  }

  // Count teachers and students
  const [teacherCount, studentCount] = await Promise.all([
    prisma.user.count({
      where: { schoolId: user.schoolId, role: "TEACHER" },
    }),
    prisma.user.count({
      where: { schoolId: user.schoolId, role: "STUDENT" },
    }),
  ]);

  return {
    ...school,
    teacherCount,
    studentCount,
  };
};

const registerSchoolSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  npsn: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export const registerSchool = async (rawArgs: unknown, context: { user?: User }) => {
  ensureAuthenticated(context);
  const args = ensureArgsSchemaOrThrowHttpError(registerSchoolSchema, rawArgs);

  // Generate unique slug
  let baseSlug = args.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!baseSlug) baseSlug = "sekolah";

  let slug = baseSlug;
  let counter = 1;
  while (await prisma.school.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const school = await prisma.school.create({
    data: {
      name: args.name,
      slug,
      npsn: args.npsn || null,
      address: args.address || null,
      city: args.city || null,
      province: args.province || null,
      phone: args.phone || null,
      email: args.email || null,
      tier: "FREE_TRIAL",
      studentQuota: 100,
      subscriptionStatus: "active",
    },
  });

  // Associate user as School Admin
  await prisma.user.update({
    where: { id: context.user.id },
    data: {
      schoolId: school.id,
      role: "SCHOOL_ADMIN",
    },
  });

  // Create default Academic Year (current year)
  const currentYear = new Date().getFullYear();
  await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      yearName: `${currentYear}/${currentYear + 1}`,
      semester: "GANJIL",
      isActive: true,
    },
  });

  return school;
};

const updateSchoolInfoSchema = z.object({
  name: z.string().min(3).optional(),
  npsn: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
});

export const updateSchoolInfo = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateSchoolInfoSchema, rawArgs);

  const updated = await prisma.school.update({
    where: { id: user.schoolId },
    data: {
      ...(args.name ? { name: args.name } : {}),
      npsn: args.npsn ?? undefined,
      address: args.address ?? undefined,
      city: args.city ?? undefined,
      province: args.province ?? undefined,
      phone: args.phone ?? undefined,
      email: args.email || undefined,
      logoUrl: args.logoUrl ?? undefined,
    },
  });

  return updated;
};

// ==========================================
// 2. Department (Jurusan) Operations
// ==========================================

export const getDepartments = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  return prisma.department.findMany({
    where: { schoolId: user.schoolId },
    include: {
      _count: {
        select: { classes: true },
      },
    },
    orderBy: { code: "asc" },
  });
};

const departmentSchema = z.object({
  code: z.string().min(1, "Kode jurusan wajib diisi").max(20),
  name: z.string().min(2, "Nama jurusan wajib diisi"),
});

export const createDepartment = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(departmentSchema, rawArgs);

  const existing = await prisma.department.findUnique({
    where: {
      schoolId_code: {
        schoolId: user.schoolId,
        code: args.code.toUpperCase().trim(),
      },
    },
  });

  if (existing) {
    throw new HttpError(400, `Jurusan dengan kode "${args.code}" sudah terdaftar.`);
  }

  return prisma.department.create({
    data: {
      schoolId: user.schoolId,
      code: args.code.toUpperCase().trim(),
      name: args.name.trim(),
    },
  });
};

const updateDepartmentSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(2),
});

export const updateDepartment = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateDepartmentSchema, rawArgs);

  const dept = await prisma.department.findFirst({
    where: { id: args.id, schoolId: user.schoolId },
  });
  if (!dept) {
    throw new HttpError(404, "Data jurusan tidak ditemukan.");
  }

  return prisma.department.update({
    where: { id: args.id },
    data: {
      code: args.code.toUpperCase().trim(),
      name: args.name.trim(),
    },
  });
};

const deleteDepartmentSchema = z.object({
  id: z.string().uuid(),
});

export const deleteDepartment = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteDepartmentSchema, rawArgs);

  const dept = await prisma.department.findFirst({
    where: { id, schoolId: user.schoolId },
    include: { _count: { select: { classes: true } } },
  });
  if (!dept) {
    throw new HttpError(404, "Data jurusan tidak ditemukan.");
  }

  if (dept._count.classes > 0) {
    throw new HttpError(
      400,
      `Tidak dapat menghapus jurusan ini karena masih memiliki ${dept._count.classes} rombel kelas.`
    );
  }

  return prisma.department.delete({ where: { id } });
};

// ==========================================
// 3. Academic Year (Tahun Ajaran) Operations
// ==========================================

export const getAcademicYears = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  return prisma.academicYear.findMany({
    where: { schoolId: user.schoolId },
    include: {
      _count: {
        select: { classes: true, courses: true },
      },
    },
    orderBy: [{ yearName: "desc" }, { semester: "asc" }],
  });
};

const createAcademicYearSchema = z.object({
  yearName: z.string().regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran harus YYYY/YYYY (contoh: 2026/2027)"),
  semester: z.enum(["GANJIL", "GENAP"]),
  isActive: z.boolean().default(false),
});

export const createAcademicYear = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createAcademicYearSchema, rawArgs);

  const existing = await prisma.academicYear.findUnique({
    where: {
      schoolId_yearName_semester: {
        schoolId: user.schoolId,
        yearName: args.yearName,
        semester: args.semester,
      },
    },
  });

  if (existing) {
    throw new HttpError(400, `Tahun ajaran ${args.yearName} semester ${args.semester} sudah ada.`);
  }

  if (args.isActive) {
    await prisma.academicYear.updateMany({
      where: { schoolId: user.schoolId, isActive: true },
      data: { isActive: false },
    });
  }

  return prisma.academicYear.create({
    data: {
      schoolId: user.schoolId,
      yearName: args.yearName,
      semester: args.semester,
      isActive: args.isActive,
    },
  });
};

const setActiveAcademicYearSchema = z.object({
  id: z.string().uuid(),
});

export const setActiveAcademicYear = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(setActiveAcademicYearSchema, rawArgs);

  const year = await prisma.academicYear.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!year) {
    throw new HttpError(404, "Data tahun ajaran tidak ditemukan.");
  }

  // Deactivate all others
  await prisma.academicYear.updateMany({
    where: { schoolId: user.schoolId, isActive: true },
    data: { isActive: false },
  });

  return prisma.academicYear.update({
    where: { id },
    data: { isActive: true },
  });
};

// ==========================================
// 4. ClassRoom (Rombel / Kelas) Operations
// ==========================================

const getClassRoomsSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  gradeLevel: z.number().int().min(10).max(13).optional(),
}).optional();

export const getClassRooms = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getClassRoomsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.classRoom.findMany({
    where: {
      schoolId: user.schoolId,
      ...(filter?.academicYearId ? { academicYearId: filter.academicYearId } : {}),
      ...(filter?.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter?.gradeLevel ? { gradeLevel: filter.gradeLevel } : {}),
    },
    include: {
      department: true,
      academicYear: true,
      homeroomTeacher: {
        select: {
          id: true,
          name: true,
          email: true,
          teacherProfile: true,
        },
      },
      _count: {
        select: { students: true, lmsCourses: true },
      },
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });
};

const createClassRoomSchema = z.object({
  name: z.string().min(2, "Nama kelas minimal 2 karakter"),
  gradeLevel: z.number().int().min(10).max(13),
  departmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  homeroomTeacherId: z.string().uuid().optional().nullable(),
});

export const createClassRoom = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createClassRoomSchema, rawArgs);

  // Validate department belongs to this school
  const dept = await prisma.department.findFirst({
    where: { id: args.departmentId, schoolId: user.schoolId },
  });
  if (!dept) throw new HttpError(404, "Jurusan tidak ditemukan.");

  // Validate academic year belongs to this school
  const year = await prisma.academicYear.findFirst({
    where: { id: args.academicYearId, schoolId: user.schoolId },
  });
  if (!year) throw new HttpError(404, "Tahun ajaran tidak ditemukan.");

  // Check unique per academic year
  const existing = await prisma.classRoom.findUnique({
    where: {
      schoolId_academicYearId_name: {
        schoolId: user.schoolId,
        academicYearId: args.academicYearId,
        name: args.name.trim(),
      },
    },
  });
  if (existing) {
    throw new HttpError(400, `Kelas "${args.name}" sudah ada pada tahun ajaran ini.`);
  }

  return prisma.classRoom.create({
    data: {
      schoolId: user.schoolId,
      name: args.name.trim(),
      gradeLevel: args.gradeLevel,
      departmentId: args.departmentId,
      academicYearId: args.academicYearId,
      homeroomTeacherId: args.homeroomTeacherId || null,
    },
    include: {
      department: true,
      academicYear: true,
      homeroomTeacher: true,
    },
  });
};

const updateClassRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  gradeLevel: z.number().int().min(10).max(13),
  departmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  homeroomTeacherId: z.string().uuid().optional().nullable(),
});

export const updateClassRoom = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateClassRoomSchema, rawArgs);

  const current = await prisma.classRoom.findFirst({
    where: { id: args.id, schoolId: user.schoolId },
  });
  if (!current) throw new HttpError(404, "Data kelas tidak ditemukan.");

  return prisma.classRoom.update({
    where: { id: args.id },
    data: {
      name: args.name.trim(),
      gradeLevel: args.gradeLevel,
      departmentId: args.departmentId,
      academicYearId: args.academicYearId,
      homeroomTeacherId: args.homeroomTeacherId || null,
    },
    include: {
      department: true,
      academicYear: true,
      homeroomTeacher: true,
    },
  });
};

const deleteClassRoomSchema = z.object({
  id: z.string().uuid(),
});

export const deleteClassRoom = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteClassRoomSchema, rawArgs);

  const room = await prisma.classRoom.findFirst({
    where: { id, schoolId: user.schoolId },
    include: { _count: { select: { students: true, lmsCourses: true } } },
  });
  if (!room) throw new HttpError(404, "Data kelas tidak ditemukan.");

  if (room._count.students > 0) {
    throw new HttpError(
      400,
      `Tidak dapat menghapus kelas ini karena masih memiliki ${room._count.students} siswa aktif.`
    );
  }

  return prisma.classRoom.delete({ where: { id } });
};

// ==========================================
// 5. User & Profile Queries (Teachers & Students)
// ==========================================

export const getSchoolTeachers = async (_args: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);

  return prisma.user.findMany({
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
      teacherProfile: true,
      homeroomClasses: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const getSchoolStudentsSchema = z.object({
  classRoomId: z.string().uuid().optional(),
}).optional();

export const getSchoolStudents = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const filter = ensureArgsSchemaOrThrowHttpError(
    getSchoolStudentsSchema || z.any(),
    rawArgs || {}
  );

  return prisma.user.findMany({
    where: {
      schoolId: user.schoolId,
      role: "STUDENT",
      ...(filter?.classRoomId ? { classRoomId: filter.classRoomId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      classRoom: {
        select: {
          id: true,
          name: true,
          department: { select: { code: true, name: true } },
        },
      },
      studentProfile: true,
      studentPlacements: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          company: { select: { id: true, name: true } },
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
};
