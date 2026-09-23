type AttendanceActor = { id: string; role: string; isAdmin?: boolean | null; schoolId?: string | null };

export function isDailyAttendanceAdmin(user: AttendanceActor): boolean {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

export function canUseDailyAttendance(user: AttendanceActor, homeroomClassIds: readonly string[]): boolean {
  return isDailyAttendanceAdmin(user) || (user.role === "TEACHER" && homeroomClassIds.length > 0);
}

export function summarizeAttendanceStatuses(records: ReadonlyArray<{ status: string }>) {
  const result = { hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0, total: records.length };
  for (const record of records) {
    if (record.status === "HADIR") result.hadir += 1;
    else if (record.status === "SAKIT") result.sakit += 1;
    else if (record.status === "IZIN") result.izin += 1;
    else if (record.status === "ALPA") result.alpa += 1;
    else if (record.status === "TERLAMBAT") result.terlambat += 1;
  }
  return result;
}

export function attendanceRate(records: ReadonlyArray<{ status: string }>): number | null {
  if (!records.length) return null;
  const present = records.filter((record) => record.status === "HADIR" || record.status === "TERLAMBAT").length;
  return Math.round((present / records.length) * 100);
}

export function needsAttendanceAttention(summary: {
  alpa: number;
  terlambat: number;
  rate: number | null;
}): boolean {
  return summary.alpa >= 3 || summary.terlambat >= 5 || (summary.rate !== null && summary.rate < 90);
}

export function isRequestedIdWithinScope(
  scopedItems: ReadonlyArray<{ id: string }>,
  requestedId?: string,
): boolean {
  return !requestedId || scopedItems.some((item) => item.id === requestedId);
}
