export const DAILY_ATTENDANCE_STATUSES = ["HADIR", "SAKIT", "IZIN", "ALPA", "TERLAMBAT"] as const;

export type DailyAttendanceStatus = (typeof DAILY_ATTENDANCE_STATUSES)[number];

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function jakartaDateOnly(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function summarizeDailyAttendance(
  records: ReadonlyArray<{ status: string }>,
) {
  const summary = {
    total: records.length,
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    terlambat: 0,
  };

  for (const record of records) {
    if (record.status === "HADIR") summary.hadir += 1;
    else if (record.status === "SAKIT") summary.sakit += 1;
    else if (record.status === "IZIN") summary.izin += 1;
    else if (record.status === "ALPA") summary.alpa += 1;
    else if (record.status === "TERLAMBAT") summary.terlambat += 1;
  }

  return summary;
}
