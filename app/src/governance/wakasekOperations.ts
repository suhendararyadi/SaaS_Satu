import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";
import { jakartaDateOnly, summarizeDailyAttendance } from "../school/dailyAttendance";
import {
  WAKASEK_ROLES,
  WAKASEK_ROLE_META,
  type WakasekRoleCode,
} from "../school/wakasek";
import { getSchoolCapabilities } from "../school/schoolCapabilities";

const wakasekDashboardSchema = z.object({
  role: z.enum(WAKASEK_ROLES).optional(),
});

function isSchoolAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

async function resolveWakasekAccess(user: ReturnType<typeof ensureSchoolUser>) {
  if (isSchoolAdmin(user as User)) {
    return {
      isAdmin: true,
      availableRoles: [...WAKASEK_ROLES] as WakasekRoleCode[],
    };
  }

  if (user.role !== "TEACHER") {
    throw new HttpError(403, "Panel Wakasek hanya tersedia untuk admin sekolah atau guru yang memiliki penugasan Wakasek.");
  }

  const [assignments, profile] = await Promise.all([
    prisma.wakasekAssignment.findMany({
      where: { schoolId: user.schoolId, teacherId: user.id },
      select: { role: true },
      orderBy: { role: "asc" },
    }),
    prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { isWaka: true },
    }),
  ]);

  const roles = assignments.map((assignment) => assignment.role as WakasekRoleCode);
  if (profile?.isWaka && !roles.includes("KURIKULUM")) roles.unshift("KURIKULUM");

  if (!roles.length) {
    throw new HttpError(403, "Akun guru ini belum memiliki penugasan Wakasek.");
  }

  return { isAdmin: false, availableRoles: roles };
}

function jakartaDayBounds(dateOnly: string) {
  return {
    start: new Date(`${dateOnly}T00:00:00+07:00`),
    end: new Date(`${dateOnly}T23:59:59.999+07:00`),
  };
}

function attendanceRate(summary: ReturnType<typeof summarizeDailyAttendance>) {
  return summary.total
    ? Math.round(((summary.hadir + summary.terlambat) / summary.total) * 100)
    : null;
}

async function getCurriculumData(schoolId: string) {
  const today = jakartaDateOnly();
  const { start, end } = jakartaDayBounds(today);

  const courses = await prisma.lmsCourse.findMany({
    where: { schoolId, academicYear: { isActive: true } },
    select: {
      id: true,
      subjectName: true,
      teacher: { select: { id: true, name: true } },
      classRoom: { select: { id: true, name: true } },
      agendas: {
        where: { date: { gte: start, lte: end } },
        select: { id: true },
      },
      _count: { select: { agendas: true } },
    },
    orderBy: [{ teacher: { name: "asc" } }, { subjectName: "asc" }],
  });

  const stats = new Map<string, {
    teacherId: string;
    teacherName: string;
    totalCourses: number;
    todayAgendasFilled: number;
    totalAgendasSemester: number;
  }>();

  for (const course of courses) {
    const current = stats.get(course.teacher.id) || {
      teacherId: course.teacher.id,
      teacherName: course.teacher.name || "Guru",
      totalCourses: 0,
      todayAgendasFilled: 0,
      totalAgendasSemester: 0,
    };
    current.totalCourses += 1;
    current.todayAgendasFilled += course.agendas.length;
    current.totalAgendasSemester += course._count.agendas;
    stats.set(course.teacher.id, current);
  }

  const teacherCompliance = [...stats.values()];
  const todayAgendasCount = courses.reduce((total, course) => total + course.agendas.length, 0);
  const complianceRate = courses.length ? Math.round((todayAgendasCount / courses.length) * 100) : 0;

  return {
    type: "KURIKULUM" as const,
    metrics: [
      { label: "Kepatuhan hari ini", value: `${Math.min(100, complianceRate)}%`, helper: `${todayAgendasCount} / ${courses.length} mapel`, tone: complianceRate < 50 ? "orange" : "green" },
      { label: "Guru aktif", value: teacherCompliance.length, helper: "Guru pengampu aktif", tone: "blue" },
      { label: "Mapel aktif", value: courses.length, helper: "Semester berjalan", tone: "teal" },
    ],
    teacherCompliance,
  };
}

async function getStudentAffairsData(schoolId: string) {
  const today = jakartaDateOnly();
  const now = new Date();
  const [
    activeYear,
    totalStudents,
    studentsWithoutClass,
    records,
    openViolations,
    openCoachings,
    activePermits,
    achievementCount,
    recentViolations,
    recentCoachings,
  ] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, yearName: true, semester: true },
    }),
    prisma.user.count({ where: { schoolId, role: "STUDENT" } }),
    prisma.user.count({ where: { schoolId, role: "STUDENT", classRoomId: null } }),
    prisma.schoolDailyAttendance.findMany({
      where: { schoolId, dateOnly: today },
      select: { classRoomId: true, status: true },
    }),
    prisma.studentViolation.count({
      where: { schoolId, status: { in: ["RECORDED", "IN_REVIEW"] } },
    }),
    prisma.studentCoaching.count({
      where: { schoolId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.studentPermit.count({
      where: {
        schoolId,
        status: "APPROVED",
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
    }),
    prisma.studentAchievement.count({ where: { schoolId } }),
    prisma.studentViolation.findMany({
      where: { schoolId, status: { in: ["RECORDED", "IN_REVIEW"] } },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        incidentAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { name: true } },
          },
        },
        handledBy: { select: { name: true } },
      },
      orderBy: [{ severity: "desc" }, { incidentAt: "desc" }],
      take: 8,
    }),
    prisma.studentCoaching.findMany({
      where: { schoolId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: {
        id: true,
        type: true,
        topic: true,
        status: true,
        nextReviewAt: true,
        student: {
          select: {
            id: true,
            name: true,
            classRoom: { select: { name: true } },
          },
        },
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ nextReviewAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const classes = activeYear
    ? await prisma.classRoom.findMany({
        where: { schoolId, academicYearId: activeYear.id },
        select: {
          id: true,
          name: true,
          homeroomTeacher: { select: { name: true } },
          _count: { select: { students: true } },
        },
        orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
      })
    : [];

  const summary = summarizeDailyAttendance(records);
  const classRows = classes.map((classRoom) => {
    const classStatuses = records.filter((record) => record.classRoomId === classRoom.id);
    const classSummary = summarizeDailyAttendance(classStatuses);
    return {
      id: classRoom.id,
      name: classRoom.name,
      homeroomTeacherName: classRoom.homeroomTeacher?.name || null,
      studentCount: classRoom._count.students,
      recordedCount: classSummary.total,
      alpa: classSummary.alpa,
      terlambat: classSummary.terlambat,
      rate: attendanceRate(classSummary),
    };
  });

  return {
    type: "KESISWAAN" as const,
    metrics: [
      { label: "Siswa", value: totalStudents, helper: "Terdaftar di sekolah", tone: "blue" },
      { label: "Pelanggaran aktif", value: openViolations, helper: "Belum selesai", tone: openViolations ? "orange" : "green" },
      { label: "Pembinaan aktif", value: openCoachings, helper: "Masih diproses", tone: openCoachings ? "orange" : "green" },
      { label: "Izin aktif", value: activePermits, helper: "Sedang berlaku", tone: activePermits ? "teal" : "green" },
    ],
    dateOnly: today,
    summary,
    attendanceRate: attendanceRate(summary),
    studentsWithoutClass,
    achievementCount,
    classRows,
    recentViolations,
    recentCoachings,
  };
}

async function getFacilitiesData(schoolId: string) {
  const [rooms, statusGroups, conditionGroups, openMaintenance, attentionAssets, recentMaintenance] =
    await Promise.all([
      prisma.facilityRoom.count({ where: { schoolId, isActive: true } }),
      prisma.assetItem.groupBy({
        by: ["status"],
        where: { schoolId },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      prisma.assetItem.groupBy({
        by: ["condition"],
        where: { schoolId, status: "ACTIVE" },
        _sum: { quantity: true },
      }),
      prisma.assetMaintenance.count({
        where: { schoolId, status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] } },
      }),
      prisma.assetItem.findMany({
        where: {
          schoolId,
          status: "ACTIVE",
          condition: { in: ["FAIR", "DAMAGED", "LOST", "MAINTENANCE"] },
        },
        select: {
          id: true,
          code: true,
          name: true,
          quantity: true,
          condition: true,
          room: { select: { code: true, name: true } },
          responsibleUser: { select: { name: true } },
          _count: {
            select: {
              maintenances: {
                where: { status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] } },
              },
            },
          },
        },
        orderBy: [{ condition: "desc" }, { name: "asc" }],
        take: 12,
      }),
      prisma.assetMaintenance.findMany({
        where: { schoolId, status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] } },
        select: {
          id: true,
          status: true,
          priority: true,
          issue: true,
          asset: { select: { id: true, code: true, name: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
        take: 8,
      }),
    ]);

  const totalUnits = statusGroups
    .filter((row) => row.status !== "DISPOSED")
    .reduce((sum, row) => sum + (row._sum.quantity || 0), 0);
  const totalRecords = statusGroups
    .filter((row) => row.status !== "DISPOSED")
    .reduce((sum, row) => sum + row._count._all, 0);
  const unitByCondition = new Map(conditionGroups.map((row) => [row.condition, row._sum.quantity || 0]));
  const attentionUnits =
    (unitByCondition.get("FAIR") || 0) +
    (unitByCondition.get("DAMAGED") || 0) +
    (unitByCondition.get("LOST") || 0) +
    (unitByCondition.get("MAINTENANCE") || 0);

  return {
    type: "SARPRAS" as const,
    metrics: [
      { label: "Unit inventaris", value: totalUnits, helper: String(totalRecords) + " record aset aktif", tone: "blue" },
      { label: "Ruang / fasilitas", value: rooms, helper: "Ruang aktif terdata", tone: "teal" },
      { label: "Perlu perhatian", value: attentionUnits, helper: "Cukup / rusak / hilang / maintenance", tone: attentionUnits ? "orange" : "green" },
      { label: "Maintenance aktif", value: openMaintenance, helper: "Belum selesai", tone: openMaintenance ? "orange" : "green" },
    ],
    attentionAssets,
    recentMaintenance,
  };
}

async function getPublicRelationsData(schoolId: string) {
  const [school, companies, activePlacements, studentsWithoutActivePlacement, site, publishedContent, draftContent] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { level: true } }),
    prisma.company.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        industrySector: true,
        picName: true,
        _count: { select: { placements: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.placement.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.user.count({
      where: {
        schoolId,
        role: "STUDENT",
        studentPlacements: { none: { status: "ACTIVE" } },
      },
    }),
    prisma.schoolSite.findUnique({
      where: { schoolId },
      select: { status: true, siteTitle: true, publishedAt: true },
    }),
    prisma.schoolSiteContent.count({ where: { schoolId, status: "PUBLISHED" } }),
    prisma.schoolSiteContent.count({ where: { schoolId, status: { in: ["DRAFT", "IN_REVIEW", "SCHEDULED"] } } }),
  ]);

  const capabilities = getSchoolCapabilities(school?.level);
  const metrics = capabilities.usesPkl
    ? [
        { label: "Mitra DUDI", value: companies.length, helper: "Mitra terdaftar", tone: "teal" },
        { label: "PKL aktif", value: activePlacements, helper: "Penempatan berjalan", tone: "green" },
        { label: "Belum PKL", value: studentsWithoutActivePlacement, helper: "Siswa tanpa penempatan aktif", tone: studentsWithoutActivePlacement ? "orange" : "green" },
        { label: "Konten publik", value: publishedContent, helper: site?.status === "PUBLISHED" ? "Website sekolah terbit" : "Website belum terbit", tone: "blue" },
      ]
    : [
        { label: "Konten publik", value: publishedContent, helper: "Informasi yang sudah terbit", tone: "blue" },
        { label: "Konten proses", value: draftContent, helper: "Draft / review / terjadwal", tone: "orange" },
        { label: "Website", value: site?.status === "PUBLISHED" ? "Terbit" : "Draft", helper: site?.siteTitle || "Website sekolah", tone: "teal" },
        { label: "Ruang publikasi", value: publishedContent + draftContent, helper: "Total konten terkelola", tone: "green" },
      ];

  return {
    type: "HUMAS_HUBIN" as const,
    usesPkl: capabilities.usesPkl,
    metrics,
    website: {
      status: site?.status || "NOT_INITIALIZED",
      title: site?.siteTitle || null,
      publishedContent,
      pendingContent: draftContent,
    },
    companyRows: companies.map((company) => ({
      id: company.id,
      name: company.name,
      industrySector: company.industrySector,
      picName: company.picName,
      activePlacements: company._count.placements,
    })),
  };
}

export const getWakasekDashboardData = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(wakasekDashboardSchema, rawArgs ?? {});
  const access = await resolveWakasekAccess(user);

  const selectedRole = (args.role || access.availableRoles[0]) as WakasekRoleCode;
  if (!access.availableRoles.includes(selectedRole)) {
    throw new HttpError(403, "Anda tidak memiliki penugasan untuk bidang Wakasek tersebut.");
  }

  const roleOwners = await prisma.wakasekAssignment.findMany({
    where: { schoolId: user.schoolId, role: selectedRole },
    select: {
      teacher: { select: { id: true, name: true, teacherProfile: { select: { nip: true } } } },
    },
    orderBy: { teacher: { name: "asc" } },
  });

  let roleData;
  switch (selectedRole) {
    case "KURIKULUM":
      roleData = await getCurriculumData(user.schoolId);
      break;
    case "KESISWAAN":
      roleData = await getStudentAffairsData(user.schoolId);
      break;
    case "SARPRAS":
      roleData = await getFacilitiesData(user.schoolId);
      break;
    case "HUMAS_HUBIN":
      roleData = await getPublicRelationsData(user.schoolId);
      break;
  }

  return {
    access: {
      isAdmin: access.isAdmin,
      availableRoles: access.availableRoles,
      selectedRole,
    },
    meta: WAKASEK_ROLE_META[selectedRole],
    owners: roleOwners.map((owner) => ({
      id: owner.teacher.id,
      name: owner.teacher.name || "Guru",
      nip: owner.teacher.teacherProfile?.nip || null,
    })),
    roleData,
  };
};
