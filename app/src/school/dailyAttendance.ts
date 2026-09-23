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


export function getAcademicSemesterDateRange(
  yearName: string,
  semester: string,
): { startDateOnly: string; endDateOnly: string; endDateOnlyExclusive: string } | null {
  const match = /^(\d{4})\/(\d{4})$/.exec(yearName.trim());
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) return null;

  if (semester === "GANJIL") {
    return {
      startDateOnly: `${startYear}-07-01`,
      endDateOnly: `${startYear}-12-31`,
      endDateOnlyExclusive: `${endYear}-01-01`,
    };
  }
  if (semester === "GENAP") {
    return {
      startDateOnly: `${endYear}-01-01`,
      endDateOnly: `${endYear}-06-30`,
      endDateOnlyExclusive: `${endYear}-07-01`,
    };
  }
  return null;
}

export function isDateWithinAcademicSemester(
  dateOnly: string,
  yearName: string,
  semester: string,
): boolean {
  const range = getAcademicSemesterDateRange(yearName, semester);
  return !!range && dateOnly >= range.startDateOnly && dateOnly < range.endDateOnlyExclusive;
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
