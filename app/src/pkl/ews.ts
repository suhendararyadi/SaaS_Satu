import { prisma } from "wasp/server";

export type PklEwsSeverity = "HIGH" | "MEDIUM" | "LOW";
export type PklEwsCategory = "ATTENDANCE" | "JOURNAL" | "READINESS" | "REVIEW" | "PLACEMENT";

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

function daysUntil(now: Date, then: Date) {
  return Math.ceil((then.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

function identity(placement: any) {
  return {
    studentName:
      placement.student?.name ||
      placement.student?.username ||
      placement.student?.email ||
      "Siswa",
    className: placement.student?.classRoom?.name || "Belum ada rombel",
    companyName: placement.company?.name || "Mitra belum tersedia",
    teacherName:
      placement.teacherSupervisor?.name ||
      placement.teacherSupervisor?.username ||
      placement.teacherSupervisor?.email ||
      "Belum ditugaskan",
  };
}

export async function getPklEwsAlertsForScope(
  schoolId: string,
  placementScope: PlacementScope = {},
): Promise<PklEwsAlert[]> {
  const placements = await prisma.placement.findMany({
    where: {
      schoolId,
      status: { in: ["PLANNED", "ACTIVE"] },
      ...(placementScope.studentId ? { studentId: placementScope.studentId } : {}),
      ...(placementScope.studentIds?.length ? { studentId: { in: placementScope.studentIds } } : {}),
      ...(placementScope.teacherSupervisorId ? { teacherSupervisorId: placementScope.teacherSupervisorId } : {}),
      ...(placementScope.dudiMentorId ? { dudiMentorId: placementScope.dudiMentorId } : {}),
    },
    select: {
      id: true,
      status: true,
      studentId: true,
      companyId: true,
      pklPeriodId: true,
      departmentId: true,
      teacherSupervisorId: true,
      dudiMentorId: true,
      startDate: true,
      endDate: true,
      readinessCheckedAt: true,
      student: {
        select: {
          name: true,
          email: true,
          username: true,
          classRoom: { select: { name: true, departmentId: true } },
        },
      },
      company: {
        select: {
          name: true,
          isActive: true,
          partnershipStatus: true,
          latitude: true,
          longitude: true,
          departmentLinks: { where: { isActive: true }, select: { departmentId: true } },
        },
      },
      pklPeriod: { select: { id: true, name: true, isActive: true, startDate: true, endDate: true } },
      teacherSupervisor: { select: { name: true, email: true, username: true } },
      dudiMentor: {
        select: {
          name: true,
          dudiMentorProfile: { select: { companyId: true, isActive: true } },
        },
      },
      attendances: {
        orderBy: { timestamp: "desc" },
        take: 30,
        select: { timestamp: true, dateOnly: true, type: true, status: true, geofenceStatus: true },
      },
      journals: {
        orderBy: { date: "desc" },
        take: 20,
        select: {
          date: true,
          dateOnly: true,
          status: true,
          submittedAt: true,
          teacherReviewStatus: true,
          mentorReviewStatus: true,
        },
      },
    },
  });

  const alerts: PklEwsAlert[] = [];
  const now = new Date();

  for (const placement of placements) {
    const base = identity(placement);

    if (placement.status === "PLANNED") {
      const departmentId = placement.departmentId || placement.student?.classRoom?.departmentId || null;
      const blockers: string[] = [];
      if (!placement.pklPeriod || !placement.pklPeriod.isActive) blockers.push("periode PKL aktif");
      if (!departmentId) blockers.push("konsentrasi siswa");
      if (!placement.teacherSupervisorId) blockers.push("Guru Pembimbing");
      const mentorOk =
        !!placement.dudiMentorId &&
        placement.dudiMentor?.dudiMentorProfile?.isActive === true &&
        placement.dudiMentor?.dudiMentorProfile?.companyId === placement.companyId;
      if (!mentorOk) blockers.push("Pembimbing DUDI");
      if (!placement.company.isActive || placement.company.partnershipStatus !== "ACTIVE") blockers.push("DUDI aktif");
      if (departmentId && !placement.company.departmentLinks.some((row) => row.departmentId === departmentId)) {
        blockers.push("kecocokan konsentrasi DUDI");
      }
      if (
        placement.pklPeriod &&
        (placement.startDate < placement.pklPeriod.startDate ||
          placement.endDate > placement.pklPeriod.endDate ||
          placement.startDate >= placement.endDate)
      ) {
        blockers.push("tanggal penempatan");
      }

      if (placement.pklPeriodId && departmentId) {
        const capacity = await prisma.pklCompanyCapacity.findFirst({
          where: {
            schoolId,
            periodId: placement.pklPeriodId,
            companyId: placement.companyId,
            departmentId,
          },
          select: { quota: true },
        });
        if (!capacity) {
          blockers.push("kapasitas periode/konsentrasi");
        } else {
          const used = await prisma.placement.count({
            where: {
              schoolId,
              pklPeriodId: placement.pklPeriodId,
              companyId: placement.companyId,
              departmentId,
              status: { in: ["PLANNED", "ACTIVE"] },
            },
          });
          if (used > capacity.quota) blockers.push("kuota DUDI terlampaui");
        }
      }

      if (blockers.length) {
        alerts.push({
          id: `${placement.id}:READINESS_BLOCKED`,
          code: "READINESS_BLOCKED",
          placementId: placement.id,
          studentId: placement.studentId,
          ...base,
          severity: "HIGH",
          category: "READINESS",
          issue: "Penempatan belum siap diaktifkan",
          details: "Belum lengkap: " + blockers.join(", ") + ".",
          destination: "/school/pkl/placements",
        });
      } else {
        alerts.push({
          id: `${placement.id}:READY_NOT_ACTIVE`,
          code: "READY_NOT_ACTIVE",
          placementId: placement.id,
          studentId: placement.studentId,
          ...base,
          severity: "LOW",
          category: "READINESS",
          issue: "Placement siap tetapi belum diaktifkan",
          details: "Semua komponen utama terisi. Admin dapat melakukan readiness check dan aktivasi.",
          destination: "/school/pkl/placements",
        });
      }
      continue;
    }

    if (placement.attendances.length === 0) {
      alerts.push({
        id: `${placement.id}:NO_ATTENDANCE`,
        code: "NO_ATTENDANCE",
        placementId: placement.id,
        studentId: placement.studentId,
        ...base,
        severity: "HIGH",
        category: "ATTENDANCE",
        issue: "Belum pernah presensi",
        details: "Belum ada catatan presensi PKL untuk penempatan aktif ini.",
        destination: "/school/pkl/attendance",
      });
    }

    const alphaCount = placement.attendances.filter((row) => row.status === "ALPA").length;
    if (alphaCount >= 2) {
      alerts.push({
        id: `${placement.id}:MULTIPLE_ALPHA`,
        code: "MULTIPLE_ALPHA",
        placementId: placement.id,
        studentId: placement.studentId,
        ...base,
        severity: alphaCount >= 3 ? "HIGH" : "MEDIUM",
        category: "ATTENDANCE",
        issue: `${alphaCount} hari ALPA`,
        details: "Perlu tindak lanjut kehadiran siswa selama PKL.",
        destination: "/school/pkl/attendance",
      });
    }

    const outOfRadiusCount = placement.attendances.filter(
      (attendance) =>
        attendance.type === "CHECK_IN" &&
        (attendance.geofenceStatus === "OUTSIDE" || attendance.status === "DI LUAR RADIUS"),
    ).length;
    if (outOfRadiusCount > 0) {
      alerts.push({
        id: `${placement.id}:OUT_OF_RADIUS`,
        code: "OUT_OF_RADIUS",
        placementId: placement.id,
        studentId: placement.studentId,
        ...base,
        severity: outOfRadiusCount >= 3 ? "HIGH" : "MEDIUM",
        category: "ATTENDANCE",
        issue: `${outOfRadiusCount} check-in di luar radius`,
        details: "Geofence mendeteksi check-in di luar radius lokasi DUDI.",
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
        ...base,
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
          ...base,
          severity: daysSinceLastJournal >= 5 ? "HIGH" : "MEDIUM",
          category: "JOURNAL",
          issue: `Jurnal tertunda ${daysSinceLastJournal} hari`,
          details: `Jurnal terakhir tercatat pada ${formatJakartaDate(journalDate)}.`,
          destination: "/school/pkl/journals",
        });
      }
    }

    const pendingReview = placement.journals.find((journal) => {
      if (journal.status !== "SUBMITTED" || !journal.submittedAt) return false;
      const teacherPending = !!placement.teacherSupervisorId && !["APPROVED", "REVISION"].includes(journal.teacherReviewStatus || "");
      const mentorPending = !!placement.dudiMentorId && !["APPROVED", "REVISION"].includes(journal.mentorReviewStatus || "");
      return (teacherPending || mentorPending) && daysBetween(now, journal.submittedAt) >= 2;
    });
    if (pendingReview) {
      alerts.push({
        id: `${placement.id}:REVIEW_STALE`,
        code: "REVIEW_STALE",
        placementId: placement.id,
        studentId: placement.studentId,
        ...base,
        severity: "MEDIUM",
        category: "REVIEW",
        issue: "Review jurnal tertunda",
        details: "Ada jurnal yang sudah dikirim ≥2 hari tetapi belum selesai direview pihak yang ditugaskan.",
        destination: "/school/pkl/journals",
      });
    }

    const remainingDays = daysUntil(now, placement.endDate);
    if (remainingDays >= 0 && remainingDays <= 7) {
      const approvedCount = placement.journals.filter((journal) => journal.status === "APPROVED").length;
      if (approvedCount === 0) {
        alerts.push({
          id: `${placement.id}:ENDING_INCOMPLETE`,
          code: "ENDING_INCOMPLETE",
          placementId: placement.id,
          studentId: placement.studentId,
          ...base,
          severity: remainingDays <= 3 ? "HIGH" : "MEDIUM",
          category: "PLACEMENT",
          issue: `PKL berakhir dalam ${remainingDays} hari`,
          details: "Belum ada jurnal berstatus APPROVED. Administrasi penyelesaian perlu ditinjau.",
          destination: "/school/pkl/monitoring",
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
