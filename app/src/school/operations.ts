import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser, requireSchoolAdmin, ensureAuthenticated, ensureSuperAdmin, requireSchoolDirectoryAccess } from "./authGuards";

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
          lmsCourses: true,
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
  level: z.enum(["SD_MI", "SMP_MTS", "SMA_SMK"]).default("SMA_SMK"),
  npsn: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export const registerSchool = async (rawArgs: unknown, context: { user?: User }) => {
  ensureAuthenticated(context);
  if (context.user.schoolId) {
    throw new HttpError(409, "Akun ini sudah terhubung ke unit sekolah. Registrasi sekolah baru dari onboarding tidak diizinkan.");
  }
  if (context.user.isAdmin || context.user.role === "SUPERADMIN") {
    throw new HttpError(403, "Super Admin harus membuat sekolah melalui panel organisasi sekolah.");
  }
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

  const currentYear = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: args.name,
        level: args.level,
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

    await tx.user.update({
      where: { id: context.user.id },
      data: { schoolId: school.id, role: "SCHOOL_ADMIN" },
    });

    await tx.academicYear.create({
      data: {
        schoolId: school.id,
        yearName: `${currentYear}/${currentYear + 1}`,
        semester: "GANJIL",
        isActive: true,
      },
    });

    return school;
  });
};

const updateSchoolInfoSchema = z.object({
  name: z.string().min(3).optional(),
  level: z.enum(["SD_MI", "SMP_MTS", "SMA_SMK"]).optional(),
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
      ...(args.level ? { level: args.level } : {}),
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
  const user = requireSchoolDirectoryAccess(context);

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
  const user = requireSchoolDirectoryAccess(context);

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

  return prisma.$transaction(async (tx) => {
    if (args.isActive) {
      await tx.academicYear.updateMany({
        where: { schoolId: user.schoolId, isActive: true },
        data: { isActive: false },
      });
    }

    return tx.academicYear.create({
      data: {
        schoolId: user.schoolId,
        yearName: args.yearName,
        semester: args.semester,
        isActive: args.isActive,
      },
    });
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

  return prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({
      where: { schoolId: user.schoolId, isActive: true },
      data: { isActive: false },
    });
    return tx.academicYear.update({
      where: { id },
      data: { isActive: true },
    });
  });
};

// ==========================================
// 4. ClassRoom (Rombel / Kelas) Operations
// ==========================================

const getClassRoomsSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  gradeLevel: z.number().int().min(1).max(13).optional(),
}).optional();

export const getClassRooms = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolDirectoryAccess(context);
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
  name: z.string().min(1, "Nama kelas minimal 1 karakter"),
  gradeLevel: z.number().int().min(1).max(13),
  departmentId: z.string().uuid().optional().nullable(),
  academicYearId: z.string().uuid(),
  homeroomTeacherId: z.string().uuid().optional().nullable(),
});

export const createClassRoom = async (rawArgs: unknown, context: { user?: User }) => {
  const user = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createClassRoomSchema, rawArgs);

  // Validate department belongs to this school if provided
  if (args.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: args.departmentId, schoolId: user.schoolId },
    });
    if (!dept) throw new HttpError(404, "Jurusan tidak ditemukan.");
  }

  // Validate academic year belongs to this school
  const year = await prisma.academicYear.findFirst({
    where: { id: args.academicYearId, schoolId: user.schoolId },
  });
  if (!year) throw new HttpError(404, "Tahun ajaran tidak ditemukan.");

  if (args.homeroomTeacherId) {
    const teacher = await prisma.user.findFirst({
      where: {
        id: args.homeroomTeacherId,
        schoolId: user.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    });
    if (!teacher) throw new HttpError(404, "Wali kelas tidak ditemukan pada sekolah aktif.");
  }

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
      departmentId: args.departmentId || null,
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
  name: z.string().min(1),
  gradeLevel: z.number().int().min(1).max(13),
  departmentId: z.string().uuid().optional().nullable(),
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

  if (args.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: args.departmentId, schoolId: user.schoolId },
    });
    if (!dept) throw new HttpError(404, "Jurusan tidak ditemukan.");
  }

  const year = await prisma.academicYear.findFirst({
    where: { id: args.academicYearId, schoolId: user.schoolId },
    select: { id: true },
  });
  if (!year) throw new HttpError(404, "Tahun ajaran tidak ditemukan.");

  if (args.homeroomTeacherId) {
    const teacher = await prisma.user.findFirst({
      where: {
        id: args.homeroomTeacherId,
        schoolId: user.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    });
    if (!teacher) throw new HttpError(404, "Wali kelas tidak ditemukan pada sekolah aktif.");
  }

  return prisma.classRoom.update({
    where: { id: args.id },
    data: {
      name: args.name.trim(),
      gradeLevel: args.gradeLevel,
      departmentId: args.departmentId || null,
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
  const user = requireSchoolDirectoryAccess(context);

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
  const user = requireSchoolDirectoryAccess(context);
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

// ==========================================
// 5.1 Manual CRUD for Teachers
// ==========================================

const createTeacherSchema = z.object({
  name: z.string().min(1, "Nama lengkap guru wajib diisi"),
  nip: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(["TEACHER", "SCHOOL_ADMIN"]).default("TEACHER"),
  isWaka: z.boolean().default(false),
});

export const createTeacher = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createTeacherSchema, rawArgs);

  const cleanEmail = args.email && args.email.trim() !== "" ? args.email.trim() : null;
  if (cleanEmail) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new HttpError(400, "Email sudah terdaftar untuk pengguna lain.");
    }
  }

  const cleanNip = args.nip && args.nip.trim() !== "" ? args.nip.trim() : null;
  if (cleanNip) {
    const existingNip = await prisma.teacherProfile.findFirst({
      where: {
        nip: cleanNip,
        user: { schoolId: admin.schoolId },
      },
    });
    if (existingNip) {
      throw new HttpError(400, `Guru dengan NIP ${cleanNip} sudah terdaftar di sekolah ini.`);
    }
  }

  let username = cleanNip || `guru_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    username = `${username}_${Date.now().toString().slice(-4)}`;
  }

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: args.name.trim(),
        email: cleanEmail,
        username,
        role: args.role,
        schoolId: admin.schoolId,
      },
    });

    await tx.teacherProfile.create({
      data: {
        userId: newUser.id,
        nip: cleanNip,
        title: args.title && args.title.trim() !== "" ? args.title.trim() : null,
        phone: args.phone && args.phone.trim() !== "" ? args.phone.trim() : null,
        isWaka: args.isWaka ?? false,
      },
    });
    return newUser;
  });
};

const updateTeacherSchema = z.object({
  id: z.string().uuid("ID guru tidak valid"),
  name: z.string().min(1, "Nama lengkap guru wajib diisi"),
  nip: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(["TEACHER", "SCHOOL_ADMIN"]).default("TEACHER"),
  isWaka: z.boolean().default(false),
});

export const updateTeacher = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateTeacherSchema, rawArgs);

  const targetUser = await prisma.user.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    include: { teacherProfile: true },
  });

  if (!targetUser) {
    throw new HttpError(404, "Data guru tidak ditemukan di unit sekolah ini.");
  }

  const cleanEmail = args.email && args.email.trim() !== "" ? args.email.trim() : null;
  if (cleanEmail && cleanEmail !== targetUser.email) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new HttpError(400, "Email sudah terdaftar untuk pengguna lain.");
    }
  }

  const cleanNip = args.nip && args.nip.trim() !== "" ? args.nip.trim() : null;
  if (cleanNip && cleanNip !== targetUser.teacherProfile?.nip) {
    const existingNip = await prisma.teacherProfile.findFirst({
      where: {
        nip: cleanNip,
        user: { schoolId: admin.schoolId },
        NOT: { userId: args.id },
      },
    });
    if (existingNip) {
      throw new HttpError(400, `Guru dengan NIP ${cleanNip} sudah terdaftar di sekolah ini.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: args.id },
      data: {
        name: args.name.trim(),
        email: cleanEmail,
        role: args.role,
      },
    });

    await tx.teacherProfile.upsert({
      where: { userId: args.id },
      create: {
        userId: args.id,
        nip: cleanNip,
        title: args.title && args.title.trim() !== "" ? args.title.trim() : null,
        phone: args.phone && args.phone.trim() !== "" ? args.phone.trim() : null,
        isWaka: args.isWaka ?? false,
      },
      update: {
        nip: cleanNip,
        title: args.title && args.title.trim() !== "" ? args.title.trim() : null,
        phone: args.phone && args.phone.trim() !== "" ? args.phone.trim() : null,
        isWaka: args.isWaka ?? false,
      },
    });
    return updatedUser;
  });
};

const deleteTeacherSchema = z.object({
  id: z.string().uuid("ID guru tidak valid"),
});

export const deleteTeacher = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteTeacherSchema, rawArgs);

  if (admin.id === id) {
    throw new HttpError(400, "Anda tidak dapat menghapus akun Anda sendiri.");
  }

  const targetUser = await prisma.user.findFirst({
    where: { id, schoolId: admin.schoolId },
    include: {
      teacherCourses: { select: { id: true, subjectName: true } },
      homeroomClasses: { select: { id: true, name: true } },
    },
  });

  if (!targetUser) {
    throw new HttpError(404, "Data guru tidak ditemukan di unit sekolah ini.");
  }

  if (targetUser.teacherCourses.length > 0) {
    throw new HttpError(
      400,
      `Guru ini masih mengampu ${targetUser.teacherCourses.length} mata pelajaran di LMS (${targetUser.teacherCourses
        .map((c) => c.subjectName)
        .slice(0, 3)
        .join(", ")}...). Alihkan pengampu mata pelajaran terlebih dahulu sebelum menghapus.`
    );
  }

  return prisma.$transaction(async (tx) => {
    if (targetUser.homeroomClasses.length > 0) {
      await tx.classRoom.updateMany({
        where: { homeroomTeacherId: id, schoolId: admin.schoolId },
        data: { homeroomTeacherId: null },
      });
    }
    await tx.placement.updateMany({
      where: { teacherSupervisorId: id, schoolId: admin.schoolId },
      data: { teacherSupervisorId: null },
    });
    await tx.dutyTeacherReport.deleteMany({
      where: { dutyTeacherId: id, schoolId: admin.schoolId },
    });
    await tx.teacherProfile.deleteMany({ where: { userId: id } });
    return tx.user.delete({ where: { id } });
  });
};

// ==========================================
// 5.2 Manual CRUD for Students
// ==========================================

const createStudentSchema = z.object({
  name: z.string().min(1, "Nama lengkap siswa wajib diisi"),
  nis: z.string().trim().optional().nullable(),
  nisn: z.string().trim().optional().nullable(),
  gender: z.enum(["L", "P"]).default("L"),
  classRoomId: z.string().uuid("ID rombel tidak valid").optional().nullable().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
});

export const createStudent = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createStudentSchema, rawArgs);

  // Check quota
  const school = await prisma.school.findUnique({
    where: { id: admin.schoolId },
    select: { studentQuota: true },
  });
  const currentStudentCount = await prisma.user.count({
    where: { schoolId: admin.schoolId, role: "STUDENT" },
  });
  const quota = school?.studentQuota || 50;
  if (currentStudentCount >= quota) {
    throw new HttpError(
      400,
      `Kuota siswa telah mencapai batas maksimal (${currentStudentCount}/${quota}). Silakan upgrade paket sekolah untuk menambah kapasitas siswa.`
    );
  }

  const cleanClassId =
    args.classRoomId && args.classRoomId.trim() !== "" ? args.classRoomId : null;
  if (cleanClassId) {
    const classExists = await prisma.classRoom.findFirst({
      where: { id: cleanClassId, schoolId: admin.schoolId },
    });
    if (!classExists) {
      throw new HttpError(400, "Rombel kelas yang dipilih tidak valid untuk sekolah ini.");
    }
  }

  const cleanEmail = args.email && args.email.trim() !== "" ? args.email.trim() : null;
  if (cleanEmail) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new HttpError(400, "Email sudah terdaftar untuk pengguna lain.");
    }
  }

  const cleanNis = args.nis && args.nis.trim() !== "" ? args.nis.trim() : null;
  if (cleanNis) {
    const existingNis = await prisma.studentProfile.findFirst({
      where: {
        nis: cleanNis,
        user: { schoolId: admin.schoolId },
      },
    });
    if (existingNis) {
      throw new HttpError(400, `Siswa dengan NIS ${cleanNis} sudah terdaftar di sekolah ini.`);
    }
  }

  let username = cleanNis || `sis_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    username = `${username}_${Date.now().toString().slice(-4)}`;
  }

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: args.name.trim(),
        email: cleanEmail,
        username,
        role: "STUDENT",
        schoolId: admin.schoolId,
        classRoomId: cleanClassId,
      },
    });
    await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        nis: cleanNis,
        nisn: args.nisn && args.nisn.trim() !== "" ? args.nisn.trim() : null,
        gender: args.gender,
        status: "ACTIVE",
      },
    });
    return newUser;
  });
};

const updateStudentSchema = z.object({
  id: z.string().uuid("ID siswa tidak valid"),
  name: z.string().min(1, "Nama lengkap siswa wajib diisi"),
  nis: z.string().trim().optional().nullable(),
  nisn: z.string().trim().optional().nullable(),
  gender: z.enum(["L", "P"]).default("L"),
  classRoomId: z.string().uuid("ID rombel tidak valid").optional().nullable().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "GRADUATED"]).default("ACTIVE"),
});

export const updateStudent = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateStudentSchema, rawArgs);

  const targetUser = await prisma.user.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    include: { studentProfile: true },
  });

  if (!targetUser) {
    throw new HttpError(404, "Data siswa tidak ditemukan di unit sekolah ini.");
  }

  const cleanClassId =
    args.classRoomId && args.classRoomId.trim() !== "" ? args.classRoomId : null;
  if (cleanClassId) {
    const classExists = await prisma.classRoom.findFirst({
      where: { id: cleanClassId, schoolId: admin.schoolId },
    });
    if (!classExists) {
      throw new HttpError(400, "Rombel kelas yang dipilih tidak valid untuk sekolah ini.");
    }
  }

  const cleanEmail = args.email && args.email.trim() !== "" ? args.email.trim() : null;
  if (cleanEmail && cleanEmail !== targetUser.email) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new HttpError(400, "Email sudah terdaftar untuk pengguna lain.");
    }
  }

  const cleanNis = args.nis && args.nis.trim() !== "" ? args.nis.trim() : null;
  if (cleanNis && cleanNis !== targetUser.studentProfile?.nis) {
    const existingNis = await prisma.studentProfile.findFirst({
      where: {
        nis: cleanNis,
        user: { schoolId: admin.schoolId },
        NOT: { userId: args.id },
      },
    });
    if (existingNis) {
      throw new HttpError(400, `Siswa dengan NIS ${cleanNis} sudah terdaftar di sekolah ini.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: args.id },
      data: {
        name: args.name.trim(),
        email: cleanEmail,
        classRoomId: cleanClassId,
      },
    });
    await tx.studentProfile.upsert({
      where: { userId: args.id },
      create: {
        userId: args.id,
        nis: cleanNis,
        nisn: args.nisn && args.nisn.trim() !== "" ? args.nisn.trim() : null,
        gender: args.gender,
        status: args.status,
      },
      update: {
        nis: cleanNis,
        nisn: args.nisn && args.nisn.trim() !== "" ? args.nisn.trim() : null,
        gender: args.gender,
        status: args.status,
      },
    });
    return updatedUser;
  });
};

const deleteStudentSchema = z.object({
  id: z.string().uuid("ID siswa tidak valid"),
});

export const deleteStudent = async (rawArgs: unknown, context: { user?: User }) => {
  const admin = requireSchoolAdmin(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteStudentSchema, rawArgs);

  const targetUser = await prisma.user.findFirst({
    where: { id, schoolId: admin.schoolId },
    include: {
      studentPlacements: {
        where: { status: "ACTIVE" },
        include: { company: { select: { name: true } } },
      },
    },
  });

  if (!targetUser) {
    throw new HttpError(404, "Data siswa tidak ditemukan di unit sekolah ini.");
  }

  if (targetUser.studentPlacements.length > 0) {
    const companyName = targetUser.studentPlacements[0]?.company?.name || "Mitra DUDI";
    throw new HttpError(
      400,
      `Tidak dapat menghapus siswa ini karena sedang dalam penempatan PKL aktif di "${companyName}". Selesaikan atau batalkan penempatan PKL terlebih dahulu.`
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.lmsAttendanceRecord.deleteMany({ where: { studentId: id } });
    await tx.lmsSubmission.deleteMany({ where: { studentId: id } });
    await tx.lmsAssessmentResult.deleteMany({ where: { studentId: id } });
    await tx.placement.deleteMany({ where: { studentId: id, schoolId: admin.schoolId } });
    await tx.studentProfile.deleteMany({ where: { userId: id } });
    return tx.user.delete({ where: { id } });
  });
};

// ==========================================
// 6. Platform Super Admin Operations
// ==========================================

export const getAllSchools = async (_args: unknown, context: { user?: User }) => {
  ensureSuperAdmin(context);

  return prisma.school.findMany({
    include: {
      _count: {
        select: {
          users: true,
          departments: true,
          classRooms: true,
          companies: true,
          placements: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const switchActiveSchoolSchema = z.object({
  schoolId: z.string().uuid("ID sekolah tidak valid"),
});

export const switchActiveSchool = async (rawArgs: unknown, context: { user?: User }) => {
  const superAdmin = ensureSuperAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(switchActiveSchoolSchema, rawArgs);

  const school = await prisma.school.findUnique({
    where: { id: args.schoolId },
  });
  if (!school) {
    throw new HttpError(404, "Sekolah tujuan tidak ditemukan.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: superAdmin.id },
    data: { schoolId: school.id },
  });

  return {
    success: true,
    school,
    user: updatedUser,
  };
};

const createSchoolByAdminSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  npsn: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  tier: z.enum(["FREE_TRIAL", "STARTER", "PRO", "ENTERPRISE"]).default("PRO"),
  level: z.enum(["SD_MI", "SMP_MTS", "SMA_SMK"]).default("SMA_SMK"),
  studentQuota: z.number().int().min(10).default(500),
  switchImmediately: z.boolean().default(true),
});

export const createSchoolByAdmin = async (rawArgs: unknown, context: { user?: User }) => {
  const superAdmin = ensureSuperAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(createSchoolByAdminSchema, rawArgs);

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

  const currentYear = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: args.name,
        level: args.level,
        slug,
        npsn: args.npsn || null,
        address: args.address || null,
        city: args.city || null,
        province: args.province || null,
        phone: args.phone || null,
        email: args.email || null,
        tier: args.tier,
        studentQuota: args.studentQuota,
        subscriptionStatus: "active",
      },
    });
    await tx.academicYear.create({
      data: {
        schoolId: school.id,
        yearName: `${currentYear}/${currentYear + 1}`,
        semester: "GANJIL",
        isActive: true,
      },
    });
    if (args.switchImmediately) {
      await tx.user.update({
        where: { id: superAdmin.id },
        data: { schoolId: school.id },
      });
    }
    return school;
  });
};
