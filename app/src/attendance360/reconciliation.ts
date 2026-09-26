export type AttendanceEvidenceEvent = {
  id?: string;
  type: string;
  status: string;
  occurredAt: Date;
  source?: string;
  metadata?: any;
};

export type AttendanceReconciliation = {
  status: "HADIR" | "SAKIT" | "IZIN" | "ALPA" | "TERLAMBAT" | null;
  arrivalAt: Date | null;
  checkOutAt: Date | null;
  lateMinutes: number | null;
  earlyLeave: boolean;
  reconciliationStatus: "AUTO" | "NEEDS_REVIEW";
  reasons: string[];
  evidenceSummary: {
    eventCount: number;
    eventTypes: string[];
    subjectPresentCount: number;
    subjectAbsentCount: number;
  };
};

function byTime(a: AttendanceEvidenceEvent, b: AttendanceEvidenceEvent) {
  return a.occurredAt.getTime() - b.occurredAt.getTime();
}

export function reconcileAttendanceEvidence(events: readonly AttendanceEvidenceEvent[]): AttendanceReconciliation {
  const ordered = [...events].sort(byTime);
  const checkIn = ordered.find((event) => event.type === "SELF_CHECK_IN") || null;
  const checkOut = [...ordered].reverse().find((event) => event.type === "SELF_CHECK_OUT") || null;
  const dutyLate = ordered.find((event) => event.type === "DUTY_LATE") || null;
  const earlyLeaveEvent = ordered.find((event) => event.type === "DUTY_EARLY_LEAVE" || event.type === "DUTY_DISPENSATION") || null;
  const permit = [...ordered].reverse().find((event) => event.type === "PERMIT_STATUS" && ["IZIN", "SAKIT"].includes(event.status)) || null;
  const subjects = ordered.filter((event) => event.type === "SUBJECT_ATTENDANCE");
  const subjectPresent = subjects.filter((event) => ["HADIR", "TERLAMBAT", "DISPENSASI"].includes(event.status));
  const subjectAbsent = subjects.filter((event) => event.status === "ALPA");

  const reasons: string[] = [];
  let status: AttendanceReconciliation["status"] = null;
  let needsReview = false;

  const hasPhysicalPresence = !!checkIn || !!dutyLate;
  if (hasPhysicalPresence) {
    status = checkIn?.status === "TERLAMBAT" || !!dutyLate ? "TERLAMBAT" : "HADIR";
    if (permit && !earlyLeaveEvent) {
      needsReview = true;
      reasons.push("Bukti hadir bertentangan dengan izin/sakit pada hari yang sama.");
    }
  } else if (permit) {
    status = permit.status as "IZIN" | "SAKIT";
  }

  if (!events.length) {
    needsReview = true;
    reasons.push("Belum ada bukti kehadiran hari ini.");
  }

  const metadataLate = Number(checkIn?.metadata?.lateMinutes ?? dutyLate?.metadata?.lateMinutes);
  const late = Number.isFinite(metadataLate) && metadataLate >= 0 ? metadataLate : null;

  return {
    status,
    arrivalAt: checkIn?.occurredAt || dutyLate?.occurredAt || null,
    checkOutAt: checkOut?.occurredAt || null,
    lateMinutes: status === "TERLAMBAT" ? late : null,
    earlyLeave: !!earlyLeaveEvent,
    reconciliationStatus: needsReview ? "NEEDS_REVIEW" : "AUTO",
    reasons,
    evidenceSummary: {
      eventCount: events.length,
      eventTypes: [...new Set(events.map((event) => event.type))],
      subjectPresentCount: subjectPresent.length,
      subjectAbsentCount: subjectAbsent.length,
    },
  };
}
