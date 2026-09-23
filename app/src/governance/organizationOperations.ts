import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  requireSchoolAdmin,
  requireSchoolDirectoryAccess,
} from "../school/authGuards";
import { getSchoolCapabilities } from "../school/schoolCapabilities";
import {
  DUTY_DAY_CODES,
  STAFF_ASSIGNMENT_ROLES,
  staffAssignmentDisplayTitle,
} from "../school/staffAssignments";
import { WAKASEK_ROLES } from "../school/wakasek";

function canManageOrganization(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

const staffAssignmentSelect = {
  id: true,
  role: true,
  unitName: true,
  customTitle: true,
  dutyDays: true,
  notes: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teacherProfile: { select: { nip: true, title: true } },
    },
  },
  academicYear: {
    select: { id: true, yearName: true, semester: true, isActive: true },
  },
  department: {
    select: { id: true, code: true, name: true },
  },
} as const;

export const getSchoolOrganizationData = async (
  _args: unknown,
  context: { user?: User },
) => {
  const user = requireSchoolDirectoryAccess(context);

  const [school, activeAcademicYear, teachers] = await Promise.all([
    prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { id: true, name: true, level: true },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true, yearName: true, semester: true, isActive: true },
    }),
    prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherProfile: { select: { nip: true, title: true } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  if (!school) throw new HttpError(404, "Unit sekolah tidak ditemukan.");

  const capabilities = getSchoolCapabilities(school.level);

  const [
    wakasekAssignments,
    homeroomClasses,
    departments,
    activeStaffAssignments,
    assignmentHistory,
  ] = await Promise.all([
    prisma.wakasekAssignment.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        role: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: { select: { nip: true, title: true } },
          },
        },
      },
      orderBy: [{ role: "asc" }, { teacher: { name: "asc" } }],
    }),
    activeAcademicYear
      ? prisma.classRoom.findMany({
          where: {
            schoolId: user.schoolId,
            academicYearId: activeAcademicYear.id,
          },
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            department: { select: { id: true, code: true, name: true } },
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
                teacherProfile: { select: { nip: true, title: true } },
              },
            },
            _count: { select: { students: true } },
          },
          orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    capabilities.usesDepartments
      ? prisma.department.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, code: true, name: true },
          orderBy: [{ code: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    prisma.schoolStaffAssignment.findMany({
      where: {
        schoolId: user.schoolId,
        isActive: true,
        OR: [
          { academicYearId: null },
          ...(activeAcademicYear ? [{ academicYearId: activeAcademicYear.id }] : []),
        ],
      },
      select: staffAssignmentSelect,
      orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.schoolStaffAssignment.findMany({
      where: { schoolId: user.schoolId, isActive: false },
      select: staffAssignmentSelect,
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const activeWithDisplay = activeStaffAssignments.map((assignment) => ({
    ...assignment,
    displayTitle: staffAssignmentDisplayTitle({
      role: assignment.role,
      unitName: assignment.unitName,
      customTitle: assignment.customTitle,
      department: assignment.department,
    }),
  }));

  const historyWithDisplay = assignmentHistory.map((assignment) => ({
    ...assignment,
    displayTitle: staffAssignmentDisplayTitle({
      role: assignment.role,
      unitName: assignment.unitName,
      customTitle: assignment.customTitle,
      department: assignment.department,
    }),
  }));

  const principal = activeWithDisplay.find((item) => item.role === "PRINCIPAL") || null;
  const dutyTeachers = activeWithDisplay.filter((item) => item.role === "DUTY_TEACHER");
  const departmentHeads = activeWithDisplay.filter((item) => item.role === "DEPARTMENT_HEAD");
  const extracurricularAdvisors = activeWithDisplay.filter(
    (item) => item.role === "EXTRACURRICULAR_ADVISOR",
  );
  const otherAssignments = activeWithDisplay.filter((item) => item.role === "OTHER");

  const assignedTeacherIds = new Set<string>();
  for (const assignment of activeWithDisplay) assignedTeacherIds.add(assignment.teacher.id);
  for (const assignment of wakasekAssignments) assignedTeacherIds.add(assignment.teacher.id);
  for (const classRoom of homeroomClasses) {
    if (classRoom.homeroomTeacher) assignedTeacherIds.add(classRoom.homeroomTeacher.id);
  }

  const wakasekFilledRoles = new Set(wakasekAssignments.map((item) => item.role));
  const departmentHeadDepartmentIds = new Set(
    departmentHeads.map((item) => item.department?.id).filter(Boolean),
  );

  return {
    canManage: canManageOrganization(user as User),
    school,
    capabilities,
    activeAcademicYear,
    teachers,
    wakasekAssignments,
    homeroomClasses,
    departments,
    assignments: {
      principal,
      dutyTeachers,
      departmentHeads,
      extracurricularAdvisors,
      otherAssignments,
      active: activeWithDisplay,
      history: historyWithDisplay,
    },
    stats: {
      assignedTeacherCount: assignedTeacherIds.size,
      totalTeacherCount: teachers.length,
      unassignedHomeroomCount: homeroomClasses.filter((item) => !item.homeroomTeacher).length,
      unfilledWakasekCount: WAKASEK_ROLES.filter((role) => !wakasekFilledRoles.has(role)).length,
      unfilledDepartmentHeadCount: capabilities.usesDepartments
        ? departments.filter((department) => !departmentHeadDepartmentIds.has(department.id)).length
        : 0,
      dutyTeacherCount: dutyTeachers.length,
      hasPrincipal: !!principal,
    },
  };
};

const staffAssignmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  teacherId: z.string().uuid(),
  role: z.enum(STAFF_ASSIGNMENT_ROLES),
  academicYearId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  unitName: z.string().trim().max(120).optional().nullable(),
  customTitle: z.string().trim().max(120).optional().nullable(),
  dutyDays: z.array(z.enum(DUTY_DAY_CODES)).default([]),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const saveSchoolStaffAssignment = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(staffAssignmentInputSchema, rawArgs);

  const [teacher, school, activeAcademicYear] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: args.teacherId,
        schoolId: admin.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    }),
    prisma.school.findUnique({
      where: { id: admin.schoolId },
      select: { level: true },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: admin.schoolId, isActive: true },
      select: { id: true },
    }),
  ]);

  if (!teacher) throw new HttpError(400, "Guru/Tendik yang dipilih tidak valid.");
  const capabilities = getSchoolCapabilities(school?.level);

  let departmentId = args.departmentId || null;
  let unitName = args.unitName?.trim() || null;
  let customTitle = args.customTitle?.trim() || null;
  let dutyDays = args.dutyDays;
  let academicYearId = args.academicYearId || null;

  if (academicYearId) {
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId: admin.schoolId },
      select: { id: true },
    });
    if (!academicYear) throw new HttpError(400, "Tahun ajaran tidak valid.");
  } else if (args.role !== "PRINCIPAL") {
    academicYearId = activeAcademicYear?.id || null;
  }

  if (args.role === "PRINCIPAL") {
    departmentId = null;
    unitName = null;
    customTitle = null;
    dutyDays = [];
    academicYearId = null;
  } else if (args.role === "DUTY_TEACHER") {
    departmentId = null;
    unitName = "Guru Piket";
    customTitle = null;
  } else if (args.role === "DEPARTMENT_HEAD") {
    if (!capabilities.usesDepartments) {
      throw new HttpError(400, "Jenjang sekolah ini tidak menggunakan program/konsentrasi keahlian.");
    }
    if (!departmentId) throw new HttpError(400, "Pilih program/konsentrasi keahlian.");
    const department = await prisma.department.findFirst({
      where: { id: departmentId, schoolId: admin.schoolId },
      select: { id: true },
    });
    if (!department) throw new HttpError(400, "Program/konsentrasi keahlian tidak valid.");
    unitName = null;
    customTitle = null;
    dutyDays = [];
  } else if (args.role === "EXTRACURRICULAR_ADVISOR") {
    if (!unitName) throw new HttpError(400, "Nama ekstrakurikuler wajib diisi.");
    departmentId = null;
    customTitle = null;
    dutyDays = [];
  } else if (args.role === "OTHER") {
    if (!customTitle) throw new HttpError(400, "Nama tugas tambahan wajib diisi.");
    departmentId = null;
    dutyDays = [];
  }

  if (args.id) {
    const existing = await prisma.schoolStaffAssignment.findFirst({
      where: { id: args.id, schoolId: admin.schoolId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Penugasan tidak ditemukan.");
  }

  return prisma.$transaction(async (tx) => {
    if (args.role === "PRINCIPAL") {
      await tx.schoolStaffAssignment.updateMany({
        where: {
          schoolId: admin.schoolId,
          role: "PRINCIPAL",
          isActive: true,
          ...(args.id ? { id: { not: args.id } } : {}),
        },
        data: { isActive: false },
      });
    }

    if (args.role === "DEPARTMENT_HEAD" && departmentId) {
      await tx.schoolStaffAssignment.updateMany({
        where: {
          schoolId: admin.schoolId,
          role: "DEPARTMENT_HEAD",
          departmentId,
          isActive: true,
          ...(args.id ? { id: { not: args.id } } : {}),
        },
        data: { isActive: false },
      });
    }

    const duplicate = await tx.schoolStaffAssignment.findFirst({
      where: {
        schoolId: admin.schoolId,
        teacherId: args.teacherId,
        role: args.role,
        isActive: true,
        ...(args.id ? { id: { not: args.id } } : {}),
        ...(args.role === "DEPARTMENT_HEAD" ? { departmentId } : {}),
        ...(args.role === "EXTRACURRICULAR_ADVISOR" ? { unitName } : {}),
        ...(args.role === "OTHER" ? { customTitle } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new HttpError(409, "Penugasan aktif yang sama sudah dimiliki guru tersebut.");
    }

    const data = {
      teacherId: args.teacherId,
      role: args.role,
      academicYearId,
      departmentId,
      unitName,
      customTitle,
      dutyDays,
      notes: args.notes?.trim() || null,
      isActive: true,
    };

    return args.id
      ? tx.schoolStaffAssignment.update({
          where: { id: args.id },
          data,
          select: staffAssignmentSelect,
        })
      : tx.schoolStaffAssignment.create({
          data: { schoolId: admin.schoolId, ...data },
          select: staffAssignmentSelect,
        });
  });
};

const assignmentIdSchema = z.object({ id: z.string().uuid() });

export const archiveSchoolStaffAssignment = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(assignmentIdSchema, rawArgs);
  const assignment = await prisma.schoolStaffAssignment.findFirst({
    where: { id: args.id, schoolId: admin.schoolId },
    select: { id: true },
  });
  if (!assignment) throw new HttpError(404, "Penugasan tidak ditemukan.");

  return prisma.schoolStaffAssignment.update({
    where: { id: assignment.id },
    data: { isActive: false },
    select: { id: true, isActive: true, updatedAt: true },
  });
};

const homeroomAssignmentSchema = z.object({
  classRoomId: z.string().uuid(),
  teacherId: z.string().uuid().nullable(),
});

export const setHomeroomTeacherAssignment = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(homeroomAssignmentSchema, rawArgs);

  const classRoom = await prisma.classRoom.findFirst({
    where: { id: args.classRoomId, schoolId: admin.schoolId },
    select: { id: true },
  });
  if (!classRoom) throw new HttpError(404, "Rombel tidak ditemukan.");

  if (args.teacherId) {
    const teacher = await prisma.user.findFirst({
      where: {
        id: args.teacherId,
        schoolId: admin.schoolId,
        role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      },
      select: { id: true },
    });
    if (!teacher) throw new HttpError(400, "Guru wali kelas tidak valid.");
  }

  return prisma.classRoom.update({
    where: { id: classRoom.id },
    data: { homeroomTeacherId: args.teacherId },
    select: {
      id: true,
      name: true,
      homeroomTeacher: { select: { id: true, name: true, email: true } },
    },
  });
};

const wakasekAssignmentSchema = z.object({
  teacherId: z.string().uuid(),
  role: z.enum(WAKASEK_ROLES),
  enabled: z.boolean(),
});

export const setWakasekOrganizationAssignment = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const admin = requireSchoolAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(wakasekAssignmentSchema, rawArgs);

  const teacher = await prisma.user.findFirst({
    where: {
      id: args.teacherId,
      schoolId: admin.schoolId,
      role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
    },
    select: { id: true },
  });
  if (!teacher) throw new HttpError(400, "Guru Wakasek tidak valid.");

  await prisma.$transaction(async (tx) => {
    if (args.enabled) {
      await tx.wakasekAssignment.upsert({
        where: {
          schoolId_teacherId_role: {
            schoolId: admin.schoolId,
            teacherId: args.teacherId,
            role: args.role,
          },
        },
        create: {
          schoolId: admin.schoolId,
          teacherId: args.teacherId,
          role: args.role,
        },
        update: {},
      });
    } else {
      await tx.wakasekAssignment.deleteMany({
        where: {
          schoolId: admin.schoolId,
          teacherId: args.teacherId,
          role: args.role,
        },
      });
    }

    if (args.role === "KURIKULUM") {
      const stillAssigned = args.enabled
        ? true
        : !!(await tx.wakasekAssignment.findFirst({
            where: {
              schoolId: admin.schoolId,
              teacherId: args.teacherId,
              role: "KURIKULUM",
            },
            select: { id: true },
          }));

      await tx.teacherProfile.upsert({
        where: { userId: args.teacherId },
        create: { userId: args.teacherId, isWaka: stillAssigned },
        update: { isWaka: stillAssigned },
      });
    }
  });

  return { ok: true };
};
