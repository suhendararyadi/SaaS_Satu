import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "./authGuards";
import { getSchoolCapabilities } from "./schoolCapabilities";
import { getPklEwsAlertsForScope } from "../pkl/ews";
import { buildStudentRiskOverview } from "./studentRiskService";
import {
  DUTY_DAY_LABELS,
  isDutyAssignmentForDay,
  jakartaDutyDayCode,
  staffAssignmentDisplayTitle,
  type DutyDayCode,
} from "./staffAssignments";
import {
  NOTIFICATION_CATEGORY_META,
  NOTIFICATION_CATEGORIES,
  notificationKey,
  isNotificationUnread,
  sortNotifications,
  type NotificationCategoryCode,
  type NotificationSeverityCode,
  type NotificationSourceItem,
} from "./notificationCenter";

function isAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

function jakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function jakartaHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
}

function dayBounds(dateKey: string) {
  return {
    start: new Date(`${dateKey}T00:00:00+07:00`),
    end: new Date(`${dateKey}T23:59:59.999+07:00`),
  };
}

function followUpSeverity(severity: string): NotificationSeverityCode {
  if (severity === "CRITICAL") return "CRITICAL";
  if (severity === "HIGH") return "WARNING";
  return "INFO";
}

function studentAffairsSeverity(severity: string): NotificationSeverityCode {
  if (severity === "CRITICAL") return "CRITICAL";
  if (severity === "HIGH") return "WARNING";
  return "INFO";
}

function pklSeverity(severity: string): NotificationSeverityCode {
  return severity === "HIGH" ? "WARNING" : "INFO";
}

function personLabel(person?: { name?: string | null; username?: string | null; email?: string | null } | null) {
  return person?.name || person?.username || person?.email || "Pengguna";
}

function classScopeWhere(homeroomClassIds: string[]) {
  return homeroomClassIds.length
    ? { student: { classRoomId: { in: homeroomClassIds } } }
    : { id: "__none__" };
}

async function collectCurrentNotifications(user: ReturnType<typeof ensureSchoolUser>) {
  const now = new Date();
  const dateKey = jakartaDateKey(now);
  const bounds = dayBounds(dateKey);
  const dayCode = jakartaDutyDayCode(now);

  const [school, activeYear] = await Promise.all([
    prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { id: true, level: true },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true },
    }),
  ]);

  const [wakasekAssignments, staffAssignments] = await Promise.all([
    user.role === "TEACHER"
      ? prisma.wakasekAssignment.findMany({
          where: { schoolId: user.schoolId, teacherId: user.id },
          select: { id: true, role: true, createdAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
    user.role === "TEACHER" || user.role === "SCHOOL_ADMIN"
      ? prisma.schoolStaffAssignment.findMany({
          where: {
            schoolId: user.schoolId,
            teacherId: user.id,
            isActive: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
              ...(activeYear
                ? [{ OR: [{ academicYearId: null }, { academicYearId: activeYear.id }] }]
                : [{ academicYearId: null }]),
            ],
          },
          select: {
            id: true,
            role: true,
            unitName: true,
            customTitle: true,
            dutyDays: true,
            createdAt: true,
            updatedAt: true,
            department: { select: { code: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  if (!school) throw new HttpError(404, "Sekolah tidak ditemukan.");

  const capabilities = getSchoolCapabilities(school.level);
  const admin = isAdmin(user as User);
  const wakasekRoles = new Set(wakasekAssignments.map((item) => item.role));
  const principal = staffAssignments.some((item) => item.role === "PRINCIPAL");
  const fullLeadership = admin || principal;
  const canKesiswaanAll = fullLeadership || wakasekRoles.has("KESISWAAN");
  const canSarprasAll = fullLeadership || wakasekRoles.has("SARPRAS");
  const canPklAll = fullLeadership || wakasekRoles.has("HUMAS_HUBIN");

  const homeroomClasses =
    user.role === "TEACHER"
      ? await prisma.classRoom.findMany({
          where: {
            schoolId: user.schoolId,
            homeroomTeacherId: user.id,
            ...(activeYear ? { academicYearId: activeYear.id } : {}),
          },
          select: { id: true, name: true },
        })
      : [];
  const homeroomClassIds = homeroomClasses.map((item) => item.id);

  const notifications: NotificationSourceItem[] = [];

  // EWS Gen-2: surface the highest cross-module student risks in the user's responsibility scope.
  if (user.role !== "STUDENT") {
    try {
      const riskOverview = await buildStudentRiskOverview(user, { cacheMs: 60_000 });
      const priorityProfiles = riskOverview.profiles
        .filter((profile: any) =>
          profile.level === "CRITICAL" ||
          profile.level === "HIGH" ||
          (profile.level === "MEDIUM" && profile.trend.code === "WORSENING"),
        )
        .slice(0, 5);

      for (const profile of priorityProfiles) {
        const topFactors = profile.signals
          .slice(0, 2)
          .map((item: any) => item.title)
          .join("; ");
        notifications.push({
          key: notificationKey("STUDENT_RISK", profile.student.id),
          category: "STUDENT_RISK",
          severity: profile.level === "CRITICAL" ? "CRITICAL" : "WARNING",
          title:
            "EWS Terpadu · " +
            profile.student.displayName +
            " · skor " +
            profile.score,
          message:
            (profile.student.classRoom?.name || "Tanpa rombel") +
            (topFactors ? ". Faktor utama: " + topFactors : ". Profil risiko perlu ditinjau."),
          href: "/school/ews?student=" + profile.student.id,
          icon: NOTIFICATION_CATEGORY_META.STUDENT_RISK.icon,
          updatedAt: profile.lastSignalAt ? new Date(profile.lastSignalAt) : riskOverview.generatedAt,
          actionLabel: "Buka profil risiko",
        });
      }
    } catch (error) {
      if (!(error instanceof HttpError) || error.statusCode !== 403) throw error;
    }
  }

  // 1) Tindak lanjut: assigned to the user, plus leadership exceptions that need a decision.
  const followUps = await prisma.schoolFollowUpCase.findMany({
    where: {
      schoolId: user.schoolId,
      status: { in: ["FINDING", "ASSIGNED", "IN_PROGRESS"] },
      ...(fullLeadership
        ? {
            OR: [
              { assignedToId: user.id },
              { assignedToId: null },
              { severity: { in: ["HIGH", "CRITICAL"] } },
              { dueAt: { lt: now } },
            ],
          }
        : wakasekRoles.size
          ? {
              OR: [
                { assignedToId: user.id },
                ...(wakasekRoles.has("KESISWAAN")
                  ? [{ sourceType: { in: ["ATTENDANCE", "STUDENT_AFFAIRS", "HOMEROOM"] as any } }]
                  : []),
                ...(wakasekRoles.has("SARPRAS") ? [{ sourceType: "SARPRAS" as any }] : []),
                ...(wakasekRoles.has("HUMAS_HUBIN") ? [{ sourceType: "PKL_EWS" as any }] : []),
                ...(wakasekRoles.has("KURIKULUM") ? [{ sourceType: "WAKASEK" as any }] : []),
              ],
            }
          : { assignedToId: user.id }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      sourceType: true,
      sourceUrl: true,
      dueAt: true,
      assignedToId: true,
      updatedAt: true,
    },
    orderBy: [{ severity: "desc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    take: 24,
  });

  for (const item of followUps) {
    const overdue = !!item.dueAt && item.dueAt < now;
    notifications.push({
      key: notificationKey("FOLLOW_UP", item.id),
      category: "FOLLOW_UP",
      severity: overdue ? "CRITICAL" : followUpSeverity(item.severity),
      title: overdue ? `Tenggat terlewati · ${item.title}` : item.title,
      message: item.description,
      href: `/school/follow-up?case=${item.id}`,
      icon: NOTIFICATION_CATEGORY_META.FOLLOW_UP.icon,
      updatedAt: item.updatedAt,
      actionLabel: "Buka tindak lanjut",
    });
  }

  // 2) Kesiswaan: high-priority school cases for leadership, or class-scoped cases for homeroom.
  if (canKesiswaanAll || homeroomClassIds.length > 0 || user.role === "STUDENT") {
    if (user.role === "STUDENT") {
      const ownPermits = await prisma.studentPermit.findMany({
        where: {
          schoolId: user.schoolId,
          studentId: user.id,
          status: { in: ["REQUESTED", "APPROVED", "REJECTED"] },
        },
        select: { id: true, type: true, reason: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      });
      for (const permit of ownPermits) {
        notifications.push({
          key: notificationKey("STUDENT_AFFAIRS", "PERMIT", permit.id),
          category: "STUDENT_AFFAIRS",
          severity: permit.status === "REJECTED" ? "WARNING" : "INFO",
          title:
            permit.status === "APPROVED"
              ? "Izin/dispensasi disetujui"
              : permit.status === "REJECTED"
                ? "Izin/dispensasi ditolak"
                : "Izin/dispensasi sedang diproses",
          message: permit.reason,
          href: "/school",
          updatedAt: permit.updatedAt,
          actionLabel: "Lihat beranda",
        });
      }
    } else {
      const scope = canKesiswaanAll ? {} : classScopeWhere(homeroomClassIds);
      const [violations, coachings, overduePermits] = await Promise.all([
        prisma.studentViolation.findMany({
          where: {
            schoolId: user.schoolId,
            status: { in: ["RECORDED", "IN_REVIEW"] },
            ...scope,
            ...(canKesiswaanAll && !wakasekRoles.has("KESISWAAN") && !admin
              ? { severity: { in: ["HIGH", "CRITICAL"] } }
              : {}),
          },
          select: {
            id: true,
            title: true,
            severity: true,
            updatedAt: true,
            student: { select: { name: true, username: true, email: true, classRoom: { select: { name: true } } } },
          },
          orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
          take: 12,
        }),
        prisma.studentCoaching.findMany({
          where: {
            schoolId: user.schoolId,
            status: { in: ["OPEN", "IN_PROGRESS"] },
            ...scope,
            OR: [
              { assignedToId: user.id },
              { nextReviewAt: { lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) } },
              ...(canKesiswaanAll ? [{ assignedToId: null }] : []),
            ],
          },
          select: {
            id: true,
            topic: true,
            status: true,
            nextReviewAt: true,
            updatedAt: true,
            student: { select: { name: true, username: true, email: true, classRoom: { select: { name: true } } } },
          },
          orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "desc" }],
          take: 10,
        }),
        prisma.studentPermit.findMany({
          where: {
            schoolId: user.schoolId,
            status: "APPROVED",
            endAt: { lt: now },
            returnedAt: null,
            ...scope,
          },
          select: {
            id: true,
            reason: true,
            endAt: true,
            updatedAt: true,
            student: { select: { name: true, username: true, email: true, classRoom: { select: { name: true } } } },
          },
          orderBy: { endAt: "asc" },
          take: 8,
        }),
      ]);

      for (const item of violations) {
        notifications.push({
          key: notificationKey("STUDENT_AFFAIRS", "VIOLATION", item.id),
          category: "STUDENT_AFFAIRS",
          severity: studentAffairsSeverity(item.severity),
          title: `Kesiswaan · ${item.title}`,
          message: `${personLabel(item.student)} · ${item.student.classRoom?.name || "Tanpa rombel"}`,
          href: `/school/student-affairs?tab=VIOLATIONS&record=${item.id}`,
          updatedAt: item.updatedAt,
          actionLabel: "Buka catatan",
        });
      }
      for (const item of coachings) {
        const overdue = !!item.nextReviewAt && item.nextReviewAt < now;
        notifications.push({
          key: notificationKey("STUDENT_AFFAIRS", "COACHING", item.id),
          category: "STUDENT_AFFAIRS",
          severity: overdue ? "WARNING" : "INFO",
          title: overdue ? `Evaluasi pembinaan terlambat · ${item.topic}` : `Pembinaan · ${item.topic}`,
          message: `${personLabel(item.student)} · ${item.student.classRoom?.name || "Tanpa rombel"}`,
          href: `/school/student-affairs?tab=COACHING&record=${item.id}`,
          updatedAt: item.updatedAt,
          actionLabel: "Buka pembinaan",
        });
      }
      for (const item of overduePermits) {
        notifications.push({
          key: notificationKey("STUDENT_AFFAIRS", "PERMIT_OVERDUE", item.id),
          category: "STUDENT_AFFAIRS",
          severity: "WARNING",
          title: "Izin melewati batas waktu",
          message: `${personLabel(item.student)} · ${item.student.classRoom?.name || "Tanpa rombel"} · ${item.reason}`,
          href: "/school/student-affairs?tab=PERMITS",
          updatedAt: item.updatedAt,
          actionLabel: "Periksa izin",
        });
      }
    }
  }

  // 3) Presensi harian: after 08:00 WIB, notify responsible users for incomplete classes.
  if (
    activeYear &&
    dayCode !== "SUNDAY" &&
    jakartaHour(now) >= 8 &&
    (canKesiswaanAll || homeroomClassIds.length > 0)
  ) {
    const classes = await prisma.classRoom.findMany({
      where: {
        schoolId: user.schoolId,
        academicYearId: activeYear.id,
        ...(canKesiswaanAll ? {} : { id: { in: homeroomClassIds } }),
      },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });
    const classIds = classes.map((item) => item.id);
    const attendanceRows = classIds.length
      ? await prisma.schoolDailyAttendance.findMany({
          where: { schoolId: user.schoolId, dateOnly: dateKey, classRoomId: { in: classIds } },
          select: { classRoomId: true },
        })
      : [];
    const countByClass = new Map<string, number>();
    for (const row of attendanceRows) {
      countByClass.set(row.classRoomId, (countByClass.get(row.classRoomId) || 0) + 1);
    }
    for (const classRoom of classes.slice(0, 18)) {
      const expected = classRoom._count.students;
      if (!expected) continue;
      const recorded = countByClass.get(classRoom.id) || 0;
      if (recorded >= expected) continue;
      notifications.push({
        key: notificationKey("ATTENDANCE", classRoom.id, dateKey),
        category: "ATTENDANCE",
        severity: recorded === 0 ? "WARNING" : "INFO",
        title: `Presensi ${classRoom.name} belum lengkap`,
        message: `${recorded} dari ${expected} siswa sudah tercatat hari ini.`,
        href: "/school/attendance",
        updatedAt: bounds.start,
        actionLabel: "Buka presensi",
      });
    }
  }

  // 4) PKL/EWS follows actual responsibility scope.
  if (capabilities.usesPkl) {
    let pklScope: { studentId?: string; teacherSupervisorId?: string; dudiMentorId?: string } | null = null;
    if (canPklAll) pklScope = {};
    else if (user.role === "TEACHER") pklScope = { teacherSupervisorId: user.id };
    else if (user.role === "DUDI_MENTOR") pklScope = { dudiMentorId: user.id };
    else if (user.role === "STUDENT") pklScope = { studentId: user.id };

    if (pklScope) {
      const alerts = await getPklEwsAlertsForScope(user.schoolId, pklScope);
      for (const alert of alerts.slice(0, 16)) {
        notifications.push({
          key: notificationKey("PKL_EWS", alert.id),
          category: "PKL_EWS",
          severity: pklSeverity(alert.severity),
          title: `PKL · ${alert.issue}`,
          message: user.role === "STUDENT"
            ? `${alert.companyName}. ${alert.details}`
            : `${alert.studentName} · ${alert.companyName}. ${alert.details}`,
          href: alert.destination,
          updatedAt: bounds.start,
          actionLabel: alert.category === "JOURNAL" ? "Buka jurnal" : "Buka presensi PKL",
        });
      }
    }
  }

  // 5) Guru Piket: scheduled duty teacher gets a daily reminder until today's report exists.
  const dutyAssignments = staffAssignments.filter(
    (item) => item.role === "DUTY_TEACHER" && isDutyAssignmentForDay(item.dutyDays, dayCode),
  );
  if (dutyAssignments.length > 0 && dayCode !== "SUNDAY") {
    const report = await prisma.dutyTeacherReport.findFirst({
      where: {
        schoolId: user.schoolId,
        dutyTeacherId: user.id,
        date: { gte: bounds.start, lte: bounds.end },
      },
      select: { id: true },
    });
    if (!report) {
      const dayLabel = DUTY_DAY_LABELS[dayCode as DutyDayCode] || "hari ini";
      notifications.push({
        key: notificationKey("DUTY_TEACHER", user.id, dateKey),
        category: "DUTY_TEACHER",
        severity: "INFO",
        title: `Jadwal Guru Piket · ${dayLabel}`,
        message: "Anda terjadwal hari ini dan laporan piket belum dicatat.",
        href: "/school/governance/piket",
        updatedAt: bounds.start,
        actionLabel: "Isi laporan piket",
      });
    }
  }

  // 6) Sarpras: assigned maintenance, plus school-level priority items for Sarpras leadership.
  const maintenance = await prisma.assetMaintenance.findMany({
    where: {
      schoolId: user.schoolId,
      status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] },
      ...(canSarprasAll
        ? {
            OR: [
              { assignedToId: user.id },
              { assignedToId: null },
              { priority: { in: ["HIGH", "CRITICAL"] } },
            ],
          }
        : { assignedToId: user.id }),
    },
    select: {
      id: true,
      issue: true,
      priority: true,
      status: true,
      scheduledAt: true,
      updatedAt: true,
      asset: { select: { code: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 14,
  });
  for (const item of maintenance) {
    const overdue = !!item.scheduledAt && item.scheduledAt < now && item.status !== "IN_PROGRESS";
    notifications.push({
      key: notificationKey("SARPRAS", item.id),
      category: "SARPRAS",
      severity: overdue ? "CRITICAL" : followUpSeverity(item.priority),
      title: overdue ? `Pemeliharaan terlambat · ${item.asset.name}` : `Sarpras · ${item.asset.name}`,
      message: `${item.asset.code} · ${item.issue}`,
      href: `/school/sarpras?maintenance=${item.id}`,
      updatedAt: item.updatedAt,
      actionLabel: "Buka Sarpras",
    });
  }

  // 7) Responsibility changes are one-time informational notifications.
  for (const assignment of staffAssignments) {
    if (assignment.role === "DUTY_TEACHER") continue;
    notifications.push({
      key: notificationKey("RESPONSIBILITY", "STAFF", assignment.id),
      category: "RESPONSIBILITY",
      severity: "INFO",
      title: `Penugasan aktif · ${staffAssignmentDisplayTitle(assignment as any)}`,
      message: "Penugasan ini menentukan akses dan tanggung jawab Anda di School OS.",
      href: "/school/governance/organization",
      updatedAt: assignment.updatedAt,
      actionLabel: "Lihat penugasan",
    });
  }
  for (const assignment of wakasekAssignments) {
    notifications.push({
      key: notificationKey("RESPONSIBILITY", "WAKASEK", assignment.id),
      category: "RESPONSIBILITY",
      severity: "INFO",
      title: `Penugasan Wakasek · ${assignment.role.replace("_", " ")}`,
      message: "Panel dan notifikasi Anda mengikuti bidang Wakasek yang ditetapkan.",
      href: `/school/governance/wakasek?role=${assignment.role}`,
      updatedAt: assignment.updatedAt,
      actionLabel: "Buka panel Wakasek",
    });
  }

  return sortNotifications(notifications).slice(0, 100);
}

const notificationQuerySchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  unreadOnly: z.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

export const getNotificationCenterData = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(notificationQuerySchema, rawArgs ?? {});
  const sourceItems = await collectCurrentNotifications(user);

  const states = sourceItems.length
    ? await prisma.schoolNotificationState.findMany({
        where: {
          schoolId: user.schoolId,
          userId: user.id,
          notificationKey: { in: sourceItems.map((item) => item.key) },
        },
        select: { notificationKey: true, readAt: true },
      })
    : [];
  const stateMap = new Map(states.map((item) => [item.notificationKey, item.readAt]));

  const withState = sourceItems.map((item) => ({
    ...item,
    unread: isNotificationUnread(item.updatedAt, stateMap.get(item.key)),
    categoryLabel: NOTIFICATION_CATEGORY_META[item.category].label,
  }));

  const filtered = withState
    .filter((item) => !args.category || item.category === args.category)
    .filter((item) => !args.unreadOnly || item.unread);

  const categoryCounts = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [
      category,
      withState.filter((item) => item.category === category).length,
    ]),
  ) as Record<NotificationCategoryCode, number>;

  return {
    items: filtered.slice(0, args.limit),
    summary: {
      total: withState.length,
      unread: withState.filter((item) => item.unread).length,
      critical: withState.filter((item) => item.severity === "CRITICAL").length,
      warning: withState.filter((item) => item.severity === "WARNING").length,
      categories: categoryCounts,
      generatedAt: new Date(),
    },
  };
};

const markReadSchema = z.object({ key: z.string().trim().min(3).max(240) });

export const markNotificationRead = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(markReadSchema, rawArgs);
  const items = await collectCurrentNotifications(user);
  if (!items.some((item) => item.key === args.key)) {
    throw new HttpError(404, "Notifikasi tidak lagi aktif atau berada di luar lingkup akses Anda.");
  }
  const now = new Date();
  await prisma.schoolNotificationState.upsert({
    where: {
      schoolId_userId_notificationKey: {
        schoolId: user.schoolId,
        userId: user.id,
        notificationKey: args.key,
      },
    },
    create: {
      schoolId: user.schoolId,
      userId: user.id,
      notificationKey: args.key,
      readAt: now,
    },
    update: { readAt: now },
  });
  return { key: args.key, readAt: now };
};

export const markAllNotificationsRead = async (
  _rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const items = await collectCurrentNotifications(user);
  const now = new Date();
  await prisma.$transaction(
    items.map((item) =>
      prisma.schoolNotificationState.upsert({
        where: {
          schoolId_userId_notificationKey: {
            schoolId: user.schoolId,
            userId: user.id,
            notificationKey: item.key,
          },
        },
        create: {
          schoolId: user.schoolId,
          userId: user.id,
          notificationKey: item.key,
          readAt: now,
        },
        update: { readAt: now },
      }),
    ),
  );
  return { count: items.length, readAt: now };
};
