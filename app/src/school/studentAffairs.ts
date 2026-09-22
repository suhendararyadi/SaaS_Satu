export const VIOLATION_STATUSES = ["RECORDED", "IN_REVIEW", "RESOLVED", "CANCELED"] as const;
export type ViolationStatusCode = (typeof VIOLATION_STATUSES)[number];

export const ACHIEVEMENT_LEVELS = ["SCHOOL", "DISTRICT", "REGENCY", "PROVINCE", "NATIONAL", "INTERNATIONAL"] as const;
export type AchievementLevelCode = (typeof ACHIEVEMENT_LEVELS)[number];

export const COACHING_TYPES = ["COACHING", "COUNSELING", "PARENT_MEETING"] as const;
export type CoachingTypeCode = (typeof COACHING_TYPES)[number];

export const COACHING_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;
export type CoachingStatusCode = (typeof COACHING_STATUSES)[number];

export const PERMIT_TYPES = ["SICK", "EXIT", "DISPENSATION", "ACTIVITY", "OTHER"] as const;
export type PermitTypeCode = (typeof PERMIT_TYPES)[number];

export const PERMIT_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "RETURNED", "CANCELED"] as const;
export type PermitStatusCode = (typeof PERMIT_STATUSES)[number];

export const VIOLATION_STATUS_META: Record<ViolationStatusCode, { label: string }> = {
  RECORDED: { label: "Tercatat" },
  IN_REVIEW: { label: "Ditangani" },
  RESOLVED: { label: "Selesai" },
  CANCELED: { label: "Dibatalkan" },
};

export const ACHIEVEMENT_LEVEL_META: Record<AchievementLevelCode, { label: string }> = {
  SCHOOL: { label: "Sekolah" },
  DISTRICT: { label: "Kecamatan" },
  REGENCY: { label: "Kabupaten/Kota" },
  PROVINCE: { label: "Provinsi" },
  NATIONAL: { label: "Nasional" },
  INTERNATIONAL: { label: "Internasional" },
};

export const COACHING_TYPE_META: Record<CoachingTypeCode, { label: string }> = {
  COACHING: { label: "Pembinaan" },
  COUNSELING: { label: "Konseling" },
  PARENT_MEETING: { label: "Pemanggilan Orang Tua" },
};

export const COACHING_STATUS_META: Record<CoachingStatusCode, { label: string }> = {
  OPEN: { label: "Terbuka" },
  IN_PROGRESS: { label: "Diproses" },
  COMPLETED: { label: "Selesai" },
  CANCELED: { label: "Dibatalkan" },
};

export const PERMIT_TYPE_META: Record<PermitTypeCode, { label: string }> = {
  SICK: { label: "Sakit" },
  EXIT: { label: "Izin Keluar" },
  DISPENSATION: { label: "Dispensasi" },
  ACTIVITY: { label: "Kegiatan" },
  OTHER: { label: "Lainnya" },
};

export const PERMIT_STATUS_META: Record<PermitStatusCode, { label: string }> = {
  REQUESTED: { label: "Diajukan" },
  APPROVED: { label: "Disetujui" },
  REJECTED: { label: "Ditolak" },
  RETURNED: { label: "Sudah Kembali" },
  CANCELED: { label: "Dibatalkan" },
};

export function nextViolationStatuses(status: ViolationStatusCode): ViolationStatusCode[] {
  switch (status) {
    case "RECORDED": return ["IN_REVIEW", "RESOLVED", "CANCELED"];
    case "IN_REVIEW": return ["RESOLVED", "CANCELED"];
    case "RESOLVED": return ["IN_REVIEW"];
    case "CANCELED": return ["RECORDED"];
  }
}

export function nextCoachingStatuses(status: CoachingStatusCode): CoachingStatusCode[] {
  switch (status) {
    case "OPEN": return ["IN_PROGRESS", "COMPLETED", "CANCELED"];
    case "IN_PROGRESS": return ["COMPLETED", "CANCELED"];
    case "COMPLETED": return ["IN_PROGRESS"];
    case "CANCELED": return ["OPEN"];
  }
}

export function nextPermitStatuses(status: PermitStatusCode): PermitStatusCode[] {
  switch (status) {
    case "REQUESTED": return ["APPROVED", "REJECTED", "CANCELED"];
    case "APPROVED": return ["RETURNED", "CANCELED"];
    case "REJECTED": return ["REQUESTED"];
    case "RETURNED": return ["APPROVED"];
    case "CANCELED": return ["REQUESTED"];
  }
}

export function shouldAutoCreateViolationFollowUp(severity: string): boolean {
  return severity === "HIGH" || severity === "CRITICAL";
}


export const STUDENT_AFFAIRS_STUDENT_LIMIT = 5000;

export function isFutureHistoricalStudentAffairsDate(
  value: Date,
  now = new Date(),
): boolean {
  return value.getTime() > now.getTime();
}
