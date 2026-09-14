import { prisma } from "wasp/server";

export type PklEwsSeverity = "HIGH" | "MEDIUM" | "LOW";
export type PklEwsCategory = "ATTENDANCE" | "JOURNAL";

export type PklEwsAlert = {
  id: string;
  code: string;
  placementId: string;
  studentId: string;
  studentName: string;
  className: string;
  companyName: string;
  teacherName: string;
  severity: PklEwsSeverity;
  category: PklEwsCategory;
  issue: string;
  details: string;
  destination: string;
};

export type PklEwsSummary = {
  totalAlerts: number;
  high: number;
  medium: number;
  low: number;
  affectedStudents: number;
  affectedPlacements: number;
};

type PlacementScope = {
  studentId?: string;
  studentIds?: string[];
  teacherSupervisorId?: string;
  dudiMentorId?: string;
};

function daysBetween(now: Date, then: Date) {
  const diff = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function summarizePklEwsAlerts(alerts: PklEwsAlert[]): PklEwsSummary {
  return {
    totalAlerts: alerts.length,
    high: alerts.filter((alert) => alert.severity === "HIGH").length,
    medium: alerts.filter((alert) => alert.severity === "MEDIUM").length,
    low: alerts.filter((alert) => alert.severity === "LOW").length,
    affectedStudents: new Set(alerts.map((alert) => alert.studentId)).size,
    affectedPlacements: new Set(alerts.map((alert) => alert.placementId)).size,
  };
}

export async function getPklEwsAlertsForScope(
  schoolId: string,
  placementScope: PlacementScope = {},
): Promise<PklEwsAlert[]> {
  const activePlacements = await prisma.placement.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      ...(placementScope.studentId ? { studentId: placementScope.studentId } : {}),
      ...(placementScope.studentIds?.length ? { studentId: { in: placementScope.studentIds } } : {}),
      ...(placementScope.teacherSupervisorId ? { teacherSupervisorId: placementScope.teacherSupervisorId } : {}),
      ...(placementScope.dudiMentorId ? { dudiMentorId: placementScope.dudiMentorId } : {}),
    },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          name: true,
          email: true,
          username: true,
          classRoom: { select: { name: true } },
        },
      },
      company: { select: { name: true } },
      teacherSupervisor: { select: { name: true, email: true, username: true } },
      attendances: {
        orderBy: { timestamp: "desc" },
        take: 5,
        select: { timestamp: true, type: true, status: true },
      },
      journals: {
        orderBy: { date: "desc" },
        take: 5,
        select: { date: true, status: true },
      },
    },
  });

  const alerts: PklEwsAlert[] = [];
  const now = new Date();

  for (const placement of activePlacements) {
    const studentName =
      placement.student?.name ||
      placement.student?.username ||
      placement.student?.email ||
      "Siswa";
    const className = placement.student?.classRoom?.name || "Belum ada rombel";
    const companyName = placement.company?.name || "Mitra belum tersedia";
    const teacherName =
      placement.teacherSupervisor?.name ||
      placement.teacherSupervisor?.username ||
      placement.teacherSupervisor?.email ||
      "Belum ditugaskan";

    if (placement.attendances.length === 0) {
      alerts.push({
        id: `${placement.id}:NO_ATTENDANCE`,
        code: "NO_ATTENDANCE",
        placementId: placement.id,
        studentId: placement.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "HIGH",
        category: "ATTENDANCE",
        issue: "Belum pernah presensi",
        details: "Belum ada catatan presensi PKL untuk penempatan aktif ini.",
        destination: "/school/pkl/attendance",
      });
    }

    const outOfRadiusCount = placement.attendances.filter(
      (attendance) => attendance.type === "CHECK_IN" && attendance.status === "DI LUAR RADIUS",
    ).length;
    if (outOfRadiusCount > 0) {
      alerts.push({
        id: `${placement.id}:OUT_OF_RADIUS`,
        code: "OUT_OF_RADIUS",
        placementId: placement.id,
        studentId: placement.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "MEDIUM",
        category: "ATTENDANCE",
        issue: `${outOfRadiusCount} presensi di luar radius DUDI`,
        details: "Presensi check-in terbaru memuat catatan di luar radius geofence mitra.",
        destination: "/school/pkl/attendance",
      });
    }

    const lastJournal = placement.journals[0];
    if (!lastJournal) {
      alerts.push({
        id: `${placement.id}:NO_JOURNAL`,
        code: "NO_JOURNAL",
        placementId: placement.id,
        studentId: placement.studentId,
        studentName,
        className,
        companyName,
        teacherName,
        severity: "MEDIUM",
        category: "JOURNAL",
        issue: "Belum mengisi jurnal",
        details: "Belum ada jurnal kegiatan untuk penempatan PKL aktif ini.",
        destination: "/school/pkl/journals",
      });
    } else {
      const journalDate = new Date(lastJournal.date);
      const daysSinceLastJournal = daysBetween(now, journalDate);
      if (daysSinceLastJournal >= 3) {
        alerts.push({
          id: `${placement.id}:JOURNAL_STALE`,
          code: "JOURNAL_STALE",
          placementId: placement.id,
          studentId: placement.studentId,
          studentName,
          className,
          companyName,
          teacherName,
          severity: "HIGH",
          category: "JOURNAL",
          issue: `Jurnal tertunda ${daysSinceLastJournal} hari`,
          details: `Jurnal terakhir tercatat pada ${formatJakartaDate(journalDate)}.`,
          destination: "/school/pkl/journals",
        });
      }
    }
  }

  const severityRank: Record<PklEwsSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return alerts.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.studentName.localeCompare(b.studentName, "id") ||
      a.issue.localeCompare(b.issue, "id"),
  );
}
