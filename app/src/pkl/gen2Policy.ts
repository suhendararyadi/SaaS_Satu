export const PKL_OPEN_STATUSES = ["PLANNED", "ACTIVE"] as const;
export const PKL_FINAL_STATUSES = ["COMPLETED", "CANCELED"] as const;
export const PKL_ATTENDANCE_STATUSES = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA", "LIBUR"] as const;
export const PKL_JOURNAL_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REVISION"] as const;

export type ReadinessItem = {
  code: string;
  label: string;
  ok: boolean;
  severity: "BLOCKER" | "WARNING";
  detail: string;
};

export type ReadinessInput = {
  hasPeriod: boolean;
  periodActive: boolean;
  dateInsidePeriod: boolean;
  companyActive: boolean;
  companyPartnershipActive: boolean;
  acceptsDepartment: boolean;
  capacityConfigured: boolean;
  capacityRemaining: number | null;
  hasTeacher: boolean;
  hasMentor: boolean;
  hasGps: boolean;
};

export function evaluatePlacementReadiness(input: ReadinessInput) {
  const items: ReadinessItem[] = [
    { code: "PERIOD", label: "Periode PKL", ok: input.hasPeriod && input.periodActive, severity: "BLOCKER", detail: input.hasPeriod ? (input.periodActive ? "Periode aktif." : "Periode belum aktif.") : "Periode belum dipilih." },
    { code: "DATES", label: "Tanggal penempatan", ok: input.dateInsidePeriod, severity: "BLOCKER", detail: input.dateInsidePeriod ? "Tanggal berada di dalam periode." : "Tanggal penempatan harus berada di dalam periode PKL." },
    { code: "COMPANY", label: "Mitra DUDI", ok: input.companyActive && input.companyPartnershipActive, severity: "BLOCKER", detail: input.companyActive && input.companyPartnershipActive ? "Mitra aktif." : "Mitra DUDI atau kemitraannya tidak aktif." },
    { code: "DEPARTMENT", label: "Konsentrasi keahlian", ok: input.acceptsDepartment, severity: "BLOCKER", detail: input.acceptsDepartment ? "Konsentrasi diterima DUDI." : "DUDI tidak menerima konsentrasi siswa." },
    { code: "CAPACITY", label: "Kapasitas", ok: input.capacityConfigured && (input.capacityRemaining ?? 0) > 0, severity: "BLOCKER", detail: !input.capacityConfigured ? "Kapasitas periode/konsentrasi belum diatur." : (input.capacityRemaining ?? 0) > 0 ? `Tersisa ${input.capacityRemaining} slot.` : "Kuota sudah penuh." },
    { code: "TEACHER", label: "Guru pembimbing", ok: input.hasTeacher, severity: "BLOCKER", detail: input.hasTeacher ? "Guru pembimbing sudah ditetapkan." : "Guru pembimbing belum ditetapkan." },
    { code: "MENTOR", label: "Pembimbing DUDI", ok: input.hasMentor, severity: "BLOCKER", detail: input.hasMentor ? "Pembimbing DUDI sudah ditetapkan." : "Pembimbing DUDI belum ditetapkan." },
    { code: "GPS", label: "Koordinat DUDI", ok: input.hasGps, severity: "WARNING", detail: input.hasGps ? "Geofence siap." : "Koordinat DUDI belum lengkap; presensi geofence tidak dapat diverifikasi." },
  ];
  const blockers = items.filter((item) => item.severity === "BLOCKER" && !item.ok);
  const warnings = items.filter((item) => item.severity === "WARNING" && !item.ok);
  return { ready: blockers.length === 0, blockers, warnings, items };
}

export function normalizeWorkingDays(value: string | null | undefined) {
  const parsed = String(value || "1,2,3,4,5")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(parsed)].sort((a, b) => a - b);
}

export function isWorkingDay(day: number, workingDays: string | null | undefined) {
  return normalizeWorkingDays(workingDays).includes(day);
}

export function normalizeTime(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesOfDay(value: string | null | undefined) {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

export function getScheduleStatus(localTime: string, lateAfter?: string | null) {
  const current = minutesOfDay(localTime);
  const threshold = minutesOfDay(lateAfter);
  if (current === null || threshold === null) return "UNSCHEDULED" as const;
  return current > threshold ? "LATE" as const : "ON_TIME" as const;
}

export function resolveJournalOverallStatus(input: {
  teacherRequired: boolean;
  mentorRequired: boolean;
  teacherStatus?: string | null;
  mentorStatus?: string | null;
}) {
  if (input.teacherStatus === "REVISION" || input.mentorStatus === "REVISION") return "REVISION";
  const teacherApproved = !input.teacherRequired || input.teacherStatus === "APPROVED";
  const mentorApproved = !input.mentorRequired || input.mentorStatus === "APPROVED";
  return teacherApproved && mentorApproved ? "APPROVED" : "SUBMITTED";
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r;]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export const PKL_IMPORT_KINDS = ["DUDI", "MENTOR", "CAPACITY", "PLACEMENT"] as const;
export type PklImportKind = (typeof PKL_IMPORT_KINDS)[number];

export function normalizedImportValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const key = alias.toLowerCase().replace(/[\s_-]+/g, "");
    const value = row[key];
    if (value != null && value.trim()) return value.trim();
  }
  return "";
}
