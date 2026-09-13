export const STAFF_ASSIGNMENT_ROLES = [
  "PRINCIPAL",
  "DUTY_TEACHER",
  "DEPARTMENT_HEAD",
  "EXTRACURRICULAR_ADVISOR",
  "OTHER",
] as const;

export type StaffAssignmentRoleCode = (typeof STAFF_ASSIGNMENT_ROLES)[number];

export const DUTY_DAY_CODES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type DutyDayCode = (typeof DUTY_DAY_CODES)[number];

export const DUTY_DAY_LABELS: Record<DutyDayCode, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
};

export const STAFF_ASSIGNMENT_META: Record<StaffAssignmentRoleCode, {
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}> = {
  PRINCIPAL: {
    label: "Kepala Sekolah",
    shortLabel: "Kepala Sekolah",
    icon: "account_balance",
    description: "Penanggung jawab utama unit sekolah.",
  },
  DUTY_TEACHER: {
    label: "Guru Piket",
    shortLabel: "Guru Piket",
    icon: "schedule",
    description: "Penanggung jawab ketertiban dan laporan piket sesuai jadwal.",
  },
  DEPARTMENT_HEAD: {
    label: "Kaprog / Kakomli",
    shortLabel: "Kaprog",
    icon: "account_tree",
    description: "Kepala program atau konsentrasi keahlian.",
  },
  EXTRACURRICULAR_ADVISOR: {
    label: "Pembina Ekstrakurikuler",
    shortLabel: "Pembina Ekskul",
    icon: "sports",
    description: "Pembina kegiatan ekstrakurikuler sekolah.",
  },
  OTHER: {
    label: "Tugas Tambahan",
    shortLabel: "Tugas Tambahan",
    icon: "assignment_ind",
    description: "Penugasan khusus lain sesuai kebutuhan sekolah.",
  },
};

export function isStaffAssignmentRole(value: unknown): value is StaffAssignmentRoleCode {
  return typeof value === "string" && (STAFF_ASSIGNMENT_ROLES as readonly string[]).includes(value);
}

export function normalizeDutyDays(values: unknown): DutyDayCode[] {
  if (!Array.isArray(values)) return [];
  return DUTY_DAY_CODES.filter((day) => values.includes(day));
}

export function jakartaDutyDayCode(date = new Date()): DutyDayCode | "SUNDAY" {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).format(date).toUpperCase();
  return day as DutyDayCode | "SUNDAY";
}

export function staffAssignmentDisplayTitle(input: {
  role: StaffAssignmentRoleCode;
  unitName?: string | null;
  customTitle?: string | null;
  department?: { code?: string | null; name?: string | null } | null;
}): string {
  if (input.role === "DEPARTMENT_HEAD") {
    const suffix = input.department?.code || input.department?.name;
    return suffix ? `Kaprog / Kakomli · ${suffix}` : "Kaprog / Kakomli";
  }
  if (input.role === "EXTRACURRICULAR_ADVISOR") {
    return input.unitName ? `Pembina · ${input.unitName}` : "Pembina Ekstrakurikuler";
  }
  if (input.role === "OTHER") {
    return input.customTitle?.trim() || "Tugas Tambahan";
  }
  return STAFF_ASSIGNMENT_META[input.role].label;
}

export function isDutyAssignmentForDay(
  dutyDays: readonly string[],
  day: DutyDayCode | "SUNDAY",
): boolean {
  if (day === "SUNDAY") return false;
  return dutyDays.length === 0 || dutyDays.includes(day);
}
